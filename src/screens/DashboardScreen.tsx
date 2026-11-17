import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  MessageSquare,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AvatarWithFallback } from '../components/AvatarWithFallback';
import { useSquadShield } from '../context/SquadShieldContext';
import { PlayerPresence } from '../types/squadshield';

const PRESENCE_OPTIONS: PlayerPresence[] = ['Online', 'In Match', 'Do Not Disturb'];

function formatRemainingTime(endsAt: number | null | undefined, now: number): string {
  if (!endsAt) return '00:00';
  const diffSec = Math.max(0, Math.floor((endsAt - now) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function DashboardScreen() {
  const {
    currentUser,
    members,
    nexconnServerStatus,
    nexconnState,
    nexconnChannelId,
    setPresence,
    activityFeed,
    flaggedQueue,
    setActiveScreen,
    toggleDemoCurrentUserRestriction,
  } = useSquadShield();

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isRestricted = currentUser.safetyStatus === 'Free-Text Restricted';
  const pendingReviewCount = flaggedQueue.filter((f) => f.status === 'Pending Review').length;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1E2332]">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Gamer Dashboard
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Manage your squad presence, review your safety standing, and jump into match comms.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveScreen('chat')}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Squad Chat</span>
          </button>
        </div>
      </div>

      {/* Top Grid: Player Profile + Safety Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Player Profile & Online Status */}
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AvatarWithFallback
                src={currentUser.avatarUrl}
                alt={currentUser.handle}
                name={currentUser.handle}
                sizeClass="w-14 h-14"
              />
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display font-semibold text-xl text-white">
                    {currentUser.handle}
                  </h2>
                  <span className="font-mono text-xs text-[#94A3B8]">{currentUser.tag}</span>
                </div>
                <div className="text-xs text-[#94A3B8] mt-1 flex items-center gap-2">
                  <span>{currentUser.role}</span>
                  <span aria-hidden="true">·</span>
                  <span>Squad: Vanguard Echo</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-[#94A3B8] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentUser.presence === 'Online'
                    ? 'bg-[#22C55E]'
                    : currentUser.presence === 'In Match'
                    ? 'bg-[#3B82F6]'
                    : 'bg-[#F59E0B]'
                }`}
              />
              <span className="font-medium text-white">{currentUser.presence}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E2332] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#94A3B8]">Online Status</span>
            <div
              role="group"
              aria-label="Set online status"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#0C0E15] border border-[#1E2332]"
            >
              {PRESENCE_OPTIONS.map((option) => {
                const active = currentUser.presence === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPresence(option)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Safety Status */}
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-[#94A3B8]">Safety Status</div>
              <div className="font-display font-semibold text-xl text-white mt-1 flex items-center gap-2">
                {isRestricted ? (
                  <>
                    <Lock className="w-5 h-5 text-[#F59E0B]" />
                    <span>Free-Text Restricted</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                    <span>Nominal Standing</span>
                  </>
                )}
              </div>
            </div>

            {isRestricted && (
              <span className="font-mono text-sm text-[#F59E0B] tabular-nums">
                {formatRemainingTime(currentUser.restrictionEndsAt, now)}
              </span>
            )}
          </div>

          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {isRestricted
              ? 'Free-text messaging is temporarily paused. All six Tactical Communication callouts remain fully unlocked for your squad.'
              : 'All free-text messaging and tactical communication channels are active. Zero active restrictions on your account.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1E2332]">
            <button
              type="button"
              onClick={() => toggleDemoCurrentUserRestriction(10)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#1A1F2E] hover:bg-[#23293C] text-[#CBD5E1] border border-[#2A3147] transition-colors whitespace-nowrap"
            >
              {isRestricted ? 'Clear Demo Restriction' : 'Test Restricted Tactical Mode'}
            </button>

            {isRestricted && (
              <button
                type="button"
                onClick={() => setActiveScreen('safety')}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors whitespace-nowrap"
              >
                Appeal Decision
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Grid: Active Squad + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Squad Information */}
        <section className="lg:col-span-7 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#3B82F6]" />
                <span>Active Squad · Vanguard Echo</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Ranked Squad Arena · {members.length} Active Roster Members (Demo Roster)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveScreen('chat')}
              className="text-xs font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Squad Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1D2231]">
            {members.map((member) => (
              <div
                key={member.id}
                className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarWithFallback
                    src={member.avatarUrl}
                    alt={member.handle}
                    name={member.handle}
                    sizeClass="w-10 h-10"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-2 truncate">
                      <span>{member.handle}</span>
                      {member.isCurrentUser && (
                        <span className="text-xs text-[#60A5FA] font-normal">(You)</span>
                      )}
                      {member.isMuted && (
                        <span className="text-xs text-[#F59E0B] font-normal">· Muted</span>
                      )}
                    </div>
                    <div className="text-xs text-[#94A3B8] truncate">
                      {member.role} · {member.presence}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-medium shrink-0">
                  {member.safetyStatus === 'Nominal' && (
                    <span className="text-[#4ADE80]">Nominal</span>
                  )}
                  {member.safetyStatus === 'Under Review' && (
                    <span className="text-[#A78BFA]">Under Review</span>
                  )}
                  {member.safetyStatus === 'Free-Text Restricted' && (
                    <span className="text-[#F59E0B]">Tactical Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity & Moderation Snapshot */}
        <section className="lg:col-span-5 p-6 rounded-2xl bg-[#121621] border border-[#22283A] flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7C3AED]" />
              <span>Recent Activity</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveScreen('moderator')}
              className="text-xs font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors inline-flex items-center gap-1 whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="tabular-nums">{pendingReviewCount} Pending Review</span>
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#1D2231]">
            {activityFeed.slice(0, 6).map((item) => (
              <div key={item.id} className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#F1F5F9]">{item.title}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{item.detail}</div>
                </div>
                <span className="font-mono text-xs text-[#64748B] tabular-nums shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#1E2332] flex items-center justify-between text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>
                {nexconnState === 'connected'
                  ? `Nexconn Live (#${nexconnChannelId}) · Client-side Smart Moderation active`
                  : nexconnServerStatus?.configured
                  ? `Nexconn SDK ready (#${nexconnChannelId}) · Connect in Squad Chat (Local Demo active)`
                  : 'Local Demo Mode · Nexconn credentials required for live chat'}
              </span>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
