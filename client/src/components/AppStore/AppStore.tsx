import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Layers,
  Settings,
  Shield,
  Server,
  Film,
  Cloud,
  Gamepad2,
  Wrench,
  X,
  Plus,
  Terminal,
  RefreshCw,
  Folder,
  ArrowRight,
  ChevronRight,
  HardDrive,
  Check,
  AlertCircle,
  Package
} from 'lucide-react';
import { AppStoreItem, InstallTask } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface AppStoreProps {
  catalog: AppStoreItem[];
  onInstallApp: (slug: string, customPort?: number) => Promise<void>;
  onUninstallApp: (slug: string) => Promise<void>;
  onNavigate: (tab: string) => void;
  localIp: string;
}

export const AppStore: React.FC<AppStoreProps> = ({
  catalog,
  onUninstallApp,
  onNavigate,
  localIp
}) => {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'installed' | 'catalog'>('installed');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // App Detail Preview Modal
  const [previewApp, setPreviewApp] = useState<AppStoreItem | null>(null);
  const [customPort, setCustomPort] = useState<number | undefined>(undefined);
  
  // Live Docker Install Task Modal
  const [activeTask, setActiveTask] = useState<InstallTask | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // Custom App Install Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [customAppPort, setCustomAppPort] = useState(8080);
  const [customCategory, setCustomCategory] = useState('Custom');
  const [customVolume, setCustomVolume] = useState('');
  const [customEnv, setCustomEnv] = useState('');

  const installedApps = catalog.filter(app => app.is_installed);
  const baseList = viewMode === 'installed' ? installedApps : catalog;

  const categories = [
    { id: 'All', label: 'All Apps', icon: Layers },
    { id: 'Popular', label: 'Popular', icon: Sparkles },
    { id: 'Media', label: 'Media', icon: Film },
    { id: 'Cloud', label: 'Cloud & Files', icon: Cloud },
    { id: 'Network', label: 'Network & DNS', icon: Server },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'Utilities', label: 'Utilities', icon: Wrench },
    { id: 'Downloaders', label: 'Downloaders', icon: Download },
    { id: 'Smart Home', label: 'Smart Home', icon: Server },
    { id: 'Photos', label: 'Photos & Docs', icon: Sparkles },
    { id: 'Gaming', label: 'Gaming', icon: Gamepad2 }
  ];

  const filteredCatalog = baseList.filter(app => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (selectedCategory === 'Popular' && (app.featured || app.badge === 'Popular')) ||
      app.category.toLowerCase() === selectedCategory.toLowerCase();

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesSearch =
      app.name.toLowerCase().includes(query) ||
      (app.tagline && app.tagline.toLowerCase().includes(query)) ||
      app.description.toLowerCase().includes(query) ||
      app.slug.toLowerCase().includes(query) ||
      (app.developer && app.developer.toLowerCase().includes(query)) ||
      app.image.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  // Start Real Live Docker Install
  const handleLaunchInstall = async (app: AppStoreItem, targetPort?: number) => {
    const portToUse = targetPort || customPort || app.port;
    setPreviewApp(null);
    setIsInstalling(true);

    try {
      const res = await api.installApp({
        slug: app.slug,
        custom_port: portToUse
      });

      // Begin polling task logs
      pollTask(res.task_id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate installation');
      setIsInstalling(false);
    }
  };

  const handleCustomInstallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImage.trim()) return;

    const slug = (customName || customImage.split(':')[0].split('/').pop() || 'custom-app')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    setShowCustomModal(false);
    setIsInstalling(true);

    try {
      const volumes = customVolume.trim() ? [customVolume.trim()] : [];
      const envObj: Record<string, string> = {};
      if (customEnv.trim()) {
        customEnv.split('\n').forEach(line => {
          const [k, ...v] = line.split('=');
          if (k && v.length) envObj[k.trim()] = v.join('=').trim();
        });
      }

      const res = await api.installApp({
        slug,
        custom_name: customName || slug,
        custom_image: customImage.trim(),
        custom_port: customAppPort,
        custom_category: customCategory,
        custom_volumes: volumes,
        custom_env: envObj
      });

      pollTask(res.task_id);
    } catch (err: any) {
      toast.error(err.message || 'Custom app deployment failed');
      setIsInstalling(false);
    }
  };

  const pollTask = (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const check = async () => {
      try {
        const task = await api.getInstallTask(taskId);
        setActiveTask(task);

        if (task.status === 'completed' || task.status === 'error') {
          clearInterval(pollIntervalRef.current);
          setIsInstalling(false);
        }
      } catch (_) {
        clearInterval(pollIntervalRef.current);
        setIsInstalling(false);
      }
    };

    check();
    pollIntervalRef.current = setInterval(check, 650);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 pb-16">

      {/* CasaOS-Inspired AppStore Hero Header */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border-slate-200 dark:border-slate-800/80 bg-gradient-to-br from-slate-900 via-obsidian-950 to-slate-950 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              {viewMode === 'installed' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Installed Applications</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CasaOS-Compatible App Store</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {viewMode === 'installed' ? 'Installed Server Applications' : 'One-Click Homelab Apps'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {viewMode === 'installed'
                ? 'Only applications and containers you have actually installed on this Lantern server appear here. Zero demo or simulated entries.'
                : 'Discover and deploy Docker services, media servers, and self-hosted tools with automatic volume mounts and live image downloads.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {viewMode === 'installed' ? (
              <button
                onClick={() => setViewMode('catalog')}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>+ Browse Catalog</span>
              </button>
            ) : (
              <button
                onClick={() => setViewMode('installed')}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>View Installed ({installedApps.length})</span>
              </button>
            )}
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Custom Install</span>
            </button>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="mt-6 relative max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              viewMode === 'installed'
                ? 'Search your installed applications...'
                : 'Search 40+ self-hosted catalog apps (e.g. Jellyfin, Nextcloud, AdGuard, Vaultwarden)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top View Mode Switcher: Installed Apps (Default) vs App Catalog */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-200/80 dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 w-fit">
          <button
            onClick={() => { setViewMode('installed'); setSelectedCategory('All'); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'installed'
                ? 'bg-white dark:bg-obsidian-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${viewMode === 'installed' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>Installed Apps</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-obsidian-950 font-mono text-slate-700 dark:text-slate-300">
              {installedApps.length}
            </span>
          </button>

          <button
            onClick={() => { setViewMode('catalog'); setSelectedCategory('All'); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'catalog'
                ? 'bg-white dark:bg-obsidian-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${viewMode === 'catalog' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>App Catalog</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-obsidian-950 font-mono text-slate-700 dark:text-slate-300">
              {catalog.length}
            </span>
          </button>
        </div>

        {viewMode === 'installed' && (
          <button
            onClick={() => { setViewMode('catalog'); setSelectedCategory('All'); }}
            className="flex items-center space-x-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 self-start sm:self-auto transition-colors"
          >
            <span>+ Install New Applications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Swipeable Category Filter Chips (when in Catalog mode or multiple installed apps) */}
      {(viewMode === 'catalog' || installedApps.length > 3) && (
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'bg-white dark:bg-obsidian-900 hover:bg-slate-100 dark:hover:bg-obsidian-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Showing {filteredCatalog.length} {viewMode === 'installed' ? 'installed applications' : 'available applications'}</span>
        {searchQuery && (
          <span>Filter: "{searchQuery}"</span>
        )}
      </div>

      {/* App Grid or Empty States */}
      {viewMode === 'installed' && filteredCatalog.length === 0 ? (
        <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
            <Package className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Apps Installed Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              You haven&apos;t installed any applications to your server yet. Browse the <strong>App Catalog</strong> to deploy Plex, Jellyfin, Nextcloud, Uptime Kuma, and 40+ more with 1-click Docker deployment.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => setViewMode('catalog')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Browse App Catalog</span>
            </button>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Custom Install</span>
            </button>
          </div>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
            <Search className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No applications found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try searching for a different keyword or deploy any Docker image using the <strong>Custom Install</strong> button.
          </p>
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow-sm inline-flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Install Custom Container</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredCatalog.map((app) => {
            const isInstalled = app.is_installed;
            const appPort = app.active_port || app.port;

            return (
              <div
                key={app.id}
                onClick={() => {
                  setPreviewApp(app);
                  setCustomPort(app.port);
                }}
                className="group bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                <div>
                  {/* Card Header: Icon & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {app.icon_url ? (
                        <img
                          src={app.icon_url}
                          alt={app.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to emoji if remote SVG fails to load
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-amber-500 stroke-[1.75]" />
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      {isInstalled ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>Installed</span>
                        </span>
                      ) : app.badge ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                          {app.badge}
                        </span>
                      ) : null}

                      <span className="text-[11px] font-mono text-slate-400">
                        :{appPort}
                      </span>
                    </div>
                  </div>

                  {/* Title & Developer */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                      {app.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {app.developer || app.category}
                    </p>
                  </div>

                  {/* Tagline / Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {app.tagline || app.description}
                  </p>
                </div>

                {/* Card Footer: Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">
                    {app.category}
                  </span>

                  {isInstalled ? (
                    <a
                      href={`http://${localIp}:${appPort}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchInstall(app);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-amber-500 dark:hover:bg-amber-500 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-slate-950 text-xs font-bold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APP DETAILS PREVIEW MODAL */}
      {previewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 relative">
            
            <button
              onClick={() => setPreviewApp(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-center flex-shrink-0">
                {previewApp.icon_url ? (
                  <img src={previewApp.icon_url} alt={previewApp.name} className="w-full h-full object-contain" />
                ) : (
                  <Package className="w-8 h-8 text-amber-500 stroke-[1.75]" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {previewApp.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {previewApp.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Developer: {previewApp.developer || 'Community'}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Image: {previewApp.image}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <h4 className="font-bold text-slate-900 dark:text-white">About this app</h4>
              <p>{previewApp.description}</p>
            </div>

            {/* Configuration Options */}
            <div className="space-y-3 bg-slate-50 dark:bg-obsidian-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white">Deployment Settings</h4>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Host Web Port
                </label>
                <input
                  type="number"
                  value={customPort ?? previewApp.port}
                  onChange={(e) => setCustomPort(parseInt(e.target.value) || previewApp.port)}
                  className="w-full bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {previewApp.volumes && previewApp.volumes.length > 0 && (
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                    Persistent Volume Mappings
                  </label>
                  <div className="space-y-1 font-mono text-[11px] text-slate-400">
                    {previewApp.volumes.map((v, i) => (
                      <div key={i} className="truncate bg-white dark:bg-obsidian-900 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewApp(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition-colors"
              >
                Cancel
              </button>

              {previewApp.is_installed ? (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to uninstall ${previewApp.name}? This will remove its container and storage.`)) {
                        setPreviewApp(null);
                        await onUninstallApp(previewApp.slug);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors"
                  >
                    Uninstall
                  </button>
                  <a
                    href={`http://${localIp}:${previewApp.active_port || previewApp.port}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm inline-flex items-center space-x-1.5"
                  >
                    <span>Launch Application</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLaunchInstall(previewApp)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lantern transition-all inline-flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Application</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* REAL LIVE DOCKER INSTALL PROGRESS MODAL */}
      {(isInstalling || activeTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl p-6 space-y-4 flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-white text-sm">
                  {activeTask?.status === 'completed'
                    ? 'Deployment Succeeded'
                    : activeTask?.status === 'error'
                    ? 'Deployment Error'
                    : 'Deploying Container Application...'}
                </h3>
              </div>

              {(!isInstalling || activeTask?.status === 'completed' || activeTask?.status === 'error') && (
                <button
                  onClick={() => setActiveTask(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Live Terminal Log Viewer */}
            <div className="flex-1 bg-black/90 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5 border border-slate-800/80 min-h-[220px]">
              {activeTask?.logs && activeTask.logs.length > 0 ? (
                activeTask.logs.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed text-slate-300">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Connecting to Docker daemon and starting download...</span>
                </div>
              )}
            </div>

            {/* Modal Bottom Status & Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                {activeTask?.status === 'running' && (
                  <span className="flex items-center space-x-1.5 text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pulling Docker layers and configuring volumes...</span>
                  </span>
                )}
                {activeTask?.status === 'completed' && (
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Application active on port {activeTask.port}!</span>
                  </span>
                )}
                {activeTask?.status === 'error' && (
                  <span className="flex items-center space-x-1.5 text-rose-400 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Error: {activeTask.error || 'Failed to deploy'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {activeTask?.status === 'completed' && (
                  <a
                    href={`http://${localIp}:${activeTask.port}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm inline-flex items-center space-x-1.5"
                  >
                    <span>Open App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM APP INSTALL MODAL (Matching CasaOS Custom App feature) */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 relative">
            
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Install Customized App
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deploy any Docker container from Docker Hub, GHCR, or Quay on your Lantern homelab.
              </p>
            </div>

            <form onSubmit={handleCustomInstallSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Redis Cache"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Docker Image Repository
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. redis:alpine or linuxserver/jellyfin"
                  value={customImage}
                  onChange={(e) => setCustomImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Host Port
                  </label>
                  <input
                    type="number"
                    required
                    value={customAppPort}
                    onChange={(e) => setCustomAppPort(parseInt(e.target.value) || 8080)}
                    className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Media">Media</option>
                    <option value="Cloud">Cloud & Files</option>
                    <option value="Network">Network & DNS</option>
                    <option value="Security">Security</option>
                    <option value="Downloaders">Downloaders</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Volume Mapping (Optional)
                </label>
                <input
                  type="text"
                  placeholder="/var/lib/mydata:/data"
                  value={customVolume}
                  onChange={(e) => setCustomVolume(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Environment Variables (KEY=VALUE per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="PORT=8080&#10;TZ=UTC"
                  value={customEnv}
                  onChange={(e) => setCustomEnv(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lantern transition-all"
                >
                  Deploy with Docker
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
