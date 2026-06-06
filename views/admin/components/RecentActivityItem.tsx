import React from 'react';
import type { Order } from '../../../types';

const RecentActivityItem: React.FC<{ order: Order; darkMode?: boolean }> = ({ order, darkMode = false }) => (
  <div
    className={[
      'flex items-center justify-between p-3 rounded-xl transition-colors border',
      darkMode
        ? 'hover:bg-slate-800/60 border-transparent'
        : 'hover:bg-slate-50 border-transparent hover:border-slate-100 group',
    ].join(' ')}
  >
    <div className="flex items-center gap-3">
      <div
        className={[
          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
          darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400',
        ].join(' ')}
      >
        {order.customerName?.[0] || '?'}
      </div>
      <div className="flex flex-col">
        <p
          className={[
            'text-xs font-bold leading-none mb-1',
            darkMode ? 'text-slate-200' : 'text-slate-700',
          ].join(' ')}
        >
          {order.customerName}
        </p>
        <p className={['text-[10px] font-medium', darkMode ? 'text-slate-400' : 'text-slate-400'].join(' ')}>
          #{order.id.toString().slice(-4)} • {Math.floor((Date.now() - (order.timestamp || Date.now())) / 60000)} min
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className={['text-xs font-bold', darkMode ? 'text-white' : 'text-slate-900'].join(' ')}>
        {order.total_final || order.total} DH
      </p>
      <div className="flex items-center gap-1 justify-end">
        <div
          className={`w-1.5 h-1.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-500' : 'bg-orange-500'}`}
        />
        <p className={['text-[9px] font-bold uppercase tracking-wider', darkMode ? 'text-slate-300' : 'text-slate-500'].join(' ')}>
          {order.status}
        </p>
      </div>
    </div>
  </div>
);

export default RecentActivityItem;
