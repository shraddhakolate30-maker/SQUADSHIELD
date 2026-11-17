import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useSquadShield } from '../context/SquadShieldContext';
import { evaluateMessageModeration } from '../services/moderationEngine';

export function SmartModerationScreen() {
  const {
    moderationConfig,
    addBlockedWord,
    removeBlockedWord,
    toggleSpamRule,
    messages,
    currentUser,
    sendFreeTextMessage,
    setActiveScreen,
  } = useSquadShield();

  const [newWord, setNewWord] = useState('');
  const [testInput, setTestInput] = useState(
    'You are playing like a trash thrower, uninstall now.'
  );

  const liveEvaluation = useMemo(
    () =>
      evaluateMessageModeration(
        testInput,
        currentUser.id,
        messages,
        moderationConfig
      ),
    [testInput, currentUser.id, messages, moderationConfig]
  );

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    addBlockedWord(newWord);
    setNewWord('');
  };

  const handleDispatchToChat = async () => {
    if (!testInput.trim()) return;
    await sendFreeTextMessage(testInput);
    setActiveScreen('chat');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1E2332]">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Smart Moderation
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Configure abusive language rules and spam detection (client-side demo state).
            Suspicious messages are flagged for review—never auto-banned permanently.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('moderator')}
          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#171C2B] hover:bg-[#20273B] text-white border border-[#29324A] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span>Open Moderator Queue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live Analyzer + Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#3B82F6]" />
              <span>Live Rule Analyzer</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Type any message below to inspect how SQUADSHIELD evaluates language and spam rules.
            </p>
          </div>

          <textarea
            rows={3}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter a test message to evaluate..."
            aria-label="Test message input"
            className="w-full p-3.5 rounded-xl bg-[#0D1018] border border-[#252C3E] focus:border-[#3B82F6] focus:outline-none text-sm text-white placeholder-[#64748B] resize-none"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
            <span>Sample inputs:</span>
            <button
              type="button"
              onClick={() => setTestInput('Nice hold on Site A, rotating now.')}
              className="text-[#CBD5E1] hover:text-white underline underline-offset-4"
            >
              Clean callout
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setTestInput('Stop being a toxic loser and leave')}
              className="text-[#C4B5FD] hover:text-white underline underline-offset-4"
            >
              Restricted words
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setTestInput('GOOOOOOOOO B NOWWWWWWWWW')}
              className="text-[#C4B5FD] hover:text-white underline underline-offset-4"
            >
              Character flood spam
            </button>
          </div>

          {/* Result Card */}
          <div
            className={`p-4 rounded-xl border ${
              liveEvaluation.flagged
                ? 'bg-[#191525] border-[#7C3AED]/45'
                : 'bg-[#111B19] border-[#16A34A]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-medium text-sm">
                {liveEvaluation.flagged ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-white">
                      Flagged · {liveEvaluation.ruleType} ({liveEvaluation.severity} Severity)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                    <span className="text-white">Clean · Ready for Squad Delivery</span>
                  </>
                )}
              </div>
            </div>

            {liveEvaluation.flagged ? (
              <div className="mt-2.5 flex flex-col gap-1.5 text-xs text-[#CBD5E1]">
                {liveEvaluation.reasons.map((r, i) => (
                  <div key={i}>{r}</div>
                ))}
                <div className="text-[#94A3B8] pt-1">
                  Outcome: Queued for Moderator Review. Tactical quick-messages remain enabled.
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#94A3B8]">
                No configured abusive terms or spam repetition patterns matched.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-[#64748B]">
              {currentUser.safetyStatus === 'Free-Text Restricted'
                ? 'Free-text is currently restricted; lift the demo restriction to dispatch free-text messages.'
                : 'Send this test message to Squad Chat to observe local Smart Moderation flow.'}
            </span>
            <button
              type="button"
              disabled={!testInput.trim() || currentUser.safetyStatus === 'Free-Text Restricted'}
              onClick={handleDispatchToChat}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-45 text-white transition-colors whitespace-nowrap"
            >
              Send Test Message to Squad Chat
            </button>
          </div>
        </section>

        {/* Moderation Safeguard Policy + Spam Controls */}
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />
              <span>Automated Detection Rules</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Toggle spam heuristics and review escalation safeguards.
            </p>
          </div>

          <div className="flex flex-col divide-y divide-[#1E2332]">
            <div className="py-3.5 first:pt-0 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">Repeated Spam Detection</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">
                  Flags duplicate lines within 60s and excessive repeated characters.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={moderationConfig.detectRepeatedSpam}
                onClick={() => toggleSpamRule('detectRepeatedSpam')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  moderationConfig.detectRepeatedSpam
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#191E2D] text-[#94A3B8] border border-[#283044]'
                }`}
              >
                {moderationConfig.detectRepeatedSpam ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">Message Flooding Guard</div>
                <div className="text-xs text-[#94A3B8] mt-0.5">
                  Flags bursts exceeding {moderationConfig.floodThresholdCount} messages in{' '}
                  {moderationConfig.floodWindowSeconds}s.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={moderationConfig.detectFlooding}
                onClick={() => toggleSpamRule('detectFlooding')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  moderationConfig.detectFlooding
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#191E2D] text-[#94A3B8] border border-[#283044]'
                }`}
              >
                {moderationConfig.detectFlooding ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1018] border border-[#212738] text-xs text-[#94A3B8] leading-relaxed">
            <div className="font-medium text-white mb-1">No Automatic Permanent Bans</div>
            SQUADSHIELD never permanently bans accounts automatically. Flagged content is
            explained to moderators who decide whether to approve, dismiss, or apply a temporary
            free-text cooldown while preserving tactical callouts.
          </div>
        </section>
      </div>

      {/* Configured Abusive Words Dictionary */}
      <section className="p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Configured Restricted Terms
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Add or remove demo terms evaluated by the Smart Moderation filter.
            </p>
          </div>

          <form onSubmit={handleAddWord} className="flex items-center gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add restricted word..."
              aria-label="Add restricted word"
              className="px-3.5 py-2 rounded-lg bg-[#0D1018] border border-[#252C3E] focus:border-[#3B82F6] focus:outline-none text-sm text-white placeholder-[#64748B]"
            />
            <button
              type="submit"
              disabled={!newWord.trim()}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-45 text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Term</span>
            </button>
          </form>
        </div>

        {moderationConfig.blockedWords.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#0D1018] border border-[#202636] text-center text-sm text-[#94A3B8]">
            No restricted words configured. Add a term above to activate keyword detection.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {moderationConfig.blockedWords.map((word) => (
              <div
                key={word}
                className="px-3 py-2 rounded-lg bg-[#0D1018] border border-[#23293A] flex items-center justify-between gap-2 text-xs text-[#E2E8F0]"
              >
                <span className="font-mono truncate">{word}</span>
                <button
                  type="button"
                  onClick={() => removeBlockedWord(word)}
                  aria-label={`Remove ${word}`}
                  className="text-[#64748B] hover:text-[#EF4444] transition-colors p-0.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
