import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  Wifi,
  Play,
  Square,
  RotateCw,
  MoreHorizontal,
  ArrowRight,
  Triangle,
  File,
  Settings as SettingsIcon,
  Package,
  Trash2,
  Globe,
  Activity,
  Thermometer,
  BarChart3,
  X,
  Sparkles,
  Users,
  Server,
  Gauge,
  AlertTriangle,
  Radio,
  Clock,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { SystemStats, SystemInfo, Container, StorageBreakdown, ActivityItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

interface DashboardProps {
  stats: SystemStats | null;
  info: SystemInfo | null;
  containers: Container[];
  onNavigate: (tab: string) => void;
  onContainerAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
}

const formatBytes = (bytes: number, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSec: number) => {
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${Math.round(bytesPerSec)} B/s`;
};

// Helper SVG Sparkline Component with smooth bezier curves
const Sparkline: React.FC<{ data: number[]; color: string; gradientId: string }> = ({ data, color, gradientId }) => {
  const width = 160;
  const height = 48;
  const min = Math.min(...data);
  const max = Math.max(...data, min + 1);

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * (height - 12) - 6;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  info,
  containers,
  onNavigate,
  onContainerAction
}) => {
  const { user, openOnboarding } = useAuth();
  const [storageData, setStorageData] = useState<StorageBreakdown | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);

  // Historical sparkline sample buffers
  const [cpuHistory, setCpuHistory] = useState<number[]>([14, 18, 16, 22, 19, 24, 18, 15, 20, 18]);
  const [ramHistory, setRamHistory] = useState<number[]>([34, 35, 34, 36, 35, 37, 35, 34, 36, 35]);
  const [storageHistory, setStorageHistory] = useState<number[]>([60, 60, 61, 61, 62, 62, 62, 62, 62, 62]);
  const [netHistory, setNetHistory] = useState<number[]>([8, 14, 11, 16, 12, 18, 10, 15, 13, 12]);

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      const [storage, act] = await Promise.all([
        api.getStorageBreakdown(),
        api.getActivity()
      ]);
      setStorageData(storage);
      setActivities(act);
    } catch (_) {}
  };

  useEffect(() => {
    if (stats) {
      setCpuHistory(prev => [...prev.slice(1), stats.cpu.percent || 18]);
      setRamHistory(prev => [...prev.slice(1), stats.memory.percent || 35]);
      if (stats.disks && stats.disks[0]) {
        setStorageHistory(prev => [...prev.slice(1), stats.disks[0].percent || 62]);
      }
      const netMbps = ((stats.network.speed_rx_bytes + stats.network.speed_tx_bytes) * 8) / (1024 * 1024);
      setNetHistory(prev => [...prev.slice(1), Math.max(1, netMbps)]);
    }
  }, [stats]);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const displayServices = containers.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    uptime: c.uptime || 'Active'
  }));

  // Donut chart math
  const donutPercent = storageData ? storageData.percent : 62;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (donutPercent / 100) * circumference;

  return (
    <div className="space-y-6 pb-16">

      {/* Greeting Banner with Quick Telemetry & Onboarding Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {currentDate}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {greeting}, {user?.name || 'Dwip'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Your home server is running smoothly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowTelemetryModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-obsidian-900 hover:bg-slate-100 dark:hover:bg-obsidian-850 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm group"
          >
            <Activity className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Hardware Telemetry</span>
          </button>

          <button
            onClick={openOnboarding}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-600 dark:text-amber-400 transition-all shadow-sm"
            title="Launch First-time Setup / Onboarding Wizard"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Setup Wizard</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Metric Cards with Live Wave Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: CPU */}
        <div
          onClick={() => onNavigate('system')}
          className="bg-white dark:bg-obsidian-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-500/50 hover:scale-[1.02] hover:shadow-lg transition-all group active:scale-95"
          title="Click to view System Terminal & Diagnostics"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                CPU
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {stats ? `${Math.round(stats.cpu.percent)}%` : '18%'}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={cpuHistory} color="#f59e0b" gradientId="cpuGrad" />
          </div>
        </div>

        {/* Card 2: RAM */}
        <div
          onClick={() => onNavigate('system')}
          className="bg-white dark:bg-obsidian-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 hover:scale-[1.02] hover:shadow-lg transition-all group active:scale-95"
          title="Click to view Memory & Process Details"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                RAM
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono leading-tight">
                {stats ? `${(stats.memory.used / (1024**3)).toFixed(1)} / ${(stats.memory.total / (1024**3)).toFixed(0)} GB` : '4.2 / 16 GB'}
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {stats ? `${Math.round(stats.memory.percent)}%` : '35%'}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <Sparkline data={ramHistory} color="#10b981" gradientId="ramGrad" />
          </div>
        </div>

        {/* Card 3: Storage */}
        <div
          onClick={() => onNavigate('storage')}
          className="bg-white dark:bg-obsidian-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-cyan-500/50 hover:scale-[1.02] hover:shadow-lg transition-all group active:scale-95"
          title="Click to manage Server Storage & Files"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Storage
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono leading-tight">
                {storageData ? `${storageData.used_gb} / ${storageData.total_gb} GB` : '310 / 500 GB'}
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {storageData ? `${storageData.percent}%` : '62%'}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <Sparkline data={storageHistory} color="#06b6d4" gradientId="storageGrad" />
          </div>
        </div>

        {/* Card 4: Network (Live Host I/O Rates) */}
        <div
          onClick={() => onNavigate('network')}
          className="bg-white dark:bg-obsidian-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-purple-500/50 hover:scale-[1.02] hover:shadow-lg transition-all group active:scale-95"
          title="Click to configure Network Exposure & Tunnels"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Network
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono leading-tight">
                {stats ? formatSpeed(stats.network.speed_rx_bytes + stats.network.speed_tx_bytes) : '0 B/s'}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                ↓ {stats ? formatSpeed(stats.network.speed_rx_bytes) : '0 B/s'}  ↑ {stats ? formatSpeed(stats.network.speed_tx_bytes) : '0 B/s'}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <Sparkline data={netHistory} color="#a855f7" gradientId="netGrad" />
          </div>
        </div>

      </div>

      {/* Main Content Layout: Left = Running Services Table, Right = Storage Donut + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Running Services Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-obsidian-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Running Services
            </h2>
            <button
              onClick={() => onNavigate('services')}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-lantern-400 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 font-semibold">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Uptime</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {displayServices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      <p className="font-bold text-xs text-slate-700 dark:text-slate-300">No active services or containers</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Docker apps you install from the App Store will appear here with live controls.
                      </p>
                      <button
                        onClick={() => onNavigate('apps')}
                        className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
                      >
                        <span>Open App Store</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  displayServices.map((service) => {
                    const isRunning = service.status === 'running';
                    return (
                      <tr key={service.id} className="hover:bg-slate-50/50 dark:hover:bg-obsidian-850/50 transition-colors">
                        <td className="py-3.5 flex items-center space-x-2.5 font-bold text-slate-800 dark:text-slate-200">
                          <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 glow-emerald' : 'bg-rose-500'}`}></span>
                          <span className="capitalize">{service.name}</span>
                        </td>

                        <td className="py-3.5">
                          <span className={`flex items-center space-x-1.5 font-medium ${isRunning ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span>•</span>
                            <span className="capitalize">{service.status}</span>
                          </span>
                        </td>

                        <td className="py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                          {service.uptime}
                        </td>

                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center space-x-1">
                            {isRunning ? (
                              <button
                                onClick={() => onContainerAction(service.id, 'stop')}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-500 border border-slate-200 dark:border-slate-800"
                                title="Stop"
                              >
                                <Square className="w-3 h-3 text-rose-500" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onContainerAction(service.id, 'start')}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-500 border border-slate-200 dark:border-slate-800"
                                title="Start"
                              >
                                <Play className="w-3 h-3 text-emerald-500" />
                              </button>
                            )}

                            <button
                              onClick={() => onContainerAction(service.id, 'restart')}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-950 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                              title="Restart"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => onNavigate('services')}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-950 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                              title="More options"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Widgets: Storage Donut & Activity */}
        <div className="space-y-6">
          
          {/* Storage Donut Card matching prototype */}
          <div className="bg-white dark:bg-obsidian-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Storage
            </h3>

            <div className="flex items-center justify-between">
              
              {/* Circular Donut Gauge */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-100 dark:text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-cyan-400"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {donutPercent}%
                  </span>
                </div>
              </div>

              {/* Dynamic Breakdown Legend matching real server disks */}
              <div className="space-y-2 text-xs flex-1 pl-4">
                {storageData?.categories && storageData.categories.length > 0 ? (
                  storageData.categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                        <span>{cat.name}</span>
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">{cat.size_gb} GB</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400">Loading disk stats...</div>
                )}
              </div>
            </div>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {storageData ? `${storageData.used_gb} GB / ${storageData.total_gb} GB` : 'Analyzing storage...'}
            </div>
          </div>

          {/* Activity Widget matching prototype */}
          <div className="bg-white dark:bg-obsidian-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Activity
              </h3>
              <button
                onClick={() => onNavigate('logs')}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-lantern-400 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        act.color === 'emerald'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : act.color === 'cyan'
                          ? 'bg-cyan-500/10 text-cyan-500'
                          : act.color === 'blue'
                          ? 'bg-blue-500/10 text-blue-500'
                          : act.color === 'amber'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {act.icon === 'triangle' && <Triangle className="w-3 h-3 fill-current" />}
                        {act.icon === 'file' && <File className="w-3 h-3" />}
                        {act.icon === 'cog' && <SettingsIcon className="w-3 h-3" />}
                        {act.icon === 'square' && <Square className="w-3 h-3 fill-current" />}
                        {act.icon === 'package' && <Package className="w-3 h-3" />}
                        {act.icon === 'globe' && <Globe className="w-3 h-3" />}
                        {!['triangle', 'file', 'cog', 'square', 'package', 'globe'].includes(act.icon) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {act.title}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap ml-2">
                      {act.time_ago}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">No recent activity</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Hardware & Deep Telemetry Modal */}
      {showTelemetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-obsidian-850/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Host Hardware Telemetry & Matrix</span>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>LIVE (1s)</span>
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real Linux kernel telemetry, per-core utilization, memory allocation, and physical drives.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTelemetryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

              {/* SECTION 1: Processor & Core Matrix */}
              <div className="bg-slate-50/60 dark:bg-obsidian-850/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      CPU Architecture & Core Matrix
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                    <span>{info?.cpu_model || 'Host CPU'}</span>
                    <span>•</span>
                    <span>{stats?.cpu?.cores ? `${stats.cpu.cores.length} Threads` : ''}</span>
                    {stats?.cpu?.frequency_mhz && (
                      <>
                        <span>•</span>
                        <span>{Math.round(stats.cpu.frequency_mhz)} MHz</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Load Averages Bar */}
                <div className="flex items-center space-x-4 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-obsidian-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Load Average:</span>
                  <div className="flex items-center space-x-3 font-mono text-slate-900 dark:text-white">
                    <span>1m: <strong className="text-amber-500">{stats?.cpu?.load_avg?.[0]?.toFixed(2) ?? '0.00'}</strong></span>
                    <span>5m: <strong className="text-amber-500">{stats?.cpu?.load_avg?.[1]?.toFixed(2) ?? '0.00'}</strong></span>
                    <span>15m: <strong className="text-amber-500">{stats?.cpu?.load_avg?.[2]?.toFixed(2) ?? '0.00'}</strong></span>
                  </div>
                  <div className="ml-auto text-xs font-mono text-slate-500">
                    Total Load: <strong className="text-slate-900 dark:text-white">{stats ? `${Math.round(stats.cpu.percent)}%` : '0%'}</strong>
                  </div>
                </div>

                {/* Per-Core Visual Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {stats?.cpu?.cores && stats.cpu.cores.length > 0 ? (
                    stats.cpu.cores.map((corePercent, idx) => {
                      const isHigh = corePercent >= 80;
                      const isMed = corePercent >= 50 && corePercent < 80;
                      const barColor = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';
                      const textColor = isHigh ? 'text-rose-500' : isMed ? 'text-amber-500' : 'text-emerald-500';

                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-obsidian-900 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-mono">#{idx}</span>
                            <span className={`font-mono font-bold ${textColor}`}>
                              {Math.round(corePercent)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-obsidian-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                              style={{ width: `${Math.min(100, Math.max(0, corePercent))}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-xs text-slate-400 text-center py-2">
                      Awaiting core metrics...
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: RAM & Swap Allocation */}
              <div className="bg-slate-50/60 dark:bg-obsidian-850/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Memory Breakdown & Linux Cache / Buffers
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {stats ? `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)} (${Math.round(stats.memory.percent)}%)` : ''}
                  </span>
                </div>

                {/* Visual Segmented Memory Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-200 dark:bg-obsidian-800 h-3 rounded-full overflow-hidden flex">
                    {stats && (
                      <>
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${stats.memory.percent}%` }}
                          title={`Used: ${formatBytes(stats.memory.used)}`}
                        ></div>
                        {stats.memory.cached && (
                          <div
                            className="bg-cyan-500 h-full transition-all duration-300 opacity-80"
                            style={{ width: `${(stats.memory.cached / stats.memory.total) * 100}%` }}
                            title={`Cached: ${formatBytes(stats.memory.cached)}`}
                          ></div>
                        )}
                        {stats.memory.buffers && (
                          <div
                            className="bg-blue-500 h-full transition-all duration-300 opacity-80"
                            style={{ width: `${(stats.memory.buffers / stats.memory.total) * 100}%` }}
                            title={`Buffers: ${formatBytes(stats.memory.buffers)}`}
                          ></div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Used: <strong>{stats ? formatBytes(stats.memory.used) : '-'}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      <span>Cached: <strong>{stats?.memory.cached ? formatBytes(stats.memory.cached) : '-'}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Buffers: <strong>{stats?.memory.buffers ? formatBytes(stats.memory.buffers) : '-'}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>Free: <strong>{stats ? formatBytes(stats.memory.free) : '-'}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Swap Row */}
                {stats?.swap && stats.swap.total > 0 && (
                  <div className="bg-white dark:bg-obsidian-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Linux Swap Space</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {formatBytes(stats.swap.used)} / {formatBytes(stats.swap.total)} ({Math.round(stats.swap.percent)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION 3: Storage Partitions & Live I/O */}
              <div className="bg-slate-50/60 dark:bg-obsidian-850/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <HardDrive className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Mounted Disks & Live I/O Throughput
                    </h3>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Read: <strong className="text-slate-800 dark:text-slate-200">{stats ? formatSpeed(stats.disk_io.read_speed_bytes) : '0 B/s'}</strong></span>
                    </span>
                    <span className="text-slate-500 flex items-center space-x-1">
                      <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                      <span>Write: <strong className="text-slate-800 dark:text-slate-200">{stats ? formatSpeed(stats.disk_io.write_speed_bytes) : '0 B/s'}</strong></span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-2">Device</th>
                        <th className="pb-2">Mountpoint</th>
                        <th className="pb-2">FSType</th>
                        <th className="pb-2">Used / Total</th>
                        <th className="pb-2 text-right">Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
                      {stats?.disks && stats.disks.length > 0 ? (
                        stats.disks.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-obsidian-800/40 transition-colors">
                            <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{d.device}</td>
                            <td className="py-2.5 text-cyan-600 dark:text-cyan-400">{d.mountpoint}</td>
                            <td className="py-2.5 text-slate-500 uppercase">{d.fstype}</td>
                            <td className="py-2.5 text-slate-700 dark:text-slate-300">
                              {formatBytes(d.used)} / {formatBytes(d.total)}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                d.percent > 85 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-200 dark:bg-obsidian-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {Math.round(d.percent)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400">No active partitions detected</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 4: Hardware Thermals & Probes */}
              <div className="bg-slate-50/60 dark:bg-obsidian-850/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center space-x-2.5">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Hardware Thermal Sensors
                  </h3>
                </div>

                {stats?.temperatures && Object.keys(stats.temperatures).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.temperatures).map(([sensorGroup, sensors]) => (
                      <div
                        key={sensorGroup}
                        className="bg-white dark:bg-obsidian-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2"
                      >
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          {sensorGroup}
                        </div>
                        <div className="space-y-1.5">
                          {sensors.map((s, idx) => {
                            const isHot = s.current >= 75;
                            const isWarm = s.current >= 55 && s.current < 75;
                            const badgeColor = isHot
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : isWarm
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

                            return (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 truncate">{s.label || `Sensor ${idx + 1}`}</span>
                                <span className={`px-2 py-0.5 rounded-md font-mono font-bold border text-[11px] ${badgeColor}`}>
                                  {Math.round(s.current)}°C
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-obsidian-900 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-semibold">Host Operating Normally</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Direct ACPI/coretemp thermal probe endpoints are not exposed by the current kernel or virtualized hypervisor.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-obsidian-850/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Hostname: <strong>{info?.hostname || 'lantern'}</strong> ({info?.kernel || 'Linux'})
              </span>
              <button
                onClick={() => setShowTelemetryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs transition-colors"
              >
                Close Telemetry
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
