import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_ACTIVITY,
  INITIAL_APPEALS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_FLAGGED_QUEUE,
  INITIAL_MODERATION_CONFIG,
  INITIAL_MODERATION_HISTORY,
  INITIAL_REPORTS,
  INITIAL_SQUAD_MEMBERS,
  TACTICAL_CALLOUTS,
} from '../data/demoData';
import { demoChatTransport, formatClockTime } from '../services/chatTransport';
import { evaluateMessageModeration } from '../services/moderationEngine';
import {
  mapNexconnMessageToChatMessage,
  nexconnAdapter,
} from '../services/nexconnAdapter';
import {
  ActivityEvent,
  AppScreen,
  ChatMessage,
  FlaggedMessageRecord,
  ModerationAppeal,
  ModerationConfig,
  ModerationHistoryEntry,
  NexconnConnectionState,
  NexconnServerStatus,
  PlayerPresence,
  PlayerReport,
  SquadMember,
  TacticalCalloutId,
} from '../types/squadshield';

export const ALLOWED_TEST_PLAYER_IDS = [
  'player_kael',
  'player_nyx',
  'player_vex',
  'player_ryder',
] as const;

export type AllowedTestPlayerId = (typeof ALLOWED_TEST_PLAYER_IDS)[number];

const TEST_PLAYER_STORAGE_KEY = 'squadshield.testPlayerIdentity';

function isAllowedTestPlayerId(id: string | null): id is AllowedTestPlayerId {
  return Boolean(id && (ALLOWED_TEST_PLAYER_IDS as readonly string[]).includes(id));
}

function getInitialSelectedPlayerId(): AllowedTestPlayerId {
  if (typeof window === 'undefined') return 'player_kael';
  try {
    const stored = window.sessionStorage.getItem(TEST_PLAYER_STORAGE_KEY);
    if (isAllowedTestPlayerId(stored)) {
      return stored;
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return 'player_kael';
}

interface SquadShieldContextValue {
  activeScreen: AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  members: SquadMember[];
  currentUser: SquadMember;
  messages: ChatMessage[];
  moderationConfig: ModerationConfig;
  flaggedQueue: FlaggedMessageRecord[];
  moderationHistory: ModerationHistoryEntry[];
  reports: PlayerReport[];
  appeals: ModerationAppeal[];
  activityFeed: ActivityEvent[];
  toastMessage: string | null;
  dismissToast: () => void;
  nexconnServerStatus: NexconnServerStatus | null;
  nexconnState: NexconnConnectionState;
  nexconnUserId: string | null;
  nexconnError: string | null;
  nexconnChannelId: string;
  testSwitcherEnabled: boolean;
  selectedTestPlayerId: AllowedTestPlayerId;
  isSwitchingPlayerIdentity: boolean;
  switchTestPlayerIdentity: (playerId: AllowedTestPlayerId) => Promise<void>;
  connectNexconn: () => Promise<void>;
  disconnectNexconn: () => Promise<void>;
  refreshNexconnStatus: () => Promise<void>;
  setPresence: (presence: PlayerPresence) => void;
  sendFreeTextMessage: (text: string) => Promise<{
    sent: boolean;
    flagged: boolean;
    blockedByRestriction: boolean;
    origin?: 'nexconn' | 'demo';
    nexconnMessageId?: string;
    error?: string;
  }>;
  sendTacticalMessage: (calloutId: TacticalCalloutId) => Promise<{
    sent: boolean;
    origin?: 'nexconn' | 'demo';
    nexconnMessageId?: string;
    error?: string;
  }>;
  toggleMuteMember: (memberId: string) => void;
  toggleBlockMember: (memberId: string) => void;
  submitPlayerReport: (
    targetPlayerId: string,
    category: PlayerReport['category'],
    notes: string
  ) => void;
  submitAppeal: (reason: string, contextNote: string) => void;
  reviewFlaggedMessage: (
    flagId: string,
    decision: 'approve' | 'dismiss' | 'restrict',
    durationMinutes?: number
  ) => Promise<void>;
  reviewAppeal: (appealId: string, decision: 'approve' | 'uphold', reviewerNote?: string) => void;
  addBlockedWord: (word: string) => void;
  removeBlockedWord: (word: string) => void;
  toggleSpamRule: (rule: 'detectRepeatedSpam' | 'detectFlooding') => void;
  toggleDemoCurrentUserRestriction: (minutes?: number) => void;
  liftPlayerRestriction: (playerId: string) => void;
  resetDemoState: () => void;
}

const SquadShieldContext = createContext<SquadShieldContextValue | null>(null);

export function SquadShieldProvider({ children }: { children: React.ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('landing');
  const testSwitcherEnabled = true;
  const [selectedTestPlayerId, setSelectedTestPlayerId] = useState<AllowedTestPlayerId>(() =>
    getInitialSelectedPlayerId()
  );
  const [isSwitchingPlayerIdentity, setIsSwitchingPlayerIdentity] = useState(false);
  const [members, setMembers] = useState<SquadMember[]>(() => {
    const initialId = getInitialSelectedPlayerId();
    return INITIAL_SQUAD_MEMBERS.map((m) => ({
      ...m,
      isCurrentUser: m.id === initialId,
    }));
  });
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [moderationConfig, setModerationConfig] = useState<ModerationConfig>(INITIAL_MODERATION_CONFIG);
  const [flaggedQueue, setFlaggedQueue] = useState<FlaggedMessageRecord[]>(INITIAL_FLAGGED_QUEUE);
  const [moderationHistory, setModerationHistory] = useState<ModerationHistoryEntry[]>(
    INITIAL_MODERATION_HISTORY
  );
  const [reports, setReports] = useState<PlayerReport[]>(INITIAL_REPORTS);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>(INITIAL_APPEALS);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>(INITIAL_ACTIVITY);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nexconnServerStatus, setNexconnServerStatus] = useState<NexconnServerStatus | null>(null);
  const [nexconnState, setNexconnState] = useState<NexconnConnectionState>('unconfigured');
  const [nexconnUserId, setNexconnUserId] = useState<string | null>(null);
  const [nexconnError, setNexconnError] = useState<string | null>(null);
  const [nexconnChannelId, setNexconnChannelId] = useState<string>(nexconnAdapter.getChannelId());

  const membersRef = useRef(members);
  membersRef.current = members;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const moderationConfigRef = useRef(moderationConfig);
  moderationConfigRef.current = moderationConfig;
  const nexconnStateRef = useRef(nexconnState);
  nexconnStateRef.current = nexconnState;
  const nexconnChannelIdRef = useRef(nexconnChannelId);
  nexconnChannelIdRef.current = nexconnChannelId;
  const seenNexconnIdsRef = useRef<Set<string>>(new Set());
  const flaggedMessageIdsRef = useRef<Set<string>>(
    new Set(INITIAL_FLAGGED_QUEUE.map((f) => f.messageId))
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const refreshNexconnStatus = async () => {
    try {
      const status = await nexconnAdapter.fetchServerStatus();
      setNexconnServerStatus(status);
      setNexconnChannelId(status.squadChannelId);
      setNexconnState(nexconnAdapter.getConnectionState());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach /api/nexconn/status.';
      setNexconnError(msg);
    }
  };

  useEffect(() => {
    nexconnAdapter.setCallbacks({
      onStateChange: (state, userId, error) => {
        setNexconnState(state);
        setNexconnUserId(userId);
        setNexconnError(error ?? null);
      },
      onIncomingMessages: (incoming) => {
        const groupMsgs = incoming.filter((m) => nexconnAdapter.isGroupChannelMessage(m));
        if (groupMsgs.length === 0) return;

        const currentMembers = membersRef.current;
        const currentConfig = moderationConfigRef.current;
        const existingIds = new Set<string>(seenNexconnIdsRef.current);
        for (const existing of messagesRef.current) {
          if (existing.nexconnMessageId) {
            existingIds.add(existing.nexconnMessageId);
          }
        }

        const nextAdditions: ChatMessage[] = [];
        const newFlags: FlaggedMessageRecord[] = [];
        const evaluationHistory = [...messagesRef.current];

        for (const raw of groupMsgs) {
          const mapped = mapNexconnMessageToChatMessage(raw, currentMembers);
          if (!mapped) continue;
          if (mapped.nexconnMessageId && existingIds.has(mapped.nexconnMessageId)) {
            continue;
          }

          if (mapped.nexconnMessageId) {
            existingIds.add(mapped.nexconnMessageId);
            seenNexconnIdsRef.current.add(mapped.nexconnMessageId);
          }

          if (mapped.kind === 'text') {
            const analysis = evaluateMessageModeration(
              mapped.content,
              mapped.senderId,
              evaluationHistory,
              currentConfig,
              mapped.createdAt
            );
            mapped.analysis = analysis;
            if (
              analysis.flagged &&
              analysis.ruleType &&
              analysis.severity &&
              !flaggedMessageIdsRef.current.has(mapped.id)
            ) {
              mapped.flagStatus = 'flagged';
              flaggedMessageIdsRef.current.add(mapped.id);
              newFlags.push({
                id: `flag_${mapped.createdAt}_${Math.random().toString(36).slice(2, 6)}`,
                messageId: mapped.id,
                senderId: mapped.senderId,
                senderHandle: mapped.senderHandle,
                content: mapped.content,
                timestamp: mapped.timestamp,
                createdAt: mapped.createdAt,
                ruleType: analysis.ruleType,
                severity: analysis.severity,
                reasons: analysis.reasons,
                matchedTerms: analysis.matchedTerms,
                status: 'Pending Review',
              });
            }
          }

          evaluationHistory.push(mapped);
          nextAdditions.push(mapped);
        }

        if (nextAdditions.length > 0) {
          setMessages((prev) => {
            const prevIds = new Set(
              prev.map((p) => p.nexconnMessageId).filter((id): id is string => Boolean(id))
            );
            const filtered = nextAdditions.filter(
              (item) => !item.nexconnMessageId || !prevIds.has(item.nexconnMessageId)
            );
            return filtered.length > 0 ? [...prev, ...filtered] : prev;
          });
        }

        if (newFlags.length > 0) {
          setFlaggedQueue((prev) => {
            const existingFlagMsgIds = new Set(prev.map((f) => f.messageId));
            const dedupedFlags = newFlags.filter((f) => !existingFlagMsgIds.has(f.messageId));
            return dedupedFlags.length > 0 ? [...dedupedFlags, ...prev] : prev;
          });
        }
      },
    });
  }, []);

  useEffect(() => {
    void refreshNexconnStatus();
  }, []);

  // Periodically expire finished temporary restrictions without triggering unnecessary re-renders
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setMembers((prev) => {
        const hasExpired = prev.some(
          (member) =>
            member.safetyStatus === 'Free-Text Restricted' &&
            Boolean(member.restrictionEndsAt) &&
            now >= member.restrictionEndsAt!
        );
        if (!hasExpired) return prev;

        return prev.map((member) => {
          if (
            member.safetyStatus === 'Free-Text Restricted' &&
            member.restrictionEndsAt &&
            now >= member.restrictionEndsAt
          ) {
            return {
              ...member,
              safetyStatus: 'Nominal',
              restrictionEndsAt: null,
              restrictionReason: null,
            };
          }
          return member;
        });
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const currentUser = useMemo(
    () => members.find((m) => m.isCurrentUser) ?? members[0],
    [members]
  );

  const pushActivity = (
    title: string,
    detail: string,
    category: ActivityEvent['category']
  ) => {
    const entry: ActivityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      detail,
      timestamp: formatClockTime(),
      category,
    };
    setActivityFeed((prev) => [entry, ...prev].slice(0, 12));
  };

  const connectNexconnForUser = async (targetUser: SquadMember, allMembers: SquadMember[]) => {
    try {
      setNexconnError(null);
      const result = await nexconnAdapter.connectUser(targetUser, allMembers);
      setNexconnChannelId(result.channelId);

      if (result.history.length > 0) {
        const mappedHistory = result.history
          .map((m) => mapNexconnMessageToChatMessage(m, allMembers))
          .filter((m): m is ChatMessage => Boolean(m));

        for (const item of mappedHistory) {
          if (item.nexconnMessageId) {
            seenNexconnIdsRef.current.add(item.nexconnMessageId);
          }
        }

        setMessages((prev) => {
          const existingIds = new Set(
            prev.map((p) => p.nexconnMessageId).filter((id): id is string => Boolean(id))
          );
          const freshHistory = mappedHistory.filter(
            (m) => !m.nexconnMessageId || !existingIds.has(m.nexconnMessageId)
          );
          return freshHistory.length > 0 ? [...prev, ...freshHistory] : prev;
        });
      }

      pushActivity(
        'Connected to Nexconn Web Chat SDK',
        `Authenticated ${result.userId} in group channel ${result.channelId}.`,
        'Chat'
      );
      showToast(`Connected to Nexconn channel ${result.channelId} as ${result.userId}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Nexconn.';
      setNexconnError(msg);
      showToast(msg);
    }
  };

  const connectNexconn = async () => {
    await connectNexconnForUser(currentUser, membersRef.current);
  };

  const disconnectNexconn = async () => {
    try {
      await nexconnAdapter.disconnect();
      pushActivity('Disconnected from Nexconn', 'Switched back to local demo simulation.', 'Chat');
      showToast('Disconnected from Nexconn.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error disconnecting from Nexconn.';
      showToast(msg);
    }
  };

  const switchTestPlayerIdentity = async (nextPlayerId: AllowedTestPlayerId) => {
    if (!isAllowedTestPlayerId(nextPlayerId)) {
      return;
    }
    if (nextPlayerId === selectedTestPlayerId || isSwitchingPlayerIdentity) {
      return;
    }

    try {
      window.sessionStorage.setItem(TEST_PLAYER_STORAGE_KEY, nextPlayerId);
    } catch {
      // Ignore sessionStorage errors
    }

    setSelectedTestPlayerId(nextPlayerId);
    const updatedMembers = membersRef.current.map((m) => ({
      ...m,
      isCurrentUser: m.id === nextPlayerId,
      isMuted: m.id === nextPlayerId ? false : m.isMuted,
      isBlocked: m.id === nextPlayerId ? false : m.isBlocked,
    }));
    membersRef.current = updatedMembers;
    setMembers(updatedMembers);

    const nextUser = updatedMembers.find((m) => m.id === nextPlayerId) ?? updatedMembers[0];
    const shouldReconnect =
      nexconnStateRef.current === 'connected' ||
      nexconnStateRef.current === 'connecting' ||
      nexconnStateRef.current === 'suspended';

    if (shouldReconnect) {
      setIsSwitchingPlayerIdentity(true);
      try {
        try {
          await nexconnAdapter.disconnect();
        } catch {
          // Proceed to reconnect attempt even if previous socket disconnect errored
        }
        await connectNexconnForUser(nextUser, updatedMembers);
      } finally {
        setIsSwitchingPlayerIdentity(false);
      }
    } else {
      pushActivity(
        'Test player identity switched',
        `Selected ${nextUser.handle} (${nextUser.id}) for this browser session.`,
        'Chat'
      );
      showToast(`Test player identity set to ${nextUser.handle} (${nextUser.id}).`);
    }
  };

  const setPresence = (presence: PlayerPresence) => {
    setMembers((prev) =>
      prev.map((m) => (m.isCurrentUser ? { ...m, presence } : m))
    );
    pushActivity('Player presence updated', `Status changed to ${presence}.`, 'Safety');
    showToast(`Online status set to ${presence}.`);
  };

  const appendMessageDeduped = (prev: ChatMessage[], item: ChatMessage): ChatMessage[] => {
    if (
      prev.some(
        (existing) =>
          existing.id === item.id ||
          (item.nexconnMessageId && existing.nexconnMessageId === item.nexconnMessageId)
      )
    ) {
      return prev;
    }
    return [...prev, item];
  };

  const sendFreeTextMessage = async (
    text: string
  ): Promise<{
    sent: boolean;
    flagged: boolean;
    blockedByRestriction: boolean;
    origin?: 'nexconn' | 'demo';
    nexconnMessageId?: string;
    error?: string;
  }> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { sent: false, flagged: false, blockedByRestriction: false };
    }

    if (currentUser.safetyStatus === 'Free-Text Restricted') {
      const msg = 'Free-text chat is temporarily restricted. Tactical callouts remain active.';
      showToast(msg);
      return { sent: false, flagged: false, blockedByRestriction: true, error: msg };
    }

    const activeChannelId = nexconnChannelIdRef.current;
    const preCheckTime = Date.now();
    const analysis = evaluateMessageModeration(
      trimmed,
      currentUser.id,
      messagesRef.current,
      moderationConfigRef.current,
      preCheckTime
    );

    // If flagged by Smart Moderation, hold locally for Moderator Review instead of dispatching to Nexconn
    if (analysis.flagged && analysis.ruleType && analysis.severity) {
      const heldReceipt = await demoChatTransport.sendFreeText(
        activeChannelId,
        currentUser,
        trimmed
      );
      const heldMessage: ChatMessage = {
        id: heldReceipt.id,
        origin: 'demo',
        senderId: currentUser.id,
        senderHandle: currentUser.handle,
        senderAvatar: currentUser.avatarUrl,
        kind: 'text',
        content: trimmed,
        timestamp: heldReceipt.timestamp,
        createdAt: heldReceipt.createdAt,
        flagStatus: 'flagged',
        analysis,
      };
      flaggedMessageIdsRef.current.add(heldMessage.id);
      setMessages((prev) => appendMessageDeduped(prev, heldMessage));
      const flagRecord: FlaggedMessageRecord = {
        id: `flag_${heldReceipt.createdAt}_${Math.random().toString(36).slice(2, 6)}`,
        messageId: heldMessage.id,
        senderId: currentUser.id,
        senderHandle: currentUser.handle,
        content: trimmed,
        timestamp: heldReceipt.timestamp,
        createdAt: heldReceipt.createdAt,
        ruleType: analysis.ruleType,
        severity: analysis.severity,
        reasons: analysis.reasons,
        matchedTerms: analysis.matchedTerms,
        status: 'Pending Review',
      };
      setFlaggedQueue((prev) => [flagRecord, ...prev]);
      pushActivity(
        'Outgoing message flagged for moderator review',
        `${analysis.ruleType}: ${analysis.reasons[0]}`,
        'Moderation'
      );
      showToast('Message flagged by Smart Moderation and queued for moderator review.');
      return {
        sent: true,
        flagged: true,
        blockedByRestriction: false,
        origin: 'demo',
      };
    }

    // Clean free-text message: send over Nexconn SDK when connected, otherwise Local Demo
    let transportMeta;
    try {
      transportMeta =
        nexconnStateRef.current === 'connected'
          ? await nexconnAdapter.sendFreeText(activeChannelId, currentUser, trimmed)
          : await demoChatTransport.sendFreeText(activeChannelId, currentUser, trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message via Nexconn.';
      showToast(msg);
      return { sent: false, flagged: false, blockedByRestriction: false, error: msg };
    }

    if (transportMeta.nexconnMessageId) {
      seenNexconnIdsRef.current.add(transportMeta.nexconnMessageId);
    }

    const newMessage: ChatMessage = {
      id: transportMeta.id,
      nexconnMessageId: transportMeta.nexconnMessageId,
      origin: transportMeta.origin,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      senderAvatar: currentUser.avatarUrl,
      kind: 'text',
      content: trimmed,
      timestamp: transportMeta.timestamp,
      createdAt: transportMeta.createdAt,
      flagStatus: 'clean',
      analysis,
    };

    setMessages((prev) => appendMessageDeduped(prev, newMessage));

    pushActivity(
      transportMeta.origin === 'nexconn'
        ? 'Nexconn message delivered'
        : 'Demo squad message delivered',
      `"${trimmed.slice(0, 48)}${trimmed.length > 48 ? '…' : ''}"`,
      'Chat'
    );
    return {
      sent: true,
      flagged: false,
      blockedByRestriction: false,
      origin: transportMeta.origin,
      nexconnMessageId: transportMeta.nexconnMessageId,
    };
  };

  const sendTacticalMessage = async (
    calloutId: TacticalCalloutId
  ): Promise<{
    sent: boolean;
    origin?: 'nexconn' | 'demo';
    nexconnMessageId?: string;
    error?: string;
  }> => {
    const callout = TACTICAL_CALLOUTS.find((c) => c.id === calloutId);
    if (!callout) {
      return { sent: false, error: 'Unknown tactical callout.' };
    }

    const activeChannelId = nexconnChannelIdRef.current;
    let transportMeta;
    try {
      transportMeta =
        nexconnStateRef.current === 'connected'
          ? await nexconnAdapter.sendTacticalCallout(activeChannelId, currentUser, callout)
          : await demoChatTransport.sendTacticalCallout(activeChannelId, currentUser, callout);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send tactical callout.';
      showToast(msg);
      return { sent: false, error: msg };
    }

    if (transportMeta.nexconnMessageId) {
      seenNexconnIdsRef.current.add(transportMeta.nexconnMessageId);
    }

    const tacticalMessage: ChatMessage = {
      id: transportMeta.id,
      nexconnMessageId: transportMeta.nexconnMessageId,
      origin: transportMeta.origin,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      senderAvatar: currentUser.avatarUrl,
      kind: 'tactical',
      content: callout.label,
      tacticalId: callout.id,
      timestamp: transportMeta.timestamp,
      createdAt: transportMeta.createdAt,
      flagStatus: 'clean',
    };

    setMessages((prev) => appendMessageDeduped(prev, tacticalMessage));
    pushActivity(
      `Tactical callout: ${callout.label}`,
      transportMeta.origin === 'nexconn'
        ? `Delivered via Nexconn to ${activeChannelId}.`
        : 'Delivered in Local Demo mode.',
      'Tactical'
    );
    return {
      sent: true,
      origin: transportMeta.origin,
      nexconnMessageId: transportMeta.nexconnMessageId,
    };
  };

  const toggleMuteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target || target.isCurrentUser) return;
    const nextMuted = !target.isMuted;

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, isMuted: nextMuted } : m))
    );
    pushActivity(
      nextMuted ? `Muted ${target.handle}` : `Unmuted ${target.handle}`,
      nextMuted
        ? 'Free-text messages hidden in your view; tactical callouts remain visible.'
        : 'All messages from this teammate restored.',
      'Safety'
    );
    showToast(nextMuted ? `${target.handle} muted in Squad Chat.` : `${target.handle} unmuted.`);
  };

  const toggleBlockMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target || target.isCurrentUser) return;
    const nextBlocked = !target.isBlocked;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, isBlocked: nextBlocked, isMuted: nextBlocked ? true : m.isMuted }
          : m
      )
    );
    pushActivity(
      nextBlocked ? `Blocked ${target.handle}` : `Unblocked ${target.handle}`,
      nextBlocked
        ? 'Player blocked from direct free-text interaction.'
        : 'Block removed from player safety list.',
      'Safety'
    );
    showToast(nextBlocked ? `${target.handle} has been blocked.` : `${target.handle} unblocked.`);
  };

  const submitPlayerReport = (
    targetPlayerId: string,
    category: PlayerReport['category'],
    notes: string
  ) => {
    const target = members.find((m) => m.id === targetPlayerId);
    if (!target) return;

    const timestamp = formatClockTime();
    const report: PlayerReport = {
      id: `rep_${Date.now()}`,
      targetPlayerId: target.id,
      targetHandle: target.handle,
      category,
      notes: notes.trim() || 'No additional notes supplied.',
      timestamp,
      status: 'Queued for Review',
    };

    setReports((prev) => [report, ...prev]);
    setModerationHistory((prev) => [
      {
        id: `hist_${Date.now()}`,
        targetPlayerId: target.id,
        targetHandle: target.handle,
        action: 'Report Logged',
        details: `${category}: ${report.notes}`,
        moderatorHandle: 'Safety Intake',
        timestamp,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    pushActivity(
      `Safety report submitted for ${target.handle}`,
      `Category: ${category}`,
      'Safety'
    );
    showToast(`Report submitted for ${target.handle} and logged for moderator review.`);
  };

  const submitAppeal = (reason: string, contextNote: string) => {
    const timestamp = formatClockTime();
    const appeal: ModerationAppeal = {
      id: `app_${Date.now()}`,
      playerId: currentUser.id,
      playerHandle: currentUser.handle,
      reason: reason.trim(),
      contextNote: contextNote.trim(),
      timestamp,
      status: 'Pending Review',
    };

    setAppeals((prev) => [appeal, ...prev]);
    pushActivity(
      'Moderation appeal submitted',
      `Reason: ${appeal.reason}`,
      'Safety'
    );
    showToast('Appeal submitted to the Moderator Queue.');
  };

  const reviewFlaggedMessage = async (
    flagId: string,
    decision: 'approve' | 'dismiss' | 'restrict',
    durationMinutes = 10
  ) => {
    const targetFlag = flaggedQueue.find((f) => f.id === flagId);
    if (!targetFlag) return;

    const now = Date.now();
    const timestamp = formatClockTime(new Date(now));

    const nextFlagStatus: FlaggedMessageRecord['status'] =
      decision === 'approve'
        ? 'Approved'
        : decision === 'dismiss'
        ? 'Dismissed'
        : 'Restricted';

    let approvedNexconnReceipt: { nexconnMessageId?: string; timestamp: string } | null = null;
    let dispatchError: string | null = null;

    if (decision === 'approve') {
      const targetMessage = messagesRef.current.find((m) => m.id === targetFlag.messageId);
      const isHeldOutgoingFromCurrentUser =
        Boolean(targetMessage) &&
        targetMessage!.senderId === currentUser.id &&
        targetMessage!.origin === 'demo' &&
        !targetMessage!.nexconnMessageId &&
        !targetMessage!.id.startsWith('msg_init_') &&
        !targetMessage!.id.startsWith('msg_hist_');

      if (isHeldOutgoingFromCurrentUser && nexconnStateRef.current === 'connected') {
        try {
          const receipt = await nexconnAdapter.sendFreeText(
            nexconnChannelIdRef.current,
            currentUser,
            targetMessage!.content
          );
          if (receipt.nexconnMessageId) {
            seenNexconnIdsRef.current.add(receipt.nexconnMessageId);
          }
          approvedNexconnReceipt = {
            nexconnMessageId: receipt.nexconnMessageId,
            timestamp: receipt.timestamp,
          };
        } catch (err) {
          dispatchError =
            err instanceof Error
              ? err.message
              : 'Failed to dispatch approved message through Nexconn.';
        }
      }
    }

    setFlaggedQueue((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: nextFlagStatus } : f))
    );

    // Update message state in Squad Chat (including live Nexconn delivery metadata when dispatched)
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== targetFlag.messageId) return m;
        if (decision === 'approve') {
          return approvedNexconnReceipt
            ? {
                ...m,
                origin: 'nexconn',
                nexconnMessageId: approvedNexconnReceipt.nexconnMessageId,
                timestamp: approvedNexconnReceipt.timestamp,
                flagStatus: 'approved',
              }
            : { ...m, flagStatus: 'approved' };
        }
        return { ...m, flagStatus: 'dismissed' };
      })
    );

    if (decision === 'restrict') {
      const restrictionEndsAt = now + durationMinutes * 60_000;
      setMembers((prev) =>
        prev.map((m) =>
          m.id === targetFlag.senderId
            ? {
                ...m,
                safetyStatus: 'Free-Text Restricted',
                restrictionEndsAt,
                restrictionReason: `${targetFlag.ruleType}: ${targetFlag.reasons[0]}`,
              }
            : m
        )
      );
    } else if (decision === 'approve') {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === targetFlag.senderId && m.safetyStatus === 'Under Review'
            ? { ...m, safetyStatus: 'Nominal' }
            : m
        )
      );
    }

    const historyAction: ModerationHistoryEntry['action'] =
      decision === 'approve'
        ? 'Approved Message'
        : decision === 'dismiss'
        ? 'Dismissed Message'
        : 'Temporary Free-Text Restriction';

    const historyDetail =
      decision === 'approve'
        ? approvedNexconnReceipt
          ? `Cleared "${targetFlag.content}" and dispatched to Nexconn #${nexconnChannelIdRef.current}.`
          : dispatchError
          ? `Cleared "${targetFlag.content}" locally; Nexconn send failed (${dispatchError}).`
          : `Cleared "${targetFlag.content}" locally after manual context review.`
        : decision === 'dismiss'
        ? `Archived flagged message "${targetFlag.content}" without restriction.`
        : `Applied ${durationMinutes}-minute free-text restriction (${targetFlag.ruleType}). Tactical callouts preserved.`;

    setModerationHistory((prev) => [
      {
        id: `hist_${now}`,
        targetPlayerId: targetFlag.senderId,
        targetHandle: targetFlag.senderHandle,
        action: historyAction,
        details: historyDetail,
        moderatorHandle: 'Mod_Lead (Demo)',
        timestamp,
        createdAt: now,
        durationMinutes: decision === 'restrict' ? durationMinutes : undefined,
      },
      ...prev,
    ]);

    pushActivity(
      `${historyAction} (${targetFlag.senderHandle})`,
      historyDetail,
      'Moderation'
    );
    showToast(
      decision === 'restrict'
        ? `${targetFlag.senderHandle} temporarily restricted (${durationMinutes}m). Tactical callouts remain active.`
        : approvedNexconnReceipt
        ? `Flagged message approved and sent via Nexconn #${nexconnChannelIdRef.current}.`
        : dispatchError
        ? `Message approved locally, but Nexconn delivery failed: ${dispatchError}`
        : `Flagged message ${decision === 'approve' ? 'approved (local demo)' : 'dismissed'}.`
    );
  };

  const reviewAppeal = (
    appealId: string,
    decision: 'approve' | 'uphold',
    reviewerNote?: string
  ) => {
    const appeal = appeals.find((a) => a.id === appealId);
    if (!appeal) return;

    const now = Date.now();
    const timestamp = formatClockTime(new Date(now));

    setAppeals((prev) =>
      prev.map((a) =>
        a.id === appealId
          ? {
              ...a,
              status:
                decision === 'approve' ? 'Approved — Restriction Lifted' : 'Upheld',
              reviewerNote:
                reviewerNote?.trim() ||
                (decision === 'approve'
                  ? 'Restriction lifted early following appeal review.'
                  : 'Temporary cooldown remains active; tactical callouts are unaffected.'),
            }
          : a
      )
    );

    if (decision === 'approve') {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === appeal.playerId
            ? {
                ...m,
                safetyStatus: 'Nominal',
                restrictionEndsAt: null,
                restrictionReason: null,
              }
            : m
        )
      );
    }

    setModerationHistory((prev) => [
      {
        id: `hist_${now}`,
        targetPlayerId: appeal.playerId,
        targetHandle: appeal.playerHandle,
        action: 'Appeal Reviewed',
        details:
          decision === 'approve'
            ? `Appeal approved for ${appeal.playerHandle}; free-text access restored.`
            : `Appeal upheld for ${appeal.playerHandle}; temporary cooldown maintained.`,
        moderatorHandle: 'Mod_Lead (Demo)',
        timestamp,
        createdAt: now,
      },
      ...prev,
    ]);

    showToast(
      decision === 'approve'
        ? `Appeal approved. Free-text restored for ${appeal.playerHandle}.`
        : `Appeal upheld for ${appeal.playerHandle}.`
    );
  };

  const addBlockedWord = (word: string) => {
    const clean = word.trim().toLowerCase();
    if (!clean) return;
    if (moderationConfig.blockedWords.includes(clean)) {
      showToast(`"${clean}" is already in the configured filter list.`);
      return;
    }
    setModerationConfig((prev) => ({
      ...prev,
      blockedWords: [clean, ...prev.blockedWords],
    }));
    showToast(`Added "${clean}" to Smart Moderation rules.`);
  };

  const removeBlockedWord = (word: string) => {
    setModerationConfig((prev) => ({
      ...prev,
      blockedWords: prev.blockedWords.filter((w) => w !== word),
    }));
    showToast(`Removed "${word}" from filter list.`);
  };

  const toggleSpamRule = (rule: 'detectRepeatedSpam' | 'detectFlooding') => {
    setModerationConfig((prev) => ({
      ...prev,
      [rule]: !prev[rule],
    }));
  };

  const toggleDemoCurrentUserRestriction = (minutes = 10) => {
    const isRestricted = currentUser.safetyStatus === 'Free-Text Restricted';
    const now = Date.now();
    const timestamp = formatClockTime(new Date(now));

    if (isRestricted) {
      setMembers((prev) =>
        prev.map((m) =>
          m.isCurrentUser
            ? {
                ...m,
                safetyStatus: 'Nominal',
                restrictionEndsAt: null,
                restrictionReason: null,
              }
            : m
        )
      );
      setModerationHistory((prev) => [
        {
          id: `hist_${now}`,
          targetPlayerId: currentUser.id,
          targetHandle: currentUser.handle,
          action: 'Restriction Lifted',
          details: 'Demo restriction cleared; full squad chat restored.',
          moderatorHandle: 'Demo Switch',
          timestamp,
          createdAt: now,
        },
        ...prev,
      ]);
      showToast('Free-text restriction lifted. Full chat restored.');
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.isCurrentUser
            ? {
                ...m,
                safetyStatus: 'Free-Text Restricted',
                restrictionEndsAt: now + minutes * 60_000,
                restrictionReason:
                  'Demo Temporary Restriction: Repeated toxic phrasing detected. Free-text paused while Tactical Callouts stay active.',
              }
            : m
        )
      );
      setModerationHistory((prev) => [
        {
          id: `hist_${now}`,
          targetPlayerId: currentUser.id,
          targetHandle: currentUser.handle,
          action: 'Temporary Free-Text Restriction',
          details: `${minutes}-minute free-text restriction activated (Tactical Communication preserved).`,
          moderatorHandle: 'Demo Switch',
          timestamp,
          createdAt: now,
          durationMinutes: minutes,
        },
        ...prev,
      ]);
      pushActivity(
        'Free-text chat temporarily restricted',
        `Tactical quick-messages remain 100% operational for ${minutes}m.`,
        'Moderation'
      );
      showToast(
        `Temporary free-text restriction active (${minutes}m). Tactical callouts remain enabled.`
      );
    }
  };

  const liftPlayerRestriction = (playerId: string) => {
    const target = members.find((m) => m.id === playerId);
    if (!target) return;
    const now = Date.now();
    setMembers((prev) =>
      prev.map((m) =>
        m.id === playerId
          ? {
              ...m,
              safetyStatus: 'Nominal',
              restrictionEndsAt: null,
              restrictionReason: null,
            }
          : m
      )
    );
    setModerationHistory((prev) => [
      {
        id: `hist_${now}`,
        targetPlayerId: target.id,
        targetHandle: target.handle,
        action: 'Restriction Lifted',
        details: 'Moderator lifted temporary free-text restriction.',
        moderatorHandle: 'Mod_Lead (Demo)',
        timestamp: formatClockTime(new Date(now)),
        createdAt: now,
      },
      ...prev,
    ]);
    showToast(`Restriction lifted for ${target.handle}.`);
  };

  const resetDemoState = () => {
    seenNexconnIdsRef.current.clear();
    flaggedMessageIdsRef.current = new Set(INITIAL_FLAGGED_QUEUE.map((f) => f.messageId));
    const resetMembers = INITIAL_SQUAD_MEMBERS.map((m) => ({
      ...m,
      isCurrentUser: m.id === selectedTestPlayerId,
    }));
    membersRef.current = resetMembers;
    setMembers(resetMembers);
    setMessages(INITIAL_CHAT_MESSAGES);
    setModerationConfig(INITIAL_MODERATION_CONFIG);
    setFlaggedQueue(INITIAL_FLAGGED_QUEUE);
    setModerationHistory(INITIAL_MODERATION_HISTORY);
    setReports(INITIAL_REPORTS);
    setAppeals(INITIAL_APPEALS);
    setActivityFeed(INITIAL_ACTIVITY);
    showToast('Demo state reset to initial match scenario.');
  };

  return (
    <SquadShieldContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        members,
        currentUser,
        messages,
        moderationConfig,
        flaggedQueue,
        moderationHistory,
        reports,
        appeals,
        activityFeed,
        toastMessage,
        dismissToast: () => setToastMessage(null),
        nexconnServerStatus,
        nexconnState,
        nexconnUserId,
        nexconnError,
        nexconnChannelId,
        testSwitcherEnabled,
        selectedTestPlayerId,
        isSwitchingPlayerIdentity,
        switchTestPlayerIdentity,
        connectNexconn,
        disconnectNexconn,
        refreshNexconnStatus,
        setPresence,
        sendFreeTextMessage,
        sendTacticalMessage,
        toggleMuteMember,
        toggleBlockMember,
        submitPlayerReport,
        submitAppeal,
        reviewFlaggedMessage,
        reviewAppeal,
        addBlockedWord,
        removeBlockedWord,
        toggleSpamRule,
        toggleDemoCurrentUserRestriction,
        liftPlayerRestriction,
        resetDemoState,
      }}
    >
      {children}
    </SquadShieldContext.Provider>
  );
}

export function useSquadShield() {
  const ctx = useContext(SquadShieldContext);
  if (!ctx) {
    throw new Error('useSquadShield must be used inside SquadShieldProvider');
  }
  return ctx;
}
