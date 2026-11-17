import {
  ChatMessage,
  MessageOrigin,
  SquadMember,
  TacticalCalloutOption,
} from '../types/squadshield';

/**
 * Modular Chat Transport interface implemented by both DemoChatTransport
 * and the official Nexconn Web Chat SDK adapter (NexconnChatAdapter).
 */
export interface TransportMessageReceipt {
  id: string;
  nexconnMessageId?: string;
  origin: MessageOrigin;
  timestamp: string;
  createdAt: number;
}

export interface ChatTransportAdapter {
  readonly mode: MessageOrigin;
  readonly providerLabel: string;
  connectChannel(channelId: string): Promise<{ connected: boolean; channelId: string }>;
  sendFreeText(
    channelId: string,
    sender: SquadMember,
    text: string
  ): Promise<TransportMessageReceipt>;
  sendTacticalCallout(
    channelId: string,
    sender: SquadMember,
    callout: TacticalCalloutOption
  ): Promise<TransportMessageReceipt>;
}

export function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export class DemoChatTransport implements ChatTransportAdapter {
  readonly mode = 'demo' as const;
  readonly providerLabel = 'Local Demo Simulation';

  async connectChannel(channelId: string): Promise<{ connected: boolean; channelId: string }> {
    return {
      connected: true,
      channelId,
    };
  }

  async sendFreeText(
    _channelId: string,
    _sender: SquadMember,
    _text: string
  ): Promise<TransportMessageReceipt> {
    const now = Date.now();
    return {
      id: `demo_msg_${now}_${Math.random().toString(36).slice(2, 7)}`,
      origin: 'demo',
      timestamp: formatClockTime(new Date(now)),
      createdAt: now,
    };
  }

  async sendTacticalCallout(
    _channelId: string,
    _sender: SquadMember,
    _callout: TacticalCalloutOption
  ): Promise<TransportMessageReceipt> {
    const now = Date.now();
    return {
      id: `demo_tac_${now}_${Math.random().toString(36).slice(2, 7)}`,
      origin: 'demo',
      timestamp: formatClockTime(new Date(now)),
      createdAt: now,
    };
  }
}

export const demoChatTransport = new DemoChatTransport();
