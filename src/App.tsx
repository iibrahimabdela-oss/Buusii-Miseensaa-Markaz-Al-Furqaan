/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  db,
  membersCollection,
  contributionsCollection,
  adminsCollection,
  OperationType,
  handleFirestoreError,
  stripUndefined,
} from './services/firebase';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { sendContributionReceiptEmail } from './services/gmail';
import { Member, Contribution, Language } from './types';
import { Navbar, AppTheme } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { MembersTab } from './components/MembersTab';
import { ContributionsTab } from './components/ContributionsTab';
import { ReportsTab } from './components/ReportsTab';
import { WorkspaceHub } from './components/WorkspaceHub';
import { GroundedAssistantTab } from './components/GroundedAssistantTab';
import { ReceiptModal } from './components/ReceiptModal';
import { ConfirmModal } from './components/ConfirmModal';
import { RoleManagementModal, AdminRoleItem } from './components/RoleManagementModal';
import { AlFurqaanLogo } from './components/AlFurqaanLogo';
import {
  Shield,
  ShieldCheck,
  Crown,
  FileText,
  Lock,
  Globe,
  CheckCircle2,
  Receipt,
  MessageCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { TRANSLATIONS } from './utils/translations';

// Super Admin Owners assigned by default
const INITIAL_SUPER_ADMINS: AdminRoleItem[] = [
  {
    id: 'owner-ibrahim',
    email: 'iibrahimabdela@gmail.com',
    role: 'owner',
    grantedBy: 'Super Admin',
    grantedAt: '2026-11-12',
  },
  {
    id: 'owner-shaxaa',
    email: 'shaxaa72@gmail.com',
    role: 'owner',
    grantedBy: 'Super Admin',
    grantedAt: '2026-11-12',
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [lang, setLang] = useState<Language>('om');
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('al_furqaan_theme') as AppTheme) || 'light';
  });

  // Core Data loaded cleanly from Firestore (no sample/demo records)
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [adminList, setAdminList] = useState<AdminRoleItem[]>(INITIAL_SUPER_ADMINS);

  // Auth & Workspace OAuth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Role Management Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Receipt Modal
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Quick Action State
  const [recordMemberPrefill, setRecordMemberPrefill] = useState<Member | null>(null);

  // Universal Workspace Confirmation Modal
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

  // Persist Theme & sync Tailwind v4 dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('al_furqaan_theme', newTheme);
  };

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // RBAC Permission Resolution
  const userEmail = (user?.email || '').toLowerCase();
  const isOwner =
    userEmail === 'iibrahimabdela@gmail.com' ||
    userEmail === 'shaxaa72@gmail.com' ||
    adminList.some((a) => a.email.toLowerCase() === userEmail && a.role === 'owner');

  const isAdmin =
    isOwner || adminList.some((a) => a.email.toLowerCase() === userEmail);

  // Listen to Admins & Roles only after authentication
  useEffect(() => {
    if (!user) return;

    const unsubAdmins = onSnapshot(
      adminsCollection,
      (snapshot) => {
        const fromDb: AdminRoleItem[] = [];
        snapshot.forEach((d) => {
          fromDb.push({ id: d.id, ...(d.data() as Omit<AdminRoleItem, 'id'>) });
        });

        const combined = [...INITIAL_SUPER_ADMINS];
        fromDb.forEach((item) => {
          if (!combined.some((c) => c.email.toLowerCase() === item.email.toLowerCase())) {
            combined.push(item);
          }
        });
        setAdminList(combined);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => unsubAdmins();
  }, [user]);

  // Real-time Firestore Listeners for Members & Contributions (Authenticated + RBAC scoped)
  useEffect(() => {
    if (!user) return;

    const membersQuery = isAdmin
      ? membersCollection
      : query(membersCollection, where('createdBy', '==', user.uid));

    const contribQuery = isAdmin
      ? contributionsCollection
      : query(contributionsCollection, where('recordedBy', '==', user.uid));

    const unsubMembers = onSnapshot(
      membersQuery,
      (snapshot) => {
        const list: Member[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Member, 'id'>) });
        });
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'members')
    );

    const unsubContrib = onSnapshot(
      contribQuery,
      (snapshot) => {
        const list: Contribution[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Contribution, 'id'>) });
        });
        setContributions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contributions')
    );

    return () => {
      unsubMembers();
      unsubContrib();
    };
  }, [user, isAdmin]);

  // Google Sign-In with Workspace OAuth scopes
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      alert('Sign-in Error: ' + (err?.message || err));
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setMembers([]);
    setContributions([]);
  };

  // Add Admin / Owner role (doc keyed by lowercase email for rules lookup)
  const handleAddAdmin = async (email: string, role: 'owner' | 'admin') => {
    if (!isOwner) {
      throw new Error('Aangoo namaaf kennuuf Owner ta’uu qabdu.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const rolePayload = {
      email: cleanEmail,
      role,
      grantedBy: user?.email || 'Owner',
      grantedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'admins', cleanEmail), rolePayload);
      setAdminList((prev) => {
        const filtered = prev.filter((a) => a.email.toLowerCase() !== cleanEmail);
        return [...filtered, { id: cleanEmail, ...rolePayload }];
      });
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${cleanEmail}`);
    }
  };

  // Remove Admin role
  const handleRemoveAdmin = async (id: string) => {
    if (!isOwner) {
      alert('Aangoo mulquuf Owner ta’uu qabdu.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', id));
      setAdminList((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${id}`);
    }
  };

  // Create Member
  const handleAddMember = async (memberData: Omit<Member, 'id'>) => {
    const payload = stripUndefined({
      ...memberData,
      createdBy: user?.uid || 'user',
      createdByEmail: user?.email || '',
    }) as Omit<Member, 'id'>;

    try {
      const docRef = await addDoc(membersCollection, payload);
      setMembers((prev) => {
        if (prev.some((m) => m.id === docRef.id)) return prev;
        return [{ id: docRef.id, ...payload }, ...prev];
      });
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'members');
    }
  };

  // Record Contribution
  const handleRecordContribution = async (contribData: Omit<Contribution, 'id'>) => {
    const payload = stripUndefined({
      ...contribData,
      recordedBy: user?.uid || 'user',
    }) as Omit<Contribution, 'id'>;

    try {
      const docRef = await addDoc(contributionsCollection, payload);
      const newContrib: Contribution = { id: docRef.id, ...payload };
      setContributions((prev) => {
        if (prev.some((c) => c.id === docRef.id)) return prev;
        return [newContrib, ...prev];
      });
      setSelectedContribution(newContrib);
      setIsReceiptOpen(true);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'contributions');
    }
  };

  // Update previously recorded contribution
  const handleUpdateContribution = async (id: string, updated: Partial<Contribution>) => {
    const cleaned = stripUndefined({
      ...updated,
      updatedAt: new Date().toISOString(),
    });

    try {
      const docRef = doc(db, 'contributions', id);
      await updateDoc(docRef, cleaned);
      setContributions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...cleaned } : c))
      );
      if (selectedContribution && selectedContribution.id === id) {
        setSelectedContribution((prev) => (prev ? { ...prev, ...cleaned } : null));
      }
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.UPDATE, `contributions/${id}`);
    }
  };

  // Send Receipt via Gmail
  const handleSendReceiptViaGmail = (contribution: Contribution, member: Member) => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }

    if (!member.email) {
      alert(`Miseensi ${member.fullName} imeelii hin qabu.`);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Nagahee Gmail dhaan Erguu?',
      message: `Nagahee buusii lakk. ${contribution.receiptNumber} gara imeelii ${member.fullName} (${member.email}) tti erguu barbaadduu?`,
      details: [
        `Lakk. Nagahee: ${contribution.receiptNumber}`,
        `Hanga: ${contribution.amountETB} ETB`,
        `Karaa Kaffaltii: ${contribution.paymentMethod.toUpperCase()}`,
        `Imeelii: ${member.email}`,
      ],
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsSendingEmail(true);
          await sendContributionReceiptEmail(member, contribution, accessToken);
          alert(`Nagaheen lakk. ${contribution.receiptNumber} milkaa'inaan gara ${member.email} tti ergameera!`);
        } catch (err: any) {
          alert('Gmail Error: ' + err.message);
        } finally {
          setIsSendingEmail(false);
        }
      },
    });
  };

  // Open Receipt Modal
  const handleOpenReceipt = (c: Contribution) => {
    setSelectedContribution(c);
    setIsReceiptOpen(true);
  };

  const selectedMember = selectedContribution
    ? members.find((m) => m.memberId === selectedContribution.memberId) || null
    : null;

  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;

  // GOOGLE LOGIN GATE: Per user requirement "yeroo seenamu Liinkiin Google account dhaan ta'uu qaba."
  if (!user && !isAuthLoading) {
    return (
      <div className={`min-h-screen theme-${theme} flex flex-col justify-between font-sans selection:bg-blue-700 selection:text-white`}>
        {/* Top Minimal Bar */}
        <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <AlFurqaanLogo size="md" />
            <div>
              <div className="font-bold text-base text-[#0B1F3A] dark:text-white leading-tight">
                Dijital Al-Furqaan
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                Giddu-gala Hifzii Qur’aanaa Al-Furqaan
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            {(['om', 'en', 'am'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  lang === l
                    ? 'bg-[#0B1F3A] dark:bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A]'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        {/* Center Login Hero */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 sm:p-9 shadow-xl text-center relative overflow-hidden">
            {/* Top Callout */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800/60 mb-5">
              <Lock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Seensa Nageenyaa (Secure Access)</span>
            </div>

            <div className="flex justify-center mb-4">
              <AlFurqaanLogo size="xl" className="shadow-md border border-slate-200 dark:border-slate-700" />
            </div>

            <h1 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
              Dijital Al-Furqaan
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Sirna To'annoo Buusii & Faayinaansii Miseensota Hifzii Qur’aanaa
            </p>

            {/* Requirement statement */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
              <div className="font-bold text-[#0B1F3A] dark:text-blue-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Hubachiisa Seensaa (Sign-In Requirement):
              </div>
              <p>
                Gara sirna kanaatti seenuuf duraan herreega <strong>Google (Google Account)</strong> keessaniin seenuu qabdu. Erga seentanii booda akkaataa aangoo keessaniitti (Owner, Admin, ykn Galmeessaa) tajaajila argattu.
              </p>
            </div>

            {/* Prominent Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-sm transition cursor-pointer"
            >
              <span className="p-1 bg-white rounded-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </span>
              <span>Google dhaan Seeni (Sign in with Google)</span>
            </button>

            {/* Feature Highlights */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-left text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>To'annoo Aangoo (RBAC)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Nagahee & WhatsApp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Gabaasa Ji'a 13 (PDF/CSV)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Executive PPT / Slides</span>
              </div>
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="p-4 text-center text-xs text-slate-400">
          Giddu-gala Hifzii Qur’aanaa Al-Furqaan • Finfinnee, Ethiopia
        </footer>
      </div>
    );
  }

  return (
    <div className={`min-h-screen theme-${theme} flex flex-col font-sans selection:bg-blue-700 selection:text-white transition-colors duration-150`}>
      {/* Left Lateral Sidebar & Slim Top Utility Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={handleThemeChange}
        user={user}
        isAdmin={isAdmin}
        isOwner={isOwner}
        onOpenRoleManagement={() => setIsRoleModalOpen(true)}
        hasGoogleToken={Boolean(accessToken)}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main App Body offset by Left Lateral Sidebar */}
      <main className="lg:pl-64 flex-1 w-full">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            members={members}
            contributions={contributions}
            lang={lang}
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenRecordModal={() => setCurrentTab('contributions')}
            onOpenAddMemberModal={() => setCurrentTab('members')}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {currentTab === 'members' && (
          <MembersTab
            members={members}
            contributions={contributions}
            lang={lang}
            isAdmin={isAdmin}
            currentUserId={user?.uid || ''}
            currentUserEmail={user?.email || ''}
            onAddMember={handleAddMember}
            onRecordPaymentForMember={(m) => {
              setRecordMemberPrefill(m);
              setCurrentTab('contributions');
            }}
            onSendReminderForMember={(m) => {
              if (!accessToken) {
                handleGoogleSignIn();
                return;
              }
              setConfirmConfig({
                isOpen: true,
                title: 'Send Monthly Pledge Reminder?',
                message: `Send an email reminder via your Gmail to ${m.fullName} (${m.email}) for their monthly contribution?`,
                details: [
                  `Member: ${m.fullName}`,
                  `Monthly Pledge: ${m.monthlyPledgeETB} ETB`,
                  `Email: ${m.email}`,
                ],
                onConfirm: async () => {
                  setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
                  try {
                    const { sendPledgeReminderEmail } = await import('./services/gmail');
                    await sendPledgeReminderEmail(m, 'Fulbaana', 2017, accessToken);
                    alert(`Reminder sent to ${m.email} successfully!`);
                  } catch (err: any) {
                    alert('Gmail Error: ' + err.message);
                  }
                },
              });
            }}
          />
        )}

        {currentTab === 'contributions' && (
          <ContributionsTab
            contributions={contributions}
            members={members}
            lang={lang}
            onRecordContribution={handleRecordContribution}
            onUpdateContribution={handleUpdateContribution}
            onOpenReceipt={handleOpenReceipt}
            onSendReceiptViaGmail={handleSendReceiptViaGmail}
          />
        )}

        {/* Reports Tab: Annual 13 Months Participation (PDF, CSV) & Executive Summary (CSV, PDF, PPT) */}
        {currentTab === 'reports' && (
          <ReportsTab
            members={members}
            contributions={contributions}
            lang={lang}
            isAdmin={isAdmin}
            userId={user?.uid || ''}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspaceHub
            members={members}
            contributions={contributions}
            expenses={[]}
            accessToken={accessToken}
            userEmail={user?.email || undefined}
            isAdmin={isAdmin}
            userId={user?.uid || ''}
            lang={lang}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}

        {currentTab === 'grounded' && (
          <GroundedAssistantTab
            members={members}
            lang={lang}
          />
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="lg:pl-64 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-[#0B1F3A] dark:text-white">Giddu-gala Hifzii Qur’aanaa Al-Furqaan</strong> • Sirna Buusii & Faayinaansii Miseensotaa
          </div>
          <div className="flex items-center gap-4 text-blue-700 dark:text-blue-400 font-medium">
            <span>Google Drive</span>
            <span>•</span>
            <span>Google Sheets</span>
            <span>•</span>
            <span>Gmail</span>
            <span>•</span>
            <span>WhatsApp</span>
            <span>•</span>
            <span>Recharts & Reports</span>
          </div>
        </div>
      </footer>

      {/* Digital Receipt Modal (With Single-Click Print & WhatsApp Share) */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        contribution={selectedContribution}
        member={selectedMember}
        lang={lang}
        hasGoogleAuth={Boolean(accessToken)}
        isSendingEmail={isSendingEmail}
        onClose={() => setIsReceiptOpen(false)}
        onSendEmail={handleSendReceiptViaGmail}
      />

      {/* Role Management Modal: Owner Namoota Admin Taasisuu Ykn kennuu Akka Danda'u Haala isaaf Mijjatu Uumi */}
      <RoleManagementModal
        isOpen={isRoleModalOpen}
        currentUserEmail={user?.email || ''}
        isOwner={isOwner}
        adminList={adminList}
        members={members}
        onAddAdmin={handleAddAdmin}
        onRemoveAdmin={handleRemoveAdmin}
        onClose={() => setIsRoleModalOpen(false)}
      />

      {/* Universal Confirmation Modal */}
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
}
