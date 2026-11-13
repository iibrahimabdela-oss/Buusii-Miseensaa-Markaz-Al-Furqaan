import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Printer,
  Mail,
  X,
  Edit3,
  RefreshCw,
  FileSpreadsheet,
  MessageCircle,
} from 'lucide-react';
import { Member, Contribution, PaymentMethod, ContributionStatus, Language } from '../types';
import {
  ETHIOPIAN_MONTHS,
  getCurrentEthiopianYearAndMonth,
  formatCurrencyETB,
  generateReceiptNumber,
} from '../utils/ethiopianCalendar';
import { TRANSLATIONS } from '../utils/translations';
import { createReceiptWhatsAppMessage, sendViaWhatsApp } from '../utils/whatsapp';
import { AlFurqaanLogo } from './AlFurqaanLogo';

interface ContributionsTabProps {
  contributions: Contribution[];
  members: Member[];
  lang: Language;
  onRecordContribution: (contribution: Omit<Contribution, 'id'>) => Promise<void>;
  onUpdateContribution: (id: string, updated: Partial<Contribution>) => Promise<void>;
  onOpenReceipt: (c: Contribution) => void;
  onSendReceiptViaGmail: (c: Contribution, m: Member) => void;
}

export const ContributionsTab: React.FC<ContributionsTabProps> = ({
  contributions,
  members,
  lang,
  onRecordContribution,
  onUpdateContribution,
  onOpenReceipt,
  onSendReceiptViaGmail,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;
  const currentEth = getCurrentEthiopianYearAndMonth();

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentEth.year);
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Update Contribution state
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [editAmountETB, setEditAmountETB] = useState<number>(0);
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState(currentEth.year);
  const [editMethod, setEditMethod] = useState<PaymentMethod>('telebirr');
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<ContributionStatus>('verified');

  // Record Form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amountETB, setAmountETB] = useState<number>(1000);
  const [formMonth, setFormMonth] = useState(currentEth.monthKey);
  const [formYear, setFormYear] = useState(currentEth.year);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');

  const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
    { id: 'telebirr', label: 'Telebirr (ቴሌብር)' },
    { id: 'cbe', label: 'Baankii Daldala Itiyoophiyaa (CBE)' },
    { id: 'awash', label: 'Baankii Awaash (Awash Bank)' },
    { id: 'cbe_birr', label: 'CBE Birr' },
    { id: 'cash', label: 'Callaa / Cash' },
    { id: 'bank_transfer', label: 'Dabarsa Baankii Biroo' },
  ];

  // Update pledge amount when selecting member
  const handleMemberChange = (mId: string) => {
    setSelectedMemberId(mId);
    const found = members.find((m) => m.memberId === mId || m.id === mId);
    if (found) {
      setAmountETB(found.monthlyPledgeETB || 1000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const foundMember = members.find((m) => m.memberId === selectedMemberId || m.id === selectedMemberId);
    if (!foundMember || !amountETB) return;

    try {
      setIsSubmitting(true);
      const nextSeq = contributions.length + 1;
      const receiptNumber = generateReceiptNumber(nextSeq, formYear);

      await onRecordContribution({
        memberId: foundMember.memberId,
        memberName: foundMember.fullName,
        receiptNumber,
        amountETB: Number(amountETB),
        ethiopianMonth: formMonth,
        ethiopianYear: Number(formYear),
        paymentMethod,
        transactionReference: transactionReference || undefined,
        notes: notes || undefined,
        recordedBy: 'admin',
        status: 'verified',
        createdAt: new Date().toISOString(),
      });

      // Celebrate with confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#34d399', '#f59e0b'],
      });

      setIsModalOpen(false);
      setTransactionReference('');
      setNotes('');
    } catch (err: any) {
      alert(err?.message || 'Failed to record contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (c: Contribution) => {
    setEditingContribution(c);
    setEditAmountETB(c.amountETB);
    setEditMonth(c.ethiopianMonth);
    setEditYear(c.ethiopianYear);
    setEditMethod(c.paymentMethod);
    setEditRef(c.transactionReference || '');
    setEditNotes(c.notes || '');
    setEditStatus(c.status);
  };

  // Handle Update submission
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;

    try {
      setIsSubmitting(true);
      const idToUpdate = editingContribution.id || editingContribution.receiptNumber;
      await onUpdateContribution(idToUpdate, {
        amountETB: Number(editAmountETB),
        ethiopianMonth: editMonth,
        ethiopianYear: Number(editYear),
        paymentMethod: editMethod,
        transactionReference: editRef || undefined,
        notes: editNotes || undefined,
        status: editStatus,
      });

      setEditingContribution(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredContributions = contributions.filter((c) => {
    const matchesSearch =
      c.memberName.toLowerCase().includes(search.toLowerCase()) ||
      c.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.memberId.toLowerCase().includes(search.toLowerCase()) ||
      (c.transactionReference && c.transactionReference.toLowerCase().includes(search.toLowerCase()));

    const matchesMonth = selectedMonth === 'all' || c.ethiopianMonth === selectedMonth;
    const matchesYear = !selectedYear || c.ethiopianYear === selectedYear;
    const matchesMethod = selectedMethod === 'all' || c.paymentMethod === selectedMethod;

    return matchesSearch && matchesMonth && matchesYear && matchesMethod;
  });

  const totalFilteredAmount = filteredContributions.reduce((sum, c) => sum + (c.amountETB || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            {t.contributions} ({filteredContributions.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Waliigala kaffaltii: <strong className="text-blue-700 dark:text-blue-400 font-mono">{formatCurrencyETB(totalFilteredAmount)}</strong>
          </p>
        </div>

        <button
          onClick={() => {
            if (members.length > 0 && !selectedMemberId) {
              handleMemberChange(members[0].memberId);
            }
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          {t.recordPayment}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Maqaa, nagahee, ref barbaadi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Month */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">Ji’a Hunda (All Months)</option>
          {ETHIOPIAN_MONTHS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.om}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
        >
          {[2016, 2017, 2018, 2019, 2020].map((y) => (
            <option key={y} value={y}>
              Waggaa {y} E.C.
            </option>
          ))}
        </select>

        {/* Payment Channel */}
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">Karaa Hunda (All Channels)</option>
          <option value="telebirr">Telebirr</option>
          <option value="cbe">CBE</option>
          <option value="awash">Awash Bank</option>
          <option value="cbe_birr">CBE Birr</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>

      {/* Contributions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">{t.receiptNumber}</th>
                <th className="py-3.5 px-4">{t.member}</th>
                <th className="py-3.5 px-4">{t.amount}</th>
                <th className="py-3.5 px-4">{t.ethMonth}</th>
                <th className="py-3.5 px-4">{t.paymentMethod}</th>
                <th className="py-3.5 px-4">{t.reference}</th>
                <th className="py-3.5 px-4">{t.status}</th>
                <th className="py-3.5 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredContributions.map((c) => {
                const memberObj = members.find((m) => m.memberId === c.memberId);
                return (
                  <tr
                    key={c.id || c.receiptNumber}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 dark:text-blue-400">
                      <button
                        onClick={() => onOpenReceipt(c)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        {c.receiptNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0B1F3A] dark:text-white">
                        {c.memberName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {c.memberId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-[#0B1F3A] dark:text-white">
                      {formatCurrencyETB(c.amountETB)}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {c.ethiopianMonth} {c.ethiopianYear}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-200">
                        {c.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {c.transactionReference || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold ${
                          c.status === 'voided'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : c.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* UPDATE / EDIT BUTTON (Kaffaltii Haaromsi) */}
                        <button
                          onClick={() => openEditModal(c)}
                          title="Kaffaltii Haaromsi / Gulaali (Edit Contribution)"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </button>

                        <button
                          onClick={() => onOpenReceipt(c)}
                          title="Nagahee Ilaali / Maxxansi (Print / View)"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {memberObj && memberObj.phoneNumber && (
                          <button
                            onClick={() => {
                              const msg = createReceiptWhatsAppMessage(memberObj, c);
                              sendViaWhatsApp(memberObj.phoneNumber, msg);
                            }}
                            title="Nagahee WhatsApp dhaan Ergi"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          </button>
                        )}
                        {memberObj && memberObj.email && (
                          <button
                            onClick={() => onSendReceiptViaGmail(c, memberObj)}
                            title="Nagahee Imeeliin Ergi (Gmail)"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredContributions.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Kaffaltiin hin argamne.
          </div>
        )}
      </div>

      {/* EDIT / UPDATE CONTRIBUTION MODAL */}
      {editingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setEditingContribution(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kaffaltii Galmaa'e Haaromsi (Update Payment)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nagahee: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{editingContribution.receiptNumber}</strong> • {editingContribution.memberName}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Hanga Kaffaltii (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editAmountETB}
                    onChange={(e) => setEditAmountETB(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Karaa Kaffaltii (Channel) *
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Ji’a Kaffaltii (Eth Month) *
                  </label>
                  <select
                    value={editMonth}
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.om}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Waggaa (Eth Year E.C.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Lakk. Eenyummaa (Ref Code)
                  </label>
                  <input
                    type="text"
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
                    placeholder="fkn. TB-9281736412"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Haala Kaffaltii (Status)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ContributionStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="verified">Verified (Mirkanaa’eera)</option>
                    <option value="completed">Completed (Xumurameera)</option>
                    <option value="pending">Pending (Eeggata)</option>
                    <option value="voided">Voided (Haqameera)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Yaada / Du’aa (Notes)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Yaada dabalataa..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingContribution(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Haaromaa Jira...' : 'Kaffaltii Haaroomsi (Save Changes)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
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
                  {t.recordPayment}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kaffaltii buusii miseensaa galmeessaa nagahee qulqulluu baasaa
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Miseensa Filadhu (Select Member) *
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Miseensa Filadhu --</option>
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.fullName} ({m.memberId}) — Waadaa: {formatCurrencyETB(m.monthlyPledgeETB)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Hanga Kaffalame (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amountETB}
                    onChange={(e) => setAmountETB(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono text-sm font-bold text-blue-700 dark:text-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Karaa Kaffaltii (Channel) *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 font-semibold"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Ji’a Kaffaltii (Eth Month) *
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                  >
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.om}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Waggaa (Eth Year E.C.) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Lakk. Eenyummaa Kaffaltii (Telebirr/CBE Ref Code)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="fkn. TB-9281736412 ykn FT242598372"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Yaada / Du’aa (Optional Prayer or Notes)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="fkn. Barattoota Hifzii fi Ustazootaaf sadaqaa jaariyaa"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
                />
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
                  className="px-5 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  {isSubmitting ? 'Galmaa’aa Jira...' : 'Galmeessi & Nagahee Baasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
