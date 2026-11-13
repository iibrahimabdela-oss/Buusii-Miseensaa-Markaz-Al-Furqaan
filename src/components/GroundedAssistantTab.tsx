import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  BookOpen,
  DollarSign,
  Calendar,
  Send,
  Copy,
  Check,
  RefreshCw,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { Member, Language, GroundingChunk } from '../types';

interface GroundedAssistantTabProps {
  members: Member[];
  lang: Language;
  onSendViaGmail?: (recipientEmail: string, subject: string, message: string) => void;
}

export const GroundedAssistantTab: React.FC<GroundedAssistantTabProps> = ({
  members,
  lang,
  onSendViaGmail,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseMarkdown, setResponseMarkdown] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);

  // AI Dua Generator State
  const [selectedDonor, setSelectedDonor] = useState('');
  const [donorPledge, setDonorPledge] = useState('1500');
  const [donorLang, setDonorLang] = useState<Language>('om');
  const [isGeneratingDua, setIsGeneratingDua] = useState(false);
  const [generatedDua, setGeneratedDua] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const PRESET_QUERIES = [
    {
      title: 'Doolaara fi Riyaala gara ETB (Exchange Rate)',
      query: 'What is the current official exchange rate of 1 USD to Ethiopian Birr (ETB) and 1 Saudi Riyal (SAR) to ETB today in Ethiopia?',
      icon: DollarSign,
    },
    {
      title: 'Bara & Ji’a Hijrii fi Ramadaana (Islamic Calendar)',
      query: 'What is the current Islamic Hijri date and year today, and what are the upcoming Ramadan and Eid dates in Ethiopia?',
      icon: Calendar,
    },
    {
      title: 'Dambii Kaffaltii Telebirr fi CBE (Payment Rules)',
      query: 'What are the current daily transfer limits, transaction rules, and fees for Telebirr and Commercial Bank of Ethiopia (CBE) mobile banking?',
      icon: Landmark,
    },
    {
      title: 'Faayidaa Barsiisa Qur’aanaa (Sadaqah Jariyah)',
      query: 'What are the authentic Hadiths on the virtues of Quran memorization centers, teaching Quran, and Sadaqah Jariyah in Islam?',
      icon: BookOpen,
    },
  ];

  const handleSearch = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;

    try {
      setIsLoading(true);
      setResponseMarkdown(null);
      setGroundingChunks([]);
      setSearchQueries([]);

      const res = await fetch('/api/gemini/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Search failed: ${res.statusText}`);
      }

      const data = await res.json();
      setResponseMarkdown(data.text);
      setGroundingChunks(data.groundingChunks || []);
      setSearchQueries(data.webSearchQueries || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDua = async () => {
    if (!selectedDonor) return;
    try {
      setIsGeneratingDua(true);
      setGeneratedDua(null);

      const res = await fetch('/api/gemini/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: selectedDonor,
          amountETB: donorPledge,
          language: donorLang,
          purpose: "Deeggarsa barattoota Hifzii fi Ustazoota Giddu-gala Qur'aanaa Al-Furqaan",
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate message');
      }

      const data = await res.json();
      setGeneratedDua(data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingDua(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedDua) return;
    navigator.clipboard.writeText(generatedDua);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#0B1F3A] border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search Grounding · Islamic & Ethiopian Finance</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Qorannoo fi Qajeelfama (Grounded Assistant)
          </h2>
          <p className="mt-1 text-xs text-blue-100/80 leading-relaxed">
            Odeeffannoo baankii Itiyoophiyaa (CBE & Telebirr), sharafa doolaaraa fi riyaalaa dhiyoo, lakkoofsa Hijrii fi qajeelfama gumaata sadaqaa Qur'aanaa Google Search dhaan mirkaneeffame argadhaa.
          </p>
        </div>
      </div>

      {/* Preset Queries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_QUERIES.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                setQuery(item.query);
                handleSearch(item.query);
              }}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left hover:border-blue-600 hover:shadow-sm transition group"
            >
              <div className="p-2 w-fit rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 mb-2 group-hover:bg-[#0B1F3A] group-hover:text-white transition">
                <Icon className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white leading-snug">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                {item.query}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Gaaffii kaffaltii, baankii, sharafa ykn Qur'aana barbaadan barreessaa..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Qorachaa jira...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Google Search dhaan Qoradhu
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        {responseMarkdown && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Grounding Sources Badge */}
            {groundingChunks.length > 0 && (
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1F3A] dark:text-blue-300 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Madda Odeeffannoo Mirkanaa'e (Google Search Grounding Sources):
                </div>
                <div className="flex flex-wrap gap-2">
                  {groundingChunks.map((chunk, index) => {
                    if (!chunk.web) return null;
                    return (
                      <a
                        key={index}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:border-blue-600 flex items-center gap-1 shadow-xs transition"
                      >
                        <span className="truncate max-w-[180px]">{chunk.web.title || chunk.web.uri}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Answer Content */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-sans">
              {responseMarkdown}
            </div>
          </div>
        )}
      </div>

      {/* Dua & Donor Appreciation Generator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">
            Uumaa Du’aa & Galata Miseensotaa (Dua Generator)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Qur'aanaa fi Hadiisa irratti hundaa'ee ergaa galataa fi du'aa eebbaa miseensota kaffalaniif qopheessaa
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Miseensa Filadhu (Donor)
            </label>
            <select
              value={selectedDonor}
              onChange={(e) => {
                setSelectedDonor(e.target.value);
                const found = members.find((m) => m.fullName === e.target.value);
                if (found) setDonorPledge(String(found.monthlyPledgeETB || 1000));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Miseensa Filadhu --</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.fullName}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Buusii (ETB)
            </label>
            <input
              type="text"
              value={donorPledge}
              onChange={(e) => setDonorPledge(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Afaan (Language)
            </label>
            <select
              value={donorLang}
              onChange={(e) => setDonorLang(e.target.value as Language)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              <option value="om">Afaan Oromoo</option>
              <option value="en">English</option>
              <option value="am">አማርኛ (Amharic)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateDua}
          disabled={isGeneratingDua || !selectedDonor}
          className="px-5 py-2.5 bg-[#0B1F3A] hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
        >
          {isGeneratingDua ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Du’aa Qopheessaa jira...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Du’aa & Galata Eebbaa Qopheessi
            </>
          )}
        </button>

        {generatedDua && (
          <div className="mt-5 p-5 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/60">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Ergaa Du'aa {selectedDonor} f Qophaa'e
              </span>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Waraabameera' : 'Waraabi (Copy)'}
              </button>
            </div>
            <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-line font-serif">
              {generatedDua}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
