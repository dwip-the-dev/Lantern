import React from 'react';
import {
  Folder,
  Home,
  Grid,
  Film,
  Gamepad2,
  Search,
  Server,
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';
import { useAuth } from '../../context/AuthContext';

interface UserSidebarProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onSwitchToAdmin: () => void;
  onOpenCommandPalette?: () => void;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
  activeCategory,
  setActiveCategory,
  onSwitchToAdmin,
  onOpenCommandPalette
}) => {
  const { user, isAdmin, openAuthModal, logout } = useAuth();

  const navItems = [
    { id: 'Home', label: 'For You', icon: Sparkles },
    { id: 'Media', label: 'Cinema', icon: Film },
    { id: 'Apps', label: 'Apps', icon: Grid },
    { id: 'Files', label: 'Files', icon: Folder },
    { id: 'Search', label: 'Search', icon: Search, shortcut: '⌘K' },
  ];

  const avatarColor = (() => {
    const u = user?.username?.toLowerCase();
    if (u === 'dwip') return '#f59e0b';
    if (u === 'sarah') return '#ec4899';
    if (u === 'leo') return '#3b82f6';
    if (u === 'livingroom') return '#10b981';
    return '#8b5cf6';
  })();

  return (
    <aside className="hidden lg:flex flex-col justify-between w-[220px] h-screen sticky top-0 px-3 py-5 bg-white/60 dark:bg-black/40 backdrop-blur-[60px] dark:backdrop-saturate-[1.8] border-r border-black/[0.04] dark:border-white/[0.04] z-30 transition-colors">
      
      {/* Brand */}
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-3 py-1">
          <div className="w-9 h-9 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-lantern-pulse">
            <LanternLogo size={20} className="text-white" glow />
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-tight leading-none text-gradient-gold">Lantern</div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium tracking-wide">HOME SERVER</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'Search' && onOpenCommandPalette) {
                    onOpenCommandPalette();
                  } else {
                    setActiveCategory(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 pill-btn ${
                  isActive
                    ? 'bg-white/90 dark:bg-white/[0.12] text-amber-600 dark:text-amber-400 font-semibold shadow-sm dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-amber-500' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded border border-black/[0.04] dark:border-white/[0.06]">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="space-y-2 px-1">
        {isAdmin && (
          <button
            onClick={onSwitchToAdmin}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all pill-btn border border-amber-500/15"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span>Console</span>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </button>
        )}

        <div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />

        <div className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer group" onClick={openAuthModal}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md" style={{ backgroundColor: avatarColor }}>
              {(user?.name || 'D')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Dwip'}</div>
              <div className="text-[9px] text-slate-400 capitalize">{user?.role || 'admin'}</div>
            </div>
          </div>
          {user && (
            <button onClick={(e) => { e.stopPropagation(); logout(); }}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
