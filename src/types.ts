export type Language = 'om' | 'en' | 'am';

export type PaymentMethod = 'cbe' | 'telebirr' | 'awash' | 'cbe_birr' | 'cash' | 'bank_transfer' | 'other';

export type ContributionStatus = 'completed' | 'verified' | 'pending' | 'voided';

export type MemberStatus = 'active' | 'inactive' | 'suspended';

export type ExpenseCategory =
  | 'ustaz_allowance'
  | 'quran_books'
  | 'utilities'
  | 'maintenance'
  | 'charity_iftaar'
  | 'administrative'
  | 'other';

export interface Member {
  id?: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  halqa?: string;
  memberId: string;
  monthlyPledgeETB: number;
  status: MemberStatus;
  city?: string;
  createdBy: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Contribution {
  id?: string;
  memberId: string;
  memberName: string;
  receiptNumber: string;
  amountETB: number;
  ethiopianMonth: string;
  ethiopianYear: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  recordedBy: string;
  status: ContributionStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id?: string;
  title: string;
  category: ExpenseCategory;
  amountETB: number;
  ethiopianDate?: string;
  paidTo?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CenterSetting {
  id?: string;
  centerName: string;
  phone?: string;
  email?: string;
  bankAccountDetails?: string;
  updatedBy?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundedSearchResponse {
  text: string;
  groundingChunks: GroundingChunk[];
  webSearchQueries?: string[];
}
