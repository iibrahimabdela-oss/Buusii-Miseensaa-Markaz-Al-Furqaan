import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  Users,
  Receipt,
  FileText,
  FolderSync,
  Sparkles,
  LogOut,
  Globe,
  CheckCircle2,
  Crown,
  Palette,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { AlFurqaanLogo } from './AlFurqaanLogo';

export type AppTheme = 'light' | 'ivory' | 'dark';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  user: User | null;
  isAdmin: boolean;
  isOwner: boolean;
  onOpenRoleManagement: () => void;
  hasGoogleToken: boolean;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  theme,
  setTheme,
  user,
  isAdmin,
  isOwner,
  onOpenRoleManagement,
  hasGoogleToken,
  onGoogleSignIn,
  onSignOut,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notice expenses is completely excluded per user requirement: "Part Baasii(Expenss) keessaa darbi(Exclude)"
  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'members', label: t.members, icon: Users },
    { id: 'contributions', label: t.contributions, icon: Receipt },
    { id: 'reports', label: 'Gabaasa (Reports)', icon: FileText },
    { id: 'workspace', label: t.workspaceHub, icon: FolderSync, connected: hasGoogleToken },
    { id: 'grounded', label: t.groundedAi, icon: Sparkles },
  ];

  const activeNav = navItems.find((n) => n.id === currentTab) || navItems[0];

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-white select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlFurqaanLogo size="md" className="border border-white/25 shadow-md shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">
              Dijital Al-Furqaan
            </h1>
            <p className="text-[11px] text-blue-200/80 truncate">
              Hifz Center · Finfinnee
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Status Strip */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-[11px]">
        <span className="text-blue-200/75 font-medium">Sadarkaa Aangoo</span>
        {isOwner ? (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
            <Crown className="w-3 h-3" /> Owner
          </span>
        ) : isAdmin ? (
          <span className="inline-flex items-center gap-1 font-semibold text-blue-200">
            <Shield className="w-3 h-3" /> Admin
          </span>
        ) : (
          <span className="text-slate-300 font-medium">Galmeessaa</span>
        )}
      </div>

      {/* Lateral Vertical Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300/60">
          Tajaajiloota (Menu)
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                isActive
                  ? 'bg-white text-[#0B1F3A] shadow-sm'
                  : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-blue-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.connected && (
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-blue-300'
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Owner / Admin Role Management Shortcut */}
        {(isOwner || isAdmin) && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300/60">
              Bulchiinsa (Governance)
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenRoleManagement();
              }}
              title="Owner Namoota Admin Taasisuu Ykn kennuu Akka Danda'u Haala isaaf Mijjatu Uumi"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-amber-200 border border-white/10 transition text-left"
            >
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">Admin / Owner</span>
            </button>
          </div>
        )}
      </nav>

      {/* Sidebar Footer: Authenticated User & Sign Out */}
      <div className="p-4 border-t border-white/10 bg-[#08172C]">
        {user ? (
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full border border-white/25 shrink-0 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'A'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </div>
                <div className="text-[10px] text-blue-200/75 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              title={t.signOut}
              className="p-2 text-blue-200 hover:text-rose-300 hover:bg-white/10 rounded-lg transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onGoogleSignIn}
            className="w-full py-2.5 px-3 bg-white text-[#0B1F3A] hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <span>{t.googleSignIn}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Lateral Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 hidden lg:flex flex-col border-r border-slate-800 print:hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Slide-Over Left Lateral Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[82vw] h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Slim Top Utility Header aligned right of sidebar */}
      <header className="lg:ml-64 sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Button + Active Section Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#0B1F3A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="lg:hidden shrink-0">
                <AlFurqaanLogo size="sm" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#0B1F3A] dark:text-white truncate">
                  {activeNav.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                  Giddu-gala Hifzii Qur’aanaa Al-Furqaan
                </div>
              </div>
            </div>
          </div>

          {/* Right: Theme Switcher, Language Switcher, Quick Google Sync */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Selector (Minimalist Deep Blue & White default, Ivory gold, Night dark) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
              <button
                onClick={() => setTheme('light')}
                title="Minimalist Deep Blue & White"
                className={`p-1.5 rounded-lg text-xs font-medium transition ${
                  theme === 'light'
                    ? 'bg-[#0B1F3A] text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('ivory')}
                title="Ivory & Gold Theme"
                className={`p-1.5 rounded-lg text-xs font-medium transition ${
                  theme === 'ivory'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                title="Night Dark Theme"
                className={`p-1.5 rounded-lg text-xs font-medium transition ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-2 mr-1 hidden sm:block" />
              {(['om', 'en', 'am'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 text-xs font-semibold rounded-lg transition ${
                    lang === l
                      ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Active Google Badge */}
            {user && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-[11px] font-semibold text-[#0B1F3A] dark:text-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Google Active</span>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
