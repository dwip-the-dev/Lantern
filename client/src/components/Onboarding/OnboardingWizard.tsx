import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Users,
  HardDrive,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Crown,
  Heart,
  Gamepad2,
  Tv,
  Plus,
  Trash2,
  Lock,
  User as UserIcon,
  Server,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';
import { useAuth } from '../../context/AuthContext';

interface FamilyMemberDraft {
  name: string;
  username: string;
  role: 'user' | 'admin';
  icon: string;
  color: string;
  password?: string;
}

interface OnboardingWizardProps {
  onComplete: (destination: 'portal' | 'admin') => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { completeOnboarding, closeOnboarding } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Server Identity
  const [serverName, setServerName] = useState('Lantern Family Server');
  const [tagline, setTagline] = useState('Your home server, enlightened.');

  // Step 2: Master Admin
  const [adminName, setAdminName] = useState('Dwip');
  const [adminUsername, setAdminUsername] = useState('dwip');
  const [adminPassword, setAdminPassword] = useState('1234dwip1234');
  const [adminEmail, setAdminEmail] = useState('dwip@lantern.local');

  // Step 3: Demo Family Profiles
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDraft[]>([
    { name: 'Sarah', username: 'sarah', role: 'user', icon: 'heart', color: '#ec4899', password: 'family123' },
    { name: 'Leo', username: 'leo', role: 'user', icon: 'gamepad', color: '#3b82f6', password: 'family123' },
    { name: 'Living Room TV', username: 'livingroom', role: 'user', icon: 'tv', color: '#10b981', password: 'family123' },
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'user' | 'admin'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const cleanUser = newMemberName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (familyMembers.some(m => m.username === cleanUser) || cleanUser === adminUsername) {
      setError('Member username already exists');
      return;
    }
    setFamilyMembers([
      ...familyMembers,
      {
        name: newMemberName.trim(),
        username: cleanUser,
        role: newMemberRole,
        icon: 'user',
        color: '#8b5cf6',
        password: 'family123'
      }
    ]);
    setNewMemberName('');
    setError(null);
  };

  const handleRemoveMember = (username: string) => {
    setFamilyMembers(familyMembers.filter(m => m.username !== username));
  };

  const handleFinish = async (destination: 'portal' | 'admin') => {
    setIsSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        server_name: serverName,
        tagline,
        admin_name: adminName,
        admin_username: adminUsername,
        admin_password: adminPassword,
        admin_email: adminEmail,
        family_members: familyMembers
      });
      onComplete(destination);
    } catch (err: any) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative text-slate-900 dark:text-slate-100 my-8">
        
        {/* Progress Bar & Steps Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center space-x-1.5 text-amber-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lantern Home Server Onboarding</span>
            </span>
            <span>Step {step} of 4</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-amber-500' : 'bg-slate-100 dark:bg-obsidian-950'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SERVER IDENTITY */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                <LanternLogo size={32} glow />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome to Lantern
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Set up your self-hosted family server. Manage media, personal cloud files, and homelab services from any phone or PC on your Wi-Fi LAN.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Lantern Family Server"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tagline / Broadcast Title
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Your home server, enlightened."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all"
              >
                <span>Continue: Admin Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MASTER ADMIN ACCOUNT */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-500">
                <Crown className="w-3.5 h-3.5" />
                <span>Primary Homelab Administrator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Create Master Admin Account</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The administrator has full access to hardware telemetry, Docker workloads, terminal, and server management.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Dwip"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    placeholder="dwip"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-500"
                    placeholder="Master Password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all"
              >
                <span>Continue: Family Profiles</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FAMILY PROFILES */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-500">
                <Users className="w-3.5 h-3.5" />
                <span>Multi-User Family Setup</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Configure Family Members</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add profiles for family members. Normal members can stream real media and access family cloud apps without administrative clutter.
              </p>
            </div>

            {/* Current Family Profiles List */}
            <div className="space-y-2.5">
              {/* Primary Admin Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span>{adminName}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                        @{adminUsername}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Primary Administrator</div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                  Master Admin
                </span>
              </div>

              {/* Other Family Members */}
              {familyMembers.map((member) => (
                <div
                  key={member.username}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.icon === 'heart' && <Heart className="w-4 h-4" />}
                      {member.icon === 'gamepad' && <Gamepad2 className="w-4 h-4" />}
                      {member.icon === 'tv' && <Tv className="w-4 h-4" />}
                      {!['heart', 'gamepad', 'tv'].includes(member.icon) && member.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <span>{member.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">@{member.username}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {member.role === 'admin' ? 'Administrator' : 'Family Member (Standard)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400">
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.username)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Member Input */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Add member name (e.g. Grandma, Emily)..."
                className="flex-1 bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as any)}
                className="bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="user">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lantern transition-all"
              >
                <span>Continue: Shared Storage</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SHARED STORAGE & LAUNCH */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-500">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Ready to Launch</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Review & Enter Lantern</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your family homelab is ready. Shared directories and real Linux storage points are initialized.
              </p>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">Server Name</span>
                <span className="font-bold">{serverName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">Primary Admin</span>
                <span className="font-bold text-amber-500">{adminName} (@{adminUsername})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500">Family Members</span>
                <span className="font-bold">{familyMembers.length + 1} profiles configured</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Shared Storage</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">~/.lantern/family_shared/</span>
              </div>
            </div>

            {/* Launch Choice Buttons */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Where would you like to go first?</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinish('portal')}
                  className="p-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-left transition-all shadow-lantern flex flex-col justify-between space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <LanternLogo size={24} />
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">Open Family Portal</div>
                    <p className="text-[11px] text-slate-900/80 font-medium mt-0.5">
                      Stream media, switch member profiles, and access family apps.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinish('admin')}
                  className="p-4 rounded-2xl bg-white dark:bg-obsidian-800 hover:bg-slate-100 dark:hover:bg-obsidian-750 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-left transition-all flex flex-col justify-between space-y-3 group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <Server className="w-6 h-6 text-amber-500" />
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">Server Management Console</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      View all hardware telemetry, Docker workloads, and network tunnels.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-start pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
