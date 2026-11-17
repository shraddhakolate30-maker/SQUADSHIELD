export type AppScreen =
  | 'landing'
  | 'dashboard'
  | 'chat'
  | 'moderation'
  | 'moderator'
  | 'safety';

export type PlayerPresence = 'Online' | 'In Match' | 'Do Not Disturb';

export type SafetyStatus = 'Nominal' | 'Under Review' | 'Free-Text Restricted';

export type TacticalCalloutId =
  | 'enemy-spotted'
  | 'need-backup'
  | 'move-to-b'
  | 'regroup'
  | 'defend-position'
  | 'healing-needed';

export interface TacticalCalloutOption {
  id: TacticalCalloutId;
  label: string;
  shortCode: string;
  category: 'Alert' | 'Support' | 'Movement' | 'Defense';
  description: string;
}

export interface SquadMember {
  id: string;
  handle: string;
  tag: string;
  role: 'Squad Captain' | 'Entry Fragger' | 'Controller' | 'Support';
  avatarUrl: string;
  presence: PlayerPresence;
  safetyStatus: SafetyStatus;
  isCurrentUser?: boolean;
  isMuted: boolean;
  isBlocked: boolean;
  restrictionEndsAt?: number | null;
  restrictionReason?: string | null;
}

export type MessageKind = 'text' | 'tactical' | 'system';

export type MessageOrigin = 'demo' | 'nexconn';

export type ModerationFlagStatus = 'clean' | 'flagged' | 'approved' | 'dismissed';

export type NexconnConnectionState =
  | 'unconfigured'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'suspended'
  | 'error';

export interface NexconnServerStatus {
  configured: boolean;
  hasFrontendAppKey: boolean;
  hasBackendAppKey: boolean;
  hasBackendAppSecret: boolean;
  appKey?: string;
  areaCode: string;
  apiBaseUrl: string;
  squadChannelId: string;
  missingVars: string[];
}

export interface ModerationAnalysis {
  flagged: boolean;
  ruleType: 'Abusive Language' | 'Spam Repetition' | 'Message Flooding' | null;
  severity: 'Low' | 'Medium' | 'High' | null;
  reasons: string[];
  matchedTerms: string[];
}

export interface ChatMessage {
  id: string;
  nexconnMessageId?: string;
  origin: MessageOrigin;
  senderId: string;
  senderHandle: string;
  senderAvatar: string;
  kind: MessageKind;
  content: string;
  tacticalId?: TacticalCalloutId;
  timestamp: string;
  createdAt: number;
  flagStatus: ModerationFlagStatus;
  analysis?: ModerationAnalysis;
}

export interface ModerationConfig {
  blockedWords: string[];
  detectRepeatedSpam: boolean;
  detectFlooding: boolean;
  floodThresholdCount: number;
  floodWindowSeconds: number;
}

export interface FlaggedMessageRecord {
  id: string;
  messageId: string;
  senderId: string;
  senderHandle: string;
  content: string;
  timestamp: string;
  createdAt: number;
  ruleType: 'Abusive Language' | 'Spam Repetition' | 'Message Flooding';
  severity: 'Low' | 'Medium' | 'High';
  reasons: string[];
  matchedTerms: string[];
  status: 'Pending Review' | 'Approved' | 'Dismissed' | 'Restricted';
}

export interface ModerationHistoryEntry {
  id: string;
  targetPlayerId: string;
  targetHandle: string;
  action: 'Approved Message' | 'Dismissed Message' | 'Temporary Free-Text Restriction' | 'Restriction Lifted' | 'Report Logged' | 'Appeal Reviewed';
  details: string;
  moderatorHandle: string;
  timestamp: string;
  createdAt: number;
  durationMinutes?: number;
}

export interface PlayerReport {
  id: string;
  targetPlayerId: string;
  targetHandle: string;
  category: 'Harassment' | 'Hate Speech' | 'Spam & Flooding' | 'Griefing';
  notes: string;
  timestamp: string;
  status: 'Queued for Review' | 'Reviewed';
}

export interface ModerationAppeal {
  id: string;
  playerId: string;
  playerHandle: string;
  reason: string;
  contextNote: string;
  timestamp: string;
  status: 'Pending Review' | 'Approved — Restriction Lifted' | 'Upheld';
  reviewerNote?: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  category: 'Chat' | 'Moderation' | 'Tactical' | 'Safety';
}
