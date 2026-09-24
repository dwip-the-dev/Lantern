import React from 'react';
import { Home, Grid, Folder, Film, Users, Sparkles } from 'lucide-react';

interface UserMobileNavProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onOpenFamilyModal?: () => void;
}

export const UserMobileNav: React.FC<UserMobileNavProps> = ({
  activeCategory,
  setActiveCategory,
  onOpenFamilyModal
}) => {
  const tabs = [
    { id: 'Home', label: 'For You', icon: Sparkles },
    { id: 'Media', label: 'Cinema', icon: Film },
    { id: 'Apps', label: 'Apps', icon: Grid },
    { id: 'Files', label: 'Files', icon: Folder },
    { id: 'Family', label: 'Profile', icon: Users, isAction: true },
  ];

  return (
    <nav className="lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-50 bg-white/80 dark:bg-[#0a0a0e]/80 backdrop-blur-[40px] dark:backdrop-saturate-[1.8] border border-black/[0.06] dark:border-white/[0.06] rounded-[22px] px-1.5 py-1.5 flex items-center justify-around shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.isAction && onOpenFamilyModal) {
                onOpenFamilyModal();
              } else {
                setActiveCategory(tab.id);
              }
            }}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300 active:scale-[0.88] relative ${
              isActive
                ? 'text-amber-500'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${
              isActive ? 'bg-amber-500/12 scale-110' : ''
            }`}>
              <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2.2 : 1.8} />
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-amber-500" />
              )}
            </div>
            <span className={`text-[10px] leading-tight transition-all ${
              isActive ? 'font-bold' : 'font-medium'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
