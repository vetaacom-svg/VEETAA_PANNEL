import React, { useCallback, useMemo } from 'react';
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   PieChart,
   Pie,
   Cell,
   Legend,
   ComposedChart,
   Line,
} from 'recharts';
import type { Order, Driver, UserProfile, Store } from '../../../types';
import type { AnalyticsPeriodPreset, AnalyticsPanelData } from '../../../lib/analyticsStats';
import type { AdminLeaderboardRow } from '../../../lib/adminActivity';
import StatisticsMapComponent from '../components/StatisticsMapComponent';
import DeferRechartsMount from '../components/DeferRechartsMount';
import StatCard from '../components/StatCard';
import {
   BarChart3,
   CalendarRange,
   Download,
   FileText,
   Store as StoreIcon,
   TrendingUp,
   Users,
   UserCog,
   Clock,
   ShoppingBag,
   Truck,
   Package,
} from 'lucide-react';

const PERIOD_OPTIONS: { id: AnalyticsPeriodPreset; label: string }[] = [
   { id: '7d', label: '7 j.' },
   { id: '30d', label: '30 j.' },
   { id: 'month', label: 'Mois' },
   { id: 'all', label: 'Tout' },
   { id: 'custom', label: 'Perso.' },
];

export type AdminStatisticsPanelProps = {
   darkMode?: boolean;
   analytics: AnalyticsPanelData;
   statsPeriod: AnalyticsPeriodPreset;
   onStatsPeriodChange: (p: AnalyticsPeriodPreset) => void;
   statsCustomFrom: string;
   statsCustomTo: string;
   onStatsCustomFromChange: (v: string) => void;
   onStatsCustomToChange: (v: string) => void;
   statsStoreFilter: string | 'all';
   onStatsStoreFilterChange: (v: string | 'all') => void;
   statsStoreOptions: string[];
   adminLeaderboard: AdminLeaderboardRow[];
   orders: Order[];
   drivers: Driver[];
   users: UserProfile[];
   stores: Store[];
   onExportPdf: () => void;
};

function fmtDh(n: number): string {
   const v = Math.round(n * 100) / 100;
   return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`;
}

const PIE_OK = '#10b981';
const PIE_BAD = '#ef4444';
const COLORS_BAR = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

const AdminStatisticsPanel: React.FC<AdminStatisticsPanelProps> = ({
   darkMode = false,
   analytics: a,
   statsPeriod,
   onStatsPeriodChange,
   statsCustomFrom,
   statsCustomTo,
   onStatsCustomFromChange,
   onStatsCustomToChange,
   statsStoreFilter,
   onStatsStoreFilterChange,
   statsStoreOptions,
   adminLeaderboard,
   orders,
   drivers,
   users,
   stores,
   onExportPdf,
}) => {
   const chartData = useMemo(
      () => a.seriesPoints.map(p => ({ ...p, caK: Math.round(p.ca / 100) / 10 })),
      [a.seriesPoints]
   );

   const exportCsv = useCallback(() => {
      const rows: string[][] = [
         ['Rapport Analytics Veetaa'],
         ['Période', a.periodLabel],
         ['Filtre magasin', statsStoreFilter === 'all' ? 'Tous' : statsStoreFilter],
         [],
         ['Indicateur', 'Valeur'],
         ['Commandes', String(a.totalOrdersInRange)],
         ['Panier moyen (livrées DH)', String(a.basketAvgDelivered)],
         ['Temps moy. livraison (h)', a.avgDeliveryHours != null ? String(a.avgDeliveryHours) : ''],
         ['Clients nouveaux', String(a.newClients)],
         ['Clients récurrents', String(a.returningClients)],
         ['Taux réachat %', a.repurchaseRatePct != null ? String(a.repurchaseRatePct) : ''],
         ['Tendance cmd %', a.trendVentesPct != null ? String(a.trendVentesPct) : ''],
         ['Tendance CA %', a.trendCaPct != null ? String(a.trendCaPct) : ''],
         [],
         ['Date / période', 'Commandes', 'CA livré DH'],
         ...a.seriesPoints.map(p => [p.name, String(p.ventes), String(p.ca)]),
         [],
         ['Top admins', 'Événements'],
         ...adminLeaderboard.map(r => [r.label, String(r.count)]),
         [],
         ['Magasin', 'CA livré DH'],
         ...a.topStoresCa.map(x => [x.name, String(x.value)]),
         [],
         ['Produit', 'Qté vendue (livrées)'],
         ...a.topProducts.map(p => [p.name, String(p.value)]),
      ];
      const blob = new Blob([rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = `Veetaa_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
      el.click();
      URL.revokeObjectURL(url);
   }, [a, adminLeaderboard, statsStoreFilter]);

   const trendCmd =
      a.trendVentesPct == null ? undefined : `${a.trendVentesPct >= 0 ? '+' : ''}${a.trendVentesPct}% vs période préc.`;
   const trendCa =
      a.trendCaPct == null ? undefined : `${a.trendCaPct >= 0 ? '+' : ''}${a.trendCaPct}% CA vs période préc.`;

   return (
      <div className="space-y-6 animate-in slide-in-from-bottom-6">
         <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${darkMode ? 'border-slate-800 bg-slate-950/60 text-slate-100' : 'border-slate-100 bg-white'}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
               <div>
                  <h3 className={`text-lg font-black uppercase tracking-tight sm:text-xl ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Analytics</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{a.periodLabel}</p>
               </div>
               <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {PERIOD_OPTIONS.map(opt => (
                     <button
                        key={opt.id}
                        type="button"
                        onClick={() => onStatsPeriodChange(opt.id)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                           statsPeriod === opt.id
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

            {statsPeriod === 'custom' && (
               <div className={`mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-3 sm:p-4 ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
                  <CalendarRange className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400">Du</label>
                     <input
                        type="date"
                        value={statsCustomFrom}
                        onChange={e => onStatsCustomFromChange(e.target.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-orange-400 ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white'}`}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400">Au</label>
                     <input
                        type="date"
                        value={statsCustomTo}
                        onChange={e => onStatsCustomToChange(e.target.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm outline-none focus:border-orange-400 ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white'}`}
                     />
                  </div>
               </div>
            )}

            <div className={`mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <div className="flex items-center gap-2">
                  <StoreIcon className={`h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <select
                     value={statsStoreFilter}
                     onChange={e => onStatsStoreFilterChange(e.target.value === 'all' ? 'all' : e.target.value)}
                     className={`max-w-[220px] rounded-xl border px-3 py-2 text-[11px] font-black uppercase shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                     <option value="all">Tous les magasins</option>
                     {statsStoreOptions.map(s => (
                        <option key={s} value={s}>
                           {s}
                        </option>
                     ))}
                  </select>
               </div>
               <div className="flex flex-wrap justify-end gap-2">
                  <button
                     type="button"
                     onClick={exportCsv}
                     className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-300/60 hover:text-orange-300' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600'}`}
                  >
                     <Download size={15} /> Export CSV
                  </button>
                  <button
                     type="button"
                     onClick={onExportPdf}
                     className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-orange-500 ${darkMode ? 'bg-slate-800' : 'bg-slate-900'}`}
                  >
                     <FileText size={15} /> Exporter PDF
                  </button>
               </div>
            </div>
         </section>

         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <StatCard
               label="Commandes (période)"
               value={a.totalOrdersInRange}
               icon={<ShoppingBag size={22} />}
               color="bg-slate-100 text-slate-800"
               trend={trendCmd}
               darkMode={darkMode}
            />
            <StatCard
               label="Panier moyen (livrées)"
               value={fmtDh(a.basketAvgDelivered)}
               icon={<TrendingUp size={22} />}
               color="bg-orange-50 text-orange-600"
               trend={trendCa}
               darkMode={darkMode}
            />
            <StatCard
               label="Délai moyen → livraison"
               value={a.avgDeliveryHours != null ? `${a.avgDeliveryHours} h` : '—'}
               icon={<Clock size={22} />}
               color="bg-blue-50 text-blue-600"
               darkMode={darkMode}
            />
            <StatCard
               label="Taux réachat (période)"
               value={a.repurchaseRatePct != null ? `${a.repurchaseRatePct} %` : '—'}
               icon={<Users size={22} />}
               color="bg-violet-50 text-violet-600"
               sublabel={`${a.newClients} nouv. · ${a.returningClients} récurrents`}
               darkMode={darkMode}
            />
         </div>

         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <div className="mb-4 flex items-center justify-between gap-2">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Commandes & CA livré</h4>
                  <BarChart3 className="h-4 w-4 text-orange-500" />
               </div>
               <p className="mb-3 text-[10px] font-bold text-slate-400">
                  Barres = commandes · Ligne = CA (kDH) — échelle droite
               </p>
               <div className="h-[320px] min-h-[320px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                           <YAxis
                              yAxisId="left"
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                           />
                           <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 10, fill: '#94a3b8' }}
                              axisLine={false}
                              tickLine={false}
                              label={{ value: 'CA (kDH)', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 9 }}
                           />
                           <Tooltip
                              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                              formatter={(value: number, name: string) =>
                                 name === 'caK' ? [`${(value * 1000).toLocaleString('fr-FR')} DH`, 'CA livré'] : [value, 'Commandes']
                              }
                           />
                           <Bar yAxisId="left" dataKey="ventes" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={48} name="Commandes" />
                           <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="caK"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#f97316' }}
                              name="CA (kDH)"
                           />
                           <Legend wrapperStyle={{ fontSize: 10 }} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>

            <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-2 font-black text-xs uppercase tracking-widest text-slate-800">Heatmap d&apos;activité</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Commandes & ressources (non filtré par période)</p>
               <div className="h-[320px] min-h-[320px] w-full min-w-0">
                  <StatisticsMapComponent orders={orders} drivers={drivers} users={users} stores={stores} />
               </div>
            </div>
         </div>

         <div className={`rounded-2xl border p-4 sm:p-5 ${darkMode ? 'border-amber-900/30 bg-amber-900/10' : 'border-amber-100 bg-amber-50/40'}`}>
            <div className="mb-3 flex items-center gap-2">
               <UserCog className="h-5 w-5 text-amber-700" />
               <h4 className="font-black text-xs uppercase tracking-widest text-amber-900">Top 7 — activité admins</h4>
            </div>
            <p className="mb-4 text-[10px] font-bold text-amber-800/80">
               Compte les actions enregistrées (statut commande, assignation livreur, produits, support, session). Exécutez{' '}
               <code className="rounded bg-white/80 px-1">docs/supabase_admin_activity.sql</code> dans Supabase pour agréger tous
               les postes.
            </p>
            {adminLeaderboard.length === 0 ? (
               <p className="text-sm font-bold text-amber-900/70">Aucune donnée sur cette période — créez la table ou effectuez des actions connecté.</p>
            ) : (
               <div className="h-[280px] min-h-[280px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart
                           data={adminLeaderboard.map(r => ({ name: r.label.length > 28 ? `${r.label.slice(0, 26)}…` : r.label, count: r.count }))}
                           layout="vertical"
                           margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                        >
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis
                              dataKey="name"
                              type="category"
                              width={200}
                              tick={{ fontSize: 9, fill: '#451a03' }}
                              axisLine={false}
                              tickLine={false}
                           />
                           <Tooltip />
                           <Bar dataKey="count" fill="#d97706" radius={[0, 6, 6, 0]} barSize={18} name="Événements" />
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            )}
         </div>

         <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-1 font-black text-xs uppercase tracking-widest text-slate-800">Magasins — volume</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Top 5 par nombre de commandes</p>
               <div className="h-[260px] min-h-[260px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={a.topStoresCount} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                              {a.topStoresCount.map((_, i) => (
                                 <Cell key={`ts-${i}`} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>

            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-1 font-black text-xs uppercase tracking-widest text-slate-800">Magasins — CA livré</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Top 5 (DH)</p>
               <div className="h-[260px] min-h-[260px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={a.topStoresCa} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                           <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-FR')} DH`, 'CA']} />
                           <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-1 font-black text-xs uppercase tracking-widest text-slate-800">Taux livraison (synthèse)</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Livrées vs refus / indisponible</p>
               <div className="h-[280px] min-h-[280px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                           <Pie
                              data={a.successRateStats}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={88}
                              paddingAngle={4}
                              dataKey="value"
                              label={props => {
                                 const { percent } = props as { percent: number };
                                 return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
                              }}
                              labelLine={false}
                           >
                              <Cell fill={PIE_OK} />
                              <Cell fill={PIE_BAD} />
                           </Pie>
                           <Tooltip />
                           <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>

            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-1 font-black text-xs uppercase tracking-widest text-slate-800">Répartition des statuts</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Commandes sur la période filtrée</p>
               <div className="h-[280px] min-h-[280px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={a.statusBreakdown} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <h4 className="mb-1 font-black text-xs uppercase tracking-widest text-slate-800">Clients fidèles</h4>
               <p className="mb-4 text-[10px] font-bold text-slate-400">Top 5 commandes sur la période</p>
               <div className="h-[280px] min-h-[280px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={a.loyalClients} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                              {a.loyalClients.map((_, i) => (
                                 <Cell key={`lc-${i}`} fill={['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'][i % 5]} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>

            <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
               <div className="mb-4 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-600" />
                  <div>
                     <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Top livreurs</h4>
                     <p className="text-[10px] font-bold text-slate-400">Livraisons livrées (période)</p>
                  </div>
               </div>
               <div className="h-[280px] min-h-[280px] w-full min-w-0">
                  <DeferRechartsMount className="h-full w-full">
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={a.topDrivers} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                     </ResponsiveContainer>
                  </DeferRechartsMount>
               </div>
            </div>
         </div>

         <div className={`rounded-2xl border p-6 shadow-sm ${darkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'}`}>
            <div className="mb-4 flex items-center gap-2">
               <Package className="h-4 w-4 text-orange-600" />
               <div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Top produits</h4>
                  <p className="text-[10px] font-bold text-slate-400">Quantités sur commandes livrées (période)</p>
               </div>
            </div>
            <div className="h-[300px] min-h-[300px] w-full min-w-0">
               <DeferRechartsMount className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                     <BarChart data={a.topProducts} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={18} />
                     </BarChart>
                  </ResponsiveContainer>
               </DeferRechartsMount>
            </div>
         </div>
      </div>
   );
};

export default AdminStatisticsPanel;
