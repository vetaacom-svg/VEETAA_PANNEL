import React from 'react';
import { Users, Truck, Package, ShoppingBag, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Order } from '../../../types';
import StatCard from '../components/StatCard';
import RecentActivityItem from '../components/RecentActivityItem';
import DeferRechartsMount from '../components/DeferRechartsMount';

export type WeeklyDatum = { name: string; ventes: number };

export type AdminOverviewPanelProps = {
  dashboardOverviewStats: { clients: number; drivers: number; products: number };
  orders: Order[];
  weeklyData: WeeklyDatum[];
  monthRevenueTotal: number;
  onGoToOrders: () => void;
  darkMode?: boolean;
};

const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({
  dashboardOverviewStats,
  orders,
  weeklyData,
  monthRevenueTotal,
  onGoToOrders,
  darkMode = false,
}) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Clients"
        value={dashboardOverviewStats.clients}
        icon={<Users size={20} />}
        darkMode={darkMode}
        color={darkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}
        trend="+5%"
      />
      <StatCard
        label="Livreurs"
        value={dashboardOverviewStats.drivers}
        icon={<Truck size={20} />}
        darkMode={darkMode}
        color={darkMode ? 'bg-emerald-900/35 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}
        trend="+2"
      />
      <StatCard
        label="Commandes"
        value={orders.length}
        icon={<Package size={20} />}
        darkMode={darkMode}
        color={darkMode ? 'bg-orange-900/35 text-orange-300' : 'bg-orange-50 text-orange-600'}
        trend="+18%"
      />
      <StatCard
        label="Produits"
        value={dashboardOverviewStats.products}
        icon={<ShoppingBag size={20} />}
        darkMode={darkMode}
        color={darkMode ? 'bg-blue-900/35 text-blue-300' : 'bg-blue-50 text-blue-600'}
        trend="+12"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div
        className={[
          'lg:col-span-2 p-6 rounded-2xl border shadow-sm',
          darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200',
        ].join(' ')}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3
              className={[
                'font-bold text-sm uppercase tracking-widest',
                darkMode ? 'text-slate-200' : 'text-slate-700',
              ].join(' ')}
            >
              Évolution des Ventes
            </h3>
            <p
              className={[
                'text-[10px] font-medium uppercase mt-0.5',
                darkMode ? 'text-slate-400' : 'text-slate-400',
              ].join(' ')}
            >
              7 derniers jours
            </p>
          </div>
          <div
            className={[
              'text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded',
              darkMode ? 'text-slate-300 bg-slate-800' : 'text-slate-400 bg-slate-50',
            ].join(' ')}
          >
            <div className={['w-1.5 h-1.5 rounded-full', darkMode ? 'bg-slate-600' : 'bg-slate-300'].join(' ')} />
            COMMANDES
          </div>
        </div>
        <div className="mt-2 h-[300px] w-full min-w-0 min-h-[300px]">
          <DeferRechartsMount className="h-full w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={darkMode ? '#334155' : '#f1f5f9'}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: darkMode ? '#94a3b8' : '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: darkMode ? '#94a3b8' : '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: darkMode ? '#0b1227' : '#f8fafc', radius: 4 }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: darkMode ? '0 10px 25px -10px rgb(0 0 0 / 0.6)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    padding: '10px',
                    background: darkMode ? '#0f172a' : '#ffffff',
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#e2e8f0' : '#0f172a' }}
                  labelStyle={{
                    fontSize: '10px',
                    color: darkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    fontWeight: '800',
                  }}
                />
                <Bar dataKey="ventes" radius={[4, 4, 0, 0]} barSize={24} fill="#F97316" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </DeferRechartsMount>
        </div>
      </div>

      <div
        className={[
          'p-6 rounded-2xl border shadow-sm flex flex-col',
          darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200',
        ].join(' ')}
      >
        <div className="flex justify-between items-center mb-5">
          <h3
            className={[
              'font-bold text-sm uppercase tracking-widest',
              darkMode ? 'text-slate-200' : 'text-slate-700',
            ].join(' ')}
          >
            Activités
          </h3>
          <button
            type="button"
            onClick={onGoToOrders}
            className={['text-[10px] font-bold hover:underline', darkMode ? 'text-orange-300' : 'text-orange-600'].join(' ')}
          >
            Voir tout
          </button>
        </div>
        <div className="space-y-1 flex-1 overflow-y-auto pr-1">
          {orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
              <Clock size={24} className="mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Aucune donnée</p>
            </div>
          ) : (
            orders
              .slice()
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
              .map(order => <RecentActivityItem key={order.id} order={order} darkMode={darkMode} />)
          )}
        </div>
        <div className={['mt-5 pt-5 border-t', darkMode ? 'border-slate-800' : 'border-slate-100'].join(' ')}>
          <div className="flex items-center justify-between">
            <div>
              <p
                className={[
                  'text-[10px] font-bold uppercase tracking-widest leading-none',
                  darkMode ? 'text-slate-400' : 'text-slate-400',
                ].join(' ')}
              >
                Ventes (Mois)
              </p>
              <h4 className={['text-lg font-black mt-1', darkMode ? 'text-white' : 'text-slate-800'].join(' ')}>
                {monthRevenueTotal.toLocaleString()} DH
              </h4>
            </div>
            <div className={['text-[10px] font-bold px-2 py-1 rounded-lg', darkMode ? 'text-emerald-300 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50'].join(' ')}>
              +12.5%
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AdminOverviewPanel;
