import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  Server,
  HardDrive,
  Globe,
  Sliders
} from 'lucide-react';
import { Settings, NotificationItem } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const SettingsView: React.FC = () => {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, n] = await Promise.all([
        api.getSettings(),
        api.getNotifications()
      ]);
      setSettings(s);
      setNotifications(n);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">

      <div className="glass-panel p-6 rounded-2xl border-slate-800/80">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-lantern-400" />
          <h1 className="text-2xl font-extrabold text-white">System Settings & Alerts</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize your server branding, storage alert thresholds, and public tunnel domains.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Settings Form */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-slate-800/80 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-lantern-400" />
            <span>General Preferences</span>
          </h2>

          {settings ? (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Server Name</label>
                <input
                  type="text"
                  value={settings.server_name}
                  onChange={(e) => setSettings({ ...settings, server_name: e.target.value })}
                  className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-lantern-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Server Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-lantern-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Disk Warning Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={settings.disk_warning_threshold}
                    onChange={(e) => setSettings({ ...settings, disk_warning_threshold: e.target.value })}
                    className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-lantern-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Displays amber banner when disk space exceeds this percentage.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Disk Critical Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="70"
                    max="99"
                    value={settings.disk_critical_threshold}
                    onChange={(e) => setSettings({ ...settings, disk_critical_threshold: e.target.value })}
                    className="w-full bg-obsidian-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:outline-none focus:border-lantern-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Displays red warning alert when disk is dangerously full.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Default Expose Base Domain
                </label>
                <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-xl overflow-hidden px-3.5 py-2.5">
                  <Globe className="w-4 h-4 text-lantern-400 mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={settings.base_domain}
                    onChange={(e) => setSettings({ ...settings, base_domain: e.target.value })}
                    className="w-full bg-transparent text-slate-100 font-mono focus:outline-none text-xs"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  e.g. lantern.network or your custom domain for public routing.
                </span>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-lantern-500 hover:bg-lantern-400 text-obsidian-950 font-bold shadow-lantern transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
                </button>

                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved successfully!</span>
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="text-slate-400 text-xs">Loading settings...</div>
          )}
        </div>

        {/* Notifications & Event History */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Bell className="w-4 h-4 text-lantern-400" />
              <span>Event Log & Alerts</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {notifications.length} logged
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-none">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No recent events</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-obsidian-900 border border-slate-800/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center space-x-1.5">
                      {n.severity === 'critical' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : n.severity === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>{n.title}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {n.created_at?.split(' ')[1]?.slice(0, 5) || ''}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
