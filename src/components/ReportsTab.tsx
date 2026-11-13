import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Presentation,
  Calendar,
  CheckCircle2,
  Users,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  Database,
} from 'lucide-react';
import { Member, Contribution, Language } from '../types';
import {
  ETHIOPIAN_MONTHS,
  getCurrentEthiopianYearAndMonth,
  formatCurrencyETB,
} from '../utils/ethiopianCalendar';
import {
  generateAnnualParticipationCSV,
  generateAnnualParticipationPDF,
  generateExecutiveSummaryCSV,
  generateExecutiveSummaryPDF,
  generateExecutiveSummaryPPT,
} from '../utils/reportGenerators';
import { exportFirebaseCollectionsAsJSON } from '../utils/firebaseBackup';
import { TRANSLATIONS } from '../utils/translations';
import { AlFurqaanLogo } from './AlFurqaanLogo';

interface ReportsTabProps {
  members: Member[];
  contributions: Contribution[];
  lang: Language;
  isAdmin?: boolean;
  userId?: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  members,
  contributions,
  lang,
  isAdmin = false,
  userId = '',
}) => {
  const currentEth = getCurrentEthiopianYearAndMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentEth.year);
  const [activeReportSubTab, setActiveReportSubTab] = useState<'annual' | 'executive'>('annual');
  const [isExportingJson, setIsExportingJson] = useState(false);

  const handleDownloadJsonBackup = async () => {
    try {
      setIsExportingJson(true);
      await exportFirebaseCollectionsAsJSON({ isAdmin, userId });
    } catch (err: any) {
      console.error('JSON Backup Error:', err);
    } finally {
      setIsExportingJson(false);
    }
  };

  const yearContribs = contributions.filter(
    (c) => c.ethiopianYear === selectedYear && c.status !== 'voided'
  );
  const totalCollected = yearContribs.reduce((acc, c) => acc + (c.amountETB || 0), 0);
  const activeMembers = members.filter((m) => m.status === 'active');
  const annualPledgedExpected = activeMembers.reduce(
    (acc, m) => acc + (Number(m.monthlyPledgeETB) || 0) * 12,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B1F3A] border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AlFurqaanLogo size="header" className="border border-white/25 shadow-lg shrink-0 hidden sm:inline-block" />
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Gabaasa & Galmee Faayinaansii</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Wiirtuu Gabaasaa (Reports & Analytics)
              </h2>
              <p className="mt-1 text-xs text-blue-100/80 max-w-xl leading-relaxed">
                Gabaasa hirmaannaa miseensotaa ji'oota waggaa 13 hunda PDF fi CSV dhaan, fi gabaasa waliigalaa CSV, PDF fi PPT dhaan baasaa.
              </p>
            </div>
          </div>

          {/* Year Selector & JSON Backup */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadJsonBackup}
              disabled={isExportingJson}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/25 text-xs flex items-center gap-2 transition disabled:opacity-60"
              title="Download full Firebase collections (members & contributions) JSON backup"
            >
              <Database className="w-4 h-4 text-blue-200" />
              <span>{isExportingJson ? 'Buufamaa Jira...' : 'JSON Backup'}</span>
            </button>

            <div className="flex items-center gap-2 bg-white/10 border border-white/15 p-2 rounded-xl">
              <Calendar className="w-4 h-4 text-blue-200 ml-1" />
              <span className="text-xs text-blue-100 font-semibold">Waggaa:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs bg-[#08172C] text-white font-bold rounded-lg px-3 py-1.5 border border-white/15 focus:ring-2 focus:ring-blue-400 cursor-pointer font-mono"
              >
                {[2016, 2017, 2018, 2019, 2020].map((y) => (
                  <option key={y} value={y}>
                    Bara {y} E.C.
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Annual Member Matrix vs Executive Summary */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveReportSubTab('annual')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition ${
            activeReportSubTab === 'annual'
              ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          1. Gabaasa Hirmaannaa Miseensotaa (13 Months Grid)
        </button>

        <button
          onClick={() => setActiveReportSubTab('executive')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition ${
            activeReportSubTab === 'executive'
              ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          2. Gabaasa Waliigalaa (Executive Summary)
        </button>
      </div>

      {/* REPORT 1: ANNUAL MEMBER PARTICIPATION (13 MONTHS) */}
      {activeReportSubTab === 'annual' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Gabaasa Hirmaannaa Miseensotaa Ji'a Ji'aan — Bara {selectedYear} E.C.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Miseensa hundaaf ji'oota Itiyoophiyaa 13 (Fulbaana hanga Phaagumee) kaffaltii fi waadaa raawwatan
              </p>
            </div>

            {/* Export Action Buttons (PDF & CSV) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateAnnualParticipationCSV(members, contributions, selectedYear)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                CSV dhaan Baasi
              </button>

              <button
                onClick={() => generateAnnualParticipationPDF(members, contributions, selectedYear)}
                className="px-4 py-2 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                PDF / Print dhaan Baasi
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Miseensota</span>
              <div className="text-lg font-bold font-mono text-[#0B1F3A] dark:text-white mt-0.5">{members.length}</div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Buusii Kaffalame</span>
              <div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                {formatCurrencyETB(totalCollected)}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Waadaa Waggaa</span>
              <div className="text-lg font-bold font-mono text-[#0B1F3A] dark:text-slate-200 mt-0.5">
                {formatCurrencyETB(annualPledgedExpected)}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Sadarkaa Guutamaa</span>
              <div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                {annualPledgedExpected > 0 ? Math.round((totalCollected / annualPledgedExpected) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* 13-Month Matrix Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            {(() => {
              const monthTotals: Record<string, number> = {};
              ETHIOPIAN_MONTHS.forEach((mo) => {
                monthTotals[mo.key] = 0;
              });
              let grandAnnualPledge = 0;
              let grandMonthlyPledge = 0;
              let grandTotalPaid = 0;

              const memberRows = members.map((m) => {
                const memberContribs = yearContribs.filter((c) => c.memberId === m.memberId);
                const monthlyPledge = Number(m.monthlyPledgeETB) || 0;
                const annualPledge = monthlyPledge * 12;
                grandMonthlyPledge += monthlyPledge;
                grandAnnualPledge += annualPledge;

                let memberTotal = 0;
                const monthCols = ETHIOPIAN_MONTHS.map((month) => {
                  const paid = memberContribs
                    .filter((c) => c.ethiopianMonth === month.key)
                    .reduce((sum, c) => sum + (c.amountETB || 0), 0);
                  memberTotal += paid;
                  monthTotals[month.key] += paid;
                  return (
                    <td
                      key={month.key}
                      className={`py-2 px-1 text-center font-mono text-[10px] ${
                        paid > 0
                          ? 'bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {paid > 0 ? paid.toLocaleString() : '-'}
                    </td>
                  );
                });

                grandTotalPaid += memberTotal;
                const rate = annualPledge > 0 ? Math.round((memberTotal / annualPledge) * 100) : 0;

                return (
                  <tr
                    key={m.id || m.memberId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {m.memberId}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#0B1F3A] dark:text-white whitespace-nowrap">
                      {m.fullName}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-[#0B1F3A] dark:text-slate-200 whitespace-nowrap">
                      {annualPledge.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {monthlyPledge.toLocaleString()}
                    </td>
                    {monthCols}
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 whitespace-nowrap">
                      {memberTotal.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-[10px] font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded-md ${
                          rate >= 100
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : rate >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                        }`}
                      >
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              });

              const grandRate =
                grandAnnualPledge > 0 ? Math.round((grandTotalPaid / grandAnnualPledge) * 100) : 0;

              return (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0B1F3A] text-white font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Maqaa Guutuu</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">Waadaa Waggaa</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">Waadaa Ji’aanii</th>
                      {ETHIOPIAN_MONTHS.map((m) => (
                        <th key={m.key} className="py-2.5 px-1.5 text-center">
                          {m.om.substring(0, 3)}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {memberRows}
                  </tbody>
                  {members.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-[#0B1F3A] dark:text-white text-[11px]">
                        <td className="py-2.5 px-3" colSpan={2}>
                          WALIIGALA (TOTAL)
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                          {grandAnnualPledge.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {grandMonthlyPledge.toLocaleString()}
                        </td>
                        {ETHIOPIAN_MONTHS.map((mo) => (
                          <td key={mo.key} className="py-2.5 px-1 text-center font-mono text-[10px]">
                            {monthTotals[mo.key] > 0 ? monthTotals[mo.key].toLocaleString() : '-'}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {grandTotalPaid.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          {grandRate}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* REPORT 2: EXECUTIVE CENTER SUMMARY (CSV, PDF, PPT) */}
      {activeReportSubTab === 'executive' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Gabaasa Waliigalaa (Executive Summary) — Bara {selectedYear} E.C.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gabaasa faayinaansii guutuu Al-Furqaan: CSV, PDF fi Presentation Slides (PPT)
              </p>
            </div>

            {/* 3 Export Buttons: CSV, PDF, PPT */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateExecutiveSummaryCSV(members, contributions, selectedYear)}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                CSV Baasi
              </button>

              <button
                onClick={() => generateExecutiveSummaryPDF(members, contributions, selectedYear)}
                className="px-3.5 py-2 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF Baasi
              </button>

              <button
                onClick={() => generateExecutiveSummaryPPT(members, contributions, selectedYear)}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <Presentation className="w-3.5 h-3.5" />
                PPT Slides Baasi
              </button>
            </div>
          </div>

          {/* Key Executive Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="text-xs font-bold text-[#0B1F3A] dark:text-blue-300 uppercase">
                Buusii Waliigalaa Kaffalame
              </span>
              <div className="text-2xl font-extrabold font-mono text-blue-700 dark:text-blue-400 mt-1">
                {formatCurrencyETB(totalCollected)}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Bara {selectedYear} nagahee {yearContribs.length} irraa
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-[#0B1F3A] dark:text-slate-200 uppercase">
                Waadaa Buusii Ji'aa
              </span>
              <div className="text-2xl font-extrabold font-mono text-[#0B1F3A] dark:text-white mt-1">
                {formatCurrencyETB(activeMembers.reduce((a, b) => a + (b.monthlyPledgeETB || 0), 0))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Miseensota hojirra jiran {activeMembers.length}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Karaa Kaffaltii (Channels)
              </span>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Telebirr:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrencyETB(yearContribs.filter(c => c.paymentMethod === 'telebirr').reduce((a, b) => a + b.amountETB, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CBE:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrencyETB(yearContribs.filter(c => c.paymentMethod === 'cbe').reduce((a, b) => a + b.amountETB, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
