import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Lock,
  Search,
  ShieldAlert,
  Unlock,
  X,
} from 'lucide-react';
import { useSquadShield } from '../context/SquadShieldContext';

type QueueFilter = 'Pending Review' | 'All' | 'Resolved';

export function ModeratorScreen() {
  const {
    flaggedQueue,
    moderationHistory,
    members,
    appeals,
    reviewFlaggedMessage,
    reviewAppeal,
    liftPlayerRestriction,
  } = useSquadShield();

  const [queueFilter, setQueueFilter] = useState<QueueFilter>('Pending Review');
  const [restrictDuration, setRestrictDuration] = useState<number>(10);
  const [historySearch, setHistorySearch] = useState('');

  const filteredFlags = flaggedQueue.filter((item) => {
    if (queueFilter === 'Pending Review') return item.status === 'Pending Review';
    if (queueFilter === 'Resolved') return item.status !== 'Pending Review';
    return true;
  });

  const restrictedMembers = members.filter(
    (m) => m.safetyStatus === 'Free-Text Restricted'
  );

  const pendingAppeals = appeals.filter((a) => a.status === 'Pending Review');

  const filteredHistory = moderationHistory.filter((entry) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      entry.targetHandle.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1E2332]">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Moderator Dashboard
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Review flagged squad messages, inspect detection reasons, and issue reversible
            temporary free-text cooldowns without disrupting tactical gameplay.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs text-[#94A3B8] flex items-center gap-2">
            <span>Default Restriction:</span>
            <select
              value={restrictDuration}
              onChange={(e) => setRestrictDuration(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[#151A27] border border-[#272E42] text-xs text-white focus:outline-none focus:border-[#3B82F6]"
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
          </label>
        </div>
      </div>

      {/* Flagged Messages Queue */}
      <section className="p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#7C3AED]" />
              <span>Flagged Messages Queue</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Approve false positives, dismiss messages, or apply temporary free-text restriction.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0C0F17] border border-[#1E2434] self-start sm:self-auto">
            {(['Pending Review', 'All', 'Resolved'] as QueueFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setQueueFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  queueFilter === tab
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredFlags.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0D1018] border border-[#1E2434] text-center">
            <div className="text-sm font-medium text-white">No flagged messages in this view</div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Test sending a restricted word or repeated spam in Squad Chat to see flagged items
              appear here immediately.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-5 rounded-xl bg-[#0E121B] border border-[#23293B] flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-white">{flag.senderHandle}</span>
                    <span aria-hidden="true" className="text-[#475569]">·</span>
                    <span className="font-mono text-[#94A3B8] tabular-nums">{flag.timestamp}</span>
                    <span aria-hidden="true" className="text-[#475569]">·</span>
                    <span className="text-[#F59E0B] font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        {flag.ruleType} ({flag.severity})
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-[#475569]">·</span>
                    <span
                      className={
                        flag.status === 'Pending Review'
                          ? 'text-[#C4B5FD]'
                          : flag.status === 'Approved'
                          ? 'text-[#4ADE80]'
                          : 'text-[#94A3B8]'
                      }
                    >
                      {flag.status}
                    </span>
                  </div>

                  <p className="text-sm text-[#F1F5F9] bg-[#141926] border border-[#222839] rounded-lg px-3.5 py-2.5">
                    "{flag.content}"
                  </p>

                  <div className="text-xs text-[#94A3B8]">
                    Reason: {flag.reasons.join(' ')}
                  </div>
                </div>

                {flag.status === 'Pending Review' && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => reviewFlaggedMessage(flag.id, 'approve')}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#16A34A]/15 hover:bg-[#16A34A]/25 text-[#4ADE80] border border-[#16A34A]/35 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => reviewFlaggedMessage(flag.id, 'dismiss')}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#1A202F] hover:bg-[#232A3E] text-[#CBD5E1] border border-[#2B334B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        reviewFlaggedMessage(flag.id, 'restrict', restrictDuration)
                      }
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px]"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Restrict Free-Text ({restrictDuration}m)</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Restrictions & Pending Appeals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Temporary Restrictions */}
        <section className="p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-4">
          <h2 className="font-display font-semibold text-lg text-white">
            Active Temporary Restrictions
          </h2>
          {restrictedMembers.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#0D1018] border border-[#1E2434] text-xs text-[#94A3B8]">
              No squad members currently have an active free-text restriction.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {restrictedMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-[#0E121B] border border-[#252B3D] flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{member.tag}</div>
                    <div className="text-xs text-[#F59E0B] mt-0.5">
                      Free-Text Restricted · Tactical Callouts Active
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => liftPlayerRestriction(member.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1A202F] hover:bg-[#232B3F] text-white border border-[#2C354D] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Lift Restriction</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Player Appeals */}
        <section className="p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-4">
          <h2 className="font-display font-semibold text-lg text-white">
            Pending Player Appeals
          </h2>
          {pendingAppeals.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#0D1018] border border-[#1E2434] text-xs text-[#94A3B8]">
              No pending appeals. Players can submit appeals from the Player Safety screen.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingAppeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className="p-4 rounded-xl bg-[#0E121B] border border-[#252B3D] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{appeal.playerHandle}</span>
                    <span className="font-mono text-[#94A3B8] tabular-nums">
                      {appeal.timestamp}
                    </span>
                  </div>
                  <div className="text-xs text-[#CBD5E1]">
                    <strong>{appeal.reason}:</strong> {appeal.contextNote}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => reviewAppeal(appeal.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#16A34A]/15 hover:bg-[#16A34A]/25 text-[#4ADE80] border border-[#16A34A]/35 transition-colors"
                    >
                      Approve & Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewAppeal(appeal.id, 'uphold')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1A202F] hover:bg-[#232A3E] text-[#CBD5E1] border border-[#2B334B] transition-colors"
                    >
                      Uphold Cooldown
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Moderation History */}
      <section className="p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Moderation History
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Complete audit log of review outcomes and temporary free-text restrictions.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Filter history..."
              aria-label="Filter moderation history"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0D1018] border border-[#252C3E] focus:border-[#3B82F6] focus:outline-none text-xs text-white placeholder-[#64748B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#212738] text-xs font-medium text-[#94A3B8]">
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Details</th>
                <th className="py-3 pr-4">Reviewer</th>
                <th className="py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A202E] text-xs">
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#161B29]/60 transition-colors">
                  <td className="py-3 pr-4 font-medium text-white whitespace-nowrap">
                    {entry.targetHandle}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-[#CBD5E1]">{entry.action}</td>
                  <td className="py-3 pr-4 text-[#94A3B8] min-w-[260px]">{entry.details}</td>
                  <td className="py-3 pr-4 text-[#94A3B8] whitespace-nowrap">
                    {entry.moderatorHandle}
                  </td>
                  <td className="py-3 text-right font-mono text-[#64748B] tabular-nums whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entry.timestamp}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
