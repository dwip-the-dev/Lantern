import React, { useState, useEffect } from 'react';
import {
  Globe,
  Lock,
  ArrowRight,
  Copy,
  ExternalLink,
  Trash2,
  Plus,
  ShieldCheck,
  FileCode,
  Check,
  Zap,
  Server,
  Sparkles,
  X
} from 'lucide-react';
import { Tunnel, Container } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface ExposeViewProps {
  tunnels: Tunnel[];
  baseDomain: string;
  containers: Container[];
  onRefresh: () => void;
  prefillApp?: { name: string; port: number; slug?: string } | null;
}

export const ExposeView: React.FC<ExposeViewProps> = ({
  tunnels,
  baseDomain,
  containers,
  onRefresh,
  prefillApp
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [port, setPort] = useState<number | ''>('');
  const [subdomain, setSubdomain] = useState('');
  const [protocol, setProtocol] = useState('https');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [configs, setConfigs] = useState<{ cloudflare: string; caddy: string } | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    if (prefillApp) {
      setName(prefillApp.name);
      setPort(prefillApp.port);
      setSubdomain(prefillApp.slug || prefillApp.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  }, [prefillApp]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !port) return;
    setIsCreating(true);
    try {
      await api.createTunnel({
        name,
        target_port: Number(port),
        subdomain: subdomain || undefined,
        protocol
      });
      setName('');
      setPort('');
      setSubdomain('');
      onRefresh();
      toast.success('Public tunnel created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tunnel');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop exposing this service?')) return;
    try {
      await api.deleteTunnel(id);
      onRefresh();
      toast.success('Tunnel removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete tunnel');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoadConfigs = async () => {
    try {
      const res = await api.getTunnelConfigs();
      setConfigs(res);
      setShowConfigModal(true);
    } catch (err) {
      toast.error('Failed to load tunnel configuration files');
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Hero Visual Concept */}
      <div className="rounded-2xl glass-panel p-6 sm:p-8 border-slate-800/80 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-amber-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 bg-lantern-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl space-y-4">
          <div className="flex items-center space-x-2 text-lantern-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Centerpiece Feature</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Expose to Internet
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Publish any local home server app, Minecraft world, or media library to the world with automated tunnels, SSL encryption, and clean subdomains.
          </p>

          {/* Interactive Flow Visual */}
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-obsidian-950/80 border border-slate-800 rounded-xl p-3.5 w-fit">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>localhost:8096</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-lantern-400 animate-pulse" />
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Zap className="w-4 h-4 text-lantern-400" />
                <span>Lantern Tunnel</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-lantern-400 animate-pulse" />
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>https://jellyfin.{baseDomain}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleLoadConfigs}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-obsidian-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-lantern-400" />
            <span>Export Cloudflare / Caddy Ingress</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Expose Wizard Form */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80 space-y-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-lantern-400" />
            <h2 className="text-base font-bold text-white">Expose New Service</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            
            {/* Quick App Select */}
            {containers.length > 0 && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Pick from Running Services</label>
                <select
                  onChange={(e) => {
                    const c = containers.find(item => item.name === e.target.value);
                    if (c) {
                      setName(c.name);
                      const p = parseInt(c.ports[0]?.split(':')[0]) || 80;
                      setPort(p);
                      setSubdomain(c.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-lantern-500"
                >
                  <option value="">-- Choose container or enter manual port --</option>
                  {containers.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.ports[0] || 'no port'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Service Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jellyfin, Nextcloud, Minecraft"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!subdomain) {
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }
                }}
                className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-lantern-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Local Port</label>
              <input
                type="number"
                required
                placeholder="8096"
                value={port}
                onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-lantern-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Subdomain</label>
              <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-xl overflow-hidden px-3 py-2">
                <input
                  type="text"
                  placeholder="jellyfin"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-transparent text-slate-200 font-mono focus:outline-none"
                />
                <span className="text-slate-500 font-mono">.{baseDomain}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Protocol</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-lantern-500"
              >
                <option value="https">HTTPS (Web apps, Jellyfin, Nextcloud)</option>
                <option value="tcp">TCP (Minecraft, SSH, Raw sockets)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-lantern-500 hover:bg-lantern-400 text-obsidian-950 font-bold shadow-lantern transition-all duration-150 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creating Tunnel...' : 'Expose to Internet Now'}</span>
            </button>
          </form>
        </div>

        {/* Active Tunnels List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Active Public Routes</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {tunnels.length} active
            </span>
          </div>

          {tunnels.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border-slate-800 space-y-3">
              <Globe className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No services exposed yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use the form on the left or click "Expose" next to any service on the Dashboard to generate a secure public link.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tunnels.map((t) => (
                <div
                  key={t.id}
                  className="glass-panel p-4 rounded-2xl border-slate-800/80 glass-panel-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{t.name}</span>
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>SSL Active</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={t.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-lantern-300 hover:text-lantern-200 underline truncate max-w-[280px] sm:max-w-md"
                      >
                        {t.public_url}
                      </a>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Routing to local port: <span className="text-slate-200 font-semibold">{t.target_port}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleCopy(t.public_url, t.id)}
                      className="p-2 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <a
                      href={t.public_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Open Public Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded-xl bg-obsidian-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
                      title="Close Tunnel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cloudflare / Caddy Configuration Modal */}
      {showConfigModal && configs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-obsidian-950 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-lantern-400" />
                <span>Generated Ingress Configurations</span>
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1">
              <div>
                <span className="text-xs font-semibold text-lantern-300 uppercase tracking-wider block mb-1">
                  Cloudflare Tunnel Ingress Config
                </span>
                <pre className="bg-obsidian-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  {configs.cloudflare}
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider block mb-1">
                  Caddyfile Reverse Proxy Config
                </span>
                <pre className="bg-obsidian-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  {configs.caddy}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-obsidian-800 hover:bg-slate-800 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
