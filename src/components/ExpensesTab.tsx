import React, { useState } from 'react';
import {
  ArrowDownCircle,
  Plus,
  Search,
  Tag,
  Calendar,
  User,
  X,
  PieChart,
} from 'lucide-react';
import { Expense, ExpenseCategory, Language } from '../types';
import { formatCurrencyETB } from '../utils/ethiopianCalendar';
import { TRANSLATIONS } from '../utils/translations';

interface ExpensesTabProps {
  expenses: Expense[];
  lang: Language;
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  lang,
  onAddExpense,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.om;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('ustaz_allowance');
  const [amountETB, setAmountETB] = useState<number>(2000);
  const [ethiopianDate, setEthiopianDate] = useState('Fulbaana 2017');
  const [paidTo, setPaidTo] = useState('');

  const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
    { id: 'ustaz_allowance', label: t.ustaz_allowance },
    { id: 'quran_books', label: t.quran_books },
    { id: 'utilities', label: t.utilities },
    { id: 'maintenance', label: t.maintenance },
    { id: 'charity_iftaar', label: t.charity_iftaar },
    { id: 'administrative', label: t.administrative },
    { id: 'other', label: t.other },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amountETB) return;

    try {
      setIsSubmitting(true);
      await onAddExpense({
        title,
        category,
        amountETB: Number(amountETB),
        ethiopianDate: ethiopianDate || undefined,
        paidTo: paidTo || undefined,
        recordedBy: 'admin',
        createdAt: new Date().toISOString(),
      });

      setIsModalOpen(false);
      setTitle('');
      setPaidTo('');
    } catch (err: any) {
      alert(err?.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e.amountETB || 0), 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amountETB || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
            {t.expenses} ({filteredExpenses.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Waliigala baasii: <strong className="text-red-600 font-mono">{formatCurrencyETB(totalExpenseAmount)}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Baasii Galmeessi
        </button>
      </div>

      {/* Category breakdown pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {CATEGORIES.map((cat) => {
          const catSum = categoryTotals[cat.id] || 0;
          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`cursor-pointer p-3 rounded-2xl border transition text-xs ${
                selectedCategory === cat.id
                  ? 'bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-500 truncate">{cat.label}</div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrencyETB(catSum)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ibsa baasii ykn eenyuuf kaffalame barbaadi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">Garee Hunda (All Categories)</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">{t.expenseTitle}</th>
                <th className="py-3.5 px-4">{t.category}</th>
                <th className="py-3.5 px-4">{t.amount}</th>
                <th className="py-3.5 px-4">{t.paidTo}</th>
                <th className="py-3.5 px-4">Guyyaa / Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredExpenses.map((exp) => (
                <tr
                  key={exp.id || exp.title}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {exp.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                      {exp.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold font-mono text-red-600 dark:text-red-400">
                    {formatCurrencyETB(exp.amountETB)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {exp.paidTo || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {exp.ethiopianDate || new Date(exp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Baasiin hin argamne.
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Baasii Galmeessi (Record Expense)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Baasii giddu-gala Al-Furqaan oole galmeessaa
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Ibsa Baasii (Description) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="fkn. Mindaa Ustazootaa Fulbaana"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Garee Baasii (Category) *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Hanga Baasii (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amountETB}
                    onChange={(e) => setAmountETB(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 font-mono font-bold text-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Eenyuuf Kaffalame (Paid To)
                  </label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="fkn. Ustaz Abdullah"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Guyyaa / Ji’a Itiyoophiyaa
                  </label>
                  <input
                    type="text"
                    value={ethiopianDate}
                    onChange={(e) => setEthiopianDate(e.target.value)}
                    placeholder="fkn. Fulbaana 2017"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Galmaa’aa Jira...' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
