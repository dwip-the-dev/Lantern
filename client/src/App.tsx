import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { MobileNav } from './components/Layout/MobileNav';

import { Dashboard } from './components/Dashboard/Dashboard';
import { AppStore } from './components/AppStore/AppStore';
import { ContainersView } from './components/Containers/ContainersView';
import { ExposeView } from './components/ExposeTunnel/ExposeView';
import { FileManagerView } from './components/FileManager/FileManagerView';
import { TerminalView } from './components/Terminal/TerminalView';
import { SettingsView } from './components/Settings/SettingsView';

import { UserPortal } from './components/UserPortal/UserPortal';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard';
import { CommandPalette } from './components/Common/CommandPalette';

import { api } from './api/client';
import { SystemInfo, SystemStats, Container, AppStoreItem, InstalledApp, Tunnel } from './types';
import { Home, ShieldAlert, Sparkles, LogIn } from 'lucide-react';

const LanternContent: React.FC = () => {
  const { user, isAdmin, isGuest, isConfigured, isLoading, openAuthModal, showOnboarding, openOnboarding } = useAuth();
  const toast = useToast();
  
  // Dual-portal mode: 'user' (Your home, on screen) vs 'admin' (Your home server, enlightened)
  const [portalMode, setPortalMode] = useState<'user' | 'admin'>(() => {
    const saved = localStorage.getItem('lantern_portal_mode');
    return (saved === 'admin' || saved === 'user') ? saved : 'user';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [mediaToPlay, setMediaToPlay] = useState<{ title: string; videoUrl: string; posterUrl: string } | null>(null);
  
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isDockerActive, setIsDockerActive] = useState<boolean>(false);
  const [catalog, setCatalog] = useState<AppStoreItem[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [baseDomain, setBaseDomain] = useState<string>('lantern.local');

  // Global Keyboard Shortcut: ⌘K or Ctrl+K or / (when not focused in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prompt setup or login if not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!isConfigured) {
        openOnboarding();
      } else if (!user) {
        openAuthModal();
      }
    }
  }, [isLoading, user, isConfigured]);

  const setAndSavePortalMode = (mode: 'user' | 'admin') => {
    if (mode === 'admin' && !isAdmin) {
      toast.warning('Administrator permissions required. Please sign in as an admin.');
      openAuthModal();
      return;
    }
    setPortalMode(mode);
    localStorage.setItem('lantern_portal_mode', mode);
  };

  const refreshData = async () => {
    try {
      const [sysInfo, sysStats, contRes, catRes, instRes, tunRes] = await Promise.all([
        api.getSystemInfo().catch(() => null),
        api.getSystemStats().catch(() => null),
        api.getContainers().catch(() => ({ containers: [], docker_active: false })),
        api.getAppCatalog().catch(() => ({ catalog: [] })),
        api.getInstalledApps().catch(() => []),
        api.getTunnels().catch(() => ({ tunnels: [], base_domain: 'lantern.local' }))
      ]);

      if (sysInfo) setInfo(sysInfo);
      if (sysStats) setStats(sysStats);
      if (contRes) {
        setContainers(contRes.containers);
        setIsDockerActive(contRes.docker_active);
      }
      if (catRes) setCatalog(catRes.catalog);
      if (instRes) setInstalledApps(instRes);
      if (tunRes) {
        setTunnels(tunRes.tunnels);
        setBaseDomain(tunRes.base_domain);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    refreshData();
    const disconnectWs = api.connectStatsWebSocket((newStats) => {
      setStats(newStats);
    });
    return () => {
      disconnectWs();
    };
  }, []);

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    if (!isAdmin) {
      toast.warning('Admin privileges required to manage services.');
      openAuthModal();
      return;
    }
    try {
      if (action === 'start') await api.startContainer(id);
      else if (action === 'stop') await api.stopContainer(id);
      else if (action === 'restart') await api.restartContainer(id);
      
      const res = await api.getContainers();
      setContainers(res.containers);
      toast.success(`Service successfully ${action}ed`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} service`);
    }
  };

  const handleDeleteContainer = async (id: string) => {
    if (!isAdmin) {
      toast.warning('Admin privileges required to remove services.');
      openAuthModal();
      return;
    }
    if (!confirm('Are you sure you want to remove this service?')) return;
    try {
      await api.removeContainer(id);
      const res = await api.getContainers();
      setContainers(res.containers);
      toast.success('Service removed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove service');
    }
  };

  const handleInstallApp = async (slug: string, customPort?: number) => {
    if (!isAdmin) {
      toast.warning('Admin privileges required to install applications.');
      openAuthModal();
      return;
    }
    try {
      await api.installApp(slug, customPort);
      await refreshData();
      toast.success(`Deployment initiated for ${slug}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to install ${slug}`);
    }
  };

  const handleUninstallApp = async (slug: string) => {
    if (!isAdmin) {
      toast.warning('Admin privileges required to uninstall applications.');
      openAuthModal();
      return;
    }
    if (!confirm('Are you sure you want to uninstall this application?')) return;
    try {
      await api.uninstallApp(slug);
      await refreshData();
      toast.success(`${slug} uninstalled successfully`);
    } catch (err: any) {
      toast.error(err.message || `Failed to uninstall ${slug}`);
    }
  };

  const handlePlayMediaFromPalette = (title: string, videoUrl: string, posterUrl: string) => {
    setMediaToPlay({ title, videoUrl, posterUrl });
    if (portalMode !== 'user') {
      setPortalMode('user');
      localStorage.setItem('lantern_portal_mode', 'user');
    }
  };

  // If in User Portal Mode, render the client/family experience!
  if (portalMode === 'user' || !isAdmin) {
    return (
      <>
        <UserPortal
          onSwitchToAdmin={() => setAndSavePortalMode('admin')}
          onOpenAppStore={() => {
            if (!isAdmin) {
              openAuthModal();
              return;
            }
            setActiveTab('apps');
            setAndSavePortalMode('admin');
          }}
          localIp={info?.local_ip || 'localhost'}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          initialMedia={mediaToPlay}
        />
        <AuthModal />
        {showOnboarding && (
          <OnboardingWizard
            onComplete={(destination) => {
              setAndSavePortalMode(destination === 'portal' ? 'user' : 'admin');
              refreshData();
            }}
          />
        )}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setAndSavePortalMode('admin');
          }}
          onSwitchPortal={(mode) => setAndSavePortalMode(mode)}
          onPlayMedia={handlePlayMediaFromPalette}
        />
      </>
    );
  }

  const alertCount = stats?.disk_alerts?.length || 0;

  // Otherwise, render the Admin Homelab Console!
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-obsidian-950 flex transition-colors duration-200">
      
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        version={info?.version || 'v1.0.0'}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onSwitchToPortal={() => setAndSavePortalMode('user')}
      />

      {/* Backdrop for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <Topbar
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          alertCount={alertCount}
          onOpenNotifications={() => setActiveTab('settings')}
          onSwitchToPortal={() => setAndSavePortalMode('user')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Dynamic Main Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              info={info}
              containers={containers}
              onNavigate={setActiveTab}
              onContainerAction={handleContainerAction}
            />
          )}

          {activeTab === 'apps' && (
            <AppStore
              catalog={catalog}
              onInstallApp={handleInstallApp}
              onUninstallApp={handleUninstallApp}
              onNavigate={setActiveTab}
              localIp={info?.local_ip || 'localhost'}
            />
          )}

          {(activeTab === 'containers' || activeTab === 'services') && (
            <ContainersView
              containers={containers}
              isDockerActive={isDockerActive}
              onRefresh={async () => {
                const res = await api.getContainers();
                setContainers(res.containers);
              }}
              onContainerAction={handleContainerAction}
              onDeleteContainer={handleDeleteContainer}
              localIp={info?.local_ip || 'localhost'}
            />
          )}

          {(activeTab === 'files' || activeTab === 'storage') && (
            <FileManagerView />
          )}

          {activeTab === 'network' && (
            <ExposeView
              tunnels={tunnels}
              baseDomain={baseDomain}
              containers={containers}
              onRefresh={async () => {
                const res = await api.getTunnels();
                setTunnels(res.tunnels);
                setBaseDomain(res.base_domain);
              }}
              prefillApp={null}
            />
          )}

          {(activeTab === 'system' || activeTab === 'logs') && (
            <TerminalView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}

          {activeTab === 'help' && (
            <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lantern Homelab Guide</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Welcome to Lantern! Manage real Linux apps, files, containers, and network exposure from any device on your Wi-Fi LAN.
              </p>
            </div>
          )}
        </main>

        {/* Bottom Navigation for mobile screens */}
        <MobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSwitchToPortal={() => setAndSavePortalMode('user')}
        />
      </div>

      {/* Authentication Modal */}
      <AuthModal />
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(destination) => {
            setAndSavePortalMode(destination === 'portal' ? 'user' : 'admin');
            refreshData();
          }}
        />
      )}

      {/* Global Apple Spotlight Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onSwitchPortal={(mode) => setAndSavePortalMode(mode)}
        onPlayMedia={handlePlayMediaFromPalette}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <LanternContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
