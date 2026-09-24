import React from 'react';
import { LayoutDashboard, Grid, Folder, Layers, Sparkles } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchToPortal?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, onSwitchToPortal }) => {
  const tabs = [
    { id: 'dashboard', label: 'Console', icon: LayoutDashboard },
    { id: 'apps', label: 'Apps', icon: Grid },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'services', label: 'Services', icon: Layers },
    ...(onSwitchToPortal ? [{ id: 'portal', label: 'Family', icon: Sparkles, isAction: true }] : [])
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-obsidian-950/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800/90 px-3 py-1.5 flex items-center justify-around pb-safe shadow-2xl">
      {tabs.map((tab: any) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.isAction && onSwitchToPortal) {
                onSwitchToPortal();
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`flex flex-col items-center space-y-0.5 py-1 px-2.5 rounded-2xl transition-all active:scale-90 ${
              isActive
                ? 'text-amber-500 dark:text-lantern-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className={`p-1 rounded-xl ${isActive ? 'bg-amber-500/15' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
