import React from 'react';
import {
  LayoutDashboard,
  Store,
  Container as ContainerIcon,
  Globe,
  FolderTree,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  AlertTriangle,
  Cpu,
  HardDrive,
  Activity
} from 'lucide-react';
import { SystemInfo, SystemStats } from '../../types';
import { LanternLogo } from '../Common/LanternLogo';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  info: SystemInfo | null;
  stats: SystemStats | null;
  alertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  info,
  stats,
  alertCount
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appstore', label: 'App Store', icon: Store, badge: '1-Click' },
    { id: 'containers', label: 'Containers', icon: ContainerIcon },
    { id: 'expose', label: 'Expose', icon: Globe, highlight: true },
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const primaryDisk = stats?.disks?.[0];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-obsidian-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-lantern-500/20 to-amber-600/10 border border-lantern-500/30 glow-lantern">
              <LanternLogo size={22} className="text-amber-400" glow />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center">
                  Lantern
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-lantern-500/20 text-lantern-300 border border-lantern-500/30">
                    v1.0
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {info?.tagline || 'Your home server enlightened'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar (Desktop) */}
          <div className="hidden lg:flex items-center space-x-4 bg-obsidian-900/60 border border-slate-800/60 rounded-full px-4 py-1.5 text-xs text-slate-300">
            {/* CPU */}
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-lantern-400" />
              <span>CPU</span>
              <span className="font-mono font-semibold text-slate-100">
                {stats ? `${Math.round(stats.cpu.percent)}%` : '--'}
              </span>
            </div>

            <span className="text-slate-700">|</span>

            {/* RAM */}
            <div className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>RAM</span>
              <span className="font-mono font-semibold text-slate-100">
                {stats ? `${Math.round(stats.memory.percent)}%` : '--'}
              </span>
            </div>

            {primaryDisk && (
              <>
                <span className="text-slate-700">|</span>
                <div className="flex items-center space-x-1.5">
                  <HardDrive className={`w-3.5 h-3.5 ${primaryDisk.percent > 85 ? 'text-rose-400' : 'text-cyan-400'}`} />
                  <span>Disk</span>
                  <span className={`font-mono font-semibold ${primaryDisk.percent > 85 ? 'text-rose-400' : 'text-slate-100'}`}>
                    {Math.round(primaryDisk.percent)}%
                  </span>
                </div>
              </>
            )}

            <span className="text-slate-700">|</span>

            {/* Docker indicator */}
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${info?.docker_running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-[11px] text-slate-400">
                {info?.docker_running ? 'Docker Engine' : 'Sandbox Mode'}
              </span>
            </div>
          </div>

          {/* Alert button & Server Info */}
          <div className="flex items-center space-x-3">
            {alertCount > 0 && (
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium animate-pulse"
                title={`${alertCount} alert(s) requiring attention`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{alertCount}</span>
              </button>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-300">
                {info?.hostname || 'server'}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {info?.uptime_human ? `up ${info.uptime_human}` : info?.local_ip || '127.0.0.1'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-lantern-500/15 text-lantern-300 border border-lantern-500/30 shadow-inner-dark'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/50 border border-transparent'
                } ${tab.highlight && !isActive ? 'text-amber-300/80 hover:text-amber-200' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-lantern-400' : tab.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-lantern-400 border border-lantern-500/20">
                    {tab.badge}
                  </span>
                )}
                {tab.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-lantern-400 animate-ping absolute -top-0.5 -right-0.5"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
