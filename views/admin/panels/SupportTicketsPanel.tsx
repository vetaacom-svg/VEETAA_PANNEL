import React from 'react';
import { Trash2, RotateCw } from 'lucide-react';
import type { SupportTicket } from '../../../types';

export type SupportTicketsPanelProps = {
  supportFilter: 'all' | 'pending' | 'resolved';
  onSupportFilterChange: (f: 'all' | 'pending' | 'resolved') => void;
  selectedTicketIds: string[];
  filteredTickets: SupportTicket[];
  supportTickets: SupportTicket[];
  onSelectAllTickets: () => void;
  onDeleteSelectedTickets: () => void;
  onToggleTicketSelection: (id: string) => void;
  onOpenTicket: (t: SupportTicket) => void;
  onRefresh: () => void;
  darkMode?: boolean;
};

const SupportTicketsPanel: React.FC<SupportTicketsPanelProps> = React.memo(
  ({
    supportFilter,
    onSupportFilterChange,
    selectedTicketIds,
    filteredTickets,
    supportTickets,
    onSelectAllTickets,
    onDeleteSelectedTickets,
    onToggleTicketSelection,
    onOpenTicket,
    onRefresh,
    darkMode = false,
  }) => (
    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase">Tickets Support</h3>
        <div className="flex gap-2 flex-wrap">
          {selectedTicketIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={onSelectAllTickets}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all bg-indigo-500 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-95"
              >
                {selectedTicketIds.length === filteredTickets.length ? 'Tout Désélectionner' : 'Tout Sélectionner'}
              </button>
              <button
                type="button"
                onClick={onDeleteSelectedTickets}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 active:scale-95"
              >
                <Trash2 size={14} /> Supprimer ({selectedTicketIds.length})
              </button>
            </>
          )}
          {selectedTicketIds.length === 0 && (
            <button
              type="button"
              onClick={onSelectAllTickets}
                className={[
                  'px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all active:scale-95',
                  darkMode ? 'bg-white/5 text-slate-200 border border-slate-800 hover:bg-white/10' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
                ].join(' ')}
            >
              Tout Sélectionner
            </button>
          )}
          <button
            type="button"
            onClick={() => onSupportFilterChange('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                supportFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : darkMode
                    ? 'bg-white/5 text-slate-200 border border-slate-800 hover:bg-white/10'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => onSupportFilterChange('pending')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                supportFilter === 'pending'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : darkMode
                    ? 'bg-white/5 text-slate-200 border border-slate-800 hover:bg-white/10'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            En Attente
          </button>
          <button
            type="button"
            onClick={() => onSupportFilterChange('resolved')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                supportFilter === 'resolved'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                  : darkMode
                    ? 'bg-white/5 text-slate-200 border border-slate-800 hover:bg-white/10'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Résolus
          </button>
          <button
            type="button"
            onClick={onRefresh}
              className={[
                'p-2.5 rounded-xl transition-all active:scale-95',
                darkMode ? 'bg-white/5 border border-slate-800 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ].join(' ')}
            title="Actualiser"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>
      <div
        className={[
          'rounded-2xl shadow-sm overflow-hidden',
          darkMode ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-200',
        ].join(' ')}
      >
        <table className="w-full text-left">
          <thead
            className={[
              'text-[10px] font-bold uppercase tracking-widest border-b',
              darkMode ? 'bg-slate-900/60 text-slate-300 border-slate-800' : 'bg-slate-50/50 text-slate-500 border-slate-200',
            ].join(' ')}
          >
            <tr>
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedTicketIds.length === filteredTickets.length && filteredTickets.length > 0}
                  onChange={onSelectAllTickets}
                  className={[
                    'w-4 h-4 rounded border cursor-pointer focus:ring-indigo-500',
                    darkMode ? 'border-slate-700 text-indigo-300 bg-slate-900' : 'border-slate-300 text-indigo-600',
                  ].join(' ')}
                />
              </th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Livreur</th>
              <th className="px-6 py-4">Sujet</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredTickets.map(t => (
              <tr
                key={t.id}
                className={[
                  'transition-colors',
                  darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50/80',
                ].join(' ')}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTicketIds.includes(t.id)}
                    onChange={() => onToggleTicketSelection(t.id)}
                    className={[
                      'w-4 h-4 rounded border cursor-pointer focus:ring-indigo-500',
                      darkMode ? 'border-slate-700 text-indigo-300 bg-slate-900' : 'border-slate-300 text-indigo-600',
                    ].join(' ')}
                  />
                </td>
                <td className="px-6 py-4">
                  <span className={['font-bold text-[11px]', darkMode ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={['font-bold text-[11px]', darkMode ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                      {t.driver_name || 'Inconnu'}
                    </span>
                    <span className={['text-[9px] font-medium', darkMode ? 'text-slate-400' : 'text-slate-400'].join(' ')}>
                      {t.driver_phone}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={['font-medium text-sm line-clamp-2', darkMode ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
                    {t.description}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={[
                      'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border',
                      t.status === 'resolved'
                        ? darkMode
                          ? 'bg-emerald-950/35 text-emerald-200 border-emerald-200/20'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : darkMode
                          ? 'bg-orange-950/35 text-orange-200 border-orange-200/20'
                          : 'bg-orange-50 text-orange-600 border-orange-100',
                    ].join(' ')}
                  >
                    {t.status === 'resolved' ? 'Résolu' : 'En attente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenTicket(t)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-orange-600 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    {t.status === 'resolved' ? 'Voir' : 'Répondre'}
                  </button>
                </td>
              </tr>
            ))}
            {supportTickets.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className={[
                    'px-6 py-10 text-center italic font-bold',
                    darkMode ? 'text-slate-300' : 'text-slate-400',
                  ].join(' ')}
                >
                  Aucun ticket de support.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
);

SupportTicketsPanel.displayName = 'SupportTicketsPanel';

export default SupportTicketsPanel;
