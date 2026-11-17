import {
  AreaCode,
  BaseChannel,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  GroupChannel,
  LogLevel,
  Message,
  MessageHandler,
  MessageType,
  NCEngine,
  SendTextMessageParams,
  TextMessageContent,
} from '@nexconn/chat';
import {
  ChatMessage,
  NexconnConnectionState,
  NexconnServerStatus,
  SquadMember,
  TacticalCalloutId,
  TacticalCalloutOption,
} from '../types/squadshield';
import {
  ChatTransportAdapter,
  TransportMessageReceipt,
  formatClockTime,
} from './chatTransport';

const DEFAULT_SQUAD_CHANNEL_ID = 'squad_vanguard_echo';

interface NexconnExtraPayload {
  squadshieldKind?: 'tactical' | 'text';
  tacticalId?: TacticalCalloutId;
  senderHandle?: string;
}

const VALID_TACTICAL_IDS: ReadonlySet<string> = new Set([
  'enemy-spotted',
  'need-backup',
  'move-to-b',
  'regroup',
  'defend-position',
  'healing-needed',
]);

function resolveAreaCode(code?: string): AreaCode {
  switch ((code || 'SG').toUpperCase()) {
    case 'BJ':
      return AreaCode.BJ;
    case 'NA':
      return AreaCode.NA;
    case 'SA':
      return AreaCode.SA;
    case 'OM':
      return AreaCode.OM;
    case 'SG':
    default:
      return AreaCode.SG;
  }
}

function isPlaceholderAppKey(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return !trimmed || trimmed.startsWith('YOUR_') || trimmed === '<Your-App-Key>';
}

/**
 * Ensures the squad channel ID is always a clean channel identifier
 * (defaulting to squad_vanguard_echo) and never an API URL.
 */
export function sanitizeSquadChannelId(candidate?: string | null): string {
  if (!candidate) return DEFAULT_SQUAD_CHANNEL_ID;
  const trimmed = candidate.trim();
  if (
    !trimmed ||
    trimmed.startsWith('YOUR_') ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes('://') ||
    trimmed.includes('/') ||
    /\.com$/i.test(trimmed)
  ) {
    return DEFAULT_SQUAD_CHANNEL_ID;
  }
  return /^[a-zA-Z0-9_-]{1,64}$/.test(trimmed) ? trimmed : DEFAULT_SQUAD_CHANNEL_ID;
}

/**
 * Safely parses JSON from backend API responses and surfaces clear errors
 * if an HTML page (e.g. SPA fallback or auth proxy) is returned instead of JSON.
 */
async function safeParseApiResponse<T>(res: Response, endpoint: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html')
  ) {
    throw new Error(
      `Backend API "${endpoint}" returned HTML (HTTP ${res.status}) instead of JSON. Ensure the Node Express server is running and serving /api/* routes rather than static SPA fallback.`
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(
      `Backend API "${endpoint}" returned invalid JSON (HTTP ${res.status}): ${trimmed.slice(0, 120) || 'Empty response'}`
    );
  }
}

function parseNexconnExtra(rawExtra?: string): NexconnExtraPayload {
  if (!rawExtra) return {};
  try {
    const parsed = JSON.parse(rawExtra) as NexconnExtraPayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function mapNexconnMessageToChatMessage(
  msg: Message<TextMessageContent>,
  members: SquadMember[]
): ChatMessage | null {
  if (msg.messageType !== MessageType.TEXT) {
    return null;
  }

  const textContent = msg.content;
  const extra = parseNexconnExtra(textContent?.extra);
  const text = textContent?.text ?? '';
  const senderMember = members.find((m) => m.id === msg.senderUserId);

  const isTactical =
    extra.squadshieldKind === 'tactical' &&
    extra.tacticalId &&
    VALID_TACTICAL_IDS.has(extra.tacticalId);

  const sentTime = msg.sentTime || Date.now();
  const messageId = msg.messageId || `nc_${sentTime}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: `nc_${messageId}`,
    nexconnMessageId: messageId,
    origin: 'nexconn',
    senderId: msg.senderUserId,
    senderHandle: senderMember?.handle || extra.senderHandle || msg.senderUserId,
    senderAvatar: senderMember?.avatarUrl || '',
    kind: isTactical ? 'tactical' : 'text',
    content: text,
    tacticalId: isTactical ? extra.tacticalId : undefined,
    timestamp: formatClockTime(new Date(sentTime)),
    createdAt: sentTime,
    flagStatus: 'clean',
  };
}

export class NexconnChatAdapter implements ChatTransportAdapter {
  readonly mode = 'nexconn' as const;
  readonly providerLabel = 'Nexconn Web Chat SDK (@nexconn/chat)';

  private initialized = false;
  private listenersAttached = false;
  private intentionalDisconnect = false;
  private activeChannelId: string;
  private activeAreaCode: string;
  private runtimeAppKey = '';
  private connectionState: NexconnConnectionState = 'unconfigured';
  private connectedUserId: string | null = null;
  private lastError: string | null = null;

  private onStateChange?: (
    state: NexconnConnectionState,
    userId: string | null,
    error?: string | null
  ) => void;
  private onIncomingMessages?: (messages: Message<any>[]) => void;

  constructor() {
    this.activeChannelId = sanitizeSquadChannelId(import.meta.env.VITE_NEXCONN_SQUAD_CHANNEL_ID);
    this.activeAreaCode = (import.meta.env.VITE_NEXCONN_AREA_CODE || 'SG').toUpperCase();
  }

  getAppKey(): string {
    const raw = import.meta.env.VITE_NEXCONN_APP_KEY;
    if (!isPlaceholderAppKey(raw)) {
      return raw.trim();
    }
    return this.runtimeAppKey;
  }

  getChannelId(): string {
    return this.activeChannelId;
  }

  getConnectionState(): NexconnConnectionState {
    return this.connectionState;
  }

  isSdkConnected(): boolean {
    return this.initialized && NCEngine.getConnectionStatus() === ConnectionStatus.CONNECTED;
  }

  getConnectedUserId(): string | null {
    return this.connectedUserId;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  setCallbacks(callbacks: {
    onStateChange?: (
      state: NexconnConnectionState,
      userId: string | null,
      error?: string | null
    ) => void;
    onIncomingMessages?: (messages: Message<any>[]) => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onIncomingMessages = callbacks.onIncomingMessages;
  }

  private updateState(
    nextState: NexconnConnectionState,
    userId: string | null = this.connectedUserId,
    error: string | null = null
  ) {
    this.connectionState = nextState;
    this.connectedUserId = userId;
    this.lastError = error;
    this.onStateChange?.(nextState, userId, error);
  }

  async fetchServerStatus(): Promise<NexconnServerStatus> {
    const res = await fetch('/api/nexconn/status', {
      headers: { Accept: 'application/json' },
    });
    const status = await safeParseApiResponse<NexconnServerStatus & { error?: string }>(
      res,
      '/api/nexconn/status'
    );
    if (!res.ok) {
      throw new Error(status.error || `Failed to fetch Nexconn status (HTTP ${res.status}).`);
    }

    this.activeChannelId = sanitizeSquadChannelId(status.squadChannelId);
    if (status.areaCode) {
      this.activeAreaCode = status.areaCode.toUpperCase();
    }
    if (status.appKey && !isPlaceholderAppKey(status.appKey)) {
      this.runtimeAppKey = status.appKey.trim();
    }

    const sanitizedStatus: NexconnServerStatus = {
      ...status,
      squadChannelId: this.activeChannelId,
      areaCode: this.activeAreaCode,
    };

    if (!sanitizedStatus.configured || !this.getAppKey()) {
      if (this.connectionState === 'unconfigured' || this.connectionState === 'disconnected') {
        this.updateState('unconfigured', null, null);
      }
    } else if (this.connectionState === 'unconfigured') {
      this.updateState('disconnected', null, null);
    }
    return sanitizedStatus;
  }

  private ensureInitialized() {
    const appKey = this.getAppKey();
    if (!appKey) {
      throw new Error('VITE_NEXCONN_APP_KEY is missing or set to a placeholder.');
    }

    if (!this.initialized) {
      NCEngine.initialize({
        appKey,
        areaCode: resolveAreaCode(this.activeAreaCode),
        logLevel: LogLevel.WARN,
      });
      this.initialized = true;
    }

    if (!this.listenersAttached) {
      NCEngine.addConnectionStatusHandler(
        'squadshield-connection',
        new ConnectionStatusHandler({
          onConnectionStatusChanged: ({ status, code }) => {
            if (status === ConnectionStatus.CONNECTED) {
              this.intentionalDisconnect = false;
              this.updateState(
                'connected',
                NCEngine.getCurrentUserId() || this.connectedUserId,
                null
              );
            } else if (status === ConnectionStatus.CONNECTING) {
              this.updateState('connecting', this.connectedUserId, null);
            } else if (status === ConnectionStatus.SUSPENDED) {
              this.updateState(
                'suspended',
                this.connectedUserId,
                code
                  ? `Connection suspended (code ${code}); reconnecting.`
                  : 'Connection suspended; reconnecting.'
              );
            } else {
              const reason = this.intentionalDisconnect
                ? null
                : code
                ? `Disconnected from Nexconn (code ${code})`
                : 'Disconnected from Nexconn';
              this.updateState('disconnected', null, reason);
            }
          },
        })
      );

      NCEngine.addMessageHandler(
        'squadshield-messages',
        new MessageHandler({
          onMessageReceived: ({ messages }) => {
            this.onIncomingMessages?.(messages);
          },
        })
      );

      this.listenersAttached = true;
    }
  }

  async connectUser(
    user: SquadMember,
    allMembers: SquadMember[]
  ): Promise<{ userId: string; channelId: string; history: Message<any>[] }> {
    this.ensureInitialized();
    this.intentionalDisconnect = false;
    this.updateState('connecting', null, null);

    try {
      // 1. Obtain short-lived user access token from Express backend (App Secret stays on server)
      const tokenRes = await fetch('/api/nexconn/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: user.handle,
        }),
      });

      const tokenJson = await safeParseApiResponse<{
        userId?: string;
        accessToken?: string;
        channelId?: string;
        error?: string;
      }>(tokenRes, '/api/nexconn/token');

      if (!tokenRes.ok || !tokenJson.accessToken) {
        throw new Error(
          tokenJson.error || `Backend token issuance failed (HTTP ${tokenRes.status}).`
        );
      }

      if (tokenJson.channelId) {
        this.activeChannelId = sanitizeSquadChannelId(tokenJson.channelId);
      }

      // 2. Connect to Nexconn messaging service using server-issued token
      const connectResult = await NCEngine.connect({ token: tokenJson.accessToken });
      if (!connectResult.isOk || connectResult.code !== 0) {
        throw new Error(
          connectResult.msg
            ? `NCEngine.connect failed (code ${connectResult.code}): ${connectResult.msg}`
            : `NCEngine.connect failed with code ${connectResult.code}.`
        );
      }

      const connectedId = connectResult.data?.userId || NCEngine.getCurrentUserId() || user.id;
      if (connectedId !== user.id) {
        throw new Error(
          `Nexconn connected as "${connectedId}" instead of expected player "${user.id}".`
        );
      }

      // 3. Ensure squad group channel exists on backend and current user is actually joined
      let ensureError: string | null = null;
      try {
        const ensureRes = await fetch('/api/nexconn/squad/ensure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            channelId: this.activeChannelId,
            channelName: 'Vanguard Echo',
            ownerId: user.id,
            memberIds: allMembers.map((m) => m.id),
          }),
        });
        const ensureJson = await safeParseApiResponse<{
          channelId?: string;
          createCode?: number;
          joinCode?: number;
          error?: string;
        }>(ensureRes, '/api/nexconn/squad/ensure');
        if (!ensureRes.ok || ensureJson.joinCode !== 0) {
          ensureError =
            ensureJson.error ||
            `Squad ensure endpoint failed (HTTP ${ensureRes.status}, joinCode ${ensureJson.joinCode ?? 'unknown'}).`;
        }
      } catch (err) {
        ensureError = err instanceof Error ? err.message : 'Unable to reach /api/nexconn/squad/ensure.';
      }

      const groupChannel = new GroupChannel(this.activeChannelId);
      const joinedRes = await GroupChannel.getJoinedGroups([this.activeChannelId]);
      const isAlreadyJoined =
        joinedRes.isOk &&
        joinedRes.code === 0 &&
        Array.isArray(joinedRes.data) &&
        joinedRes.data.some((group) => group.groupId === this.activeChannelId);

      if (!isAlreadyJoined) {
        const sdkJoinRes = await groupChannel.join();
        if (!sdkJoinRes.isOk || sdkJoinRes.code !== 0) {
          const joinDetail = sdkJoinRes.msg || `code ${sdkJoinRes.code}`;
          throw new Error(
            ensureError
              ? `Unable to join Nexconn group "${this.activeChannelId}": ${ensureError} (SDK join fallback: ${joinDetail}).`
              : `Unable to join Nexconn group "${this.activeChannelId}" (${joinDetail}).`
          );
        }
      }

      // 4. Load recent group history from Nexconn remote server
      // Note: BaseChannel.createMessagesQuery(...).loadNextPage() resolves RCResult<PageData<Message>> where data is { data: Message[] }.
      const historyQuery = BaseChannel.createMessagesQuery({
        channelIdentifier: groupChannel.identifier,
        startTime: 0,
        pageSize: 20,
        isAscending: false,
      });
      const historyRes = await historyQuery.loadNextPage();
      const rawHistoryData = historyRes.data as
        | Message<any>[]
        | { data?: Message<any>[] }
        | undefined;
      const rawHistoryList = Array.isArray(rawHistoryData)
        ? rawHistoryData
        : Array.isArray(rawHistoryData?.data)
        ? rawHistoryData.data
        : [];
      const historyMessages =
        historyRes.isOk && historyRes.code === 0
          ? [...rawHistoryList].sort((a, b) => (a.sentTime || 0) - (b.sentTime || 0))
          : [];

      this.updateState('connected', connectedId, null);
      return {
        userId: connectedId,
        channelId: this.activeChannelId,
        history: historyMessages,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Nexconn.';
      this.updateState('error', null, msg);
      throw new Error(msg);
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    try {
      if (this.initialized) {
        await NCEngine.disconnect();
      }
    } finally {
      this.updateState('disconnected', null, null);
    }
  }

  async connectChannel(channelId: string): Promise<{ connected: boolean; channelId: string }> {
    const safeId = sanitizeSquadChannelId(channelId);
    const channel = new GroupChannel(safeId);
    const res = await channel.join();
    this.activeChannelId = safeId;
    return { connected: res.isOk && res.code === 0, channelId: safeId };
  }

  private assertReadyToSend(expectedSenderId: string, channelId?: string): string {
    if (!this.initialized) {
      throw new Error('Nexconn SDK is not initialized. Click "Connect to Nexconn" first.');
    }

    const sdkStatus = NCEngine.getConnectionStatus();
    if (sdkStatus !== ConnectionStatus.CONNECTED) {
      const mappedState: NexconnConnectionState =
        sdkStatus === ConnectionStatus.CONNECTING
          ? 'connecting'
          : sdkStatus === ConnectionStatus.SUSPENDED
          ? 'suspended'
          : 'disconnected';
      const detail =
        sdkStatus === ConnectionStatus.SUSPENDED
          ? 'Nexconn WebSocket connection is temporarily suspended while reconnecting.'
          : 'Nexconn session is disconnected. Another session may have signed in with the same user ID or the socket closed.';
      this.updateState(mappedState, mappedState === 'disconnected' ? null : this.connectedUserId, detail);
      throw new Error(detail);
    }

    const sdkUserId = NCEngine.getCurrentUserId();
    if (sdkUserId && sdkUserId !== expectedSenderId) {
      throw new Error(
        `Active Nexconn session is "${sdkUserId}" instead of "${expectedSenderId}". Reconnect with your selected identity.`
      );
    }

    return sanitizeSquadChannelId(channelId || this.activeChannelId);
  }

  async sendFreeText(
    channelId: string,
    sender: SquadMember,
    text: string
  ): Promise<TransportMessageReceipt> {
    const safeId = this.assertReadyToSend(sender.id, channelId);
    const channel = new GroupChannel(safeId);
    const extra: NexconnExtraPayload = {
      squadshieldKind: 'text',
      senderHandle: sender.handle,
    };
    const params = new SendTextMessageParams({
      text,
      extra: JSON.stringify(extra),
    });

    const result = await channel.sendMessage(params);
    if (!result.isOk || result.code !== 0 || !result.data) {
      throw new Error(
        result.msg
          ? `Nexconn GroupChannel.sendMessage failed (code ${result.code}): ${result.msg}`
          : `Nexconn GroupChannel.sendMessage failed with code ${result.code}.`
      );
    }

    const sentTime = result.data.sentTime || Date.now();
    return {
      id: `nc_${result.data.messageId || sentTime}`,
      nexconnMessageId: result.data.messageId,
      origin: 'nexconn',
      timestamp: formatClockTime(new Date(sentTime)),
      createdAt: sentTime,
    };
  }

  async sendTacticalCallout(
    channelId: string,
    sender: SquadMember,
    callout: TacticalCalloutOption
  ): Promise<TransportMessageReceipt> {
    const safeId = this.assertReadyToSend(sender.id, channelId);
    const channel = new GroupChannel(safeId);
    const extra: NexconnExtraPayload = {
      squadshieldKind: 'tactical',
      tacticalId: callout.id,
      senderHandle: sender.handle,
    };
    const params = new SendTextMessageParams({
      text: callout.label,
      extra: JSON.stringify(extra),
    });

    const result = await channel.sendMessage(params);
    if (!result.isOk || result.code !== 0 || !result.data) {
      throw new Error(
        result.msg
          ? `Nexconn tactical sendMessage failed (code ${result.code}): ${result.msg}`
          : `Nexconn tactical sendMessage failed with code ${result.code}.`
      );
    }

    const sentTime = result.data.sentTime || Date.now();
    return {
      id: `nc_${result.data.messageId || sentTime}`,
      nexconnMessageId: result.data.messageId,
      origin: 'nexconn',
      timestamp: formatClockTime(new Date(sentTime)),
      createdAt: sentTime,
    };
  }

  isGroupChannelMessage(msg: Message<any>): boolean {
    return (
      msg.channelIdentifier?.channelType === ChannelType.GROUP &&
      msg.channelIdentifier?.channelId === this.activeChannelId
    );
  }
}

export const nexconnAdapter = new NexconnChatAdapter();
