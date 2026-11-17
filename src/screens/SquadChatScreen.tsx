import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  Lock,
  PlugZap,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Unplug,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarWithFallback } from '../components/AvatarWithFallback';
import { TacticalIcon } from '../components/TacticalIcon';
import {
  ALLOWED_TEST_PLAYER_IDS,
  AllowedTestPlayerId,
  useSquadShield,
} from '../context/SquadShieldContext';
import { TACTICAL_CALLOUTS } from '../data/demoData';

function formatCountdown(endsAt: number | null | undefined, now: number): string {
  if (!endsAt) return '00:00';
  const diffSec = Math.max(0, Math.floor((endsAt - now) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function SquadChatScreen() {
  const {
    members,
    currentUser,
    messages,
    nexconnServerStatus,
    nexconnState,
    nexconnUserId,
    nexconnError,
    nexconnChannelId,
    selectedTestPlayerId,
    isSwitchingPlayerIdentity,
    switchTestPlayerIdentity,
    connectNexconn,
    disconnectNexconn,
    sendFreeTextMessage,
    sendTacticalMessage,
    toggleMuteMember,
    toggleDemoCurrentUserRestriction,
    setActiveScreen,
  } = useSquadShield();

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    status: 'success' | 'error';
    detail: string;
  } | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Record<string, boolean>>({});
  const [showNexconnSetup, setShowNexconnSetup] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    setSendFeedback(null);
  }, [selectedTestPlayerId]);

  const isRestricted = currentUser.safetyStatus === 'Free-Text Restricted';
  const isNexconnConfigured = Boolean(nexconnServerStatus?.configured);
  const isNexconnConnected = nexconnState === 'connected';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isRestricted || isSending || isSwitchingPlayerIdentity) return;
    setIsSending(true);
    setSendFeedback(null);
    try {
      const result = await sendFreeTextMessage(draft);
      if (result.sent) {
        setDraft('');
        setSendFeedback({
          status: 'success',
          detail: result.flagged
            ? 'Message flagged by Smart Moderation and queued locally for Moderator Review.'
            : result.origin === 'nexconn'
            ? `Delivered via Nexconn #${nexconnChannelId}${
                result.nexconnMessageId ? ` (ID: ${result.nexconnMessageId})` : ''
              }`
            : 'Delivered in Local Demo mode (Nexconn not connected).',
        });
      } else {
        setSendFeedback({
          status: 'error',
          detail: result.error || 'Failed to deliver message.',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleTacticalClick = async (calloutId: (typeof TACTICAL_CALLOUTS)[number]['id']) => {
    if (isSending || isSwitchingPlayerIdentity) return;
    setIsSending(true);
    setSendFeedback(null);
    try {
      const result = await sendTacticalMessage(calloutId);
      if (result.sent) {
        setSendFeedback({
          status: 'success',
          detail:
            result.origin === 'nexconn'
              ? `Tactical callout delivered via Nexconn #${nexconnChannelId}${
                  result.nexconnMessageId ? ` (ID: ${result.nexconnMessageId})` : ''
                }`
              : 'Tactical callout delivered in Local Demo mode (Nexconn not connected).',
        });
      } else {
        setSendFeedback({
          status: 'error',
          detail: result.error || 'Failed to deliver tactical callout.',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const toggleFlagDetails = (msgId: string) => {
    setExpandedFlags((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E2332]">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            Squad Chat · Vanguard Echo
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            {isNexconnConnected
              ? `Live Nexconn Group Channel (${nexconnChannelId}) · Authenticated as ${nexconnUserId} · Moderation & cooldowns run locally in browser demo state`
              : isNexconnConfigured
              ? `Nexconn SDK ready (${nexconnChannelId}) · Connect for live Nexconn messaging or test Local Demo mode`
              : 'Local Demo Mode active · Configure Nexconn App Key & Secret to verify live SDK delivery'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isNexconnConfigured ? (
            isNexconnConnected ? (
              <button
                type="button"
                disabled={isSwitchingPlayerIdentity}
                onClick={() => void disconnectNexconn()}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#181E2E] hover:bg-[#21293E] disabled:opacity-50 text-[#E2E8F0] border border-[#2A334B] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Unplug className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Disconnect Nexconn</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={nexconnState === 'connecting' || isSwitchingPlayerIdentity}
                onClick={() => void connectNexconn()}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <PlugZap className="w-3.5 h-3.5" />
                <span>
                  {isSwitchingPlayerIdentity
                    ? 'Switching Identity…'
                    : nexconnState === 'connecting'
                    ? 'Connecting Nexconn…'
                    : 'Connect to Nexconn'}
                </span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowNexconnSetup((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#181C2B] hover:bg-[#21273C] text-[#CBD5E1] border border-[#2B334D] transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <PlugZap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Nexconn Setup Required</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleDemoCurrentUserRestriction(10)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              isRestricted
                ? 'bg-[#16A34A]/15 text-[#4ADE80] border border-[#16A34A]/35 hover:bg-[#16A34A]/25'
                : 'bg-[#7C3AED]/15 text-[#C4B5FD] border border-[#7C3AED]/35 hover:bg-[#7C3AED]/25'
            }`}
          >
            {isRestricted ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Restore Free-Text (Demo)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Simulate Temp Restriction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Honest Nexconn Configuration / Connection Diagnostics Drawer */}
      {(showNexconnSetup || nexconnError) && (
        <div className="p-4 rounded-xl bg-[#141824] border border-[#283047] flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-white">
              Nexconn Web Chat SDK Configuration Status
            </span>
            {!nexconnError && (
              <button
                type="button"
                onClick={() => setShowNexconnSetup(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                Hide
              </button>
            )}
          </div>

          {nexconnError && (
            <div className="text-[#FCA5A5]">Connection error: {nexconnError}</div>
          )}

          {!isNexconnConfigured && (
            <div className="text-[#94A3B8] leading-relaxed">
              The <code className="text-[#CBD5E1]">@nexconn/chat</code> SDK adapter and backend token
              route (<code className="text-[#CBD5E1]">POST /api/nexconn/token</code>) are installed
              and wired, but live Nexconn credentials are missing. Add these environment variables
              and restart the server to verify live Nexconn connection and messaging:
              <div className="mt-2 font-mono text-[11px] text-[#E2E8F0] bg-[#0D1018] border border-[#22283A] rounded-lg p-3">
                Missing: {nexconnServerStatus?.missingVars?.join(', ') || 'VITE_NEXCONN_APP_KEY, NEXCONN_APP_KEY, NEXCONN_APP_SECRET'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Temporary Testing-Only Test Player Identity Selector */}
      <div className="px-4 py-3 rounded-xl bg-[#131826] border border-[#27314A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="test-player-identity-select" className="font-semibold text-white">
            Test Player Identity
          </label>
          <select
            id="test-player-identity-select"
            value={selectedTestPlayerId}
            disabled={isSwitchingPlayerIdentity || nexconnState === 'connecting'}
            onChange={(e) =>
              void switchTestPlayerIdentity(e.target.value as AllowedTestPlayerId)
            }
            className="px-3 py-1.5 rounded-lg bg-[#0D1018] border border-[#2A3550] text-xs font-mono text-white focus:outline-none focus:border-[#3B82F6] disabled:opacity-50"
          >
            {ALLOWED_TEST_PLAYER_IDS.map((playerId) => {
              const match = members.find((m) => m.id === playerId);
              return (
                <option key={playerId} value={playerId}>
                  {match ? `${match.handle} (${playerId})` : playerId}
                </option>
              );
            })}
          </select>
        </div>
        <span className="text-[#94A3B8]">
          {isSwitchingPlayerIdentity
            ? 'Disconnecting current session and reconnecting…'
            : 'Testing-only · Stored in sessionStorage for multi-session Nexconn chat'}
        </span>
      </div>

      {/* Main Chat + Squad Roster Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Chat Column */}
        <section className="xl:col-span-8 rounded-2xl bg-[#111520] border border-[#22283A] flex flex-col overflow-hidden min-h-[640px] max-h-[780px]">
          {/* Channel Status Strip */}
          <div className="px-5 py-3.5 bg-[#151A27] border-b border-[#22283A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Radio
                className={`w-4 h-4 ${isNexconnConnected ? 'text-[#22C55E]' : 'text-[#3B82F6]'}`}
              />
              <span className="font-medium text-white">Channel #{nexconnChannelId}</span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span className="text-[#94A3B8]">
                {isNexconnConnected
                  ? 'Nexconn Live · Local Demo Moderation'
                  : 'Local Demo Stream'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {isRestricted ? (
                <span className="text-[#F59E0B] font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Free-Text Restricted · Tactical Only</span>
                </span>
              ) : (
                <span className="text-[#4ADE80] font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Full Comms Active</span>
                </span>
              )}
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {messages.map((msg) => {
              const senderMember = members.find((m) => m.id === msg.senderId);
              const isMutedOrBlocked =
                senderMember && !senderMember.isCurrentUser && (senderMember.isMuted || senderMember.isBlocked);
              const isRealNexconn = msg.origin === 'nexconn';

              // Tactical messages ALWAYS bypass mute for gameplay continuity
              if (msg.kind === 'tactical' && msg.tacticalId) {
                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl bg-[#161E31] border border-[#3B82F6]/35 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA] shrink-0">
                        <TacticalIcon id={msg.tacticalId} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#93C5FD]">
                          <span className="font-semibold text-white">{msg.senderHandle}</span>
                          <span aria-hidden="true">·</span>
                          <span>Tactical Callout</span>
                          <span aria-hidden="true">·</span>
                          <span className={isRealNexconn ? 'text-[#4ADE80]' : 'text-[#94A3B8]'}>
                            {isRealNexconn ? 'Nexconn Live' : 'Local Demo'}
                          </span>
                        </div>
                        <div className="font-display font-semibold text-sm text-white mt-0.5">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-[#94A3B8] tabular-nums shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              }

              if (isMutedOrBlocked) {
                return (
                  <div
                    key={msg.id}
                    className="px-4 py-2.5 rounded-xl bg-[#131722] border border-[#1E2434] flex items-center justify-between gap-3 text-xs text-[#64748B]"
                  >
                    <span className="flex items-center gap-2">
                      {senderMember.isBlocked ? (
                        <Ban className="w-3.5 h-3.5 text-[#EF4444]" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-[#94A3B8]" />
                      )}
                      <span>
                        Free-text message from {msg.senderHandle} hidden (
                        {senderMember.isBlocked ? 'Blocked' : 'Muted'} by you)
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>
                  </div>
                );
              }

              const isFlagged = msg.flagStatus === 'flagged';
              const isDismissed = msg.flagStatus === 'dismissed';
              const isExpanded = Boolean(expandedFlags[msg.id]);

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isFlagged
                      ? 'bg-[#1A1624] border-[#7C3AED]/45'
                      : isDismissed
                      ? 'bg-[#141720] border-[#232838] opacity-65'
                      : 'bg-[#151A26] border-[#212738]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AvatarWithFallback
                      src={msg.senderAvatar}
                      alt={msg.senderHandle}
                      name={msg.senderHandle}
                      sizeClass="w-9 h-9"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-white truncate">
                            {msg.senderHandle}
                          </span>
                          <span
                            className={`text-xs ${
                              isRealNexconn ? 'text-[#60A5FA]' : 'text-[#64748B]'
                            }`}
                            title={
                              msg.nexconnMessageId
                                ? `Nexconn Message ID: ${msg.nexconnMessageId}`
                                : 'Local demo simulation message'
                            }
                          >
                            · {isRealNexconn ? 'Nexconn Live' : 'Local Demo'}
                          </span>
                          {msg.flagStatus === 'approved' && (
                            <span className="text-xs text-[#4ADE80]">· Cleared by Moderator</span>
                          )}
                          {isFlagged && (
                            <span className="text-xs text-[#C4B5FD] flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                              <span>Flagged for Moderator Review</span>
                            </span>
                          )}
                          {isDismissed && (
                            <span className="text-xs text-[#94A3B8]">· Archived by Moderator</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[#64748B] tabular-nums shrink-0">
                          {msg.timestamp}
                        </span>
                      </div>

                      <p className="text-sm text-[#E2E8F0] mt-1.5 leading-relaxed break-words">
                        {isDismissed
                          ? 'This message was dismissed by a moderator during review.'
                          : msg.content}
                      </p>

                      {isFlagged && msg.analysis && (
                        <div className="mt-3 pt-2.5 border-t border-[#2B2540]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFlagDetails(msg.id)}
                              className="text-xs font-medium text-[#C4B5FD] hover:text-white inline-flex items-center gap-1.5 transition-colors"
                            >
                              <span>Why was this flagged?</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveScreen('moderator')}
                              className="text-xs font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                            >
                              Review in Moderator Queue
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2.5 p-3 rounded-lg bg-[#110F1A] border border-[#2F2746] text-xs text-[#CBD5E1] flex flex-col gap-1">
                              <div>
                                <span className="text-[#94A3B8]">Rule triggered:</span>{' '}
                                <strong className="text-white">{msg.analysis.ruleType}</strong>{' '}
                                ({msg.analysis.severity} severity)
                              </div>
                              {msg.analysis.reasons.map((reason, idx) => (
                                <div key={idx} className="text-[#CBD5E1]">
                                  {reason}
                                </div>
                              ))}
                              <div className="text-[#94A3B8] pt-1">
                                Policy: Flagged users are never permanently banned automatically.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollEndRef} />
          </div>

          {/* Tactical Communication Bar — Always Enabled */}
          <div className="px-5 py-3.5 bg-[#141825] border-t border-[#22283A] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
                <span>Tactical Quick-Messages</span>
              </span>
              <span className="text-[#4ADE80] font-medium">
                Always Active {isRestricted ? '(Free-Text Bypassed)' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TACTICAL_CALLOUTS.map((callout) => (
                <button
                  key={callout.id}
                  type="button"
                  disabled={isSending || isSwitchingPlayerIdentity}
                  onClick={() => void handleTacticalClick(callout.id)}
                  title={callout.description}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1A2133] hover:bg-[#24304B] disabled:opacity-50 active:scale-[0.99] text-[#E2E8F0] hover:text-white border border-[#2B3652] hover:border-[#3B82F6]/60 transition-all flex items-center gap-2 whitespace-nowrap min-h-[40px]"
                >
                  <TacticalIcon id={callout.id} className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                  <span className="truncate">{callout.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Free-Text Input Area */}
          <div className="p-4 bg-[#0E111A] border-t border-[#22283A]">
            {isRestricted ? (
              <div className="p-4 rounded-xl bg-[#1A1622] border border-[#F59E0B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Free-text messaging temporarily restricted</span>
                      <span className="font-mono text-xs text-[#F59E0B] tabular-nums">
                        {formatCountdown(currentUser.restrictionEndsAt, now)}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                      {currentUser.restrictionReason ||
                        'Temporary cooldown active. Tactical quick-messages above remain available to coordinate with your squad.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScreen('safety')}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Appeal Decision
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <form onSubmit={handleSend} className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={draft}
                    disabled={isSending || isSwitchingPlayerIdentity}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      isNexconnConnected
                        ? 'Send live Nexconn squad message (checked by Smart Moderation)...'
                        : 'Send demo squad message (checked by Smart Moderation)...'
                    }
                    aria-label="Squad chat message"
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-[#151A27] border border-[#262D40] focus:border-[#3B82F6] focus:outline-none disabled:opacity-50 text-sm text-white placeholder-[#64748B] min-h-[42px]"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isSending || isSwitchingPlayerIdentity}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-45 disabled:hover:bg-[#3B82F6] text-white transition-colors flex items-center gap-2 whitespace-nowrap min-h-[42px]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Sending…' : 'Send'}</span>
                  </button>
                </form>

                {sendFeedback && (
                  <div
                    role={sendFeedback.status === 'error' ? 'alert' : 'status'}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      sendFeedback.status === 'error'
                        ? 'bg-[#2A151B] border-[#EF4444]/40 text-[#FCA5A5]'
                        : 'bg-[#12221A] border-[#22C55E]/35 text-[#86EFAC]'
                    }`}
                  >
                    <span className="truncate">{sendFeedback.detail}</span>
                    <button
                      type="button"
                      onClick={() => setSendFeedback(null)}
                      className="text-[11px] opacity-80 hover:opacity-100 shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                  <span>Quick test:</span>
                  <button
                    type="button"
                    onClick={() => setDraft('Rotating through mid connector with flash.')}
                    className="text-[#CBD5E1] hover:text-white underline underline-offset-4"
                  >
                    Clean callout
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setDraft('You are playing like an idiot noob right now')}
                    className="text-[#C4B5FD] hover:text-white underline underline-offset-4"
                  >
                    Abusive language test
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setDraft('RUSH B NOWWWWWWWW')}
                    className="text-[#C4B5FD] hover:text-white underline underline-offset-4"
                  >
                    Spam flood test
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Squad Member List */}
        <aside className="xl:col-span-4 rounded-2xl bg-[#111520] border border-[#22283A] p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-white">Squad Roster</h2>
            <span className="font-mono text-xs text-[#94A3B8] tabular-nums">
              {members.length}/4
            </span>
          </div>

          <div className="flex flex-col divide-y divide-[#1D2231]">
            {members.map((member) => (
              <div
                key={member.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarWithFallback
                    src={member.avatarUrl}
                    alt={member.handle}
                    name={member.handle}
                    sizeClass="w-10 h-10"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-1.5 truncate">
                      <span>{member.handle}</span>
                      {member.isCurrentUser && (
                        <span className="text-xs text-[#60A5FA]">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-[#94A3B8] truncate">
                      {member.role} · {member.presence}
                    </div>
                    {member.safetyStatus === 'Free-Text Restricted' && (
                      <div className="text-xs text-[#F59E0B] mt-0.5">
                        Free-text locked · Tactical active
                      </div>
                    )}
                  </div>
                </div>

                {!member.isCurrentUser && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleMuteMember(member.id)}
                      aria-label={member.isMuted ? `Unmute ${member.handle}` : `Mute ${member.handle}`}
                      title={member.isMuted ? 'Unmute player' : 'Mute free-text'}
                      className={`p-2 rounded-lg border transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                        member.isMuted
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                          : 'bg-[#161B29] border-[#252C3E] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {member.isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveScreen('safety')}
                      aria-label={`Safety options for ${member.handle}`}
                      title="Open Player Safety"
                      className="p-2 rounded-lg bg-[#161B29] border border-[#252C3E] text-[#94A3B8] hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#151A27] border border-[#232A3D] text-xs text-[#94A3B8] leading-relaxed">
            Muting a squad member hides their free-text messages while keeping Tactical Callouts
            visible so team coordination never breaks down.
          </div>
        </aside>
      </div>
    </div>
  );
}
