import React from 'react';

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  sublabel?: string;
  darkMode?: boolean;
}> = ({ label, value, icon, color, trend, sublabel, darkMode = false }) => (
  <div
    className={[
      'flex h-full flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-shadow duration-300 sm:p-5',
      darkMode
        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md',
    ].join(' ')}
  >
    <div className="flex items-start justify-between gap-2">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      {trend && (
        <span
          className={[
            'shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold',
            darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600',
          ].join(' ')}
        >
          {trend}
        </span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p
        className={[
          'mb-1 text-[10px] font-bold uppercase tracking-widest',
          darkMode ? 'text-slate-400' : 'text-slate-500',
        ].join(' ')}
      >
        {label}
      </p>
      <h3
        className={[
          'text-xl font-black tracking-tight sm:text-2xl',
          darkMode ? 'text-white' : 'text-slate-900',
        ].join(' ')}
      >
        {value}
      </h3>
      {sublabel && (
        <p
          className={[
            'mt-1 text-[11px] font-bold',
            darkMode ? 'text-slate-500' : 'text-slate-400',
          ].join(' ')}
        >
          {sublabel}
        </p>
      )}
    </div>
  </div>
);

export default StatCard;
