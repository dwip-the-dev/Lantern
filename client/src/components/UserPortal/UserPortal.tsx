import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play, Plus, Sun, Moon, ChevronRight, Server, X, Film, Power, Users, Lock, Check,
  Folder, Search as SearchIcon, ExternalLink, Zap, Clock, Bell, Activity, Cpu,
  HardDrive, Wifi, Upload, Settings, BarChart3, Sparkles, ArrowUpRight, Tv,
  ChevronLeft, Volume2, VolumeX, Maximize, Pause, RotateCcw, Download, Eye, Gamepad2,
  LayoutGrid, Image as ImageIcon, FileText, Music, Crown, Heart, User, Package,
  Layers, ShieldCheck, ArrowRight, Bookmark, BookmarkCheck, Radio
} from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { audioFeedback } from '../../utils/audioFeedback';
import { UserSidebar } from './UserSidebar';
import { UserMobileNav } from './UserMobileNav';
import { FilePane } from './FilePane';
import { api } from '../../api/client';
import {
  ContinueWatchingItem, UserPortalApp, FamilyMember, SystemStats, SystemInfo,
  ActivityItem, NotificationItem, StorageBreakdown
} from '../../types';

interface UserPortalProps {
  onSwitchToAdmin: () => void;
  onOpenAppStore: () => void;
  localIp: string;
  onOpenCommandPalette?: () => void;
  initialMedia?: { title: string; videoUrl: string; posterUrl: string } | null;
}

/* ─── Minimal Loading Skeleton ─── */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-white/[0.03] dark:bg-white/[0.04] rounded-2xl ${className}`}>
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer" />
  </div>
);

/* ─── Apple-Grade Radial Telemetry Gauge ─── */
const RadialGauge: React.FC<{
  value: number;
  size?: number;
  color: string;
  trackColor?: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}> = ({
  value, size = 68, color, trackColor = 'rgba(255,255,255,0.06)', label, sub, icon
}) => {
  const r = (size - 7) / 2;
  const c = 2 * Math.PI * r;
  const safeVal = Math.min(Math.max(value || 0, 0), 100);
  const off = c - (safeVal / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5 group">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="5.5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5.5"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
            className="transition-all duration-[1.2s] ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}66)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[12px] font-black tracking-tight text-slate-100 flex items-center">
            {Math.round(safeVal)}<span className="text-[8px] font-semibold text-slate-400 ml-0.5">%</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[11px] font-bold text-slate-200">{label}</span>
      </div>
      {sub && <span className="text-[9px] font-medium text-slate-400 -mt-1">{sub}</span>}
    </div>
  );
};

export const UserPortal: React.FC<UserPortalProps> = ({
  onSwitchToAdmin,
  onOpenAppStore,
  localIp,
  onOpenCommandPalette,
  initialMedia
}) => {
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, openAuthModal, logout, familyMembers, switchProfile, openOnboarding } = useAuth();
  
  const [activeCategory, setActiveCategory] = useState('Home');
  const [mediaFilter, setMediaFilter] = useState('All');
  const [appFilter, setAppFilter] = useState('All');
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [apps, setApps] = useState<UserPortalApp[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [portalSearchQuery, setPortalSearchQuery] = useState('');
  const [selectedFolderPath, setSelectedFolderPath] = useState('~/.lantern/family_shared');
  const [isLoading, setIsLoading] = useState(true);
  
  // Real stats & system info
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  // UI states
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Video Player & Preview Sheet state
  const [activeMedia, setActiveMedia] = useState<ContinueWatchingItem | null>(null);
  const [previewMedia, setPreviewMedia] = useState<ContinueWatchingItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSyncRef = useRef(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroProgress, setHeroProgress] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Watchlist & Audio feedback
  const toast = useToast();
  const [audioEnabled, setAudioEnabled] = useState(audioFeedback.isEnabled());
  const [liveDate, setLiveDate] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lantern_watchlist') || '[]'); } catch { return []; }
  });

  // TV 10-foot UI mode
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvFocusIndex, setTvFocusIndex] = useState(0);

  // Dynamic Ambient Theme based on Active Tab and Active Hero
  const ambientTheme = useMemo(() => {
    if (activeCategory === 'Media') {
      return {
        orb1: 'from-purple-600/35 via-indigo-600/25 to-pink-600/20',
        orb2: 'from-rose-600/30 via-red-600/20 to-purple-800/30',
        orb3: 'from-blue-600/25 via-cyan-600/20 to-indigo-700/25',
        glowColor: '#a855f7'
      };
    }
    if (activeCategory === 'Apps') {
      return {
        orb1: 'from-emerald-500/35 via-teal-500/25 to-cyan-500/20',
        orb2: 'from-sky-500/25 via-blue-600/20 to-teal-600/25',
        orb3: 'from-amber-500/25 via-emerald-600/20 to-lime-500/20',
        glowColor: '#10b981'
      };
    }
    if (activeCategory === 'Files') {
      return {
        orb1: 'from-cyan-500/35 via-sky-500/25 to-blue-600/20',
        orb2: 'from-indigo-600/25 via-blue-500/20 to-teal-500/25',
        orb3: 'from-teal-500/25 via-sky-600/20 to-cyan-600/20',
        glowColor: '#0ea5e9'
      };
    }
    if (activeCategory === 'Games') {
      return {
        orb1: 'from-fuchsia-600/35 via-purple-600/25 to-rose-500/20',
        orb2: 'from-violet-600/30 via-indigo-600/20 to-amber-500/25',
        orb3: 'from-pink-500/25 via-fuchsia-600/20 to-purple-700/25',
        glowColor: '#d946ef'
      };
    }
    if (activeCategory === 'Search') {
      return {
        orb1: 'from-sky-500/35 via-indigo-500/25 to-purple-600/20',
        orb2: 'from-violet-600/25 via-cyan-500/20 to-blue-600/25',
        orb3: 'from-slate-600/25 via-sky-500/20 to-indigo-500/20',
        glowColor: '#38bdf8'
      };
    }
    // Default Home with dynamic mood based on active hero slide
    if (heroIdx === 1) {
      return {
        orb1: 'from-cyan-500/35 via-blue-600/30 to-indigo-700/25',
        orb2: 'from-violet-600/30 via-fuchsia-600/20 to-cyan-600/25',
        orb3: 'from-emerald-500/20 via-teal-600/20 to-blue-700/25',
        glowColor: '#06b6d4'
      };
    }
    if (heroIdx === 2) {
      return {
        orb1: 'from-rose-500/35 via-purple-600/25 to-amber-500/20',
        orb2: 'from-sky-500/25 via-indigo-600/25 to-rose-600/25',
        orb3: 'from-indigo-600/25 via-violet-600/20 to-amber-600/20',
        glowColor: '#f43f5e'
      };
    }
    return {
      orb1: 'from-amber-500/35 via-orange-500/25 to-emerald-500/20',
      orb2: 'from-purple-600/25 via-amber-600/20 to-rose-500/20',
      orb3: 'from-emerald-500/25 via-teal-500/20 to-amber-600/25',
      glowColor: '#f59e0b'
    };
  }, [activeCategory, heroIdx]);

  // Card interactive spotlight highlight
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
  }, []);

  const handleToggleAudio = () => {
    const state = audioFeedback.toggle();
    setAudioEnabled(state);
    if (state) {
      toast.success('Spatial UI Audio enabled');
    } else {
      toast.info('Spatial UI Audio muted');
    }
  };

  const toggleBookmark = (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    const exists = bookmarkedIds.includes(item.id);
    const updated = exists ? bookmarkedIds.filter(id => id !== item.id) : [...bookmarkedIds, item.id];
    setBookmarkedIds(updated);
    localStorage.setItem('lantern_watchlist', JSON.stringify(updated));
    audioFeedback.playSuccess();
    if (exists) {
      toast.info(`Removed "${item.title}" from Watchlist`);
    } else {
      toast.success(`Saved "${item.title}" to Watchlist`);
    }
  };

  // ─── Helpers ───
  const handleOpenStore = () => {
    audioFeedback.playClick();
    if (isAdmin) onOpenAppStore();
    else setActiveCategory('Apps');
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cw, ua] = await Promise.all([
        api.getContinueWatching().catch(() => []),
        api.getUserApps().catch(() => [])
      ]);
      setContinueWatching(cw);
      setApps(ua);
    } catch (_) {}
    setIsLoading(false);
  };

  // ─── Initial Load & Websocket ───
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (initialMedia) {
      setActiveMedia({
        id: `m-${Date.now()}`,
        platform: 'Cinema',
        title: initialMedia.title,
        progress: 0,
        thumbnail: initialMedia.posterUrl,
        badge_color: '#f59e0b',
        icon: 'film',
        target_url: initialMedia.videoUrl,
        stream_url: initialMedia.videoUrl
      });
    }
  }, [initialMedia]);

  useEffect(() => {
    const upd = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const d = api.connectStatsWebSocket(
      s => setSystemStats(s),
      () => {}
    );
    return d;
  }, []);

  useEffect(() => {
    api.getSystemInfo().then(setSystemInfo).catch(() => {});
    api.getNotifications().then(setNotifications).catch(() => {});
    api.getActivity().then(setActivities).catch(() => {});
    api.getStorageBreakdown().then(setStorageBreakdown).catch(() => {});
  }, []);

  // Hero Carousel auto-advance with fluid progress bar
  useEffect(() => {
    if (continueWatching.length <= 1 || isHeroHovered) return;
    const interval = 100;
    const duration = 7500;
    const timer = setInterval(() => {
      setHeroProgress(prev => {
        if (prev >= 100) {
          setHeroIdx(p => (p + 1) % continueWatching.length);
          audioFeedback.playSwoosh();
          return 0;
        }
        return prev + (interval / duration) * 100;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [continueWatching.length, isHeroHovered]);

  // Click outside notification dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ─── TV Remote / D-Pad Navigation ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
        if (!isTvMode) setIsTvMode(true);
      }

      if (e.key === 'Escape') {
        if (previewMedia) {
          setPreviewMedia(null);
          return;
        }
        if (activeMedia) {
          setActiveMedia(null);
          return;
        }
        if (showFamilyModal) {
          setShowFamilyModal(false);
          return;
        }
        if (showNotifDropdown) {
          setShowNotifDropdown(false);
          return;
        }
        if (activeCategory !== 'Home') {
          setActiveCategory('Home');
          return;
        }
      }

      // Arrow navigation
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setTvFocusIndex(prev => prev + 1);
      } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setTvFocusIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        const focusedEl = document.querySelector('.tv-focus-active') as HTMLElement;
        if (focusedEl) {
          e.preventDefault();
          focusedEl.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode, previewMedia, activeMedia, showFamilyModal, showNotifDropdown, activeCategory]);

  // Auto-scroll TV focused element into view
  useEffect(() => {
    if (isTvMode) {
      const allTargets = document.querySelectorAll('.tv-focus-target');
      if (allTargets.length > 0) {
        const targetIdx = tvFocusIndex % allTargets.length;
        allTargets.forEach((el, idx) => {
          if (idx === targetIdx) {
            el.classList.add('tv-focus-active');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } else {
            el.classList.remove('tv-focus-active');
          }
        });
      }
    } else {
      document.querySelectorAll('.tv-focus-active').forEach(el => el.classList.remove('tv-focus-active'));
    }
  }, [tvFocusIndex, isTvMode, activeCategory, continueWatching, apps]);

  // ─── Personalization & Greets ───
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = user?.name || 'Friend';
  const unread = notifications.filter(n => !n.read || n.read === 0).length;
  const heroItem = continueWatching[heroIdx % (continueWatching.length || 1)] || null;

  const avatarColor = useMemo(() => {
    const u = user?.username?.toLowerCase();
    if (u === 'dwip') return '#f59e0b';
    if (u === 'sarah') return '#ec4899';
    if (u === 'leo') return '#3b82f6';
    if (u === 'livingroom') return '#10b981';
    return '#8b5cf6';
  }, [user?.username]);

  // ─── Bulletproof App Launch Logic ───
  const getAppLaunchUrl = (app: UserPortalApp): string | null => {
    if (app.url) return app.url;
    if (!app.default_port) return null;
    const curHost = window.location.hostname;
    const host = (curHost && curHost !== '0.0.0.0') ? curHost : (localIp || 'localhost');
    return `http://${host}:${app.default_port}`;
  };

  const handleAppLaunch = (app: UserPortalApp, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    audioFeedback.playClick();
    const url = getAppLaunchUrl(app);
    if (!url) return;

    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.location.href = url;
    }
  };

  // ─── Media Launch & Progress Sync ───
  const handleMediaLaunch = (item: ContinueWatchingItem) => {
    audioFeedback.playSuccess();
    setActiveMedia(item);
  };

  const handlePlayVideoPath = (videoPath: string, title: string) => {
    audioFeedback.playSuccess();
    setActiveMedia({
      id: `f-${Date.now()}`,
      platform: 'Local',
      title,
      progress: 0,
      thumbnail: `/api/media/thumbnail?path=${encodeURIComponent(videoPath)}`,
      badge_color: '#a855f7',
      icon: 'video',
      target_url: `/api/media/stream?path=${encodeURIComponent(videoPath)}`,
      stream_url: `/api/media/stream?path=${encodeURIComponent(videoPath)}`,
      file_path: videoPath
    });
  };

  const onVideoLoaded = () => {
    if (videoRef.current && activeMedia?.position_sec) {
      videoRef.current.currentTime = activeMedia.position_sec;
    }
  };

  const onVideoTime = () => {
    if (!videoRef.current || !activeMedia) return;
    const now = Date.now();
    if (now - lastSyncRef.current > 3000) {
      lastSyncRef.current = now;
      const ct = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      api.updateMediaProgress({
        file_path: activeMedia.file_path || activeMedia.title,
        title: activeMedia.title,
        progress: Math.round((ct / dur) * 100),
        position_sec: ct,
        duration_sec: dur
      }).catch(() => {});
    }
  };

  // ─── Family Switcher ───
  const handleSelectMember = async (m: FamilyMember) => {
    if (m.username === user?.username) {
      setShowFamilyModal(false);
      return;
    }
    if (m.is_admin) {
      setSelectedMember(m);
      setSwitchPassword('');
      setSwitchError(null);
    } else {
      try {
        setIsSwitching(true);
        await switchProfile(m.username);
        setShowFamilyModal(false);
        await loadData();
      } catch (e: any) {
        setSwitchError(e.message || 'Switch failed');
      } finally {
        setIsSwitching(false);
      }
    }
  };

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchProfile(selectedMember.username, switchPassword);
      setShowFamilyModal(false);
      setSelectedMember(null);
      await loadData();
    } catch (e: any) {
      setSwitchError(e.message || 'Invalid password');
    } finally {
      setIsSwitching(false);
    }
  };

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return apps.filter(a => {
      if (appFilter === 'All') return true;
      if (appFilter === 'Downloaders') return a.category === 'Downloaders' || (a.slug ? (a.slug.includes('torrent') || a.slug.includes('transmission')) : a.name.toLowerCase().includes('transmission'));
      if (appFilter === 'Media') return a.category === 'Media' || (a.slug ? (a.slug.includes('plex') || a.slug.includes('jellyfin')) : false);
      return a.category === appFilter;
    });
  }, [apps, appFilter]);

  // Filtered Media
  const filteredMedia = useMemo(() => {
    return continueWatching.filter(m => {
      if (mediaFilter === 'All') return true;
      if (mediaFilter === 'Screencasts') return m.file_path?.includes('Screencast') || m.title.includes('Screencast');
      if (mediaFilter === 'Downloads') return m.file_path?.includes('Downloads');
      return true;
    });
  }, [continueWatching, mediaFilter]);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className={`min-h-screen flex font-sans transition-colors relative overflow-x-hidden ${
      theme === 'dark' ? 'mesh-gradient-dark text-white' : 'mesh-gradient-light text-slate-900'
    }`}>

      {/* ── Dynamic Ambient Floating Gradient Mesh Orbs (iOS / VisionOS Glow) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[20%] -left-[15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-tr ${ambientTheme.orb1} blur-3xl transform-gpu will-change-transform animate-mesh-orb-1 transition-all duration-[1600ms] ease-out`} />
        <div className={`absolute top-[25%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl ${ambientTheme.orb2} blur-3xl transform-gpu will-change-transform animate-mesh-orb-2 transition-all duration-[1600ms] ease-out`} />
        <div className={`absolute -bottom-[25%] left-[25%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr ${ambientTheme.orb3} blur-3xl transform-gpu will-change-transform animate-mesh-orb-3 transition-all duration-[1600ms] ease-out`} />
      </div>

      {/* Sidebar (desktop) */}
      <div className="hidden lg:block relative z-10">
        <UserSidebar
          activeCategory={activeCategory}
          setActiveCategory={(cat) => {
            audioFeedback.playClick();
            if (cat === 'Search') {
              if (onOpenCommandPalette) onOpenCommandPalette();
              return;
            }
            setActiveCategory(cat);
          }}
          onSwitchToAdmin={onSwitchToAdmin}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 max-w-[1500px] w-full mx-auto space-y-6 sm:space-y-7 pb-28 lg:pb-8">

          {/* ═══ MINIMALIST DELIVERABLE TOP HEADER ═══ */}
          <header className="flex items-center justify-between gap-4 animate-fade-in-up">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-[-0.03em] leading-tight text-white">
                  {greeting}, <span className="text-gradient-gold">{userName}</span>
                </h1>
                {isTvMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                    <Tv className="w-3 h-3" /> TV
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-2">
                <span>{systemInfo ? systemInfo.server_name : 'Lantern Home'}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-emerald-400 font-semibold">{localIp || 'localhost'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {/* Unified Spotlight Search Pill */}
              <button
                onClick={() => {
                  audioFeedback.playPop();
                  if (onOpenCommandPalette) onOpenCommandPalette();
                }}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white text-xs font-medium backdrop-blur-xl transition-all shadow-sm group"
                title="Spotlight Search (⌘K)"
              >
                <SearchIcon className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-slate-400 group-hover:text-slate-200">Search</span>
                <kbd className="hidden sm:inline text-[10px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
              </button>

              {/* Spatial UI Audio Toggle */}
              <button
                onClick={handleToggleAudio}
                title={audioEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                className={`p-2 rounded-full glass-ios dark:glass-ultra transition-all pill-btn ${
                  audioEnabled ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  audioFeedback.playClick();
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                }}
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                className="p-2 rounded-full glass-ios dark:glass-ultra text-slate-400 hover:text-white transition-all pill-btn"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    audioFeedback.playClick();
                    setShowNotifDropdown(!showNotifDropdown);
                  }}
                  className="relative p-2 rounded-full glass-ios dark:glass-ultra text-slate-400 hover:text-white transition-all pill-btn"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-black" />
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 top-11 w-80 sm:w-96 rounded-3xl glass-ios dark:glass-ultra border border-white/10 shadow-2xl p-4 space-y-3 z-50 animate-scale-in">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div className="font-bold text-xs flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        <span>Notifications</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{notifications.length} total</span>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">All clear! No alerts.</div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                        {notifications.map(n => (
                          <div key={n.id} className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.04] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200">{n.title}</span>
                              <span className="text-[9px] text-slate-500">{n.time_ago || n.created_at || 'Recently'}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Family Switcher Trigger (Mobile Only — Desktop is in Sidebar) */}
              <button
                onClick={() => {
                  audioFeedback.playClick();
                  setShowFamilyModal(true);
                  setSelectedMember(null);
                  setSwitchError(null);
                }}
                className="lg:hidden p-1 rounded-full border border-white/15 hover:border-amber-500/40 transition-all"
                title="Switch Profile"
              >
                <div
                  className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: avatarColor }}
                >
                  {userName[0]}
                </div>
              </button>
            </div>
          </header>


          {/* ══════════════════ VIEW: FILES ══════════════════ */}
          {activeCategory === 'Files' && (
            <div className="animate-fade-in-up">
              <FilePane initialPath={selectedFolderPath} onPlayVideo={handlePlayVideoPath} />
            </div>
          )}

          {/* ══════════════════ VIEW: SEARCH ══════════════════ */}
          {activeCategory === 'Search' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass-ios dark:glass-ultra p-6 sm:p-8 rounded-3xl space-y-4">
                <div className="relative">
                  <SearchIcon className="w-5 h-5 text-amber-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={portalSearchQuery}
                    onChange={e => setPortalSearchQuery(e.target.value)}
                    placeholder="Search videos, installed apps, files, family shared..."
                    className="w-full bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl pl-12 pr-10 py-4 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {portalSearchQuery && (
                    <button
                      onClick={() => setPortalSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'All Files', action: () => setActiveCategory('Files') },
                    { label: 'All Media', action: () => setActiveCategory('Media') },
                    { label: 'Open Transmission', action: () => {
                      const t = apps.find(a => (a.slug && a.slug === 'transmission') || a.name.toLowerCase().includes('transmission'));
                      if (t) handleAppLaunch(t);
                    }},
                    { label: 'App Store', action: handleOpenStore }
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={q.action}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold transition-all pill-btn text-slate-300"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              {portalSearchQuery && (
                <div className="space-y-6">
                  {/* Matching Apps */}
                  {apps.filter(a => a.name.toLowerCase().includes(portalSearchQuery.toLowerCase())).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Installed Apps</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {apps.filter(a => a.name.toLowerCase().includes(portalSearchQuery.toLowerCase())).map(app => (
                          <a
                            key={app.id}
                            href={getAppLaunchUrl(app) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => handleAppLaunch(app, e)}
                            className="tv-focus-target p-4 rounded-2xl glass-ios dark:glass-ultra ios-card flex items-center justify-between gap-3 group no-underline"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-amber-500 flex-shrink-0">
                                {app.icon_url ? <img src={app.icon_url} className="w-8 h-8 rounded-lg object-contain" alt="" /> : <Package className="w-5 h-5 text-amber-500 stroke-[1.75]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">{app.name}</div>
                                <div className="text-[10px] text-slate-400">Port {app.default_port}</div>
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Videos */}
                  {continueWatching.filter(v => v.title.toLowerCase().includes(portalSearchQuery.toLowerCase())).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Media Files</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {continueWatching.filter(v => v.title.toLowerCase().includes(portalSearchQuery.toLowerCase())).map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleMediaLaunch(item)}
                            className="tv-focus-target p-3 rounded-2xl glass-ios dark:glass-ultra ios-card cursor-pointer flex items-center gap-3 group"
                          >
                            <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-black/40">
                              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">{item.title}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{item.platform}</span>
                                {item.size_mb && <span>· {item.size_mb} MB</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ VIEW: MEDIA ══════════════════ */}
          {activeCategory === 'Media' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Media Sub-filter */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Your Home Cinema</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Real video library streamed directly from your host drives.</p>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-ios dark:glass-ultra">
                  {['All', 'Screencasts', 'Downloads'].map(f => (
                    <button
                      key={f}
                      onClick={() => setMediaFilter(f)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all pill-btn ${
                        mediaFilter === f ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Media Spotlight */}
              {heroItem && (
                <div
                  onClick={() => handleMediaLaunch(heroItem)}
                  className="tv-focus-target relative w-full h-[220px] sm:h-[300px] lg:h-[380px] rounded-3xl overflow-hidden cursor-pointer group media-card"
                >
                  <img
                    src={heroItem.thumbnail}
                    alt={heroItem.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/90 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-bold">
                        {heroItem.platform}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-amber-300 font-bold text-[11px]">
                        {heroItem.quality_label || (heroItem.height ? `${heroItem.height}p` : 'HD')}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-slate-200 text-[11px]">
                        {heroItem.audio_layout || heroItem.audio_codec || 'Stereo'}
                      </span>
                      {heroItem.duration_formatted && (
                        <>
                          <span className="text-white/40">·</span>
                          <span className="text-slate-300 text-[11px] font-mono">{heroItem.duration_formatted}</span>
                        </>
                      )}
                      <span className="text-white/40">·</span>
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Direct Host Stream
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-[-0.03em] line-clamp-2">
                      {heroItem.title}
                    </h2>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMediaLaunch(heroItem);
                        }}
                        className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-black text-xs sm:text-sm font-black shadow-2xl hover:scale-105 active:scale-95 transition-all pill-btn"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>Play</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioFeedback.playPop();
                          setPreviewMedia(heroItem);
                        }}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-xl transition-all pill-btn"
                      >
                        <Eye className="w-4 h-4 text-slate-200" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={(e) => toggleBookmark(e, heroItem)}
                        title={bookmarkedIds.includes(heroItem.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        className={`p-3 rounded-2xl border backdrop-blur-xl transition-all pill-btn ${
                          bookmarkedIds.includes(heroItem.id)
                            ? 'bg-amber-500/25 border-amber-500/50 text-amber-300'
                            : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                        }`}
                      >
                        {bookmarkedIds.includes(heroItem.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Media Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300">All Video Files ({filteredMedia.length})</h3>
                {filteredMedia.length === 0 ? (
                  <div className="py-12 px-6 rounded-3xl glass-ios dark:glass-ultra text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                      <Film className="w-8 h-8 stroke-[1.75]" />
                    </div>
                    <h3 className="text-sm font-bold">No videos match filter</h3>
                    <p className="text-xs text-slate-400">Put media files into ~/Videos or ~/Downloads</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredMedia.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleMediaLaunch(item)}
                        className="tv-focus-target rounded-2xl overflow-hidden glass-ios dark:glass-ultra cursor-pointer group media-card relative"
                      >
                        <div className="relative aspect-video bg-black/50 overflow-hidden">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                          
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                audioFeedback.playPop();
                                setPreviewMedia(item);
                              }}
                              title="Details & Specs"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:text-sky-400 hover:bg-black/80 transition-all pill-btn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => toggleBookmark(e, item)}
                              title="Save to Watchlist"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:text-amber-400 hover:bg-black/80 transition-all pill-btn"
                            >
                              {bookmarkedIds.includes(item.id) ? (
                                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {item.progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                              <div className="h-full bg-amber-400" style={{ width: `${item.progress}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{item.platform} · {item.quality_label || 'HD'}</span>
                            <span className="font-mono">{item.duration_formatted || item.file_size_formatted || (item.size_mb ? `${item.size_mb} MB` : '')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ VIEW: APPS ══════════════════ */}
          {activeCategory === 'Apps' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Installed Applications</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click any application to launch directly in your browser.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-ios dark:glass-ultra">
                    {['All', 'Downloaders', 'Media'].map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          audioFeedback.playClick();
                          setAppFilter(f);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all pill-btn ${
                          appFilter === f ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleOpenStore}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 pill-btn hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>App Store</span>
                  </button>
                </div>
              </div>

              {/* Apps Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredApps.map(app => {
                  const launchUrl = getAppLaunchUrl(app);
                  return (
                    <a
                      key={app.id}
                      href={launchUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleAppLaunch(app, e)}
                      className="tv-focus-target p-5 rounded-3xl glass-ios dark:glass-ultra ios-card flex flex-col justify-between space-y-4 group cursor-pointer no-underline border border-white/10 hover:border-amber-500/40 hover:scale-[1.02] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center p-2.5 shadow-lg group-hover:scale-105 transition-transform">
                          {app.icon_url ? (
                            <img src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-7 h-7 text-amber-500 stroke-[1.75]" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/5">
                          <span className={`w-2 h-2 rounded-full ${app.is_online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-500'}`} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            {app.is_online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-extrabold text-slate-100 group-hover:text-amber-400 transition-colors">
                            {app.name}
                          </h3>
                          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {app.description || `Accessible on LAN port ${app.default_port}`}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5">
                          :{app.default_port}
                        </span>
                        <span className="text-[11px] font-bold text-amber-400 group-hover:underline flex items-center gap-1">
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </a>
                  );
                })}

                {/* Add App Card */}
                <div
                  onClick={handleOpenStore}
                  className="tv-focus-target p-5 rounded-3xl border-2 border-dashed border-white/10 hover:border-amber-500/40 cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[190px] transition-all group hover:bg-white/[0.02]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center transition-all group-hover:scale-110">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">Install More Apps</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Explore 40+ self-hosted 1-click apps</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ VIEW: HOME (FOR YOU) ══════════════════ */}
          {activeCategory === 'Home' && (
            <div className="space-y-7 sm:space-y-8">

              {/* ═══ HERO SPOTLIGHT ═══ */}
              <div className="animate-fade-in-up-delay-1">
                {isLoading ? (
                  <Skeleton className="w-full h-[220px] sm:h-[300px] lg:h-[370px] rounded-3xl" />
                ) : heroItem ? (
                  <div className="relative group">
                    {/* Dynamic Ambient Ambilight Halo */}
                    <div
                      className="absolute -inset-1.5 sm:-inset-2.5 rounded-[36px] blur-2xl opacity-50 group-hover:opacity-85 transition-all duration-700 -z-10"
                      style={{
                        background: `radial-gradient(ellipse at center, ${ambientTheme.glowColor}55 0%, transparent 72%)`
                      }}
                    />

                    <div
                      onClick={() => handleMediaLaunch(heroItem)}
                      onMouseMove={handleCardMouseMove}
                      onMouseEnter={() => setIsHeroHovered(true)}
                      onMouseLeave={() => setIsHeroHovered(false)}
                      className="tv-focus-target card-spotlight glass-reflection relative w-full h-[220px] sm:h-[300px] lg:h-[370px] rounded-3xl overflow-hidden cursor-pointer media-card border border-white/15 shadow-2xl"
                    >
                      <img
                        src={heroItem.thumbnail}
                        alt={heroItem.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={e => {
                          (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="%23111"/></svg>';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 space-y-3.5 z-10">
                        {/* Authentic Probed Hardware Metadata */}
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/90 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[11px] font-bold">
                            {heroItem.platform}
                          </span>
                          <span className="text-white/40">·</span>
                          <span className="text-amber-300 font-bold text-[11px]">
                            {heroItem.quality_label || (heroItem.height ? `${heroItem.height}p` : 'HD')}
                          </span>
                          <span className="text-white/40">·</span>
                          <span className="text-slate-200 text-[11px]">
                            {heroItem.audio_layout || heroItem.audio_codec || 'Stereo'}
                          </span>
                          {heroItem.duration_formatted && (
                            <>
                              <span className="text-white/40">·</span>
                              <span className="text-slate-300 text-[11px] font-mono">{heroItem.duration_formatted}</span>
                            </>
                          )}
                          <span className="text-white/40">·</span>
                          <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Direct Host Stream
                          </span>
                        </div>

                        <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight max-w-2xl line-clamp-2 tracking-[-0.03em] drop-shadow-md">
                          {heroItem.title}
                        </h2>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMediaLaunch(heroItem);
                            }}
                            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-black text-xs sm:text-sm font-extrabold shadow-xl hover:scale-105 active:scale-95 transition-all pill-btn"
                          >
                            <Play className="w-4 h-4 fill-black" />
                            <span>Play</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              audioFeedback.playPop();
                              setPreviewMedia(heroItem);
                            }}
                            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-xl transition-all pill-btn"
                          >
                            <Eye className="w-4 h-4 text-slate-200" />
                            <span>Details</span>
                          </button>

                          <button
                            onClick={(e) => toggleBookmark(e, heroItem)}
                            title={bookmarkedIds.includes(heroItem.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            className={`p-3 rounded-2xl border backdrop-blur-xl transition-all pill-btn ${
                              bookmarkedIds.includes(heroItem.id)
                                ? 'bg-amber-500/25 border-amber-500/50 text-amber-300'
                                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                            }`}
                          >
                            {bookmarkedIds.includes(heroItem.id) ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {heroItem.progress > 0 && (
                          <div className="w-full max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full shadow-[0_0_8px_#f59e0b]" style={{ width: `${heroItem.progress}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Pagination indicators with live auto-advance fill */}
                      {continueWatching.length > 1 && (
                        <div className="absolute bottom-5 right-6 sm:right-8 flex items-center gap-2 z-20">
                          {continueWatching.slice(0, 5).map((_, i) => {
                            const isActive = i === heroIdx % continueWatching.length;
                            return (
                              <button
                                key={i}
                                onClick={e => {
                                  e.stopPropagation();
                                  audioFeedback.playSwoosh();
                                  setHeroIdx(i);
                                  setHeroProgress(0);
                                }}
                                title={`Slide ${i + 1}`}
                                className="relative h-2 rounded-full transition-all overflow-hidden"
                                style={{ width: isActive ? '36px' : '10px', backgroundColor: 'rgba(255,255,255,0.2)' }}
                              >
                                {isActive && (
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                                    style={{ width: `${heroProgress}%` }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-[180px] sm:h-[240px] rounded-3xl overflow-hidden glass-ios dark:glass-ultra flex items-center justify-center border border-white/10">
                    <div className="text-center space-y-2 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                        <Film className="w-6 h-6 stroke-[1.75]" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-200">Your Cinema Awaits</h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Add video files to <span className="font-mono text-amber-400">~/Videos</span> to see them here.
                      </p>
                    </div>
                  </div>
                )}
              </div>



              {/* ═══ CONTINUE WATCHING CAROUSEL ═══ */}
              <div className="space-y-3.5 animate-fade-in-up-delay-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">Continue Watching</h2>
                    <span className="text-xs text-slate-500 font-semibold">({continueWatching.length})</span>
                  </div>
                  <button
                    onClick={() => setActiveCategory('Media')}
                    className="text-xs text-slate-400 hover:text-amber-400 font-bold flex items-center gap-0.5 transition-colors pill-btn"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="w-[220px] sm:w-[260px] h-[140px] sm:h-[165px] flex-shrink-0 rounded-2xl" />
                    ))}
                  </div>
                ) : continueWatching.length === 0 ? (
                  <div className="py-8 px-6 rounded-3xl glass-ios dark:glass-ultra text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                      <Film className="w-6 h-6 stroke-[1.75]" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-300">No Videos Found</h3>
                    <p className="text-[11px] text-slate-400">Put .mp4 or .webm videos into ~/Videos or ~/Downloads</p>
                  </div>
                ) : (
                  <div className="carousel-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
                    {continueWatching.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleMediaLaunch(item)}
                        onMouseMove={handleCardMouseMove}
                        className="tv-focus-target card-spotlight glass-reflection w-[215px] sm:w-[265px] lg:w-[295px] h-[142px] sm:h-[168px] lg:h-[182px] rounded-2xl overflow-hidden cursor-pointer media-card relative group card-shine border border-white/10 shadow-xl"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={e => {
                            (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="%23111"/></svg>';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                        
                        <div className="media-card-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-lg flex items-center justify-center border border-white/30 shadow-2xl scale-95 group-hover:scale-105 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1 border border-white/10 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.badge_color }} />
                              {item.platform}
                            </span>
                            {item.quality_label && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                {item.quality_label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                audioFeedback.playPop();
                                setPreviewMedia(item);
                              }}
                              title="Details & Specs"
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/80 hover:text-sky-400 hover:bg-black/80 transition-all pill-btn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => toggleBookmark(e, item)}
                              title="Save to Watchlist"
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/80 hover:text-amber-400 hover:bg-black/80 transition-all pill-btn"
                            >
                              {bookmarkedIds.includes(item.id) ? (
                                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1 z-10">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold text-white line-clamp-1 drop-shadow-sm truncate">{item.title}</h3>
                            {item.duration_formatted && (
                              <span className="text-[9px] font-mono text-slate-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm flex-shrink-0">
                                {item.duration_formatted}
                              </span>
                            )}
                          </div>
                          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══ YOUR APPS SECTION ═══ */}
              <div className="space-y-3.5 animate-fade-in-up-delay-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">Your Apps</h2>
                    <span className="text-xs text-slate-500 font-semibold">({apps.length})</span>
                  </div>
                  <button
                    onClick={handleOpenStore}
                    className="text-xs text-slate-400 hover:text-amber-400 font-bold flex items-center gap-0.5 transition-colors pill-btn"
                  >
                    <span>Store</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px]" />
                        <Skeleton className="w-12 h-2 rounded" />
                      </div>
                    ))}
                  </div>
                ) : apps.length === 0 ? (
                  <div className="py-8 px-6 rounded-3xl glass-ios dark:glass-ultra text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                      <Package className="w-7 h-7 stroke-[1.75]" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-300">No Apps Installed Yet</h3>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Explore the App Store to install Plex, Jellyfin, Transmission, and more.
                    </p>
                    <button
                      onClick={handleOpenStore}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 pill-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Open App Store</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5">
                    {apps.map(app => {
                      const launchUrl = getAppLaunchUrl(app);
                      return (
                        <a
                          key={app.id}
                          href={launchUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => handleAppLaunch(app, e)}
                          title={`Launch ${app.name} (${app.default_port ? `Port ${app.default_port}` : 'Web'})`}
                          className="tv-focus-target flex flex-col items-center gap-2 group cursor-pointer app-icon-wrapper no-underline"
                        >
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-[22px] bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.08] shadow-lg flex items-center justify-center relative overflow-hidden p-3 transition-all group-hover:shadow-2xl group-hover:shadow-amber-500/20 group-hover:border-amber-500/40">
                            {/* Status indicator dot */}
                            <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full z-10 ${
                              app.is_online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-400/40'
                            }`} />
                            {app.icon_url ? (
                              <img
                                src={app.icon_url}
                                alt={app.name}
                                className="w-full h-full object-contain"
                                onError={e => { (e.target as any).style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="w-8 h-8 text-amber-500 stroke-[1.75]" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-300 group-hover:text-amber-400 transition-colors truncate max-w-[80px] text-center">
                            {app.name}
                          </span>
                        </a>
                      );
                    })}

                    {/* Add App Icon */}
                    <div
                      onClick={handleOpenStore}
                      className="tv-focus-target flex flex-col items-center gap-2 group cursor-pointer app-icon-wrapper"
                    >
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-[22px] border-2 border-dashed border-white/15 hover:border-amber-500/50 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-all bg-white/[0.02] group-hover:bg-amber-500/10">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                        Add App
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ FAMILY CLOUD QUICK ACCESS ═══ */}
              <div className="space-y-3.5 animate-fade-in-up-delay-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">Family Cloud Storage</h2>
                    <span className="text-xs text-slate-500 font-semibold">Shared folders</span>
                  </div>
                  <button
                    onClick={() => { setSelectedFolderPath('~/.lantern/family_shared'); setActiveCategory('Files'); }}
                    className="text-xs text-slate-400 hover:text-amber-400 font-bold flex items-center gap-0.5 transition-colors pill-btn"
                  >
                    <span>Browse All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { name: 'Photos', icon: <ImageIcon className="w-6 h-6 text-pink-400 stroke-[1.75]" />, grad: 'from-pink-500/20 to-rose-500/15 border-pink-500/20', path: '~/.lantern/family_shared/Photos' },
                    { name: 'Movies', icon: <Film className="w-6 h-6 text-purple-400 stroke-[1.75]" />, grad: 'from-purple-500/20 to-indigo-500/15 border-purple-500/20', path: '~/.lantern/family_shared/Movies' },
                    { name: 'Documents', icon: <FileText className="w-6 h-6 text-blue-400 stroke-[1.75]" />, grad: 'from-blue-500/20 to-sky-500/15 border-blue-500/20', path: '~/.lantern/family_shared/Documents' },
                    { name: 'Music', icon: <Music className="w-6 h-6 text-emerald-400 stroke-[1.75]" />, grad: 'from-emerald-500/20 to-teal-500/15 border-emerald-500/20', path: '~/.lantern/family_shared/Music' },
                    { name: 'Kids', icon: <Gamepad2 className="w-6 h-6 text-amber-400 stroke-[1.75]" />, grad: 'from-amber-500/20 to-yellow-500/15 border-amber-500/20', path: '~/.lantern/family_shared/Kids' },
                    { name: 'Downloads', icon: <Download className="w-6 h-6 text-cyan-400 stroke-[1.75]" />, grad: 'from-cyan-500/20 to-blue-500/15 border-cyan-500/20', path: '~/Downloads' },
                  ].map((f, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        audioFeedback.playClick();
                        setSelectedFolderPath(f.path);
                        setActiveCategory('Files');
                      }}
                      onMouseMove={handleCardMouseMove}
                      className={`tv-focus-target card-spotlight glass-reflection p-4 rounded-2xl bg-gradient-to-br ${f.grad} border backdrop-blur-xl cursor-pointer ios-card flex flex-col items-center justify-center text-center gap-2 group shadow-lg`}
                    >
                      <div className="group-hover:scale-115 transition-transform duration-300">{f.icon}</div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Floating Mobile Bottom Navigation */}
        <UserMobileNav
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onOpenFamilyModal={() => { setShowFamilyModal(true); setSelectedMember(null); setSwitchError(null); }}
        />
      </div>

      {/* ═══ APPLE TV STYLE MEDIA DETAIL / PREVIEW SHEET ═══ */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-3xl p-4 sm:p-6 animate-scale-in"
          onClick={() => {
            audioFeedback.playClick();
            setPreviewMedia(null);
          }}
        >
          {/* Ambilight glow */}
          <div
            className="absolute w-[80vw] max-w-3xl h-[50vh] rounded-full blur-[130px] opacity-40 pointer-events-none -z-10"
            style={{
              background: `radial-gradient(circle, ${previewMedia.badge_color || '#f59e0b'} 0%, transparent 70%)`
            }}
          />

          <div
            className="relative w-full max-w-3xl bg-[#0a0c14]/95 border border-white/15 rounded-3xl overflow-hidden shadow-2xl glass-reflection card-spotlight"
            onClick={e => e.stopPropagation()}
            onMouseMove={handleCardMouseMove}
          >
            {/* Header Image with Gradient */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={previewMedia.thumbnail}
                alt={previewMedia.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-[#0a0c14]/40 to-transparent" />
              
              <button
                onClick={() => {
                  audioFeedback.playClick();
                  setPreviewMedia(null);
                }}
                className="absolute top-4 right-4 p-2.5 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/15 transition-all pill-btn"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: previewMedia.badge_color }} />
                    {previewMedia.platform}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black tracking-wider">
                    {previewMedia.quality_label || (previewMedia.height ? `${previewMedia.height}p` : 'HD')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-black tracking-wider">
                    {previewMedia.audio_codec && previewMedia.audio_codec !== 'None' ? `${previewMedia.audio_codec.toUpperCase()} ${previewMedia.audio_layout?.includes('Surround') ? 'SURROUND' : 'STEREO'}` : 'NO AUDIO'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black tracking-wider">
                    DIRECT HOST STREAM
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {previewMedia.title}
                </h2>
              </div>
            </div>

            {/* Body Info & Actions */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const itemToPlay = previewMedia;
                      setPreviewMedia(null);
                      handleMediaLaunch(itemToPlay);
                    }}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-black font-black text-sm hover:scale-105 shadow-xl shadow-white/10 transition-all pill-btn"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play in Cinema</span>
                  </button>

                  <button
                    onClick={(e) => toggleBookmark(e, previewMedia)}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl border backdrop-blur-md font-bold text-sm transition-all pill-btn ${
                      bookmarkedIds.includes(previewMedia.id)
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                    }`}
                  >
                    {bookmarkedIds.includes(previewMedia.id) ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-amber-400" />
                        <span>In Watchlist</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Add to Watchlist</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Download */}
                <a
                  href={previewMedia.stream_url || previewMedia.target_url}
                  download={previewMedia.title}
                  onClick={() => {
                    audioFeedback.playPop();
                    toast.success(`Starting download: ${previewMedia.title}`);
                  }}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all pill-btn no-underline"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download File</span>
                </a>
              </div>

              {/* Hardware Streaming Specs - 100% Real ffprobe Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Format / Container</span>
                  <span className="font-mono font-bold text-slate-200 mt-0.5 block truncate">
                    {previewMedia.container || 'MP4'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                    {previewMedia.file_size_formatted || `${previewMedia.size_mb} MB`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Resolution & Codec</span>
                  <span className="font-mono font-bold text-amber-300 mt-0.5 block truncate">
                    {previewMedia.resolution || (previewMedia.width ? `${previewMedia.width} × ${previewMedia.height}` : 'HD')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                    {previewMedia.video_codec || 'Video Stream'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Audio Track</span>
                  <span className="font-mono font-bold text-sky-300 mt-0.5 block truncate">
                    {previewMedia.audio_display || previewMedia.audio_codec || 'Stereo'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                    {previewMedia.audio_layout || 'Audio Stream'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Duration & Bitrate</span>
                  <span className="font-mono font-bold text-emerald-400 mt-0.5 block truncate">
                    {previewMedia.duration_formatted || (previewMedia.duration_sec ? `${Math.round(previewMedia.duration_sec)}s` : 'Unknown')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                    {previewMedia.bitrate_formatted ? `${previewMedia.bitrate_formatted} · Direct LAN` : '< 1ms Direct LAN'}
                  </span>
                </div>
              </div>

              {previewMedia.file_path && (
                <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-2 rounded-xl border border-white/5 truncate">
                  Host Path: {previewMedia.file_path}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ FULLSCREEN VIDEO STREAMING MODAL ═══ */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-3xl p-3 sm:p-6 animate-scale-in"
          onClick={() => {
            audioFeedback.playClick();
            setActiveMedia(null);
          }}
        >
          {/* Cinema Ambilight Halo */}
          <div
            className="absolute w-[80vw] max-w-4xl h-[60vh] rounded-full blur-[140px] opacity-45 pointer-events-none transition-all duration-1000 -z-10"
            style={{
              background: `radial-gradient(circle, ${activeMedia.badge_color || '#f59e0b'}88 0%, transparent 70%)`
            }}
          />

          <div
            className="relative w-full max-w-5xl bg-[#080a10]/95 border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeMedia.badge_color, color: activeMedia.badge_color }} />
                <span className="text-sm font-bold text-white truncate">{activeMedia.title}</span>
                <span className="text-xs text-slate-400 font-mono">({activeMedia.platform})</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  4K STREAM
                </span>
              </div>
              <button
                onClick={() => {
                  audioFeedback.playClick();
                  setActiveMedia(null);
                }}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-all pill-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={activeMedia.stream_url}
                controls
                autoPlay
                onLoadedMetadata={onVideoLoaded}
                onTimeUpdate={onVideoTime}
                className="w-full max-h-[75vh] object-contain shadow-2xl"
              />
            </div>

            {/* Quick Keyboard Controls Bar */}
            <div className="px-5 py-2.5 bg-black/60 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">Space</kbd> Play/Pause
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">F</kbd> Fullscreen
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">Esc</kbd> Close
                </span>
              </div>
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local Hardware Transcode
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FAMILY PROFILE SWITCHER MODAL ═══ */}
      {showFamilyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-2xl p-4 animate-scale-in"
          onClick={() => { setShowFamilyModal(false); setSelectedMember(null); }}
        >
          <div
            className="bg-white/95 dark:bg-[#0c0e15]/95 backdrop-blur-[60px] dark:backdrop-saturate-[2] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Who's Watching?</h2>
                  <p className="text-[11px] text-slate-500">Switch profile for personal library & history</p>
                </div>
              </div>
              <button
                onClick={() => { setShowFamilyModal(false); setSelectedMember(null); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {switchError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
                {switchError}
              </div>
            )}

            {selectedMember ? (
              <form onSubmit={handleConfirmSwitch} className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: selectedMember.avatar_color || '#f59e0b' }}
                  >
                    {selectedMember.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      {selectedMember.name}
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                        Admin Protected
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Enter password to unlock</div>
                  </div>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    required
                    value={switchPassword}
                    onChange={e => setSwitchPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(null); setSwitchError(null); }}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 pill-btn text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSwitching}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 pill-btn"
                  >
                    {isSwitching ? 'Verifying...' : 'Unlock Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {familyMembers.map(m => {
                  const active = m.username === user?.username;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMember(m)}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 cursor-pointer transition-all ios-card relative ${
                        active
                          ? 'bg-amber-500/15 border-amber-500/40 ring-2 ring-amber-500/20'
                          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                        style={{ backgroundColor: m.avatar_color || '#8b5cf6' }}
                      >
                        {m.avatar_icon === 'crown' ? <Crown className="w-6 h-6 stroke-[1.75]" /> :
                         m.avatar_icon === 'heart' ? <Heart className="w-6 h-6 stroke-[1.75]" /> :
                         m.avatar_icon === 'gamepad' ? <Gamepad2 className="w-6 h-6 stroke-[1.75]" /> :
                         m.avatar_icon === 'tv' ? <Tv className="w-6 h-6 stroke-[1.75]" /> : m.name[0]}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-xs text-slate-200 truncate max-w-[90px]">{m.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{m.role === 'admin' ? 'Admin' : 'Member'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <button
                onClick={() => { setShowFamilyModal(false); openOnboarding(); }}
                className="text-slate-400 hover:text-amber-400 font-semibold flex items-center gap-1.5 pill-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Family Member</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => { setShowFamilyModal(false); onSwitchToAdmin(); }}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 pill-btn"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
