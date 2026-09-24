import React, { useState, useEffect } from 'react';
import {
  Container as ContainerIcon,
  Play,
  Square,
  RotateCw,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Terminal,
  X,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { Container } from '../../types';
import { api } from '../../api/client';

interface ContainersViewProps {
  containers: Container[];
  isDockerActive: boolean;
  onRefresh: () => void;
  onContainerAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
  onDeleteContainer: (id: string) => void;
  localIp: string;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  containers,
  isDockerActive,
  onRefresh,
  onContainerAction,
  onDeleteContainer,
  localIp
}) => {
  const [activeLogsContainer, setActiveLogsContainer] = useState<Container | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [systemdServices, setSystemdServices] = useState<any[]>([]);

  useEffect(() => {
    loadSystemd();
  }, []);

  const loadSystemd = async () => {
    try {
      const res = await api.getSystemServices();
      setSystemdServices(res.services || []);
    } catch (_) {}
  };

  const handleOpenLogs = async (container: Container) => {
    setActiveLogsContainer(container);
    setIsLoadingLogs(true);
    try {
      const res = await api.getContainerLogs(container.id);
      setLogs(res.logs || []);
    } catch (err) {
      setLogs(['Failed to fetch service logs.']);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const runningCount = containers.filter(c => c.status === 'running').length;
  const stoppedCount = containers.length - runningCount;

  return (
    <div className="space-y-8 pb-12">

      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Services & Workloads</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isDockerActive
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}>
              {isDockerActive ? 'Docker Daemon' : 'Native C Runner (PID Monitored)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supervising real Linux processes, sockets, and systemd units without demo simulations.
          </p>
        </div>

        {/* Quick Stats & Refresh */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-obsidian-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <span className="text-emerald-500 font-bold">{runningCount}</span>
            <span className="text-slate-500">Live</span>
            <span className="text-slate-400 dark:text-slate-700">|</span>
            <span className="text-slate-400 font-bold">{stoppedCount}</span>
            <span className="text-slate-500">Stopped</span>
          </div>

          <button
            onClick={() => { onRefresh(); loadSystemd(); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
            title="Refresh services"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section 1: Managed Native Services */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Managed Homelab Services</h2>
          </div>
          <span className="text-xs text-slate-400">Real sockets & PID tracking</span>
        </div>

        <div className="space-y-3">
          {containers.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border-slate-800">
              <p className="text-slate-400 text-sm">No services discovered.</p>
            </div>
          ) : (
            containers.map((c: any) => {
              const isRunning = c.status === 'running';
              const port = c.port || (c.ports && c.ports[0]?.split(':')[0]) || '80';

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  {/* Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0">
                      {c.is_real_docker ? <Layers className="w-5 h-5 text-blue-500 stroke-[1.75]" /> : <Zap className="w-5 h-5 text-amber-500 stroke-[1.75]" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white capitalize">
                          {c.title || c.name}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-400'}`}></span>
                        {c.pid ? (
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            PID {c.pid}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-400">Offline</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>{c.image || 'native-c'}</span>
                        <span>•</span>
                        <a
                          href={`http://${localIp}:${port}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-500 hover:underline flex items-center space-x-1"
                        >
                          <span>Port {port}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {c.uptime && (
                          <>
                            <span>•</span>
                            <span>Uptime: {c.uptime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics & Controls */}
                  <div className="flex items-center justify-between md:justify-end space-x-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    {/* Real Usage */}
                    {isRunning && (
                      <div className="text-right hidden lg:block text-xs font-mono">
                        <div className="text-slate-700 dark:text-slate-200 font-bold">{c.memory_usage}</div>
                        <div className="text-slate-400">CPU {c.cpu_percent || 0}%</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {isRunning ? (
                        <button
                          onClick={() => onContainerAction(c.id, 'stop')}
                          className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-500 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-colors"
                        >
                          <Square className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden sm:inline">Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onContainerAction(c.id, 'start')}
                          className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-500 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 text-xs font-semibold transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="hidden sm:inline">Start</span>
                        </button>
                      )}

                      <button
                        onClick={() => onContainerAction(c.id, 'restart')}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-800 transition-colors"
                        title="Restart"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenLogs(c)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-cyan-500 border border-slate-200 dark:border-slate-800 transition-colors"
                        title="View Real Logs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteContainer(c.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 transition-colors"
                        title="Remove Service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 2: Real Host Systemd Services */}
      {systemdServices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Host Systemd Services</h2>
            </div>
            <span className="text-xs text-slate-400">Live OS service bus</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {systemdServices.map((svc: any) => (
              <div
                key={svc.unit}
                className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {svc.name}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${svc.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {svc.unit}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                  <span className="text-slate-400">{svc.category}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                    {svc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {activeLogsContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Real Service Logs: <span className="font-mono text-amber-500">{activeLogsContainer.name}</span>
                </h3>
              </div>
              <button
                onClick={() => setActiveLogsContainer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-1">
              {isLoadingLogs ? (
                <div className="text-slate-500">Reading logs from ~/.lantern/logs/...</div>
              ) : logs.length === 0 ? (
                <div className="text-slate-500">No log entries found for this service.</div>
              ) : (
                logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap leading-relaxed">{line}</div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                {logs.length} lines stream
              </span>
              <button
                onClick={() => handleOpenLogs(activeLogsContainer)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Real Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
