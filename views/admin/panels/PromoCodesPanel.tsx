import React from 'react';
import { Plus, Ticket, Check, TrendingUp, Edit3, Trash2 } from 'lucide-react';
import type { PromoCode } from '../../../types';

export type PromoCodesPanelProps = {
  promoCodes: PromoCode[];
  darkMode?: boolean;
  onOpenCreate: () => void;
  onEdit: (promo: PromoCode) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
};

const PromoCodesPanel: React.FC<PromoCodesPanelProps> = React.memo(
  ({ promoCodes, darkMode = false, onOpenCreate, onEdit, onDelete, onToggleActive }) => (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Gestion des Codes Promo</h2>
        <button
          type="button"
          onClick={onOpenCreate}
          className={`flex items-center gap-2 shadow-lg text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-orange-600 hover:to-orange-500 active:scale-95 transition-all ${darkMode ? 'bg-gradient-to-r from-slate-800 to-slate-700 shadow-slate-900/30' : 'bg-gradient-to-r from-slate-900 to-slate-800 shadow-slate-900/20'}`}
        >
          <Plus size={16} /> Nouveau Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">📌 Total Codes</p>
              <h3 className="text-4xl font-black text-blue-900 mt-3">{promoCodes.length}</h3>
            </div>
            <div className="p-3.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30">
              <Ticket size={22} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✓ Actifs</p>
              <h3 className="text-4xl font-black text-emerald-900 mt-3">
                {promoCodes.filter(p => p.is_active && p.current_uses < p.max_uses).length}
              </h3>
            </div>
            <div className="p-3.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/30">
              <Check size={22} />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">📊 Utilisations</p>
              <h3 className="text-4xl font-black text-orange-900 mt-3">
                {promoCodes.reduce((sum, p) => sum + p.current_uses, 0)}
              </h3>
            </div>
            <div className="p-3.5 bg-orange-600 rounded-xl text-white shadow-lg shadow-orange-600/30">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {promoCodes.length === 0 ? (
          <div className={`lg:col-span-2 rounded-2xl border shadow-sm p-16 text-center ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 rounded-2xl w-fit mx-auto mb-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <Ticket size={48} className="text-slate-400" />
            </div>
            <p className={`font-black uppercase tracking-widest text-lg ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Aucun code promo créé</p>
            <p className={`text-[10px] mt-3 uppercase tracking-widest font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Cliquez sur &quot;Nouveau Code&quot; pour en ajouter un à votre catalogue
            </p>
          </div>
        ) : (
          promoCodes.map(promo => {
            const usagePercent = promo.max_uses > 0 ? Math.min(100, (promo.current_uses / promo.max_uses) * 100) : 0;
            const isFull = promo.max_uses > 0 && promo.current_uses >= promo.max_uses;
            const isExpired = promo.is_active === false || isFull;

            return (
              <div
                key={promo.id}
                className={`rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-5 group ${isExpired ? 'opacity-60' : ''} ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`p-3.5 rounded-xl shadow-md ${promo.type === 'percentage' ? 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600' : 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600'}`}
                    >
                      <Ticket size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Code Promo</p>
                      <h4 className={`text-2xl font-black mt-1.5 truncate font-mono tracking-wider ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{promo.code}</h4>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEdit(promo)}
                      className={`p-2.5 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:text-orange-300 hover:bg-slate-900' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                      title="Modifier"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(promo.id)}
                      className={`p-2.5 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:text-red-300 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={`border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">💰 Valeur</p>
                    <p className={`text-3xl font-black mt-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} DH`}
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ${promo.type === 'percentage' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
                  >
                    {promo.type === 'percentage' ? '% Remise' : 'Montant'}
                  </div>
                </div>

                {(promo.min_order_amount || 0) > 0 && (
                  <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">🛒 Commande Minimale</p>
                    <p className={`text-lg font-black mt-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{promo.min_order_amount} DH</p>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">📈 Utilisation</p>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                      {promo.current_uses} / {promo.max_uses}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden shadow-inset ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full transition-all duration-1000 shadow-lg ${isFull ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className={`text-[8px] font-bold text-right ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{Math.round(usagePercent)}% utilisé</p>
                </div>

                <div className={`flex items-center justify-between pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[8px] font-black text-red-700 uppercase tracking-widest">Expiré</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 rounded-lg border border-emerald-200 shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Actif</span>
                      </div>
                    )}
                  </div>
                  <div className="bauble_box">
                    <input
                      className="bauble_input"
                      id={`promo-active-${promo.id}`}
                      type="checkbox"
                      checked={promo.is_active && !isFull}
                      disabled={isFull}
                      onChange={() => onToggleActive(promo.id, promo.is_active)}
                    />
                    <label className="bauble_label" htmlFor={`promo-active-${promo.id}`} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  )
);

PromoCodesPanel.displayName = 'PromoCodesPanel';

export default PromoCodesPanel;
