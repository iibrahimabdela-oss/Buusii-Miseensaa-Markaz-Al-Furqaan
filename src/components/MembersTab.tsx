import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Shield,
  Lock,
  MessageCircle,
} from 'lucide-react';
import { Member, Contribution, Language } from '../types';
import { formatCurrencyETB, generateMemberId, getCurrentEthiopianYearAndMonth } from '../utils/ethiopianCalendar';
import { TRANSLATIONS } from '../utils/translations';
import { createPledgeReminderWhatsAppMessage, sendViaWhatsApp } from '../utils/whatsapp';
import { AlFurqaanLogo } from './AlFurqaanLogo';

interface MembersTabProps {
  members: Member[];
  contributions: Contribution[];
  lang: Language;
  isAdmin: boolean;
  currentUserId: string;
  currentUserEmail: string;
  onAddMember: (member: Omit<Member, 'id'>) => Promise<void>;
  onRecordPaymentForMember: (member: Member) => void;
  onSendReminderForMember: (member: Member) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  contributions,
  lang,
  isAdmin,
  currentUserId,
  currentUserEmail,
  onAddMember,
  onRecordPaymentForMember,
  onSendReminderForMember,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;
  const currentEth = getCurrentEthiopianYearAndMonth();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New member form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [monthlyPledgeETB, setMonthlyPledgeETB] = useState<number>(1000);
  const [city, setCity] = useState('Finfinnee / Addis Ababa');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // RBAC Filtering: If not admin, regular user ONLY sees members that they registered!
  const userVisibleMembers = isAdmin
    ? members
    : members.filter(
        (m) =>
          m.createdBy === currentUserId ||
          m.createdBy === currentUserEmail ||
          (m.createdBy && m.createdBy.toLowerCase() === currentUserEmail.toLowerCase())
      );

  // Valid (non-voided) contributions & current Ethiopian month paid member set
  const validContributions = contributions.filter((c) => c.status !== 'voided');

  const paidThisMonthIds = new Set(
    validContributions
      .filter(
        (c) =>
          c.ethiopianMonth === currentEth.monthKey &&
          c.ethiopianYear === currentEth.year
      )
      .map((c) => c.memberId)
  );

  const unpaidActiveCount = userVisibleMembers.filter(
    (m) => m.status === 'active' && !paidThisMonthIds.has(m.memberId)
  ).length;

  // Calculate total contributed per member
  const memberTotalPaid: Record<string, number> = {};
  validContributions.forEach((c) => {
    const key = c.memberId;
    memberTotalPaid[key] = (memberTotalPaid[key] || 0) + (c.amountETB || 0);
  });

  const filteredMembers = userVisibleMembers.filter((m) => {
    const query = search.trim().toLowerCase();
    const normalizedQueryDigits = query.replace(/[\s\-()+]/g, '');
    const normalizedPhoneDigits = (m.phoneNumber || '').replace(/[\s\-()+]/g, '');

    const matchesSearch =
      !query ||
      m.fullName.toLowerCase().includes(query) ||
      m.memberId.toLowerCase().includes(query) ||
      (m.phoneNumber && m.phoneNumber.toLowerCase().includes(query)) ||
      (normalizedQueryDigits.length > 0 && normalizedPhoneDigits.includes(normalizedQueryDigits)) ||
      (m.email && m.email.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
    const isUnpaidCurrentMonth = m.status === 'active' && !paidThisMonthIds.has(m.memberId);
    const matchesPayment =
      selectedPaymentFilter === 'all' ||
      (selectedPaymentFilter === 'unpaid' && isUnpaidCurrentMonth) ||
      (selectedPaymentFilter === 'paid' && paidThisMonthIds.has(m.memberId));

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phoneNumber) return;

    try {
      setIsSubmitting(true);
      const nextSeq = members.length + 1;
      const memberCode = generateMemberId(nextSeq);

      await onAddMember({
        fullName,
        phoneNumber,
        email: email || undefined,
        memberId: memberCode,
        monthlyPledgeETB: Number(monthlyPledgeETB) || 0,
        status,
        city,
        createdBy: currentUserId || currentUserEmail,
        createdAt: new Date().toISOString(),
      });

      setIsModalOpen(false);
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setMonthlyPledgeETB(1000);
    } catch (err: any) {
      alert(err?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              {t.members} ({filteredMembers.length})
            </h2>
            {isAdmin ? (
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-700 dark:text-blue-400" /> All Center Members (Admin)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-700 dark:text-blue-400" /> Miseensota Ati Galmeessite Qofa
              </span>
            )}
            {unpaidActiveCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {unpaidActiveCount} · {currentEth.monthNameOm} Hin Kaffalamne
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? `Miseensota buusii ji'aa Al-Furqaan kaffalanii fi waadaa galan hunda · Ji'a Ammaa: ${currentEth.monthNameOm} ${currentEth.year}`
              : 'Miseensa haaraa galmeessuu dandeessa; miseensonni ati galmeessite qofti asirratti mul\'atu.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t.addMember}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search members by name or phone number"
            placeholder="Maqaa ykn lakk. bilbilaa dhaan barbaadi (Search by name or phone)..."
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              aria-label="Clear search"
              className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Current Month Payment Filter */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-[11px] font-semibold">
            <button
              onClick={() => setSelectedPaymentFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedPaymentFilter === 'all'
                  ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Hunda
            </button>
            <button
              onClick={() => setSelectedPaymentFilter('unpaid')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                selectedPaymentFilter === 'unpaid'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Hin Kaffalle ({unpaidActiveCount})
            </button>
            <button
              onClick={() => setSelectedPaymentFilter('paid')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedPaymentFilter === 'paid'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Kaffalame
            </button>
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">{t.allStatuses}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((m) => {
          const totalPaid = memberTotalPaid[m.memberId] || 0;
          const hasPaidCurrentMonth = paidThisMonthIds.has(m.memberId);
          const isUnpaidThisMonth = m.status === 'active' && !hasPaidCurrentMonth;

          return (
            <div
              key={m.id || m.memberId}
              className={`rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between border ${
                isUnpaidThisMonth
                  ? 'bg-amber-50/25 dark:bg-slate-900 border-amber-300/80 dark:border-amber-700/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Top header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                        {m.memberId}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          m.status === 'active'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white mt-1.5">
                      {m.fullName}
                    </h3>
                  </div>

                  {/* Subtle Current-Month Contribution Status Badge */}
                  {isUnpaidThisMonth ? (
                    <span
                      title={`${currentEth.monthNameOm} ${currentEth.year} kaffaltiin hin galmoofne`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 shrink-0"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Hin kaffalamne</span>
                    </span>
                  ) : hasPaidCurrentMonth ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
                      <span>{currentEth.monthNameOm}</span>
                    </span>
                  ) : null}
                </div>

                {/* Info List */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-500 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{m.phoneNumber}</span>
                  </div>

                  {m.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{m.email}</span>
                    </div>
                  )}

                  {m.city && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.city}</span>
                    </div>
                  )}

                  {isAdmin && m.createdBy && (
                    <div className="text-[10px] text-slate-400 pt-1">
                      Galmeessaa: <span className="font-mono text-slate-600 dark:text-slate-300">{m.createdBy}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Waadaa Ji’aa</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">
                      {formatCurrencyETB(m.monthlyPledgeETB)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Waliigala Kaffale</span>
                    <span className="font-bold text-[#0B1F3A] dark:text-slate-200 font-mono">
                      {formatCurrencyETB(totalPaid)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => onRecordPaymentForMember(m)}
                  className="flex-1 px-3 py-2 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Kaffaltii
                </button>

                {m.phoneNumber && (
                  <button
                    onClick={() => {
                      const msg = createPledgeReminderWhatsAppMessage(m, currentEth.monthNameOm, currentEth.year);
                      sendViaWhatsApp(m.phoneNumber, msg);
                    }}
                    title="Yaadachiisa Buusii WhatsApp dhaan Ergi"
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </button>
                )}

                {m.email && (
                  <button
                    onClick={() => onSendReminderForMember(m)}
                    title="Yaadachiisa Imeeliin Ergi"
                    className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-slate-200">Miseensi hin argamne</h3>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Maqaa ykn lakkoofsa bilbilaa barbaadan sirreessaa yaalaa.'
              : 'Miseensi ati galmeessite hin jiru. "Miseensa Haaraa Galmeessi" tuquun jalqabi.'}
          </p>
        </div>
      )}

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <AlFurqaanLogo size="sm" />
              <div>
                <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white leading-tight">
                  {t.addMember}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Odeeffannoo miseensa haaraa galmeessaa
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Maqaa Guutuu (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="fkn. Ahmedin Jemal Ali"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Lakk. Bilbilaa *
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+251 91 ..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Imeelii (Gmail / Email)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Buusii Waadaa Ji’atti (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={monthlyPledgeETB}
                    onChange={(e) => setMonthlyPledgeETB(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Magaalaa / Bakka Jireenyaa
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="fkn. Finfinnee"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Galmaa’aa Jira...' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
