import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Film, AppWindow, Folder, Terminal, Sun, Moon, Volume2, VolumeX,
  Sparkles, Power, RefreshCw, Layers, HardDrive, Cpu, Activity,
  ArrowRight, CornerDownLeft, X, Command, ShieldCheck, Play, ArrowUpRight,
  ExternalLink, Check, Trash2, Box, Zap
} from 'lucide-react';
import { LanternLogo } from './LanternLogo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { audioFeedback } from '../../utils/audioFeedback';
import { api } from '../../api/client';

export interface CommandItem {
  id: string;
  category: 'media' | 'apps' | 'navigation' | 'actions' | 'files';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  keywords: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSwitchPortal: (mode: 'user' | 'admin') => void;
  onPlayMedia?: (title: string, videoUrl: string, posterUrl: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSwitchPortal,
  onPlayMedia
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [realVideos, setRealVideos] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      audioFeedback.playSwoosh();
      setTimeout(() => inputRef.current?.focus(), 50);
      api.getContinueWatching()
        .then(vids => setRealVideos(vids || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Built-in commands list
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: 'nav-portal',
        category: 'navigation',
        title: 'Family Home Portal',
        description: 'Switch to Apple TV style cinema & living room view',
        icon: Sparkles,
        iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        badge: 'Family View',
        keywords: ['home', 'portal', 'tv', 'family', 'movies', 'player'],
        action: () => {
          onSwitchPortal('user');
          toast.info('Switched to Family Home Portal');
        }
      },
      {
        id: 'nav-admin',
        category: 'navigation',
        title: 'Homelab Admin Console',
        description: 'Manage Docker, containers, storage pools and telemetry',
        icon: Layers,
        iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        badge: 'Admin Console',
        keywords: ['admin', 'dashboard', 'homelab', 'console', 'docker'],
        action: () => {
          if (!isAdmin) {
            toast.warning('Admin privileges required.');
            return;
          }
          onSwitchPortal('admin');
          onNavigateTab('dashboard');
          toast.info('Switched to Admin Console');
        }
      },
      {
        id: 'nav-appstore',
        category: 'navigation',
        title: '1-Click App Store',
        description: 'Browse, install and deploy 1-click self-hosted apps',
        icon: AppWindow,
        iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
        badge: 'App Store',
        keywords: ['apps', 'store', 'install', 'catalog', 'jellyfin', 'plex', 'nextcloud'],
        action: () => {
          onSwitchPortal('admin');
          onNavigateTab('apps');
        }
      },
      {
        id: 'nav-files',
        category: 'navigation',
        title: 'Cloud Drive & File Vault',
        description: 'Explore shared storage, download and upload files',
        icon: Folder,
        iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        badge: 'Files',
        keywords: ['files', 'cloud', 'drive', 'upload', 'download', 'storage'],
        action: () => {
          onSwitchPortal('admin');
          onNavigateTab('files');
        }
      },
      {
        id: 'nav-containers',
        category: 'navigation',
        title: 'Docker Containers',
        description: 'Inspect running containers, CPU memory usage and logs',
        icon: Box,
        iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
        badge: 'Containers',
        keywords: ['docker', 'containers', 'services', 'restart', 'stop'],
        action: () => {
          onSwitchPortal('admin');
          onNavigateTab('containers');
        }
      },
      {
        id: 'nav-terminal',
        category: 'navigation',
        title: 'Web Terminal',
        description: 'Real-time root bash shell inside Lantern',
        icon: Terminal,
        iconBg: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
        badge: 'Terminal',
        keywords: ['terminal', 'shell', 'bash', 'command', 'cli', 'ssh'],
        action: () => {
          onSwitchPortal('admin');
          onNavigateTab('system');
        }
      },

      // Real Media Streams from Host Storage
      ...realVideos.map(v => ({
        id: `media-${v.id || v.title.toLowerCase().replace(/\s+/g, '-')}`,
        category: 'media' as const,
        title: v.title,
        description: `${v.quality_label || 'HD'} · ${v.video_codec || 'Video'} · ${v.duration_formatted || v.file_size_formatted || ''}`,
        icon: Film,
        iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        badge: 'Play in Cinema',
        keywords: ['movie', 'video', 'watch', 'play', 'stream', v.title.toLowerCase(), (v.platform || '').toLowerCase()],
        action: () => {
          if (onPlayMedia) {
            onPlayMedia(v.title, v.stream_url || v.target_url, v.thumbnail);
          } else {
            onSwitchPortal('user');
          }
          toast.success(`Playing ${v.title}`);
        }
      })),

      // Instant Actions
      {
        id: 'act-theme',
        category: 'actions',
        title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        description: `Current mode is ${theme}. Toggle high-contrast theme`,
        icon: theme === 'dark' ? Sun : Moon,
        iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        badge: 'Display',
        keywords: ['theme', 'dark', 'light', 'mode', 'color'],
        action: () => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          audioFeedback.playPop();
          toast.info(`Theme set to ${next} mode`);
        }
      },
      {
        id: 'act-sound',
        category: 'actions',
        title: audioFeedback.isEnabled() ? 'Mute Spatial Audio' : 'Enable Spatial Audio',
        description: audioFeedback.isEnabled() ? 'Turn off synthesizer clicks and pops' : 'Turn on Web Audio physical sound feedback',
        icon: audioFeedback.isEnabled() ? VolumeX : Volume2,
        iconBg: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
        badge: 'Audio',
        keywords: ['sound', 'audio', 'mute', 'volume', 'chime', 'clicks'],
        action: () => {
          const newState = audioFeedback.toggle();
          if (newState) audioFeedback.playChime();
          toast.info(newState ? 'Spatial sound effects enabled' : 'Sound effects muted');
        }
      },
      {
        id: 'act-prune',
        category: 'actions',
        title: 'Prune Unused Docker Data',
        description: 'Reclaim storage space by pruning dangling images & containers',
        icon: Trash2,
        iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        badge: 'Maintenance',
        keywords: ['prune', 'cleanup', 'clean', 'storage', 'docker', 'reclaim'],
        action: async () => {
          if (!isAdmin) {
            toast.warning('Admin privileges required.');
            return;
          }
          try {
            toast.info('Running Docker cleanup...');
            await api.pruneDocker();
            toast.success('Unused Docker cache & images pruned');
          } catch (e: any) {
            toast.error(e.message || 'Prune failed');
          }
        }
      },
      {
        id: 'act-reboot',
        category: 'actions',
        title: 'Restart Lantern Daemon',
        description: 'Gracefully restart background Lantern service',
        icon: RefreshCw,
        iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        badge: 'System',
        keywords: ['restart', 'reboot', 'reload', 'server'],
        action: async () => {
          if (!isAdmin) {
            toast.warning('Admin privileges required.');
            return;
          }
          toast.warning('Restarting Lantern system...');
          try {
            await api.restartServer();
          } catch (_) {}
        }
      }
    ];

    return list;
  }, [theme, isAdmin, onNavigateTab, onSwitchPortal, onPlayMedia, realVideos, setTheme, toast]);

  // Filtered results
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.description.toLowerCase().includes(q)) return true;
      return item.keywords.some(k => k.includes(q));
    });
  }, [commands, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        audioFeedback.playPop();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        audioFeedback.playPop();
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          audioFeedback.playClick();
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-28 px-4 bg-black/65 backdrop-blur-2xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-obsidian-950/90 dark:bg-obsidian-950/90 border border-white/15 rounded-3xl shadow-2xl overflow-hidden glass-reflection card-spotlight animate-scale-up"
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.15)'
        }}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Search className="w-4 h-4 text-amber-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, movie, app or action... (e.g. 'bunny', 'terminal', 'dark')"
            className="w-full bg-transparent text-sm sm:text-base font-medium text-white placeholder-slate-400 focus:outline-none tracking-tight"
          />
          {query ? (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-slate-300">
                ESC
              </span>
            </div>
          )}
        </div>

        {/* Command Items List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-white/[0.03]"
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Search className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No matching commands found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for movies, docker, terminal or theme</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    audioFeedback.playClick();
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/40 text-white shadow-lg'
                      : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg || 'bg-white/10 text-slate-200'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-100'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 font-bold">
                        <span>Select</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-t border-white/10 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-slate-300">↑↓</span>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-slate-300">↵</span>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-slate-300">ESC</span>
              <span>Close</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <LanternLogo size={14} />
            <span className="font-bold text-[10px] text-slate-400">Lantern Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
