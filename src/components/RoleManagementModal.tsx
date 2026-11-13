import React, { useState } from 'react';
import { Shield, ShieldAlert, UserCheck, Plus, Trash2, X, Crown, Users } from 'lucide-react';
import { Member } from '../types';

export interface AdminRoleItem {
  id: string;
  email: string;
  role: 'owner' | 'admin';
  grantedBy: string;
  grantedAt: string;
}

interface RoleManagementModalProps {
  isOpen: boolean;
  currentUserEmail: string;
  isOwner: boolean;
  adminList: AdminRoleItem[];
  members?: Member[];
  onAddAdmin: (email: string, role: 'owner' | 'admin') => Promise<void>;
  onRemoveAdmin: (id: string) => Promise<void>;
  onClose: () => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  currentUserEmail,
  isOwner,
  adminList,
  members = [],
  onAddAdmin,
  onRemoveAdmin,
  onClose,
}) => {
  if (!isOpen) return null;

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'admin'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddAdmin(newEmail.trim().toLowerCase(), newRole);
      setNewEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddMember = (mEmail: string) => {
    setNewEmail(mEmail);
    setNewRole('admin');
  };

  // Find members with emails who are not yet admins
  const eligibleMembers = members.filter(
    (m): m is Member & { email: string } =>
      Boolean(m.email && m.email.trim().length > 0) &&
      !adminList.some((a) => a.email.toLowerCase() === m.email!.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-2">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#0B1F3A] dark:text-white">
              To'annoo Role & Bulchitootaa (Owner & Admin)
            </h3>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
              Owner Namoota Admin Taasisuu Ykn kennuu Akka Danda'u Haala isaaf Mijjatu Uumi.
            </p>
          </div>
        </div>

        {/* Prominent Instruction & RBAC Card */}
        <div className="my-4 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="font-bold text-[#0B1F3A] dark:text-blue-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Owner Namoota Admin Taasisuu Ykn kennuu Akka Danda'u Haala isaaf Mijjatu Uumi:
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong>Owner:</strong> Namoota haaraa ykn miseensota filachuun aangoo <em>Admin</em> (Bulchaa) ykn <em>Owner</em> kennuu danda'a.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Admin:</strong> Miseensota hunda ilaaluu, kaffaltii galmeessuu, gabaasa baasuu fi nagahee erguu danda'a.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Non-Admin (Galmeessaa):</strong> Miseensa haaraa galmeessuu fi kaffaltii nagahee baasuu danda'a, garuu <em>miseensota ofii isaaniitiif galmeessan qofa</em> argu.
          </p>
        </div>

        {/* Add Role Form - Only Owner can add */}
        {isOwner ? (
          <form onSubmit={handleAdd} className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-blue-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Namoota Admin Taasisi Ykn Aangoo Kenni
              </h4>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                Owner Only
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Imeelii Google (User Google Email) *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="fkn. nama@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Quick Select from Eligible Members if any */}
              {eligibleMembers.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">
                    Miseensota keessaa filachuun Admin taasisi (Quick select):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {eligibleMembers.slice(0, 6).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleQuickAddMember(m.email)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                      >
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{m.fullName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Gosa Aangoo (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'owner' | 'admin')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-800 dark:text-emerald-300"
                  >
                    <option value="admin">🛡️ Admin (Bulchaa — Miseensota hunda arguuf)</option>
                    <option value="owner">👑 Owner (Abbaa Aangoo Guutuu)</option>
                  </select>
                </div>

                <div className="pt-5">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newEmail}
                    className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Taasisaa jira...' : newRole === 'admin' ? 'Admin Taasisi' : 'Owner Taasisi'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Aangoo Admin namaaf kennuuf Owner ta'uu qabdu.</span>
          </div>
        )}

        {/* Existing Admins List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tarree Bulchitootaa (Current Admins & Owners)
            </h4>
            <span className="text-[10px] text-slate-500">
              Walii-gala: {adminList.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto pr-1">
            {adminList.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${item.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                    {item.role === 'owner' ? <Crown className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{item.email}</span>
                      {item.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">(Ati / You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className={`uppercase font-bold ${item.role === 'owner' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.role === 'owner' ? '👑 Owner' : '🛡️ Admin'}
                      </span>
                      <span>•</span>
                      <span>Kan kenne: {item.grantedBy}</span>
                    </div>
                  </div>
                </div>

                {isOwner && item.email.toLowerCase() !== currentUserEmail.toLowerCase() && item.email !== 'iibrahimabdela@gmail.com' && item.email !== 'shaxaa72@gmail.com' && (
                  <button
                    onClick={() => onRemoveAdmin(item.id)}
                    title="Aangoo Irraa Mulqi (Revoke Role)"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Cufi (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
