import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CloudUpload,
  Mail,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Send,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Lock,
  Database,
} from 'lucide-react';
import { Member, Contribution, Expense, Language } from '../types';
import { createCenterSpreadsheet, ExportResult } from '../services/googleSheets';
import { listAppDriveFiles, saveJsonBackupToDrive, DriveFileItem } from '../services/googleDrive';
import { sendPledgeReminderEmail, sendEmailViaGmail } from '../services/gmail';
import { exportFirebaseCollectionsAsJSON } from '../utils/firebaseBackup';
import { ConfirmModal } from './ConfirmModal';
import { getCurrentEthiopianYearAndMonth, formatCurrencyETB } from '../utils/ethiopianCalendar';

interface WorkspaceHubProps {
  members: Member[];
  contributions: Contribution[];
  expenses: Expense[];
  accessToken: string | null;
  userEmail?: string;
  isAdmin?: boolean;
  userId?: string;
  lang: Language;
  onGoogleSignIn: () => void;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  members,
  contributions,
  expenses,
  accessToken,
  userEmail,
  isAdmin = false,
  userId = '',
  lang,
  onGoogleSignIn,
}) => {
  const currentEth = getCurrentEthiopianYearAndMonth();
  const [isExportingJson, setIsExportingJson] = useState(false);

  // State
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // Email reminders state
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchResultMsg, setBatchResultMsg] = useState<string | null>(null);

  // Confirmation Modals
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Custom email broadcast
  const [broadcastSubject, setBroadcastSubject] = useState("Beeksisa Giddu-gala Hifzii Qur'aanaa Al-Furqaan");
  const [broadcastBody, setBroadcastBody] = useState(
    "Assalaamu Alaykum wa Rahmatullaahi wa Barakaatuhu, kabajamoo miseensa Al-Furqaan, sagantaan hifzii fi barumsi Qur'aanaa barattoota keenyaa akkaan itti fufee jira. Buusii fi deeggarsa keessaniif Rabbiin jazaa gaarii isiniif haa kennu."
  );

  // Load drive files when token is present
  useEffect(() => {
    if (accessToken) {
      loadDriveFiles();
    }
  }, [accessToken]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    try {
      setIsLoadingFiles(true);
      const files = await listAppDriveFiles(accessToken);
      setDriveFiles(files);
    } catch (err) {
      console.warn('Failed to load drive files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Google Sheets Export with explicit confirmation
  const handleExportSheetsClick = () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Export to Google Sheets?',
      message: `Create a new Google Spreadsheet in your Google Drive with ${members.length} members, ${contributions.length} contributions, and financial summaries?`,
      details: [
        `Tab 1: Miseensota (${members.length} members)`,
        `Tab 2: Buusii & Kaffaltii (${contributions.length} records)`,
        `Tab 3: Baasiiwwan (${expenses.length} records)`,
        'Tab 4: Gabaasa Waliigalaa (Executive Summary)',
      ],
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsExportingSheets(true);
          const result = await createCenterSpreadsheet(members, contributions, expenses, accessToken);
          setLastExport(result);
          await loadDriveFiles();
        } catch (err: any) {
          alert('Sheets Export Error: ' + err.message);
        } finally {
          setIsExportingSheets(false);
        }
      },
    });
  };

  // Google Drive Backup with explicit confirmation
  const handleBackupDriveClick = () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Save Database Backup to Google Drive?',
      message: 'Upload an encrypted, timestamped JSON snapshot of Al-Furqaan database directly to your personal Google Drive?',
      details: [
        `${members.length} Registered Members`,
        `${contributions.length} Contribution Receipts`,
        `${expenses.length} Center Expenses`,
      ],
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsBackingUpDrive(true);
          const snapshot = {
            exportDate: new Date().toISOString(),
            centerName: "Giddu-gala Hifzii Qur'aanaa Al-Furqaan",
            ethiopianPeriod: `${currentEth.monthKey} ${currentEth.year}`,
            members,
            contributions,
            expenses,
          };
          const res = await saveJsonBackupToDrive(snapshot, accessToken);
          setBackupSuccessMsg(`Backup saved to Drive! File ID: ${res.fileId}`);
          await loadDriveFiles();
        } catch (err: any) {
          alert('Drive Backup Error: ' + err.message);
        } finally {
          setIsBackingUpDrive(false);
        }
      },
    });
  };

  // Unpaid members for current month
  const unpaidMembersThisMonth = members.filter((m) => {
    if (m.status !== 'active') return false;
    const hasPaid = contributions.some(
      (c) => c.memberId === m.memberId && c.ethiopianMonth === currentEth.monthKey && c.ethiopianYear === currentEth.year
    );
    return !hasPaid && Boolean(m.email);
  });

  // Batch reminder with explicit confirmation
  const handleBatchReminderClick = () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }

    if (unpaidMembersThisMonth.length === 0) {
      alert(`All active members with email have already paid for ${currentEth.monthKey} ${currentEth.year}! Alhamdulillah.`);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: `Send Reminder Emails via Gmail?`,
      message: `Send polite monthly contribution reminders via your connected Gmail to ${unpaidMembersThisMonth.length} members who have not contributed for ${currentEth.monthKey} ${currentEth.year}?`,
      details: unpaidMembersThisMonth.map((m) => `${m.fullName} (${m.email}) — ${formatCurrencyETB(m.monthlyPledgeETB)}`),
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsSendingBatch(true);
          let sentCount = 0;
          for (const m of unpaidMembersThisMonth) {
            try {
              await sendPledgeReminderEmail(m, currentEth.monthKey, currentEth.year, accessToken);
              sentCount++;
            } catch (err) {
              console.error(`Failed to send to ${m.fullName}`, err);
            }
          }
          setBatchResultMsg(`Successfully sent reminder emails to ${sentCount} members via Gmail!`);
        } catch (err: any) {
          alert('Batch Reminder Error: ' + err.message);
        } finally {
          setIsSendingBatch(false);
        }
      },
    });
  };

  // Custom broadcast with explicit confirmation
  const handleBroadcastClick = () => {
    if (!accessToken) {
      onGoogleSignIn();
      return;
    }

    const recipientMembers = members.filter((m) => m.status === 'active' && Boolean(m.email));
    if (recipientMembers.length === 0) {
      alert('No active members with email found.');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Send Center Broadcast Email via Gmail?',
      message: `Send this announcement from your Gmail account to ${recipientMembers.length} active donors?`,
      details: [
        `Subject: ${broadcastSubject}`,
        `Recipients: ${recipientMembers.length} active members`,
      ],
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsSendingBatch(true);
          let count = 0;
          for (const m of recipientMembers) {
            const html = `
              <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
                <div style="background: #065f46; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                  <h2 style="margin: 0;">Al-Furqaan Quran Memorization Center</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px;">Giddu-gala Hifzii Qur’aanaa Al-Furqaan</p>
                </div>
                <p>Assalaamu Alaykum wa Rahmatullaahi wa Barakaatuhu, kabajamoo <strong>${m.fullName}</strong>,</p>
                <div style="background: #f8fafc; border-left: 4px solid #065f46; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.6;">
                  ${broadcastBody.replace(/\n/g, '<br>')}
                </div>
                <p style="font-size: 13px; color: #64748b;">Giddu-gala Hifzii Qur’aanaa Al-Furqaan • Finfinnee, Ethiopia</p>
              </div>
            `;
            try {
              await sendEmailViaGmail(m.email!, broadcastSubject, html, accessToken);
              count++;
            } catch (err) {
              console.error(err);
            }
          }
          setBatchResultMsg(`Broadcast sent to ${count} members via Gmail!`);
        } catch (err: any) {
          alert('Broadcast Error: ' + err.message);
        } finally {
          setIsSendingBatch(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & OAuth Status */}
      <div className="bg-[#0B1F3A] border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 text-xs font-semibold text-blue-200">
              <span className="inline-flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Google Workspace Integration
              </span>
              {accessToken && (
                <>
                  <span className="text-blue-400/50">·</span>
                  <span className="inline-flex items-center gap-1 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" /> Connected
                  </span>
                </>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Google Drive, Sheets & Gmail Hub
            </h2>
            <p className="mt-1 text-xs text-blue-100/80 max-w-xl leading-relaxed">
              Buusii miseensotaa Google Sheets tti ergaa, kuusaa faayilaa Google Drive keessatti ol-kaa'aa, nagahee fi yaadachiisa kaffaltii Gmail dhaan kallattiin ergaa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!accessToken ? (
              <button
                onClick={onGoogleSignIn}
                className="w-full sm:w-auto px-5 py-3 bg-white text-[#0B1F3A] hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google Workspace Qabsiisi (Connect)
              </button>
            ) : (
              <div className="text-right text-xs">
                <span className="text-blue-200 font-semibold block">{userEmail || 'Connected User'}</span>
                <span className="text-[11px] text-blue-300/75">Tokens active in memory</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Main Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Sheets Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
              Google Sheets Live Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Odeeffannoo miseensotaa, kaffaltii nagahee fi baasii hunda gara Google Sheets tti baasaa.
            </p>

            <div className="my-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>4 Sheets (Tabs) auto-generated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Executive Financial Summary tab</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Auditing & Bank Details included</span>
              </div>
            </div>
          </div>

          <div>
            {lastExport && (
              <a
                href={lastExport.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 text-xs font-semibold text-[#0B1F3A] dark:text-blue-300 flex items-center justify-between hover:bg-blue-100 transition"
              >
                <span className="truncate max-w-[180px]">{lastExport.title}</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            )}

            <button
              disabled={isExportingSheets}
              onClick={handleExportSheetsClick}
              className="w-full py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExportingSheets ? 'Uumamaa Jira...' : 'Google Sheets tti Ergi'}
            </button>
          </div>
        </div>

        {/* Google Drive Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4">
              <CloudUpload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
              Google Drive Cloud Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Kuusaa daataa Al-Furqaan guutuu (Members, Receipts, Expenses) gara Google Drive keessaniitti ol-kaa'aa.
            </p>

            <div className="my-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Encrypted JSON database snapshot</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Stored under your Drive account</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Restore-ready archives</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {backupSuccessMsg && (
              <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-[11px] text-[#0B1F3A] dark:text-blue-300">
                {backupSuccessMsg}
              </div>
            )}

            <button
              disabled={isBackingUpDrive}
              onClick={handleBackupDriveClick}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              {isBackingUpDrive ? 'Ol-kaa’aa Jira...' : 'Drive tti Ol-kaa’i (Backup)'}
            </button>

            <button
              disabled={isExportingJson}
              onClick={async () => {
                try {
                  setIsExportingJson(true);
                  const res = await exportFirebaseCollectionsAsJSON({ isAdmin, userId });
                  setBackupSuccessMsg(
                    `JSON Backup (${res.membersCount} members, ${res.contributionsCount} contributions) downloaded!`
                  );
                } catch (err: any) {
                  console.error('JSON Backup Error:', err);
                } finally {
                  setIsExportingJson(false);
                }
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0B1F3A] dark:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
            >
              <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              {isExportingJson ? 'Buufamaa Jira...' : 'Firebase JSON Backup Buusi'}
            </button>
          </div>
        </div>

        {/* Gmail Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B1F3A] dark:text-blue-300 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
              Gmail Receipt & Reminders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Nagahee kaffaltii qulqulluu fi yaadachiisa buusii miseensotaaf Gmail dhaan ergaa.
            </p>

            <div className="my-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Nagahee kaffaltii nagaan erga</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Yaadachiisa buusii ji'aa ({unpaidMembersThisMonth.length} pending)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Du'aa fi herreega baankii of keessaa qaba</span>
              </div>
            </div>
          </div>

          <div>
            {batchResultMsg && (
              <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-[11px] text-[#0B1F3A] dark:text-blue-300">
                {batchResultMsg}
              </div>
            )}

            <button
              disabled={isSendingBatch}
              onClick={handleBatchReminderClick}
              className="w-full py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSendingBatch ? 'Ergamaa Jira...' : `Yaadachiisa Ergi (${unpaidMembersThisMonth.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Composer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          Ergaa Waliigalaa Miseensotaaf (Gmail Broadcast)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Ergaa beeksisaa, guyyoota kabaja Ayyaanaa ykn sagantaa Qur'aanaa miseensota hundaaf ergaa
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mata-duree Imeelii (Subject)
            </label>
            <input
              type="text"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Qabiyyee Ergaa (Message Body)
            </label>
            <textarea
              rows={3}
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleBroadcastClick}
              disabled={isSendingBatch || !broadcastSubject || !broadcastBody}
              className="px-5 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Miseensota Hundaaf Ergi
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive App Files Explorer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              Faayiloota Al-Furqaan Google Drive Keessatti
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Faayiloota sirna kanaan Google Drive irratti uumaman
            </p>
          </div>
          <button
            onClick={loadDriveFiles}
            disabled={isLoadingFiles || !accessToken}
            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Haaromsi"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin text-blue-700' : ''}`} />
          </button>
        </div>

        {!accessToken ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Faayiloota Google Drive ilaaluuf duraan <strong>Google Workspace Qabsiisi</strong>.
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            Faayiliin uumame hin jiru. "Google Sheets tti Ergi" ykn "Drive tti Ol-kaa'i" tuquun jalqabaa.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {driveFiles.map((file) => (
              <div
                key={file.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl px-2 transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                    {file.mimeType.includes('spreadsheet') ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-[#0B1F3A] dark:text-white">{file.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{file.mimeType.split('.').pop() || file.mimeType}</span>
                      {file.modifiedTime && (
                        <span>• {new Date(file.modifiedTime).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-[#0B1F3A] dark:text-slate-200 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    Bani <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        details={confirmConfig.details}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
