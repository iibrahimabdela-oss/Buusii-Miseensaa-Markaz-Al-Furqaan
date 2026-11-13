import { getDocs, query, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  membersCollection,
  contributionsCollection,
  handleFirestoreError,
  OperationType,
} from '../services/firebase';
import { Member, Contribution } from '../types';

export interface FirebaseBackupResult {
  fileName: string;
  membersCount: number;
  contributionsCount: number;
  exportedAt: string;
}

export interface FirebaseBackupPayload {
  backupVersion: string;
  exportedAt: string;
  exportedBy: string | null;
  firestoreDatabaseId: string;
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalContributions: number;
    validContributionsTotalETB: number;
  };
  collections: {
    members: Member[];
    contributions: Contribution[];
  };
}

/**
 * Queries Firestore collections (`members` and `contributions`) respecting RBAC rules
 * and triggers a downloadable JSON backup file for manual record keeping.
 */
export async function exportFirebaseCollectionsAsJSON(options?: {
  isAdmin?: boolean;
  userId?: string;
}): Promise<FirebaseBackupResult> {
  const uid = options?.userId || auth.currentUser?.uid || '';
  const isAdmin = Boolean(options?.isAdmin);

  const membersQuery = isAdmin
    ? membersCollection
    : query(membersCollection, where('createdBy', '==', uid));

  const contribQuery = isAdmin
    ? contributionsCollection
    : query(contributionsCollection, where('recordedBy', '==', uid));

  const members: Member[] = [];
  try {
    const memberSnap = await getDocs(membersQuery);
    memberSnap.forEach((docSnap) => {
      members.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Member, 'id'>),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'members');
  }

  const contributions: Contribution[] = [];
  try {
    const contribSnap = await getDocs(contribQuery);
    contribSnap.forEach((docSnap) => {
      contributions.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Contribution, 'id'>),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'contributions');
  }

  const exportedAt = new Date().toISOString();
  const validTotalETB = contributions
    .filter((c) => c.status !== 'voided')
    .reduce((sum, c) => sum + (Number(c.amountETB) || 0), 0);

  const payload: FirebaseBackupPayload = {
    backupVersion: '1.0',
    exportedAt,
    exportedBy: auth.currentUser?.email || null,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    summary: {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status === 'active').length,
      totalContributions: contributions.length,
      validContributionsTotalETB: validTotalETB,
    },
    collections: {
      members,
      contributions,
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const dateTag = exportedAt.slice(0, 10);
  const fileName = `Al-Furqaan-Firebase-Backup-${dateTag}.json`;

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    fileName,
    membersCount: members.length,
    contributionsCount: contributions.length,
    exportedAt,
  };
}
