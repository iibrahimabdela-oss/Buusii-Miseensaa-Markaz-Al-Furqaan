import React from 'react';
import { X, Printer, Mail, CheckCircle2, QrCode, ShieldCheck, Share2, MessageCircle } from 'lucide-react';
import { Member, Contribution, Language } from '../types';
import { formatCurrencyETB } from '../utils/ethiopianCalendar';
import { TRANSLATIONS } from '../utils/translations';
import { createReceiptWhatsAppMessage, sendViaWhatsApp } from '../utils/whatsapp';
import { AlFurqaanLogo } from './AlFurqaanLogo';

interface ReceiptModalProps {
  isOpen: boolean;
  contribution: Contribution | null;
  member: Member | null;
  lang: Language;
  hasGoogleAuth: boolean;
  isSendingEmail?: boolean;
  onClose: () => void;
  onSendEmail: (contribution: Contribution, member: Member) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  contribution,
  member,
  lang,
  hasGoogleAuth,
  isSendingEmail = false,
  onClose,
  onSendEmail,
}) => {
  if (!isOpen || !contribution) return null;

  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!member) {
      alert('Odeeffannoon miseensaa hin jiru.');
      return;
    }
    const phone = member.phoneNumber;
    if (!phone) {
      alert('Lakkoofsi bilbila / WhatsApp miseensaa hin galmoofne.');
      return;
    }
    const msg = createReceiptWhatsAppMessage(member, contribution);
    sendViaWhatsApp(phone, msg);
  };

  return (
    <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="receipt-card bg-white dark:bg-slate-900 border border-[#0B1F3A]/20 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative my-8">
        {/* Top toolbar (Hidden in print) */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-blue-400">
            <CheckCircle2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Nagahee Kaffaltii Qulqulluu (Verified Receipt)
          </div>
          <div className="flex items-center gap-2">
            {/* WhatsApp Button */}
            {member && member.phoneNumber && (
              <button
                onClick={handleWhatsAppShare}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                title="Send receipt to WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* Primary Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0B1F3A] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printReceipt}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="receipt-printable" className="p-6 sm:p-8 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-[#0B1F3A]/20">
            <div className="flex justify-center mb-3">
              <AlFurqaanLogo size="header" className="shadow-md" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-blue-300">
              Giddu-gala Hifzii Qur’aanaa Al-Furqaan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Al-Furqaan Quran Memorization & Islamic Studies Center
            </p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 font-mono mt-0.5">
              Finfinnee / Addis Ababa, Ethiopia • Tel: +251 91 100 2233
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#0B1F3A] dark:text-blue-200 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800/50">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              Nagahee Buusii Ji’aa / Official Receipt
            </div>
          </div>

          {/* Receipt Serial & Date */}
          <div className="flex items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t.receiptNumber}: </span>
              <span className="font-mono font-extrabold text-[#0B1F3A] dark:text-blue-400 text-sm">{contribution.receiptNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Date: </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(contribution.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-5 p-5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-0.5">
              Hanga Kaffalame (Amount Paid)
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0B1F3A] dark:text-white font-mono tracking-tight">
              {formatCurrencyETB(contribution.amountETB)}
            </div>
            <div className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1 capitalize font-semibold">
              Buusii Ji'a: {contribution.ethiopianMonth} {contribution.ethiopianYear} E.C.
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t.member}:</span>
              <span className="font-bold text-[#0B1F3A] dark:text-white text-sm">{contribution.memberName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Koodii Miseensaa (Member ID):</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{contribution.memberId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t.paymentMethod}:</span>
              <span className="font-extrabold uppercase text-[#0B1F3A] dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {contribution.paymentMethod}
              </span>
            </div>
            {contribution.transactionReference && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t.reference}:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{contribution.transactionReference}</span>
              </div>
            )}
            {contribution.notes && (
              <div className="py-2 text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                "{contribution.notes}"
              </div>
            )}
          </div>

          {/* Quran Ayah & Islamic Dua */}
          <div className="mt-5 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-center">
            <p className="text-xs font-serif text-amber-950 dark:text-amber-200 leading-relaxed font-bold">
              « مَثَلُ الَّذِينَ يُنْفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنْبَتَتْ سَبْعَ سَنَابِلَ »
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1.5 leading-snug">
              « جَزَاكُمُ اللَّهُ خَيْرًا وَبَارَكَ اللَّهُ لَكُمْ فِي أَمْوَالِكُمْ وَأَهْلِيكُمْ »
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 italic">
              "Rabbiin buusii keessan sadaqaa jaariyaa haa godhuuf, barakaa guddaa isiniif haa kennu."
            </p>
          </div>

          {/* Verification Barcode & Footer */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t-2 border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <QrCode className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">AL-FURQAAN DIGITAL SEAL</div>
                <div>ID: {contribution.receiptNumber}</div>
              </div>
            </div>
            <div className="text-right">
              <div>Recorded By: <strong className="text-slate-700 dark:text-slate-300">{contribution.recordedBy}</strong></div>
              <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">VERIFIED PAYMENT</div>
            </div>
          </div>
        </div>

        {/* Action Footer (Hidden in print) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            {member?.phoneNumber ? (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp: <strong>{member.phoneNumber}</strong>
              </span>
            ) : member?.email ? (
              <span>Imeelii: <strong className="text-slate-700 dark:text-slate-300">{member.email}</strong></span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">Lakkoofsi bilbilaa hin jiru</span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
            {/* WhatsApp Share Button */}
            {member && member.phoneNumber && (
              <button
                onClick={handleWhatsAppShare}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp dhaan Ergi
              </button>
            )}

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.printReceipt}
            </button>

            {/* Send via Gmail */}
            {member && member.email && (
              <button
                disabled={isSendingEmail}
                onClick={() => onSendEmail(contribution, member)}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                {isSendingEmail ? 'Ergamaa Jira...' : 'Gmail'}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
