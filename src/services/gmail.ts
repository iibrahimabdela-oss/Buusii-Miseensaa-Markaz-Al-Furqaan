import { Member, Contribution } from '../types';
import { formatCurrencyETB } from '../utils/ethiopianCalendar';

function base64UrlEncode(str: string): string {
  // Handles utf-8 strings correctly in browser
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendEmailViaGmail(
  to: string,
  subject: string,
  htmlContent: string,
  accessToken: string
): Promise<{ id: string; threadId: string }> {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlContent,
  ];

  const rawMessage = emailLines.join('\r\n');
  const encodedMessage = base64UrlEncode(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to send email via Gmail: ${res.statusText}`);
  }

  return await res.json();
}

export async function sendContributionReceiptEmail(
  member: Member,
  contribution: Contribution,
  accessToken: string
): Promise<{ id: string; threadId: string }> {
  if (!member.email) {
    throw new Error(`Member ${member.fullName} does not have an email address configured.`);
  }

  const subject = `Nagahee Kaffaltii / Donation Receipt [${contribution.receiptNumber}] — Al-Furqaan`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 32px 24px; }
    .receipt-badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amount-title { font-size: 13px; color: #166534; margin: 0 0 4px 0; font-weight: 600; text-transform: uppercase; }
    .amount-val { font-size: 32px; font-weight: 800; color: #065f46; margin: 0; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .table td.label { color: #64748b; font-weight: 500; width: 40%; }
    .table td.value { color: #0f172a; font-weight: 600; text-align: right; }
    .dua-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; color: #713f12; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 24px; margin-bottom: 6px;">📖 🕌</div>
      <h1>Giddu-gala Hifzii Qur’aanaa Al-Furqaan</h1>
      <p>Al-Furqaan Quran Memorization Center • Finfinnee / Oromia, Ethiopia</p>
    </div>
    <div class="body">
      <div style="text-align: center;">
        <span class="receipt-badge">NAGAHEE KAFFALTII / OFFICIAL RECEIPT</span>
      </div>
      
      <p style="font-size: 15px; margin-top: 0;">Assalaamu Alaykum wa Rahmatullaahi wa Barakaatuhu, kabajamoo <strong>${member.fullName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Kaffaltiin buusii keessan milkaa’inaan galmaa’eera. Giddu-gala Hifzii Qur’aanaa Al-Furqaan deeggaruu keessaniif galata guddaa qabdu.</p>

      <div class="amount-box">
        <div class="amount-title">Hanga Kaffalame / Paid Amount</div>
        <div class="amount-val">${formatCurrencyETB(contribution.amountETB)}</div>
      </div>

      <table class="table">
        <tr>
          <td class="label">Lakk. Nagahee (Receipt #):</td>
          <td class="value">${contribution.receiptNumber}</td>
        </tr>
        <tr>
          <td class="label">Koodii Miseensaa (Member ID):</td>
          <td class="value">${contribution.memberId}</td>
        </tr>
        <tr>
          <td class="label">Ji’a Kaffaltii (Period):</td>
          <td class="value">${contribution.ethiopianMonth.toUpperCase()} ${contribution.ethiopianYear} E.C.</td>
        </tr>
        <tr>
          <td class="label">Karaa Kaffaltii (Channel):</td>
          <td class="value">${contribution.paymentMethod.toUpperCase()}</td>
        </tr>
        ${contribution.transactionReference ? `<tr><td class="label">Lakk. Eenyummaa (Ref #):</td><td class="value">${contribution.transactionReference}</td></tr>` : ''}
        <tr>
          <td class="label">Guyyaa Galmee (Date):</td>
          <td class="value">${new Date(contribution.createdAt).toLocaleDateString('en-GB')}</td>
        </tr>
      </table>

      <div class="dua-box">
        <strong>Du'aa & Eebba Barakaa:</strong><br>
        « جَزَاكُمُ اللَّهُ خَيْرًا وَبَارَكَ اللَّهُ لَكَ فِي أَهْلِكَ وَمَالِكَ »<br>
        <em>"Rabbiin qabeenya keessan, maatii keessan fi umrii keessan keessatti barakaa haa kaa'u. Sadaqaa Jaariyaa isin barattoota Qur'aanaa barsiisuuf gumaachitan kana jannataan isiniif haa deebisu."</em>
      </div>

      <p style="font-size: 13px; color: #64748b;">Gaafilee ykn qorannoof nu qunnamaa: <strong>+251 91 100 2233</strong> | <strong>alfurqaan.center@gmail.com</strong></p>
    </div>
    <div class="footer">
      Al-Furqaan Quran Memorization & Hifz Center • Dijital Al-Furqaan System
    </div>
  </div>
</body>
</html>
`;

  return await sendEmailViaGmail(member.email, subject, html, accessToken);
}

export async function sendPledgeReminderEmail(
  member: Member,
  monthName: string,
  year: number,
  accessToken: string
): Promise<{ id: string; threadId: string }> {
  if (!member.email) {
    throw new Error(`Member ${member.fullName} does not have an email address configured.`);
  }

  const subject = `Yaadachiisa Buusii Ji'aa (${monthName} ${year}) — Giddu-gala Al-Furqaan`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #065f46; color: #ffffff; padding: 28px 24px; text-align: center; }
    .body { padding: 28px 24px; }
    .bank-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0 0 6px 0;">Al-Furqaan Quran Memorization Center</h2>
      <p style="margin: 0; font-size: 13px; opacity: 0.9;">Giddu-gala Hifzii Qur’aanaa Al-Furqaan</p>
    </div>
    <div class="body">
      <p>Assalaamu Alaykum wa Rahmatullaahi wa Barakaatuhu, kabajamoo <strong>${member.fullName}</strong>,</p>
      <p>Buusii waadaa keessan ji'a <strong>${monthName} ${year} E.C.</strong> kan hanga <strong>${formatCurrencyETB(member.monthlyPledgeETB)}</strong> kabajaan isin yaadachiifna.</p>
      
      <p>Gumaachi keessan kun barattoota Qur'aana qe'ee keenyatti qara'an deeggaruu fi oolmaa Ustazootaaf oola.</p>

      <div class="bank-box">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">Herreega Baankii Kaffaltiif:</h4>
        <p style="margin: 4px 0; font-size: 14px;">• <strong>CBE (Commercial Bank of Ethiopia):</strong> 1000293847561</p>
        <p style="margin: 4px 0; font-size: 14px;">• <strong>Telebirr:</strong> 0911002233</p>
        <p style="margin: 4px 0; font-size: 14px;">• <strong>Awash Bank:</strong> 01320495867100</p>
      </div>

      <p style="font-size: 13px; color: #64748b;">Kaffaltii raawwachuu keessan booda lakk. eenyummaa kaffaltii (transaction ref) nuf ergaa nagahee keessan akka isiniif erginuuf.</p>
      <p>Rabbiin dalagaa gaarii hunda nurraa haa qeebalu. Jazakumullahu Khayran.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendEmailViaGmail(member.email, subject, html, accessToken);
}
