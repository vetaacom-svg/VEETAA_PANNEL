import React, { useMemo, useState, useCallback } from 'react';
import {
   DollarSign,
   Truck,
   TrendingUp,
   FileText,
   Image as ImageIcon,
   Download,
   Search,
   Wallet,
   CreditCard,
   CalendarRange,
} from 'lucide-react';
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
} from 'recharts';
import type { Order } from '../../../types';
import StatCard from '../components/StatCard';
import DeferRechartsMount from '../components/DeferRechartsMount';

export type FinanceDailyPoint = { dateKey: string; date: string; amount: number };

export type FinanceStatsShape = {
   revenue: number;
   deliveryFees: number;
   total: number;
   completedCount: number;
   completedOrders: Order[];
   dailyStats: FinanceDailyPoint[];
   paymentCash: { count: number; amount: number };
   paymentTransfer: { count: number; amount: number };
   avgBasket: number;
   periodLabel: string;
   trendVsPreviousPct: number | null;
};

export type FinancePeriodPreset = '7d' | '30d' | 'month' | 'all' | 'custom';

export type AdminFinancePanelProps = {
   darkMode?: boolean;
   financeStats: FinanceStatsShape;
   financePeriod: FinancePeriodPreset;
   onFinancePeriodChange: (p: FinancePeriodPreset) => void;
   financeCustomFrom: string;
   financeCustomTo: string;
   onFinanceCustomFromChange: (v: string) => void;
   onFinanceCustomToChange: (v: string) => void;
   onExportPdf: () => void;
   onViewReceipt: (src: string | null) => void;
};

function fmtDh(n: number): string {
   const v = Math.round(n * 100) / 100;
   return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`;
}

function orderGrand(o: Order): number {
   if (typeof o.total_final === 'number' && Number.isFinite(o.total_final)) return o.total_final;
   if (typeof o.total === 'number' && Number.isFinite(o.total)) return o.total;
   if (typeof o.total_products === 'number' && Number.isFinite(o.total_products)) return o.total_products;
   return 0;
}

const PERIOD_OPTIONS: { id: FinancePeriodPreset; label: string }[] = [
   { id: '7d', label: '7 j.' },
   { id: '30d', label: '30 j.' },
   { id: 'month', label: 'Mois' },
   { id: 'all', label: 'Tout' },
   { id: 'custom', label: 'Perso.' },
];

const AdminFinancePanel: React.FC<AdminFinancePanelProps> = ({
   darkMode = false,
   financeStats,
   financePeriod,
   onFinancePeriodChange,
   financeCustomFrom,
   financeCustomTo,
   onFinanceCustomFromChange,
   onFinanceCustomToChange,
   onExportPdf,
   onViewReceipt,
}) => {
   const [tableSearch, setTableSearch] = useState('');
   const [tableSort, setTableSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'client'>('date-desc');

   const filteredSortedOrders = useMemo(() => {
      const q = tableSearch.trim().toLowerCase();
      let list = [...financeStats.completedOrders];
      if (q) {
         list = list.filter(o => {
            const id = String(o.id).toLowerCase();
            const name = (o.customerName || '').toLowerCase();
            const phone = (o.phone || '').toLowerCase();
            return id.includes(q) || name.includes(q) || phone.includes(q);
         });
      }
      list.sort((a, b) => {
         if (tableSort === 'client') return (a.customerName || '').localeCompare(b.customerName || '', 'fr');
         if (tableSort === 'amount-desc') return orderGrand(b) - orderGrand(a);
         if (tableSort === 'amount-asc') return orderGrand(a) - orderGrand(b);
         if (tableSort === 'date-asc') return a.timestamp - b.timestamp;
         return b.timestamp - a.timestamp;
      });
      return list;
   }, [financeStats.completedOrders, tableSearch, tableSort]);

   const exportCsv = useCallback(() => {
      const rows = [
         ['ID', 'Date', 'Client', 'Téléphone', 'Paiement', 'Montant TTC (DH)'],
         ...financeStats.completedOrders.map(o => [
            String(o.id),
            new Date(o.timestamp).toLocaleString('fr-FR'),
            `"${(o.customerName || '').replace(/"/g, '""')}"`,
            o.phone || '',
            o.paymentMethod || o.payment_method || 'cash',
            String(orderGrand(o)),
         ]),
      ];
      const blob = new Blob([rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Veetaa_finance_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
   }, [financeStats.completedOrders]);

   const trendStr =
      financeStats.trendVsPreviousPct == null
         ? undefined
         : `${financeStats.trendVsPreviousPct >= 0 ? '+' : ''}${financeStats.trendVsPreviousPct}% vs période préc.`;

   const chartData = financeStats.dailyStats.map(d => ({
      ...d,
      shortDate: d.date.replace(/\//g, '.'),
   }));

   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-6">
         <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${darkMode ? 'border-slate-800 bg-slate-950/60 text-slate-100' : 'border-slate-100 bg-white'}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
               <div className="min-w-0">
                  <h3 className={`text-lg font-black uppercase tracking-tight sm:text-xl ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Chiffre d&apos;affaires</h3>
                  <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{financeStats.periodLabel}</p>
               </div>
               <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {PERIOD_OPTIONS.map(opt => (
                     <button
                        key={opt.id}
                        type="button"
                        onClick={() => onFinancePeriodChange(opt.id)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                           financePeriod === opt.id
                              ? 'bg-orange-500 text-white shadow-sm ring-1 ring-orange-500/30'
                              : darkMode
                                 ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-300/60 hover:text-orange-300'
                                 : 'border border-slate-200 bg-slate-50/80 text-slate-600 hover:border-orange-200 hover:bg-white hover:text-orange-600'
                        }`}
                     >
                        {opt.label}
                     </button>
                  ))}
               </div>
            </div>

            {financePeriod === 'custom' && (
               <div className={`mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-3 sm:p-4 ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
                  <CalendarRange className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400">Du</label>
                     <input
                        type="date"
                        value={financeCustomFrom}
                        onChange={e => onFinanceCustomFromChange(e.target.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white'}`}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400">Au</label>
                     <input
                        type="date"
                        value={financeCustomTo}
                        onChange={e => onFinanceCustomToChange(e.target.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white'}`}
                     />
                  </div>
               </div>
            )}

            <div className={`mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-4 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <button
                  type="button"
                  onClick={exportCsv}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors ${
                     darkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-300/60 hover:text-orange-300' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600'
                  }`}
               >
                  <Download size={15} strokeWidth={2.25} /> Export CSV
               </button>
               <button
                  type="button"
                  onClick={onExportPdf}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-orange-500 ${darkMode ? 'bg-slate-800' : 'bg-slate-900'}`}
               >
                  <FileText size={15} strokeWidth={2.25} /> Exporter PDF
               </button>
            </div>
         </section>

         <section aria-labelledby="finance-stats-heading">
            <h4 id="finance-stats-heading" className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
               Synthèse
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
               <StatCard
                  label="Ventes produits"
                  value={fmtDh(financeStats.revenue)}
                  icon={<DollarSign size={22} />}
                  color="bg-emerald-50 text-emerald-600"
                  darkMode={darkMode}
               />
               <StatCard
                  label="Frais livraison"
                  value={fmtDh(financeStats.deliveryFees)}
                  icon={<Truck size={22} />}
                  color="bg-blue-50 text-blue-600"
                  darkMode={darkMode}
               />
               <StatCard
                  label="Total TTC période"
                  value={fmtDh(financeStats.total)}
                  icon={<TrendingUp size={22} />}
                  color="bg-orange-50 text-orange-600"
                  trend={trendStr}
                  darkMode={darkMode}
               />
               <StatCard
                  label="Panier moyen"
                  value={fmtDh(financeStats.avgBasket)}
                  icon={<Wallet size={22} />}
                  color="bg-violet-50 text-violet-600"
                  darkMode={darkMode}
               />
            </div>

            <h4 className={`mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Paiements</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
               <div className="sm:col-span-1 lg:col-span-2">
                  <StatCard
                     label="Espèces"
                     value={fmtDh(financeStats.paymentCash.amount)}
                     sublabel={`${financeStats.paymentCash.count} commande${financeStats.paymentCash.count !== 1 ? 's' : ''}`}
                     icon={<Wallet size={22} />}
                     color="bg-slate-100 text-slate-700"
                     darkMode={darkMode}
                  />
               </div>
               <div className="sm:col-span-1 lg:col-span-2">
                  <StatCard
                     label="Virement"
                     value={fmtDh(financeStats.paymentTransfer.amount)}
                     sublabel={`${financeStats.paymentTransfer.count} commande${financeStats.paymentTransfer.count !== 1 ? 's' : ''}`}
                     icon={<CreditCard size={22} />}
                     color="bg-sky-50 text-sky-700"
                     darkMode={darkMode}
                  />
               </div>
            </div>
         </section>

         {chartData.length > 0 && (
            <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`} aria-labelledby="finance-chart-heading">
               <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h4 id="finance-chart-heading" className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                     CA par jour (TTC)
                  </h4>
                  <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{financeStats.periodLabel}</span>
               </div>
               <div className="h-52 w-full min-w-0 min-h-[208px] sm:h-56 sm:min-h-[224px]">
                  <DeferRechartsMount className="h-full w-full min-w-0">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 4 }} barCategoryGap={chartData.length <= 3 ? '35%' : '20%'}>
                           <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#f1f5f9'} vertical={false} />
                           <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={{ stroke: darkMode ? '#475569' : '#e2e8f0' }} tickLine={false} />
                           <YAxis tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} width={36} />
                           <Tooltip
                              formatter={(v: number) => [`${v.toLocaleString('fr-FR')} DH`, 'CA']}
                              labelFormatter={(_, p: any) => (p?.[0]?.payload?.date ? `Date : ${p[0].payload.date}` : '')}
                              contentStyle={{
                                 borderRadius: 12,
                                 border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                                 background: darkMode ? '#0f172a' : '#ffffff',
                                 color: darkMode ? '#e2e8f0' : '#0f172a',
                                 boxShadow: '0 4px 14px rgb(15 23 42 / 0.08)',
                              }}
                           />
                           <Bar dataKey="amount" fill="#f97316" radius={[6, 6, 0, 0]} name="CA" maxBarSize={56} />
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </section>
         )}

         <div className={`overflow-hidden rounded-2xl border shadow-sm animate-in fade-in duration-700 ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
            <div className={`flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <div>
                  <h4 className={`font-black text-xs uppercase tracking-widest ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Détails des ventes (livrées)</h4>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">{financeStats.periodLabel}</p>
               </div>
               <span className={`w-fit rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600'}`}>
                  {financeStats.completedCount} commande(s)
               </span>
            </div>

            <div className={`flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <div className="relative min-w-[200px] flex-1">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                     type="search"
                     placeholder="Rechercher client, ID, téléphone…"
                     value={tableSearch}
                     onChange={e => setTableSearch(e.target.value)}
                     className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm font-bold shadow-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/25 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white'}`}
                  />
               </div>
               <select
                  value={tableSort}
                  onChange={e => setTableSort(e.target.value as typeof tableSort)}
                  className={`rounded-xl border px-3 py-2.5 text-[11px] font-black uppercase ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 text-slate-700 bg-white'}`}
               >
                  <option value="date-desc">Date ↓</option>
                  <option value="date-asc">Date ↑</option>
                  <option value="amount-desc">Montant ↓</option>
                  <option value="amount-asc">Montant ↑</option>
                  <option value="client">Client A→Z</option>
               </select>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full min-w-[640px] text-left">
                  <thead className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                     <tr>
                        <th className="px-8 py-5">ID</th>
                        <th className="px-8 py-5">Date</th>
                        <th className="px-8 py-5">Client</th>
                        <th className="px-8 py-5">Méthode</th>
                        <th className="px-8 py-5">Reçu</th>
                        <th className="px-8 py-5 text-right">Montant TTC</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                     {filteredSortedOrders.map(o => (
                        <tr key={o.id} className={`group transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                           <td className={`px-8 py-5 font-black transition-colors ${darkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-400 group-hover:text-slate-900'}`}>
                              #{o.id}
                           </td>
                           <td className={`px-8 py-5 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{new Date(o.timestamp).toLocaleDateString('fr-FR')}</td>
                           <td className={`px-8 py-5 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{o.customerName}</td>
                           <td className={`px-8 py-5 text-[10px] font-bold uppercase ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {(o as any).paymentMethod || (o as any).payment_method || '—'}
                           </td>
                           <td className="px-8 py-5">
                              {(o.paymentMethod || o.payment_method) === 'transfer' && (o.paymentReceiptImage || o.payment_receipt_base64) ? (
                                 <button
                                    type="button"
                                    onClick={() => onViewReceipt(o.paymentReceiptImage || o.payment_receipt_base64 || null)}
                                    className={`flex items-center gap-2 rounded-xl p-2 transition-colors ${darkMode ? 'bg-blue-500/15 text-blue-300 hover:text-blue-200' : 'bg-blue-50 text-blue-600 hover:text-blue-800'}`}
                                    title="Voir le reçu"
                                 >
                                    <ImageIcon size={16} />
                                    <span className="text-[10px] font-black uppercase">Voir reçu</span>
                                 </button>
                              ) : (
                                 <span className={`text-[10px] italic ${darkMode ? 'text-slate-500' : 'text-slate-300'}`}>—</span>
                              )}
                           </td>
                           <td className="px-8 py-5 text-right font-black text-emerald-600">{fmtDh(orderGrand(o))}</td>
                        </tr>
                     ))}
                     {financeStats.completedCount === 0 && (
                        <tr>
                           <td colSpan={6} className={`px-8 py-20 text-center font-bold italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              Aucune commande livrée sur cette période.
                           </td>
                        </tr>
                     )}
                     {financeStats.completedCount > 0 && filteredSortedOrders.length === 0 && (
                        <tr>
                           <td colSpan={6} className={`px-8 py-12 text-center font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              Aucun résultat pour « {tableSearch} ».
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};

export default AdminFinancePanel;
