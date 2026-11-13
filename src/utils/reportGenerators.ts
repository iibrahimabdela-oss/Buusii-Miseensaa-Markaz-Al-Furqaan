import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member, Contribution } from '../types';
import {
  ETHIOPIAN_MONTHS,
  formatCurrencyETB,
  getCurrentEthiopianYearAndMonth,
} from './ethiopianCalendar';

// Helper to trigger browser file download
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper to load the center logo as a base64 JPEG data URL for PDF headers
async function loadLogoAsDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${window.location.origin}/assets/aistudio/loog_6003b99d.jpg`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Normalize Oromo/Unicode apostrophes for built-in PDF Helvetica font
function pdfSafeText(text: string): string {
  return text.replace(/[’‘`]/g, "'");
}

// 1. Annual Member Participation CSV (13 Ethiopian Months)
export function generateAnnualParticipationCSV(
  members: Member[],
  contributions: Contribution[],
  ethYear: number
): void {
  // UTF-8 BOM for Excel
  let csv = '\uFEFF';

  // Headers: Member ID, Name, Phone, Waadaa Waggaa, Waadaa Ji'aanii, 13 Months, Total Paid, Remaining, Fulfillment %
  const monthHeaders = ETHIOPIAN_MONTHS.map((m) => m.om.split(' ')[0]);
  const headers = [
    'Koodii (ID)',
    'Maqaa Guutuu (Full Name)',
    'Lakk. Bilbilaa (Phone)',
    'Waadaa Waggaa (ETB)',
    "Waadaa Ji'aanii (ETB)",
    ...monthHeaders,
    'Waliigala Kaffalame (Total Paid ETB)',
    'Haftee Waadaa (Remaining ETB)',
    'Haala (Fulfillment %)',
  ];

  csv += headers.map((h) => `"${h}"`).join(',') + '\r\n';

  const validYearContribs = contributions.filter(
    (c) => c.ethiopianYear === ethYear && c.status !== 'voided'
  );
  const monthTotals: number[] = ETHIOPIAN_MONTHS.map(() => 0);
  let grandAnnualPledge = 0;
  let grandMonthlyPledge = 0;
  let grandTotalPaid = 0;
  let grandRemaining = 0;

  // Rows
  members.forEach((m) => {
    const memberContribs = validYearContribs.filter((c) => c.memberId === m.memberId);

    const monthlyPledge = Number(m.monthlyPledgeETB) || 0;
    const expectedAnnual = monthlyPledge * 12;
    grandMonthlyPledge += monthlyPledge;
    grandAnnualPledge += expectedAnnual;

    let memberTotal = 0;
    const monthValues = ETHIOPIAN_MONTHS.map((month, mIdx) => {
      const paid = memberContribs
        .filter((c) => c.ethiopianMonth === month.key)
        .reduce((sum, c) => sum + (c.amountETB || 0), 0);
      memberTotal += paid;
      monthTotals[mIdx] += paid;
      return paid > 0 ? paid : 0;
    });

    const remaining = Math.max(expectedAnnual - memberTotal, 0);
    grandTotalPaid += memberTotal;
    grandRemaining += remaining;

    const fulfillment =
      expectedAnnual > 0 ? Math.round((memberTotal / expectedAnnual) * 100) + '%' : '0%';

    const row = [
      m.memberId,
      m.fullName,
      m.phoneNumber,
      expectedAnnual,
      monthlyPledge,
      ...monthValues,
      memberTotal,
      remaining,
      fulfillment,
    ];

    csv += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
  });

  if (members.length > 0) {
    const grandFulfillment =
      grandAnnualPledge > 0 ? Math.round((grandTotalPaid / grandAnnualPledge) * 100) + '%' : '0%';
    const totalRow = [
      'WALIIGALA',
      'Total',
      '',
      grandAnnualPledge,
      grandMonthlyPledge,
      ...monthTotals,
      grandTotalPaid,
      grandRemaining,
      grandFulfillment,
    ];
    csv += totalRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
  }

  downloadFile(
    csv,
    `Al-Furqaan-Gabaasa-Miseensotaa-${ethYear}.csv`,
    'text/csv;charset=utf-8;'
  );
}

// 2. Annual Member Participation PDF (Real downloadable A4 Landscape PDF via jsPDF)
export async function generateAnnualParticipationPDF(
  members: Member[],
  contributions: Contribution[],
  ethYear: number
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoAsDataUrl();

  const validYearContribs = contributions.filter(
    (c) => c.ethiopianYear === ethYear && c.status !== 'voided'
  );

  let grandTotalPaid = 0;
  let grandTotalExpected = 0;
  let grandTotalMonthly = 0;
  const monthTotals: number[] = ETHIOPIAN_MONTHS.map(() => 0);

  const bodyRows = members.map((m) => {
    const memberContribs = validYearContribs.filter((c) => c.memberId === m.memberId);
    const monthlyPledge = Number(m.monthlyPledgeETB) || 0;
    const expectedAnnual = monthlyPledge * 12;
    grandTotalMonthly += monthlyPledge;
    grandTotalExpected += expectedAnnual;

    let memberTotal = 0;
    const monthCells = ETHIOPIAN_MONTHS.map((month, mIdx) => {
      const paid = memberContribs
        .filter((c) => c.ethiopianMonth === month.key)
        .reduce((sum, c) => sum + (c.amountETB || 0), 0);
      memberTotal += paid;
      monthTotals[mIdx] += paid;
      return paid > 0 ? paid.toLocaleString() : '-';
    });

    grandTotalPaid += memberTotal;
    const rate = expectedAnnual > 0 ? Math.round((memberTotal / expectedAnnual) * 100) : 0;

    return [
      m.memberId,
      pdfSafeText(m.fullName),
      expectedAnnual.toLocaleString(),
      monthlyPledge.toLocaleString(),
      ...monthCells,
      memberTotal.toLocaleString(),
      `${rate}%`,
    ];
  });

  const grandRate =
    grandTotalExpected > 0 ? Math.round((grandTotalPaid / grandTotalExpected) * 100) : 0;

  if (members.length > 0) {
    bodyRows.push([
      'TOTAL',
      'WALIIGALA',
      grandTotalExpected.toLocaleString(),
      grandTotalMonthly.toLocaleString(),
      ...monthTotals.map((mt) => (mt > 0 ? mt.toLocaleString() : '-')),
      grandTotalPaid.toLocaleString(),
      `${grandRate}%`,
    ]);
  }

  // Deep blue header banner
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 297, 26, 'F');
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', 12, 3, 20, 20);
    } catch {
      // Ignore logo decode issues so PDF download still succeeds
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text("Giddu-gala Hifzii Qur'aanaa Al-Furqaan", logoDataUrl ? 37 : 14, 11);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gabaasa Hirmaannaa Buusii Miseensotaa Waggaa - Bara ${ethYear} E.C. (Annual Member Participation)`,
    logoDataUrl ? 37 : 14,
    18
  );
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 260, 11);

  doc.setTextColor(11, 31, 58);
  doc.setFontSize(9);
  doc.text(
    `Miseensota: ${members.length}   |   Waliigala Kaffalame: ${formatCurrencyETB(
      grandTotalPaid
    )}   |   Waadaa Waggaa: ${formatCurrencyETB(grandTotalExpected)}   |   Guutama: ${grandRate}%`,
    14,
    33
  );

  const monthShortHeaders = ETHIOPIAN_MONTHS.map((m) => m.om.substring(0, 3));

  autoTable(doc, {
    startY: 37,
    head: [
      ['ID', 'Maqaa Guutuu', 'Waadaa Waggaa', "Waadaa Ji'aanii", ...monthShortHeaders, 'Total', '%'],
    ],
    body: bodyRows,
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      halign: 'right',
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 32 },
    },
    headStyles: {
      fillColor: [11, 31, 58],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (hookData) => {
      if (members.length > 0 && hookData.row.index === bodyRows.length - 1) {
        hookData.cell.styles.fillColor = [239, 246, 255];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [11, 31, 58];
      }
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`Al-Furqaan-Gabaasa-Miseensotaa-${ethYear}.pdf`);
}

// 3. Executive Summary CSV
export function generateExecutiveSummaryCSV(
  members: Member[],
  contributions: Contribution[],
  ethYear: number
): void {
  let csv = '\uFEFF';
  csv += '"Giddu-gala Hifzii Qur\'aanaa Al-Furqaan — Gabaasa Waliigalaa (Executive Summary)"\r\n';
  csv += `"Bara (Ethiopian Year)",${ethYear}\r\n`;
  csv += `"Guyyaa (Date Generated)","${new Date().toLocaleDateString('en-GB')}"\r\n\r\n`;

  const active = members.filter((m) => m.status === 'active');
  const totalPledgedMonth = active.reduce((acc, m) => acc + (m.monthlyPledgeETB || 0), 0);
  const yearContribs = contributions.filter(
    (c) => c.ethiopianYear === ethYear && c.status !== 'voided'
  );
  const totalCollected = yearContribs.reduce((acc, c) => acc + (c.amountETB || 0), 0);

  csv += '"Qabxiiwwan Ijoo (Key Financial Metrics)","Amount (ETB)"\r\n';
  csv += `"Waliigala Miseensota Galmaa'anii",${members.length}\r\n`;
  csv += `"Miseensota Hojirra Jiran (Active)",${active.length}\r\n`;
  csv += `"Waliigala Buusii Waadaa Ji'aa",${totalPledgedMonth}\r\n`;
  csv += `"Waliigala Buusii Kaffalame (Bara ${ethYear})",${totalCollected}\r\n`;
  csv += `"Lakk. Kaffaltii Nagahee (Receipts Count)",${yearContribs.length}\r\n\r\n`;

  // Breakdown by Channel
  csv += '"Karaa Kaffaltii (Payment Channels)","Lakk. Kaffaltii","Waliigala ETB"\r\n';
  const channels = ['telebirr', 'cbe', 'awash', 'cbe_birr', 'cash', 'bank_transfer'];
  channels.forEach((ch) => {
    const list = yearContribs.filter((c) => c.paymentMethod === ch);
    const sum = list.reduce((a, b) => a + (b.amountETB || 0), 0);
    csv += `"${ch.toUpperCase()}",${list.length},${sum}\r\n`;
  });

  csv += '\r\n"Kaffaltii Ji\'oota Itiyoophiyaa","Lakk. Nagahee","Hanga Kaffalame (ETB)"\r\n';
  ETHIOPIAN_MONTHS.forEach((m) => {
    const list = yearContribs.filter((c) => c.ethiopianMonth === m.key);
    const sum = list.reduce((a, b) => a + (b.amountETB || 0), 0);
    csv += `"${m.om}",${list.length},${sum}\r\n`;
  });

  downloadFile(
    csv,
    `Al-Furqaan-Gabaasa-Waliigalaa-${ethYear}.csv`,
    'text/csv;charset=utf-8;'
  );
}

// 4. Executive Financial Summary PDF (Real downloadable A4 Portrait PDF via jsPDF)
export async function generateExecutiveSummaryPDF(
  members: Member[],
  contributions: Contribution[],
  ethYear: number
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoAsDataUrl();
  const currentEth = getCurrentEthiopianYearAndMonth();

  const active = members.filter((m) => m.status === 'active');
  const totalPledgedMonth = active.reduce((acc, m) => acc + (Number(m.monthlyPledgeETB) || 0), 0);
  const totalPledgedAnnual = totalPledgedMonth * 12;
  const validContributions = contributions.filter((c) => c.status !== 'voided');
  const yearContribs = validContributions.filter((c) => c.ethiopianYear === ethYear);
  const totalCollectedYear = yearContribs.reduce((acc, c) => acc + (c.amountETB || 0), 0);
  const totalCollectedAllTime = validContributions.reduce((acc, c) => acc + (c.amountETB || 0), 0);
  const collectionRateYear =
    totalPledgedAnnual > 0 ? Math.round((totalCollectedYear / totalPledgedAnnual) * 100) : 0;

  // Current month vs previous month totals
  const regularMonths = ETHIOPIAN_MONTHS.slice(0, 12);
  const curIdx = regularMonths.findIndex((m) => m.key === currentEth.monthKey);
  const prevIdx = curIdx <= 0 ? 11 : curIdx - 1;
  const prevMonthObj = regularMonths[prevIdx];
  const prevYear = curIdx <= 0 ? currentEth.year - 1 : currentEth.year;

  const curMonthTotal = validContributions
    .filter((c) => c.ethiopianMonth === currentEth.monthKey && c.ethiopianYear === currentEth.year)
    .reduce((sum, c) => sum + (c.amountETB || 0), 0);
  const prevMonthTotal = validContributions
    .filter((c) => c.ethiopianMonth === prevMonthObj.key && c.ethiopianYear === prevYear)
    .reduce((sum, c) => sum + (c.amountETB || 0), 0);

  // Header Banner (Minimalist Deep Blue)
  doc.setFillColor(11, 31, 58);
  doc.rect(0, 0, 210, 34, 'F');
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', 14, 5, 24, 24);
    } catch {
      // Ignore logo decode issues so PDF download still succeeds
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text("Giddu-gala Hifzii Qur'aanaa Al-Furqaan", logoDataUrl ? 43 : 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Gabaasa Waliigalaa Buusii Miseensaa (Member Donation Summary Report) - Bara ${ethYear} E.C.`,
    logoDataUrl ? 43 : 14,
    21
  );
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')}  |  Magaalaa Ciro/ Oromia, Ethiopia  |  Tel: +251 935097339`,
    logoDataUrl ? 43 : 14,
    28
  );

  // Section 1: Key Financial Metrics
  doc.setTextColor(11, 31, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Qabxiiwwan Ijoo Faayinaansii (Financial Summary Metrics)', 14, 44);

  autoTable(doc, {
    startY: 47,
    head: [['Qabxii (Metric)', 'Gatii (Value)']],
    body: [
      [`Waliigala Buusii Kaffalame (Bara ${ethYear} E.C.)`, formatCurrencyETB(totalCollectedYear)],
      ['Waliigala Buusii Kaffalame (All-Time)', formatCurrencyETB(totalCollectedAllTime)],
      [
        `Buusii Ji'a Ammaa (${pdfSafeText(currentEth.monthNameOm)} ${currentEth.year})`,
        formatCurrencyETB(curMonthTotal),
      ],
      [
        `Buusii Ji'a Darbee (${pdfSafeText(prevMonthObj.om.split(' ')[0])} ${prevYear})`,
        formatCurrencyETB(prevMonthTotal),
      ],
      ["Waadaa Ji'aanii (Monthly Target Pledge)", formatCurrencyETB(totalPledgedMonth)],
      ['Waadaa Waggaa (Annual Target Pledge)', formatCurrencyETB(totalPledgedAnnual)],
      ['Sadarkaa Guutama Waggaa (Annual Collection Rate)', `${collectionRateYear}%`],
      ['Miseensota Hojirra Jiran / Waliigala (Active / Total)', `${active.length} / ${members.length}`],
      [`Lakk. Nagahee Galmaa'anii (Bara ${ethYear})`, `${yearContribs.length}`],
    ],
    headStyles: { fillColor: [11, 31, 58], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [30, 41, 59] },
      1: { halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const afterKpiY = ((doc as any).lastAutoTable?.finalY || 120) + 8;

  // Section 2: Monthly Contributions Breakdown (12 Ethiopian Months)
  doc.setTextColor(11, 31, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("2. Gabaasa Buusii Ji'ootaa (Monthly Breakdown)", 14, afterKpiY);

  const monthRows = ETHIOPIAN_MONTHS.slice(0, 12).map((mo) => {
    const list = yearContribs.filter((c) => c.ethiopianMonth === mo.key);
    const sum = list.reduce((a, b) => a + (b.amountETB || 0), 0);
    return [pdfSafeText(mo.om), String(list.length), formatCurrencyETB(sum)];
  });
  monthRows.push(['WALIIGALA (TOTAL)', String(yearContribs.length), formatCurrencyETB(totalCollectedYear)]);

  autoTable(doc, {
    startY: afterKpiY + 3,
    head: [["Ji'a Itiyoophiyaa (Ethiopian Month)", "Nagahee Galmaa'e", 'Buusii Kaffalame (ETB)']],
    body: monthRows,
    headStyles: { fillColor: [11, 31, 58], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (hookData) => {
      if (hookData.row.index === monthRows.length - 1) {
        hookData.cell.styles.fillColor = [239, 246, 255];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [11, 31, 58];
      }
    },
    margin: { left: 14, right: 14 },
  });

  const afterMonthsY = ((doc as any).lastAutoTable?.finalY || 210) + 8;

  // Section 3: Payment Channels Breakdown
  if (afterMonthsY > 245) {
    doc.addPage();
  }
  const channelsStartY = afterMonthsY > 245 ? 18 : afterMonthsY;
  doc.setTextColor(11, 31, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Karaa Kaffaltii (Payment Channels)', 14, channelsStartY);

  const channelRows = ['telebirr', 'cbe', 'awash', 'cbe_birr', 'cash', 'bank_transfer'].map((ch) => {
    const list = yearContribs.filter((c) => c.paymentMethod === ch);
    const sum = list.reduce((a, b) => a + (b.amountETB || 0), 0);
    return [ch.toUpperCase(), String(list.length), formatCurrencyETB(sum)];
  });

  autoTable(doc, {
    startY: channelsStartY + 3,
    head: [['Karaa Kaffaltii (Channel)', "Nagahee Galmaa'e", 'Hanga Kaffaltii (ETB)']],
    body: channelRows,
    headStyles: { fillColor: [11, 31, 58], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [11, 31, 58] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const afterChannelsY = ((doc as any).lastAutoTable?.finalY || 265) + 8;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Bank Details: CBE 1000293847561  |  Telebirr 0911002233  |  Awash Bank 01320495867100',
    14,
    Math.min(afterChannelsY, 286)
  );

  doc.save(`Al-Furqaan-Gabaasa-Waliigalaa-${ethYear}.pdf`);
}

// 5. Executive Summary Presentation (PPT slide deck in HTML/PowerPoint compatible format)
export function generateExecutiveSummaryPPT(
  members: Member[],
  contributions: Contribution[],
  ethYear: number
): void {
  const active = members.filter((m) => m.status === 'active');
  const totalPledgedMonth = active.reduce((acc, m) => acc + (m.monthlyPledgeETB || 0), 0);
  const yearContribs = contributions.filter(
    (c) => c.ethiopianYear === ethYear && c.status !== 'voided'
  );
  const totalCollected = yearContribs.reduce((acc, c) => acc + (c.amountETB || 0), 0);

  const pptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gabaasa Al-Furqaan Presentation Slides - Bara ${ethYear}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #ffffff; margin: 0; padding: 24px; }
    .slide { width: 900px; height: 506px; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 2px solid #059669; border-radius: 20px; margin: 0 auto 32px auto; padding: 48px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); page-break-after: always; position: relative; overflow: hidden; }
    .slide-badge { background: rgba(5, 150, 105, 0.3); border: 1px solid #10b981; color: #a7f3d0; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; width: fit-content; text-transform: uppercase; }
    .slide-title { font-size: 32px; font-weight: 800; color: #ffffff; margin: 12px 0 6px 0; }
    .slide-sub { font-size: 16px; color: #a7f3d0; margin: 0; }
    .slide-content { flex: 1; margin: 24px 0; display: flex; flex-direction: column; justify-content: center; }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .kpi-box { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px; text-align: center; }
    .kpi-num { font-size: 32px; font-weight: 800; color: #34d399; font-family: monospace; }
    .kpi-label { font-size: 12px; color: #cbd5e1; text-transform: uppercase; margin-top: 4px; }
    .slide-footer { display: flex; justify-content: space-between; font-size: 12px; color: #6ee7b7; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px; }
    .table-slide { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table-slide th { background: rgba(5, 150, 105, 0.4); padding: 8px 12px; text-align: left; color: #a7f3d0; }
    .table-slide td { padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    @media print {
      body { background: transparent; padding: 0; }
      .slide { box-shadow: none; margin: 0; border: none; width: 100%; height: 100vh; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 900px; margin: 0 auto 20px auto; display: flex; justify-content: space-between; align-items: center; background: #064e3b; padding: 14px; border-radius: 12px;">
    <span style="font-weight: bold; color: #a7f3d0;">Al-Furqaan Presentation Slides (PPT Deck)</span>
    <button onclick="window.print()" style="background: #10b981; color: #022c22; font-weight: bold; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer;">PDF / Maxxansi</button>
  </div>

  <!-- Slide 1: Cover -->
  <div class="slide">
    <div class="slide-badge">Bara ${ethYear} E.C. Annual Presentation</div>
    <div class="slide-content" style="text-align: center;">
      <div style="margin-bottom: 16px;">
        <img src="${window.location.origin}/assets/aistudio/loog_6003b99d.jpg" style="width: 96px; height: 96px; border-radius: 9999px; object-fit: cover; margin: 0 auto; display: block;" alt="Al-Furqaan Logo" />
      </div>
      <h1 class="slide-title" style="font-size: 38px;">Giddu-gala Hifzii Qur’aanaa Al-Furqaan</h1>
      <p class="slide-sub" style="font-size: 20px; color: #34d399;">Gabaasa Buusii & Sagantaa Hifzii Qur'aanaa</p>
      <p style="font-size: 14px; color: #94a3b8; margin-top: 20px;">Finfinnee, Oromia, Ethiopia • Al-Furqaan Digital System</p>
    </div>
    <div class="slide-footer">
      <span>Official Center Presentation Deck</span>
      <span>Slide 1 / 4</span>
    </div>
  </div>

  <!-- Slide 2: Financial Executive Overview -->
  <div class="slide">
    <div>
      <div class="slide-badge">Qabxiiwwan Ijoo • Key Metrics</div>
      <h2 class="slide-title">Waliigala Faayinaansii & Buusii</h2>
      <p class="slide-sub">Bara ${ethYear} E.C. Gumaata barattoota Qur'aanaaf kaffalame</p>
    </div>
    <div class="slide-content">
      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-num">${formatCurrencyETB(totalCollected)}</div>
          <div class="kpi-label">Waliigala Buusii Kaffalame</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num">${formatCurrencyETB(totalPledgedMonth)}</div>
          <div class="kpi-label">Waadaa Buusii Ji'aa</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-num">${active.length}</div>
          <div class="kpi-label">Miseensota Hojirra Jiran</div>
        </div>
      </div>
    </div>
    <div class="slide-footer">
      <span>Al-Furqaan Quran Center</span>
      <span>Slide 2 / 4</span>
    </div>
  </div>

  <!-- Slide 3: Channel Breakdown -->
  <div class="slide">
    <div>
      <div class="slide-badge">Karaa Kaffaltii • Payment Channels</div>
      <h2 class="slide-title">Telebirr & CBE Digital Payment Channels</h2>
      <p class="slide-sub">Akkaataan miseensonni kaffaltii buusii ittiin raawwatan</p>
    </div>
    <div class="slide-content">
      <table class="table-slide">
        <thead>
          <tr>
            <th>Karaa Kaffaltii</th>
            <th>Nagahee Kaffaltii</th>
            <th>Hanga Kaffaltii (ETB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Telebirr (ቴሌብር)</strong></td>
            <td>Merchant 0911002233</td>
            <td style="color: #34d399; font-weight: bold; font-family: monospace;">Fast Digital Transfers</td>
          </tr>
          <tr>
            <td><strong>CBE (Commercial Bank of Ethiopia)</strong></td>
            <td>Account 1000293847561</td>
            <td style="color: #34d399; font-weight: bold; font-family: monospace;">Primary Banking Channel</td>
          </tr>
          <tr>
            <td><strong>Awash Bank</strong></td>
            <td>Account 01320495867100</td>
            <td style="color: #34d399; font-weight: bold; font-family: monospace;">Secondary Banking Channel</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="slide-footer">
      <span>Al-Furqaan Quran Center</span>
      <span>Slide 3 / 4</span>
    </div>
  </div>

  <!-- Slide 4: Dua & Closing -->
  <div class="slide">
    <div>
      <div class="slide-badge">Eebba & Du'aa • Baraka Closing</div>
      <h2 class="slide-title">Galata Guddaa & Du’aa</h2>
      <p class="slide-sub">Barattoota Qur'aanaa fi Ustazoota Giddu-gala Al-Furqaan irraa</p>
    </div>
    <div class="slide-content" style="text-align: center;">
      <p style="font-size: 24px; color: #fde047; font-family: serif; line-height: 1.6; margin: 0 0 16px 0;">
        « خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »
      </p>
      <p style="font-size: 18px; color: #ffffff; line-height: 1.6; max-width: 700px; margin: 0 auto;">
        « جَزَاكُمُ اللَّهُ خَيْرًا وَبَارَكَ اللَّهُ لَكُمْ فِي أَمْوَالِكُمْ وَأَهْلِيكُمْ »
      </p>
      <p style="font-size: 14px; color: #a7f3d0; margin-top: 14px;">
        "Rabbiin buusii fi gumaata keessan kana sadaqaa jaariyaa haa godhuuf. Barakaa guddaa isiniif haa kennu."
      </p>
    </div>
    <div class="slide-footer">
      <span>Al-Furqaan Quran Memorization Center • Finfinnee, Ethiopia</span>
      <span>Slide 4 / 4</span>
    </div>
  </div>
</body>
</html>
  `;

  // Download as HTML PPT presentation
  downloadFile(
    pptHtml,
    `Al-Furqaan-Presentation-Slides-${ethYear}.html`,
    'text/html;charset=utf-8;'
  );

  // Also open preview window for direct slide presentation / printing
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(pptHtml);
    win.document.close();
  }
}
