import { Member, Contribution } from '../types';

/**
 * Normalizes phone numbers to WhatsApp international format.
 * Ethiopian numbers starting with 09 or 07 become 2519... or 2517...
 * Removes dashes, spaces, and plus signs for wa.me URL compatibility.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
    cleaned = '251' + cleaned.substring(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 9) {
    cleaned = '251' + cleaned;
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '251' + cleaned;
  }

  return cleaned;
}

/**
 * Formats a digital receipt message for WhatsApp in Afan Oromo & English.
 */
export function createReceiptWhatsAppMessage(
  member: Member,
  contribution: Contribution
): string {
  const methodLabel = contribution.paymentMethod.toUpperCase();
  const dateStr = `${contribution.ethiopianMonth} ${contribution.ethiopianYear}`;

  return `🕌 *Giddu-gala Hifzii Qur’aanaa Al-Furqaan*
📄 *NAGAHEE KAFFALTII BUUSII DIJITAALAA*
----------------------------------------
👤 *Miseensa:* ${member.fullName}
🆔 *ID Miseensaa:* ${member.memberId}
💰 *Hanga Buusii:* ${contribution.amountETB.toLocaleString()} ETB
📅 *Ji'a & Waggaa:* ${contribution.ethiopianMonth} ${contribution.ethiopianYear} E.C.
🔢 *Lakk. Nagahee:* ${contribution.receiptNumber}
💳 *Karaa Kaffaltii:* ${methodLabel}
📝 *Guyyaa:* ${dateStr}
${contribution.transactionReference ? `🔖 *Lakk. Teessoo/Ref:* ${contribution.transactionReference}\n` : ''}----------------------------------------
🤲 *Jazaakumullaahu Khayran!*
"Rabbiin arjooma keessan sadaqaa jaallatamtuu isiniif haa taasisu, qabeenya keessan keessattis barakaa haa buusu."
✨ Al-Furqaan Quran Memorization Center - Chiro, Ethiopia`;
}

/**
 * Formats a pledge reminder message for WhatsApp.
 */
export function createPledgeReminderWhatsAppMessage(
  member: Member,
  monthName: string,
  year: number
): string {
  return `Assalaamu Aleykum warahmatullaahi wabarakaatuhu Obbo/Aadde *${member.fullName}*,

Giddu-gala Hifzii Qur’aanaa Al-Furqaan irraa.
Buusii waadaa ji'aa keessan *${member.monthlyPledgeETB?.toLocaleString()} ETB* kan ji'a *${monthName} ${year}* kaffaluuf kabajaan isin yaadachiifna.

Daa'imman Qur'aana qomatti qabatan cinaa dhaabbachuun gumaacha gootan hundaaf Rabbiin galata guddaa isiniif haa deebisu!

🤲 *Jazaakumullaahu Khayran!*
Al-Furqaan Quran Memorization Center`;
}

/**
 * Opens a WhatsApp chat in a new tab with the pre-filled message.
 */
export function sendViaWhatsApp(phone: string, message: string): boolean {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) {
    alert('Lakkoofsi bilbilaa miseensaa hin jiru ykn sirrii miti.');
    return false;
  }

  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
  window.open(url, '_blank');
  return true;
}
