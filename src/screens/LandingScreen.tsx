import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Lock,
  MessageSquare,
  Shield,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useSquadShield } from '../context/SquadShieldContext';
import { HERO_COMMAND_IMAGE, TACTICAL_CALLOUTS } from '../data/demoData';
import { TacticalIcon } from '../components/TacticalIcon';

export function LandingScreen() {
  const { setActiveScreen, toggleDemoCurrentUserRestriction, currentUser } = useSquadShield();
  const [heroImgError, setHeroImgError] = useState(false);
  const [previewCallout, setPreviewCallout] = useState<string>('Move to B');

  const launchChatWithRestrictionDemo = () => {
    if (currentUser.safetyStatus !== 'Free-Text Restricted') {
      toggleDemoCurrentUserRestriction(10);
    }
    setActiveScreen('chat');
  };

  return (
    <div className="min-h-screen bg-[#0B0D13] text-[#F1F5F9] flex flex-col">
      {/* Top Bar Contract: Brand — 4-5 nav links — 1 primary action */}
      <header className="sticky top-0 z-30 bg-[#0B0D13]/90 backdrop-blur-md border-b border-[#1E2332]">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display font-bold text-lg tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <Shield className="w-5 h-5 text-[#3B82F6] shrink-0" />
            <span>SQUADSHIELD</span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#94A3B8]"
          >
            <a
              href="#overview"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#tactical-mode"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Tactical Mode
            </a>
            <a
              href="#moderation"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Moderation
            </a>
            <a
              href="#safety"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Player Safety
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveScreen('dashboard')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors whitespace-nowrap shrink-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section
          id="overview"
          className="max-w-[1280px] mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-center gap-6">
              <div className="text-xs font-medium text-[#94A3B8] flex items-center gap-2">
                <span className="text-[#3B82F6]">Gaming Squad Communication Safety</span>
                <span aria-hidden="true">·</span>
                <span>Nexconn SDK + Safety Demo</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                Protect the Player. Preserve the Gameplay.
              </h1>

              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-[58ch]">
                SQUADSHIELD intercepts harassment, abusive language, and chat spam in real time
                while guaranteeing your squad never loses critical match coordination. Even when
                free-text chat is restricted, tactical callouts keep moving.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen('dashboard')}
                  className="px-6 py-3 rounded-lg text-sm font-semibold bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors flex items-center gap-2 whitespace-nowrap min-h-[44px]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={launchChatWithRestrictionDemo}
                  className="px-5 py-3 rounded-lg text-sm font-medium bg-[#151924] hover:bg-[#1C2231] text-[#E2E8F0] border border-[#272D3E] transition-colors flex items-center gap-2 whitespace-nowrap min-h-[44px]"
                >
                  <Lock className="w-4 h-4 text-[#A78BFA]" />
                  <span>Try Tactical Restriction Demo</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#1E2332] grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="font-display font-semibold text-xl text-white tabular-nums">
                    6 Callouts
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">Always-on tactical pings</div>
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-white tabular-nums">
                    0 Auto-Bans
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">Human moderator review</div>
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-white tabular-nums">
                    Nexconn SDK
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">@nexconn/chat integrated</div>
                </div>
              </div>
            </div>

            {/* Right Visual Column */}
            <div className="lg:col-span-6 flex">
              <div className="relative w-full min-h-[320px] lg:min-h-full rounded-2xl overflow-hidden border border-[#232838] bg-[#121621]">
                {!heroImgError ? (
                  <img
                    src={HERO_COMMAND_IMAGE}
                    alt="Esports squad command room with tactical displays"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[340px] bg-gradient-to-br from-[#131724] via-[#171C2C] to-[#1D1830] flex flex-col items-center justify-center p-8 text-center">
                    <Shield className="w-12 h-12 text-[#3B82F6] mb-3" />
                    <div className="font-display font-semibold text-white text-lg">
                      SQUADSHIELD Command Environment
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/35 to-transparent" />

                <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-[#93C5FD]">
                      Protection Workflow Preview
                    </div>
                    <div className="font-display font-semibold text-lg text-white mt-1">
                      Vanguard Echo · Ranked Squad Channel
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('chat')}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-[#151924]/90 hover:bg-[#1E2434] text-white border border-[#2D354A] transition-colors whitespace-nowrap shrink-0"
                  >
                    Inspect Squad Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Asymmetric Grid */}
        <section
          id="moderation"
          className="border-t border-[#1C202E] bg-[#0E1118] py-16 lg:py-20"
        >
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-medium text-[#3B82F6] mb-2">
                Platform Architecture
              </div>
              <h2
                className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Designed for competitive clarity without silent communication blackouts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Card 01 - Wide */}
              <div className="md:col-span-7 p-7 rounded-2xl bg-[#131722] border border-[#222738] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-[#94A3B8] mb-2">01. Smart Moderation</div>
                    <h3 className="font-display font-semibold text-xl text-white">
                      Transparent flagging with zero automatic permanent bans
                    </h3>
                  </div>
                  <Filter className="w-5 h-5 text-[#3B82F6] shrink-0" />
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Every outgoing free-text message is checked against configurable abusive-word
                  lists, repeated spam detection, and flooding thresholds. Flagged messages explain
                  exactly which rule triggered and move to a human moderator queue rather than
                  issuing permanent bans automatically.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('moderation')}
                    className="text-sm font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Configure & Test Filter Rules</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 02 */}
              <div className="md:col-span-5 p-7 rounded-2xl bg-[#131722] border border-[#222738] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-[#94A3B8] mb-2">
                      02. Moderator Queue
                    </div>
                    <h3 className="font-display font-semibold text-xl text-white">
                      Context-first review actions
                    </h3>
                  </div>
                  <ShieldAlert className="w-5 h-5 text-[#7C3AED] shrink-0" />
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Moderators review flagged lines with exact matched terms, then choose to approve
                  false positives, dismiss messages, or apply temporary free-text cooldowns with
                  full audit history.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('moderator')}
                    className="text-sm font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Open Moderator Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 03 */}
              <div
                id="safety"
                className="md:col-span-5 p-7 rounded-2xl bg-[#131722] border border-[#222738] flex flex-col justify-between gap-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-[#94A3B8] mb-2">03. Player Safety</div>
                    <h3 className="font-display font-semibold text-xl text-white">
                      Mute, block, report, and appeal
                    </h3>
                  </div>
                  <UserCheck className="w-5 h-5 text-[#3B82F6] shrink-0" />
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Players control their own experience with one-click mute and block toggles,
                  structured incident reporting, and a built-in appeals workflow for temporary
                  restrictions.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('safety')}
                    className="text-sm font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Explore Player Safety</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 04 - Wide */}
              <div className="md:col-span-7 p-7 rounded-2xl bg-[#131722] border border-[#222738] flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-[#94A3B8] mb-2">
                      04. Nexconn Chat Integration
                    </div>
                    <h3 className="font-display font-semibold text-xl text-white">
                      Official @nexconn/chat SDK with local demo fallback
                    </h3>
                  </div>
                  <MessageSquare className="w-5 h-5 text-[#7C3AED] shrink-0" />
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Real-time group messaging connects through the official{' '}
                  <code className="text-[#CBD5E1]">@nexconn/chat</code> Web SDK using backend-signed
                  tokens, while moderation filters, moderator queue actions, and safety appeals run
                  locally in browser demo state.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('chat')}
                    className="text-sm font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Launch Squad Chat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tactical Communication Interactive Preview */}
        <section id="tactical-mode" className="py-16 lg:py-20 max-w-[1280px] mx-auto px-6">
          <div className="rounded-2xl bg-[#121622] border border-[#23293A] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="text-xs font-medium text-[#A78BFA]">
                Signature Feature · Tactical Communication
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                Free-text muted. Objective callouts uninterrupted.
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Restricting toxic free-text chat should never punish four teammates by blinding
                their match callouts. When a player enters a temporary free-text cooldown, all six
                verified tactical callouts stay 100% functional.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={launchChatWithRestrictionDemo}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Experience Restricted Tactical Mode</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl bg-[#0D1018] border border-[#242A3B] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-3 border-b border-[#1E2332]">
                <span className="flex items-center gap-2 text-[#F59E0B] font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Free-Text Cooldown Active (09:42 remaining)</span>
                </span>
                <span className="text-[#4ADE80] flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tactical Enabled</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TACTICAL_CALLOUTS.map((callout) => {
                  const selected = previewCallout === callout.label;
                  return (
                    <button
                      key={callout.id}
                      type="button"
                      onClick={() => setPreviewCallout(callout.label)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap min-h-[40px] ${
                        selected
                          ? 'bg-[#3B82F6] text-white border border-[#60A5FA]'
                          : 'bg-[#151A27] text-[#CBD5E1] hover:bg-[#1C2334] border border-[#272F42]'
                      }`}
                    >
                      <TacticalIcon id={callout.id} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{callout.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="px-3.5 py-2.5 rounded-lg bg-[#141824] border border-[#242A3B] text-xs text-[#CBD5E1] flex items-center justify-between">
                <span>
                  Preview broadcast: <strong className="text-white">{previewCallout}</strong>
                </span>
                <span className="font-mono text-[#64748B] tabular-nums">21:50</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#1C202E] bg-[#090B10] py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2.5 text-[#94A3B8]">
            <Shield className="w-4 h-4 text-[#3B82F6]" />
            <span className="font-display font-semibold text-white">SQUADSHIELD</span>
            <span aria-hidden="true">·</span>
            <span>Protect the Player. Preserve the Gameplay.</span>
          </div>
          <div>
            Hackathon MVP · @nexconn/chat Web SDK integrated · Client-side moderation & safety demo
          </div>
        </div>
      </footer>
    </div>
  );
}
