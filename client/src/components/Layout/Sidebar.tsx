import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Box,
  Layers,
  Folder,
  HardDrive,
  Globe,
  Server,
  FileText,
  Settings,
  HelpCircle,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  version?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onSwitchToPortal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  version = 'v0.1.0',
  isMobileOpen,
  onCloseMobile,
  onSwitchToPortal
}) => {
  const { user, openAuthModal, logout, isGuest } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apps', label: 'Apps', icon: Grid },
    { id: 'containers', label: 'Containers', icon: Box },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'system', label: 'System', icon: Server },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col justify-between p-4 bg-white dark:bg-obsidian-950 border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Top Branding & Main Nav */}
      <div className="space-y-6">
        
        {/* Brand */}
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center space-x-3 px-2 cursor-pointer select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-lantern-500/20 border border-amber-500/30 glow-lantern text-amber-500">
            <LanternLogo size={22} glow />
          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
              Lantern
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Your home server, enlightened.
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-600 dark:text-lantern-400 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-obsidian-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500 dark:text-lantern-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Settings, Status & User Profile */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
        
        {/* Settings & Help */}
        <div className="space-y-0.5">
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-amber-500/15 text-amber-600 dark:text-lantern-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-obsidian-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => handleNavClick('help')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'help'
                ? 'bg-amber-500/15 text-amber-600 dark:text-lantern-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-obsidian-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Help</span>
          </button>
        </div>

        {/* Family Portal Quick Switcher */}
        {onSwitchToPortal && (
          <button
            onClick={onSwitchToPortal}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-lantern-400 text-xs font-bold transition-all shadow-sm group active:scale-95"
            title="Switch to Family Home Screen"
          >
            <div className="flex items-center space-x-2">
              <LanternLogo size={16} />
              <span>Family Home Portal</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Version Status Pill */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <div className="text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Lantern {version}</span>
            <span className="block text-[10px] text-slate-400 dark:text-slate-500">Running smoothly</span>
          </div>
        </div>

        {/* User Profile Card */}
        <div
          onClick={openAuthModal}
          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-obsidian-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 cursor-pointer transition-all group"
        >
          <div className="flex items-center space-x-2.5 overflow-hidden">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-amber-500/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {(user?.name || 'Dwip').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {user?.name || 'Dwip'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {user?.role || 'admin'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {user ? (
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="p-1 text-slate-400 hover:text-rose-500 rounded"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};
