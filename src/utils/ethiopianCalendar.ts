export interface EthMonth {
  key: string;
  om: string;
  am: string;
  en: string;
  number: number;
}

export const ETHIOPIAN_MONTHS: EthMonth[] = [
  { key: 'fulbaana', om: 'Fulbaana (Meskerem)', am: 'መስከረም', en: 'Meskerem', number: 1 },
  { key: 'onkololeessa', om: 'Onkololeessa (Tikimt)', am: 'ጥቅምት', en: 'Tikimt', number: 2 },
  { key: 'sadaasa', om: 'Sadaasa (Hidar)', am: 'ኅዳር', en: 'Hidar', number: 3 },
  { key: 'muddee', om: 'Muddee (Tahsas)', am: 'ታኅሣሥ', en: 'Tahsas', number: 4 },
  { key: 'amajjii', om: 'Amajjii (Tir)', am: 'ጥር', en: 'Tir', number: 5 },
  { key: 'guraandhala', om: 'Guraandhala (Yekatit)', am: 'የካቲት', en: 'Yekatit', number: 6 },
  { key: 'bitootessa', om: 'Bitootessa (Megabit)', am: 'መጋቢት', en: 'Megabit', number: 7 },
  { key: 'ebla', om: 'Ebla (Miazia)', am: 'ሚያዝያ', en: 'Miazia', number: 8 },
  { key: 'caamsaa', om: 'Caamsaa (Ginbot)', am: 'ግንቦት', en: 'Ginbot', number: 9 },
  { key: 'waxabajjii', om: 'Waxabajjii (Sene)', am: 'ሰኔ', en: 'Sene', number: 10 },
  { key: 'adooleessa', om: 'Adooleessa (Hamle)', am: 'ሐምሌ', en: 'Hamle', number: 11 },
  { key: 'hagayya', om: 'Hagayya (Nehase)', am: 'ነሐሴ', en: 'Nehase', number: 12 },
  { key: 'phaagumee', om: 'Phaagumee (Pagume)', am: 'ጳጉሜ', en: 'Pagume', number: 13 },
];

/**
 * Approximate current Ethiopian Year and Month based on Gregorian date.
 * Ethiopian new year starts Sept 11 (or Sept 12 in leap years).
 */
export function getCurrentEthiopianYearAndMonth(): {
  year: number;
  monthKey: string;
  monthNameOm: string;
  monthNameEn: string;
} {
  const now = new Date();
  const gYear = now.getFullYear();
  const gMonth = now.getMonth(); // 0-11
  const gDay = now.getDate();

  // Approximate Ethiopian Year: Gregorian year - 8 before Sept 11, or Gregorian year - 7 after Sept 11
  let ethYear = gYear - 8;
  if (gMonth > 8 || (gMonth === 8 && gDay >= 11)) {
    ethYear = gYear - 7;
  }

  // Determine current month key
  let monthIndex = 0;
  if (gMonth === 8 && gDay >= 11) monthIndex = 0; // Fulbaana
  else if (gMonth === 9 && gDay < 11) monthIndex = 0;
  else if ((gMonth === 9 && gDay >= 11) || (gMonth === 10 && gDay < 10)) monthIndex = 1; // Onkololeessa
  else if ((gMonth === 10 && gDay >= 10) || (gMonth === 11 && gDay < 10)) monthIndex = 2; // Sadaasa
  else if ((gMonth === 11 && gDay >= 10) || (gMonth === 0 && gDay < 9)) monthIndex = 3; // Muddee
  else if ((gMonth === 0 && gDay >= 9) || (gMonth === 1 && gDay < 8)) monthIndex = 4; // Amajjii
  else if ((gMonth === 1 && gDay >= 8) || (gMonth === 2 && gDay < 10)) monthIndex = 5; // Guraandhala
  else if ((gMonth === 2 && gDay >= 10) || (gMonth === 3 && gDay < 9)) monthIndex = 6; // Bitootessa
  else if ((gMonth === 3 && gDay >= 9) || (gMonth === 4 && gDay < 9)) monthIndex = 7; // Ebla
  else if ((gMonth === 4 && gDay >= 9) || (gMonth === 5 && gDay < 8)) monthIndex = 8; // Caamsaa
  else if ((gMonth === 5 && gDay >= 8) || (gMonth === 6 && gDay < 8)) monthIndex = 9; // Waxabajjii
  else if ((gMonth === 6 && gDay >= 8) || (gMonth === 7 && gDay < 7)) monthIndex = 10; // Adooleessa
  else if ((gMonth === 7 && gDay >= 7) || (gMonth === 8 && gDay < 6)) monthIndex = 11; // Hagayya
  else monthIndex = 12; // Phaagumee

  const safeIndex = Math.min(Math.max(monthIndex, 0), ETHIOPIAN_MONTHS.length - 1);
  return {
    year: ethYear,
    monthKey: ETHIOPIAN_MONTHS[safeIndex].key,
    monthNameOm: ETHIOPIAN_MONTHS[safeIndex].om.split(' ')[0],
    monthNameEn: ETHIOPIAN_MONTHS[safeIndex].en,
  };
}

export function formatCurrencyETB(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount).replace('ETB', 'ETB ');
}

export function generateReceiptNumber(seq: number, year: number): string {
  const padSeq = String(seq).padStart(4, '0');
  return `ALF-REC-${year}-${padSeq}`;
}

export function generateMemberId(seq: number): string {
  return `ALF-M-${String(seq).padStart(3, '0')}`;
}
