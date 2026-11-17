import React, { useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Flag,
  Lock,
  MessageSquareWarning,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarWithFallback } from '../components/AvatarWithFallback';
import { useSquadShield } from '../context/SquadShieldContext';
import { PlayerReport } from '../types/squadshield';

export function SafetyScreen() {
  const {
    members,
    currentUser,
    reports,
    appeals,
    toggleMuteMember,
    toggleBlockMember,
    submitPlayerReport,
    submitAppeal,
  } = useSquadShield();

  const otherMembers = members.filter((m) => !m.isCurrentUser);

  const [reportTargetId, setReportTargetId] = useState<string>(
    otherMembers[otherMembers.length - 1]?.id ?? ''
  );
  const [reportCategory, setReportCategory] =
    useState<PlayerReport['category']>('Harassment');
  const [reportNotes, setReportNotes] = useState('');

  const [appealReason, setAppealReason] = useState('Context misunderstood during match');
  const [appealNotes, setAppealNotes] = useState('');

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTargetId) return;
    submitPlayerReport(reportTargetId, reportCategory, reportNotes);
    setReportNotes('');
  };

  const handleAppealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    submitAppeal(
      appealReason,
      appealNotes.trim() || 'Requesting review of temporary free-text cooldown.'
    );
    setAppealNotes('');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#1E2332]">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
          Player Safety & Appeals
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Mute or block disruptive players, submit incident reports, and appeal moderation
          decisions.
        </p>
      </div>

      {/* Squad Mute & Block Controls + Report Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mute & Block Roster */}
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Mute & Block Controls
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Muting hides free-text messages in Squad Chat while preserving Tactical Callouts.
              Blocking disables direct free-text interaction.
            </p>
          </div>

          <div className="flex flex-col divide-y divide-[#1D2231]">
            {otherMembers.map((member) => (
              <div
                key={member.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarWithFallback
                    src={member.avatarUrl}
                    alt={member.handle}
                    name={member.handle}
                    sizeClass="w-11 h-11"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{member.tag}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">
                      {member.role} · {member.presence}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleMuteMember(member.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                      member.isMuted
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40'
                        : 'bg-[#171C2B] hover:bg-[#20273B] text-[#CBD5E1] border border-[#273047]'
                    }`}
                  >
                    {member.isMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Mute</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBlockMember(member.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                      member.isBlocked
                        ? 'bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/40'
                        : 'bg-[#171C2B] hover:bg-[#20273B] text-[#CBD5E1] border border-[#273047]'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{member.isBlocked ? 'Blocked' : 'Block'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Report a Player */}
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#7C3AED]" />
              <span>Report a Player</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Reports enter the moderator audit log with match context.
            </p>
          </div>

          <form onSubmit={handleReportSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                Player
              </label>
              <select
                value={reportTargetId}
                onChange={(e) => setReportTargetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1018] border border-[#252C3E] text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              >
                {otherMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tag} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                Reason Category
              </label>
              <select
                value={reportCategory}
                onChange={(e) =>
                  setReportCategory(e.target.value as PlayerReport['category'])
                }
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1018] border border-[#252C3E] text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="Harassment">Harassment</option>
                <option value="Hate Speech">Hate Speech</option>
                <option value="Spam & Flooding">Spam & Flooding</option>
                <option value="Griefing">Griefing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                Incident Context
              </label>
              <textarea
                rows={3}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Describe what happened in chat or during the round..."
                className="w-full p-3 rounded-lg bg-[#0D1018] border border-[#252C3E] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors whitespace-nowrap min-h-[42px]"
            >
              Submit Safety Report
            </button>
          </form>
        </section>
      </div>

      {/* Appeal Moderation Decisions + Submitted Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appeal Moderation Decisions */}
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-[#3B82F6]" />
                <span>Appeal Moderation Decisions</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Current standing:{' '}
                <strong className="text-white">{currentUser.safetyStatus}</strong>
              </p>
            </div>

            {currentUser.safetyStatus === 'Free-Text Restricted' ? (
              <span className="text-xs text-[#F59E0B] flex items-center gap-1.5 font-medium shrink-0">
                <Lock className="w-3.5 h-3.5" />
                <span>Restriction Active</span>
              </span>
            ) : (
              <span className="text-xs text-[#4ADE80] flex items-center gap-1.5 font-medium shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Good Standing</span>
              </span>
            )}
          </div>

          <form onSubmit={handleAppealSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                Appeal Reason
              </label>
              <select
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1018] border border-[#252C3E] text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="Context misunderstood during match">
                  Context misunderstood during match
                </option>
                <option value="False positive keyword detection">
                  False positive keyword detection
                </option>
                <option value="Acknowledge warning and request early restore">
                  Acknowledge warning and request early restore
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">
                Explanation for Moderator Review
              </label>
              <textarea
                rows={2}
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Explain why the restriction should be lifted..."
                className="w-full p-3 rounded-lg bg-[#0D1018] border border-[#252C3E] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] resize-none"
              />
            </div>

            <div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors whitespace-nowrap"
              >
                Submit Moderation Appeal
              </button>
            </div>
          </form>

          {/* Appeals History */}
          <div className="pt-4 border-t border-[#1E2332] flex flex-col gap-3">
            <div className="text-xs font-medium text-[#94A3B8]">Submitted Appeals</div>
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="p-3.5 rounded-xl bg-[#0D1018] border border-[#202636] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-white">
                    {appeal.playerHandle} · {appeal.reason}
                  </span>
                  <span className="font-mono text-[#64748B] tabular-nums">{appeal.timestamp}</span>
                </div>
                <p className="text-xs text-[#94A3B8]">{appeal.contextNote}</p>
                <div className="text-xs flex items-center gap-1.5 pt-1">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      appeal.status.startsWith('Approved')
                        ? 'text-[#4ADE80]'
                        : appeal.status === 'Pending Review'
                        ? 'text-[#A78BFA]'
                        : 'text-[#F59E0B]'
                    }`}
                  />
                  <span className="text-[#E2E8F0]">{appeal.status}</span>
                  {appeal.reviewerNote && (
                    <span className="text-[#64748B]">— {appeal.reviewerNote}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Submitted Reports Log */}
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-4">
          <h2 className="font-display font-semibold text-lg text-white">
            Your Submitted Reports
          </h2>
          {reports.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#0D1018] border border-[#1E2434] text-xs text-[#94A3B8]">
              No safety reports submitted yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl bg-[#0D1018] border border-[#202636] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">
                      {rep.targetHandle} · {rep.category}
                    </span>
                    <span className="font-mono text-[#64748B] tabular-nums">{rep.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">{rep.notes}</p>
                  <div className="text-xs text-[#60A5FA] pt-0.5">{rep.status}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
