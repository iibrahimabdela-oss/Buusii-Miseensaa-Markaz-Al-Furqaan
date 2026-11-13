import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  Coins,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt,
  ArrowRight,
  Landmark,
  BarChart3,
  Calendar,
  MessageCircle,
  ArrowUpRight,
  FileDown,
} from 'lucide-react';
import { Member, Contribution, Language } from '../types';
import {
  ETHIOPIAN_MONTHS,
  getCurrentEthiopianYearAndMonth,
  formatCurrencyETB,
} from '../utils/ethiopianCalendar';
import { TRANSLATIONS } from '../utils/translations';
import { createReceiptWhatsAppMessage, sendViaWhatsApp } from '../utils/whatsapp';
import { generateExecutiveSummaryPDF } from '../utils/reportGenerators';
import { AlFurqaanLogo } from './AlFurqaanLogo';

interface DashboardProps {
  members: Member[];
  contributions: Contribution[];
  lang: Language;
  onNavigate: (tab: string) => void;
  onOpenRecordModal: () => void;
  onOpenAddMemberModal: () => void;
  onOpenReceipt: (c: Contribution) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  members,
  contributions,
  lang,
  onNavigate,
  onOpenRecordModal,
  onOpenAddMemberModal,
  onOpenReceipt,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;
  const currentEth = getCurrentEthiopianYearAndMonth();

  const [selectedMonthView, setSelectedMonthView] = useState<string>(currentEth.monthKey);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportSummaryPdf = async () => {
    try {
      setIsExportingPdf(true);
      await generateExecutiveSummaryPDF(members, contributions, currentEth.year);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Valid (non-voided) contributions (Expenses completely excluded per prompt)
  const validContributions = contributions.filter((c) => c.status !== 'voided');

  // Active members & contribution totals
  const activeMembers = members.filter((m) => m.status === 'active');
  const totalMonthlyPledged = activeMembers.reduce((acc, m) => acc + (m.monthlyPledgeETB || 0), 0);
  const totalCollectedAllTime = validContributions.reduce((acc, c) => acc + (c.amountETB || 0), 0);

  // Current Ethiopian Month vs. Previous Ethiopian Month Comparison
  const currentIdx = ETHIOPIAN_MONTHS.findIndex((m) => m.key === currentEth.monthKey);
  const prevIdx = currentIdx <= 0 ? ETHIOPIAN_MONTHS.length - 1 : currentIdx - 1;
  const prevMonthObj = ETHIOPIAN_MONTHS[prevIdx];
  const prevYear = currentIdx <= 0 ? currentEth.year - 1 : currentEth.year;

  const currentMonthContribs = validContributions.filter(
    (c) => c.ethiopianMonth === currentEth.monthKey && c.ethiopianYear === currentEth.year
  );
  const prevMonthContribs = validContributions.filter(
    (c) => c.ethiopianMonth === prevMonthObj.key && c.ethiopianYear === prevYear
  );

  const currentMonthTotal = currentMonthContribs.reduce((sum, c) => sum + (c.amountETB || 0), 0);
  const prevMonthTotal = prevMonthContribs.reduce((sum, c) => sum + (c.amountETB || 0), 0);
  const monthDiffETB = currentMonthTotal - prevMonthTotal;
  const monthDiffPercent =
    prevMonthTotal > 0
      ? Math.round((monthDiffETB / prevMonthTotal) * 100)
      : currentMonthTotal > 0
      ? 100
      : 0;
  const maxComparisonVal = Math.max(currentMonthTotal, prevMonthTotal, 1);

  // Selected Month Totals (for interactive month filter & pie breakdown)
  const selectedMonthContributions = validContributions.filter(
    (c) => c.ethiopianMonth === selectedMonthView && c.ethiopianYear === currentEth.year
  );
  const selectedMonthCollected = selectedMonthContributions.reduce(
    (acc, c) => acc + (c.amountETB || 0),
    0
  );

  const collectionRate =
    totalMonthlyPledged > 0
      ? Math.min(Math.round((selectedMonthCollected / totalMonthlyPledged) * 100), 100)
      : 0;

  // Recharts Monthly Comparison Data: Collected vs Target across all 12 Ethiopian Months
  const monthlyChartData = ETHIOPIAN_MONTHS.slice(0, 12).map((m) => {
    const monthContribs = validContributions
      .filter((c) => c.ethiopianMonth === m.key && c.ethiopianYear === currentEth.year)
      .reduce((sum, c) => sum + (c.amountETB || 0), 0);

    return {
      monthKey: m.key,
      name: m.om.split(' ')[0],
      Kaffalame: monthContribs,
      Waadaa: totalMonthlyPledged,
    };
  });

  // Payment Method Breakdown
  const methodMap: Record<string, number> = {};
  selectedMonthContributions.forEach((c) => {
    const method = c.paymentMethod || 'other';
    methodMap[method] = (methodMap[method] || 0) + (c.amountETB || 0);
  });

  const paymentMethodPieData = Object.keys(methodMap).map((k) => ({
    name: k.toUpperCase(),
    value: methodMap[k],
  }));

  const PIE_COLORS = ['#0B1F3A', '#1D4ED8', '#3B82F6', '#64748B', '#93C5FD'];

  // Active vs. Inactive Members over the Last 6 Ethiopian Months (based on contribution history)
  const regularMonths = ETHIOPIAN_MONTHS.slice(0, 12);
  const curRegIdx = regularMonths.findIndex((m) => m.key === currentEth.monthKey);
  const anchorIdx = curRegIdx >= 0 ? curRegIdx : 11;
  const last6Periods: { monthKey: string; year: number; label: string }[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    let idx = anchorIdx - offset;
    let yr = currentEth.year;
    if (idx < 0) {
      idx += 12;
      yr -= 1;
    }
    const mObj = regularMonths[idx];
    last6Periods.push({
      monthKey: mObj.key,
      year: yr,
      label: mObj.om.split(' ')[0],
    });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const activeLast6Ids = new Set(
    validContributions
      .filter((c) => {
        const inLast6Eth = last6Periods.some(
          (p) => p.monthKey === c.ethiopianMonth && p.year === c.ethiopianYear
        );
        const isPhaagumeeCurrent =
          currentEth.monthKey === 'phaagumee' &&
          c.ethiopianMonth === 'phaagumee' &&
          c.ethiopianYear === currentEth.year;
        const createdTime = new Date(c.createdAt).getTime();
        const withinSixMonthsDate = !Number.isNaN(createdTime) && createdTime >= sixMonthsAgo.getTime();
        return inLast6Eth || isPhaagumeeCurrent || withinSixMonthsDate;
      })
      .map((c) => c.memberId)
  );

  const totalMembersCount = members.length;
  const activeLast6Count = members.filter((m) => activeLast6Ids.has(m.memberId)).length;
  const inactiveLast6Count = Math.max(totalMembersCount - activeLast6Count, 0);
  const activeLast6Pct =
    totalMembersCount > 0 ? Math.round((activeLast6Count / totalMembersCount) * 100) : 0;
  const inactiveLast6Pct = totalMembersCount > 0 ? 100 - activeLast6Pct : 0;

  const sixMonthActivityPieData = [
    {
      name: 'Socho’oo (Active)',
      value: activeLast6Pct,
      count: activeLast6Count,
    },
    {
      name: 'Hin Kaffalle (Inactive)',
      value: inactiveLast6Pct,
      count: inactiveLast6Count,
    },
  ];

  const sixMonthTrendData = last6Periods.map((p) => {
    const paidIds = new Set(
      validContributions
        .filter((c) => c.ethiopianMonth === p.monthKey && c.ethiopianYear === p.year)
        .map((c) => c.memberId)
    );
    const activeCount = members.filter((m) => paidIds.has(m.memberId)).length;
    const inactiveCount = Math.max(totalMembersCount - activeCount, 0);
    const activePct = totalMembersCount > 0 ? Math.round((activeCount / totalMembersCount) * 100) : 0;
    const inactivePct = totalMembersCount > 0 ? 100 - activePct : 0;

    return {
      name: p.label,
      ActivePct: activePct,
      InactivePct: inactivePct,
      activeCount,
      inactiveCount,
    };
  });

  const last12MonthsLineData = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i;
    let idx = anchorIdx - offset;
    let yr = currentEth.year;
    if (idx < 0) {
      idx += 12;
      yr -= 1;
    }
    const mObj = regularMonths[idx];
    const matching = validContributions.filter(
      (c) => c.ethiopianMonth === mObj.key && c.ethiopianYear === yr
    );
    const total = matching.reduce((sum, c) => sum + (c.amountETB || 0), 0);
    const shortName = mObj.om.split(' ')[0];
    return {
      name: `${shortName.slice(0, 3)} '${String(yr).slice(-2)}`,
      fullLabel: `${shortName} ${yr} E.C.`,
      Total: total,
      Receipts: matching.length,
    };
  });

  const last12MonthsGrandTotal = last12MonthsLineData.reduce((s, item) => s + item.Total, 0);

  const recentContributions = [...validContributions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const selectedMonthObj = ETHIOPIAN_MONTHS.find((m) => m.key === selectedMonthView);
  const prevMonthLabel = prevMonthObj.om.split(' ')[0];

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Minimalist Deep Blue Hero Header */}
      <div className="rounded-2xl bg-[#0B1F3A] text-white p-6 sm:p-8 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <AlFurqaanLogo
              size="header"
              className="border border-white/20 shadow-md shrink-0 hidden sm:inline-block"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 mb-2">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  Bara {currentEth.year} E.C. · {currentEth.monthNameOm}
                </span>
                <span className="text-blue-400/50">·</span>
                <span className="font-medium text-white">
                  {activeMembers.length} Miseensota Socho’oo
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Giddu-gala Hifzii Qur’aanaa Al-Furqaan
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-2xl">
                « الَّذِينَ يُنْفِقُونَ أَمْوَالَهُمْ بِاللَّيْلِ وَالنَّهَارِ سِرًّا وَعَلَانِيَةً فَلَهُمْ أَجْرُهُمْ عِنْدَ رَبِّهِمْ »
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenRecordModal}
              className="px-4 py-2.5 bg-white hover:bg-blue-50 text-[#0B1F3A] font-bold rounded-xl shadow-xs text-xs flex items-center gap-2 transition"
            >
              <Coins className="w-4 h-4 text-blue-700" />
              <span>{t.recordPayment}</span>
            </button>
            <button
              onClick={onOpenAddMemberModal}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/20 text-xs flex items-center gap-2 transition"
            >
              <Users className="w-4 h-4" />
              <span>{t.addMember}</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2.5 bg-blue-700/80 hover:bg-blue-700 text-white font-semibold rounded-xl border border-blue-500/40 text-xs flex items-center gap-2 transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Gabaasa 13</span>
            </button>
            <button
              onClick={handleExportSummaryPdf}
              disabled={isExportingPdf}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/25 text-xs flex items-center gap-2 transition disabled:opacity-60"
              title="Export current financial summary as PDF report"
            >
              <FileDown className="w-4 h-4 text-blue-200" />
              <span>{isExportingPdf ? 'Qophaa’aa Jira...' : 'Gabaasa PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Current Month vs Previous Month Contributions Summary Card */}
      <section aria-label="Current vs Previous Month Contributions">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Madaallii Ji’a Ammaa fi Ji’a Darbee · Monthly Contribution Comparison
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-white mt-0.5">
                Buusii Ji’a {currentEth.monthNameOm} {currentEth.year} vs. {prevMonthLabel} {prevYear}
              </h3>
            </div>

            {/* Variance Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border self-start sm:self-auto ${
                monthDiffETB > 0
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : monthDiffETB < 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {monthDiffETB > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              ) : monthDiffETB < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="font-mono">
                {monthDiffETB > 0 ? '+' : ''}
                {formatCurrencyETB(monthDiffETB)}
              </span>
              {prevMonthTotal > 0 && (
                <span className="font-mono opacity-80">
                  ({monthDiffPercent > 0 ? '+' : ''}
                  {monthDiffPercent}%)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 items-center">
            {/* Current Month Total */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Ji’a Ammaa ({currentEth.monthNameOm} {currentEth.year})</span>
                <ArrowUpRight className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-2">
                {formatCurrencyETB(currentMonthTotal)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{currentMonthContribs.length} kaffaltii galmaa’e</span>
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                  {totalMonthlyPledged > 0
                    ? `${Math.min(Math.round((currentMonthTotal / totalMonthlyPledged) * 100), 100)}% target`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Previous Month Total */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Ji’a Darbe ({prevMonthLabel} {prevYear})</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-slate-200 font-mono mt-2">
                {formatCurrencyETB(prevMonthTotal)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{prevMonthContribs.length} kaffaltii galmaa’e</span>
                <span>Ji’a duraa</span>
              </div>
            </div>

            {/* Visual Proportional Comparison Bars */}
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#0B1F3A] dark:text-slate-200">
                    {currentEth.monthNameOm} {currentEth.year}
                  </span>
                  <span className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                    {formatCurrencyETB(currentMonthTotal)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B1F3A] dark:bg-blue-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((currentMonthTotal / maxComparisonVal) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {prevMonthLabel} {prevYear}
                  </span>
                  <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                    {formatCurrencyETB(prevMonthTotal)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 dark:bg-slate-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((prevMonthTotal / maxComparisonVal) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {prevMonthTotal === 0 && currentMonthTotal === 0
                  ? 'Ji’oota lamaanuu keessatti kaffaltiin hin galmoofne.'
                  : prevMonthTotal === 0
                  ? `Ji’a ${prevMonthLabel} keessa kaffaltiin hin galmoofne; ji’a kana ${formatCurrencyETB(currentMonthTotal)} argameera.`
                  : monthDiffETB >= 0
                  ? `Ji’a darbe caalaa ${formatCurrencyETB(monthDiffETB)} (${monthDiffPercent}%) dabalataan walitti qabameera.`
                  : `Ji’a darbe irraa ${formatCurrencyETB(Math.abs(monthDiffETB))} (${Math.abs(monthDiffPercent)}%) hir’ateera.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Month Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1F3A] dark:text-slate-300 shrink-0">
          <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <span>Ji’a Filadhaa (Filter by Ethiopian Month):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ETHIOPIAN_MONTHS.slice(0, 12).map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMonthView(m.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedMonthView === m.key
                  ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {m.om.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Financial Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collected All Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Waliigala Buusii (All-Time)</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-3">
            {formatCurrencyETB(totalCollectedAllTime)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Kaffaltii {validContributions.length} galmaa’e</span>
          </div>
        </div>

        {/* Card 2: Selected Month Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Buusii Ji’a {selectedMonthObj?.om.split(' ')[0]}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 font-mono mt-3">
            {formatCurrencyETB(selectedMonthCollected)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Target irraa: <strong className="text-[#0B1F3A] dark:text-slate-200 font-mono">{collectionRate}%</strong> galma ga’e
          </div>
        </div>

        {/* Card 3: Monthly Target / Pledge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Waadaa Ji’aa (Monthly Target)</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B1F3A] dark:text-slate-300">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-3">
            {formatCurrencyETB(totalMonthlyPledged)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Miseensota <strong className="text-[#0B1F3A] dark:text-slate-200 font-mono">{activeMembers.length}</strong> irraa eegama
          </div>
        </div>

        {/* Card 4: Active Members Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Miseensota Galmaa’an</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono mt-3">
            {members.length}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{activeMembers.length} Socho’oo (Active)</span>
          </div>
        </div>
      </div>

      {/* Recharts Monthly Summary Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Collected vs Monthly Target */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Gabaasa Buusii Ji’ootaa (Monthly Contributions vs Target)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Waggaa {currentEth.year} E.C. — Buusii Kaffalame fi Waadaa Ji’aa
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`, '']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  dataKey="Kaffalame"
                  name="Buusii Kaffalame (Collected)"
                  fill="#1D4ED8"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Waadaa"
                  name="Waadaa Ji'aa (Target Pledge)"
                  fill="#CBD5E1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channels / Payment Method Breakdown Pie */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white mb-1 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Karaa Kaffaltii (Channels)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Ji’a {selectedMonthObj?.om.split(' ')[0]} kaffaltii walitti qabame
          </p>

          <div className="flex-1 min-h-[180px] flex items-center justify-center">
            {paymentMethodPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethodPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {paymentMethodPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, '']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400 py-6">
                Ji’a kana kaffaltiin hin jiru.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            {paymentMethodPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-mono font-bold text-[#0B1F3A] dark:text-slate-200">
                  {formatCurrencyETB(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active vs Inactive Members (Last 6 Months Contribution History) */}
      <section aria-label="Active vs Inactive Members Last 6 Months">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Hirmaannaa Miseensotaa Ji’oota 6 Darban (Active vs. Inactive Members — Last 6 Months)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dhibbeentaa miseensota ji’oota 6 darban keessatti buusii galchanii (Active) fi kan hin galchine (Inactive)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                Active: {activeLast6Pct}% ({activeLast6Count})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                Inactive: {inactiveLast6Pct}% ({inactiveLast6Count})
              </span>
            </div>
          </div>

          {totalMembersCount > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 items-center">
              {/* Overall 6-Month Active vs Inactive Donut PieChart */}
              <div className="flex flex-col items-center">
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sixMonthActivityPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        <Cell fill="#1D4ED8" />
                        <Cell fill="#CBD5E1" />
                      </Pie>
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => [
                          `${value}% (${props?.payload?.count ?? 0} miseensota)`,
                          props?.payload?.name || '',
                        ]}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs mt-1">
                  <span className="flex items-center gap-1.5 font-semibold text-[#0B1F3A] dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" />
                    Active ({activeLast6Pct}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                    Inactive ({inactiveLast6Pct}%)
                  </span>
                </div>
              </div>

              {/* Monthly Percentage Breakdown Stacked BarChart (Last 6 Months) */}
              <div className="lg:col-span-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Haala Hirmaannaa Ji’a Ji’aan (%) · Last 6 Months Monthly Trend
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sixMonthTrendData}
                      margin={{ top: 8, right: 10, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [`${value}%`, name]}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar
                        dataKey="ActivePct"
                        name="Active (%)"
                        stackId="members"
                        fill="#1D4ED8"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="InactivePct"
                        name="Inactive (%)"
                        stackId="members"
                        fill="#CBD5E1"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              Miseensonni yeroo galmaa’an dhibbeentaan hirmaannaa ji’oota 6 darbanii asirratti mul’ata.
            </div>
          )}
        </div>
      </section>

      {/* Financial Trend Line Chart (Total Monthly Contributions over the Last 12 Months) */}
      <section aria-label="12-Month Contribution Financial Trend">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Guddina Buusii Ji’oota 12 Darban (12-Month Contribution Trend)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Waliigala maallaqa ji’a ji’aan walitti qabame ji’oota 12 darban keessatti (ETB)
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 self-start sm:self-auto">
              12-Month Total: {formatCurrencyETB(last12MonthsGrandTotal)}
            </div>
          </div>

          <div className="h-64 w-full pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={last12MonthsLineData}
                margin={{ top: 10, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                />
                <Tooltip
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullLabel || String(_label)
                  }
                  formatter={(value: any) => [formatCurrencyETB(Number(value)), 'Buusii Kaffalame']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="Total"
                  name="Buusii Ji'aa (ETB)"
                  stroke="#1D4ED8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0B1F3A', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#1D4ED8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Contributions Table with WhatsApp & Receipt Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Kaffaltii Dhiyoo Galmaa’an (Recent Payments)
          </h3>
            <button
              onClick={() => onNavigate('contributions')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 flex items-center gap-1 transition"
            >
              Hunda Ilaali <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="pb-2.5 font-semibold">Miseensa</th>
                  <th className="pb-2.5 font-semibold">Ji’a & Waggaa</th>
                  <th className="pb-2.5 font-semibold">Hanga</th>
                  <th className="pb-2.5 font-semibold">Karaa</th>
                  <th className="pb-2.5 font-semibold text-right">Tarkaanfii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentContributions.map((c) => {
                  const memberObj = members.find((m) => m.memberId === c.memberId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-semibold text-[#0B1F3A] dark:text-slate-200">
                        <div>{c.memberName}</div>
                        <span className="text-[10px] font-mono text-slate-400">{c.receiptNumber}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300 capitalize">
                        {c.ethiopianMonth} {c.ethiopianYear}
                      </td>
                      <td className="py-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrencyETB(c.amountETB)}
                      </td>
                      <td className="py-2.5 uppercase text-[10px] font-bold text-slate-500">
                        {c.paymentMethod}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {memberObj && memberObj.phoneNumber && (
                            <button
                              onClick={() => {
                                const msg = createReceiptWhatsAppMessage(memberObj, c);
                                sendViaWhatsApp(memberObj.phoneNumber, msg);
                              }}
                              title="Nagahee WhatsApp dhaan ergi"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenReceipt(c)}
                            title="Nagahee Maxxansi / Ilaali"
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};
