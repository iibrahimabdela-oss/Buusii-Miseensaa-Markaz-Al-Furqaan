import { Member, Contribution, Expense } from '../types';

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export async function createCenterSpreadsheet(
  members: Member[],
  contributions: Contribution[],
  expenses: Expense[],
  accessToken: string,
  customTitle?: string
): Promise<ExportResult> {
  const dateStr = new Date().toLocaleDateString('en-GB');
  const title = customTitle || `Al-Furqaan Center - Sirna Buusii & Faayinaansii (${dateStr})`;

  // Step 1: Create Spreadsheet with multiple sheets
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Miseensota (Members)' } },
        { properties: { title: 'Buusii (Contributions)' } },
        { properties: { title: 'Baasii (Expenses)' } },
        { properties: { title: 'Gabaasa (Summary)' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create Google Sheet: ${createRes.statusText}`);
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Step 2: Prepare data for each tab
  const memberRows = [
    ['Member ID', 'Full Name (Maqaa Guutuu)', 'Phone Number', 'Email', 'Waadaa Waggaa (Annual ETB)', "Waadaa Ji'aanii (Monthly ETB)", 'City', 'Status'],
    ...members.map((m) => [
      m.memberId,
      m.fullName,
      m.phoneNumber,
      m.email || '-',
      (Number(m.monthlyPledgeETB) || 0) * 12,
      Number(m.monthlyPledgeETB) || 0,
      m.city || '-',
      m.status,
    ]),
  ];

  const contribRows = [
    ['Receipt Number', 'Member Code', 'Member Name', 'Amount (ETB)', 'Ethiopian Month', 'Ethiopian Year', 'Payment Channel', 'Reference #', 'Status', 'Date'],
    ...contributions.map((c) => [
      c.receiptNumber,
      c.memberId,
      c.memberName,
      c.amountETB,
      c.ethiopianMonth,
      c.ethiopianYear,
      c.paymentMethod.toUpperCase(),
      c.transactionReference || '-',
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
    ]),
  ];

  const expenseRows = [
    ['Expense ID', 'Description (Ibsa Baasii)', 'Category', 'Amount (ETB)', 'Ethiopian Date', 'Paid To (Recipient)', 'Recorded By', 'Date Recorded'],
    ...expenses.map((e) => [
      e.id || '-',
      e.title,
      e.category,
      e.amountETB,
      e.ethiopianDate || '-',
      e.paidTo || '-',
      e.recordedBy,
      new Date(e.createdAt).toLocaleDateString(),
    ]),
  ];

  const totalPledged = members.reduce((sum, m) => sum + (m.monthlyPledgeETB || 0), 0);
  const totalCollected = contributions.reduce((sum, c) => sum + (c.amountETB || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amountETB || 0), 0);
  const netBalance = totalCollected - totalExpenses;

  const summaryRows = [
    ['Giddu-gala Hifzii Qur’aanaa Al-Furqaan — Financial Executive Summary', ''],
    ['Export Generated Date', dateStr],
    ['', ''],
    ['Metric Description', 'Amount / Value (ETB)'],
    ['Total Registered Members', members.length],
    ['Active Contributing Members', members.filter((m) => m.status === 'active').length],
    ['Total Monthly Pledges (Waadaa)', totalPledged],
    ['Total Contributions Collected (Waliigala Buusii)', totalCollected],
    ['Total Center Expenses (Waliigala Baasii)', totalExpenses],
    ['Net Treasury Balance (Haftee Qulqulluu)', netBalance],
    ['', ''],
    ['Bank Details for Donors:', ''],
    ['Commercial Bank of Ethiopia (CBE)', '1000293847561'],
    ['Telebirr Merchant Code', '0911002233'],
    ['Awash Bank', '01320495867100'],
  ];

  // Step 3: Populate values in all tabs via batchUpdate
  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: "'Miseensota (Members)'!A1", values: memberRows },
        { range: "'Buusii (Contributions)'!A1", values: contribRows },
        { range: "'Baasii (Expenses)'!A1", values: expenseRows },
        { range: "'Gabaasa (Summary)'!A1", values: summaryRows },
      ],
    }),
  });

  if (!batchRes.ok) {
    console.warn('Batch update values warning:', await batchRes.text());
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}
