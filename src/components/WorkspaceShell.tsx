import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Filter,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquare,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  X,
} from 'lucide-react';
import { useSquadShield } from '../context/SquadShieldContext';
import { AppScreen } from '../types/squadshield';
import { AvatarWithFallback } from './AvatarWithFallback';

interface NavItem {
  id: Exclude<AppScreen, 'landing'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Gamer Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Squad Chat', icon: MessageSquare },
  { id: 'moderation', label: 'Smart Moderation', icon: Filter },
  { id: 'moderator', label: 'Moderator Queue', icon: ShieldAlert },
  { id: 'safety', label: 'Player Safety', icon: UserCheck },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const {
    activeScreen,
    setActiveScreen,
    currentUser,
    flaggedQueue,
    appeals,
    nexconnState,
    nexconnChannelId,
    toggleDemoCurrentUserRestriction,
    resetDemoState,
    toastMessage,
    dismissToast,
  } = useSquadShield();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingFlagsCount = flaggedQueue.filter((f) => f.status === 'Pending Review').length;
  const pendingAppealsCount = appeals.filter((a) => a.status === 'Pending Review').length;
  const moderatorBadgeCount = pendingFlagsCount + pendingAppealsCount;
  const isRestricted = currentUser.safetyStatus === 'Free-Text Restricted';

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeScreen)?.label ?? 'Workspace';

  const handleNavigate = (screen: AppScreen) => {
    setActiveScreen(screen);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0D13] text-[#F1F5F9] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#11141D] border-b border-[#222736] sticky top-0 z-30">
        <button
          type="button"
          onClick={() => handleNavigate('landing')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-md"
        >
          <Shield className="w-5 h-5 text-[#3B82F6] shrink-0" />
          <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
            SQUADSHIELD
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded-lg border border-[#252B3B] bg-[#161A25] text-[#CBD5E1] hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-20 h-screen w-[264px] shrink-0 bg-[#10131C] border-r border-[#212635] flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 flex flex-col gap-6 overflow-y-auto">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigate('landing')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-md"
            >
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white whitespace-nowrap">
                SQUADSHIELD
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-[#94A3B8] hover:text-white"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation */}
          <nav aria-label="Workspace navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                    isActive
                      ? 'bg-[#3B82F6]/15 text-white border border-[#3B82F6]/35'
                      : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#171B26] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#3B82F6]' : 'text-[#64748B]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'moderator' && moderatorBadgeCount > 0 && (
                    <span className="font-mono text-xs tabular-nums text-[#A78BFA]">
                      {moderatorBadgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Interactive Demo Controls Box */}
          <div className="p-3.5 rounded-xl bg-[#151924] border border-[#242938] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#CBD5E1]">Demo Mode Controls</span>
              <span className="text-[11px] font-mono text-[#7C3AED]">LOCAL</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Test how tactical callouts stay active even when free-text chat is restricted.
            </p>
            <button
              type="button"
              onClick={() => toggleDemoCurrentUserRestriction(10)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-[40px] ${
                isRestricted
                  ? 'bg-[#16A34A]/15 text-[#4ADE80] border border-[#16A34A]/35 hover:bg-[#16A34A]/25'
                  : 'bg-[#7C3AED]/15 text-[#C4B5FD] border border-[#7C3AED]/35 hover:bg-[#7C3AED]/25'
              }`}
            >
              {isRestricted ? (
                <>
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                  <span>Lift Demo Restriction</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Simulate Free-Text Lock</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetDemoState}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white bg-[#1B202E] hover:bg-[#22283A] border border-[#282E40] transition-colors whitespace-nowrap min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* Bottom Player Summary & Return to Landing */}
        <div className="p-4 border-t border-[#212635] flex flex-col gap-3 bg-[#0E1119]">
          <div className="flex items-center gap-3">
            <AvatarWithFallback
              src={currentUser.avatarUrl}
              alt={currentUser.handle}
              name={currentUser.handle}
              sizeClass="w-9 h-9"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{currentUser.tag}</div>
              <div className="text-xs text-[#94A3B8] flex items-center gap-1.5 truncate">
                <span>{currentUser.presence}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isRestricted ? 'text-[#F59E0B]' : 'text-[#4ADE80]'
                  }
                >
                  {isRestricted ? 'Tactical Only' : 'Nominal'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('landing')}
            className="flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview Page</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Top Header */}
        <div className="hidden lg:flex items-center justify-between gap-8 px-8 py-4 border-b border-[#212635] bg-[#0D1017]">
          <div className="flex items-center gap-2 text-sm text-[#94A3B8] min-w-0">
            <span className="text-[#CBD5E1] font-medium whitespace-nowrap">SQUADSHIELD</span>
            <span aria-hidden="true">/</span>
            <span className="text-white font-medium truncate">{currentNavLabel}</span>
            <span aria-hidden="true" className="text-[#475569]">·</span>
            <span
              className={`text-xs truncate ${
                nexconnState === 'connected' ? 'text-[#4ADE80]' : 'text-[#94A3B8]'
              }`}
            >
              {nexconnState === 'connected'
                ? `Nexconn Live (#${nexconnChannelId}) · Local Demo Moderation`
                : nexconnState === 'disconnected'
                ? `Nexconn SDK Ready (#${nexconnChannelId}) · Local Demo Mode`
                : nexconnState === 'unconfigured'
                ? 'Local Demo Mode · Nexconn Credentials Required'
                : `Nexconn SDK (${nexconnState}) · Local Demo Mode`}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('chat')}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Open Squad Chat</span>
            </button>
          </div>
        </div>

        {/* Active Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mx-4 lg:mx-8 mt-4 px-4 py-3 rounded-xl bg-[#161B29] border border-[#3B82F6]/40 text-sm text-[#F1F5F9] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="text-[#94A3B8] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
