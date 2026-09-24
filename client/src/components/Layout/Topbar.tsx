import React from 'react';
import { Search, Sun, Moon, Bell, ChevronDown, X, Menu, LogOut } from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  alertCount?: number;
  onOpenNotifications?: () => void;
  onSwitchToPortal?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
  alertCount = 0,
  onOpenNotifications,
  onSwitchToPortal,
  onOpenCommandPalette
}) => {
  const { theme, setTheme } = useTheme();
  const { user, openAuthModal, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 w-full flex items-center justify-between px-4 sm:px-8 bg-white/80 dark:bg-obsidian-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 transition-colors glass-reflection">
      
      {/* Mobile brand & hamburger */}
      <div className="flex items-center space-x-3 lg:hidden">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2">
          <LanternLogo size={20} />
          <span className="font-extrabold text-base text-slate-900 dark:text-white">Lantern</span>
        </div>
      </div>

      {/* Global Search Bar (Desktop) - Launches Command Palette */}
      <div
        onClick={onOpenCommandPalette}
        className="hidden sm:flex items-center w-80 lg:w-96 cursor-pointer group"
      >
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 group-hover:text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            readOnly
            placeholder="Search commands, movies, apps... (⌘K)"
            onClick={onOpenCommandPalette}
            className="w-full bg-slate-100/80 dark:bg-obsidian-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-16 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 cursor-pointer group-hover:border-amber-500/50 group-hover:bg-slate-100 dark:group-hover:bg-obsidian-850 transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-0.5 pointer-events-none">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-obsidian-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm">
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Home Portal, Mobile Search, Theme Switcher, Notifications, User Chip */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Mobile Search Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="sm:hidden p-2 rounded-2xl bg-slate-100 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-400 transition-colors"
            title="Search anything (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
        
        {/* Switch to Home Portal Pill */}
        {onSwitchToPortal && (
          <button
            onClick={onSwitchToPortal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lantern transition-all active:scale-95"
            title="Switch to Family Home Portal"
          >
            <LanternLogo size={14} />
            <span className="hidden sm:inline">Home Portal</span>
            <span className="sm:hidden text-[11px]">Portal</span>
          </button>
        )}

        {/* Segmented Light / Dark Toggle matching prototype */}
        <div className="flex items-center bg-slate-100 dark:bg-obsidian-900 p-1 rounded-full border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-full transition-all ${
              theme === 'light'
                ? 'bg-white text-amber-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Light Mode"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-full transition-all ${
              theme === 'dark'
                ? 'bg-obsidian-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Dark Mode"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-2xl bg-slate-100 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-obsidian-950"></span>
          )}
        </button>

        {/* User Pill (Desktop) */}
        <div className="relative">
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="hidden sm:flex items-center space-x-2.5 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.name || 'User'}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {(user?.name || 'Dwip').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                {user?.name || (user?.role === 'guest' ? 'Guest Visitor' : 'Dwip')}
              </span>
              <span className="text-[10px] text-slate-400 capitalize block leading-tight">
                {user?.role || 'Guest'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Guest'}</p>
                <p className="text-[10px] text-slate-400 font-mono">@{user?.username || 'guest'}</p>
              </div>

              <button
                onClick={() => { setUserMenuOpen(false); openAuthModal(); }}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition-colors"
              >
                Switch Account
              </button>

              {onSwitchToPortal && (
                <button
                  onClick={() => { setUserMenuOpen(false); onSwitchToPortal(); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/10 transition-colors flex items-center justify-between"
                >
                  <span>Family Home Portal</span>
                  <LanternLogo size={16} />
                </button>
              )}

              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="w-full text-left px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium flex items-center justify-between"
              >
                <span>Sign Out</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
