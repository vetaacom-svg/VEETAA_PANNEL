import React from 'react';
import { Users, Mail, Edit3, Trash2 } from 'lucide-react';
import type { PartnerAccount, PartnerStoreAccess, Store } from '../../../types';

export type PartnersMgmtPanelProps = {
  partnerAccounts: PartnerAccount[];
  partnerStoreAccess: PartnerStoreAccess[];
  stores: Store[];
  darkMode?: boolean;
  onOpenCreate: () => void;
  onEdit: (partner: PartnerAccount, storeIds: string[]) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
};

const PartnersMgmtPanel: React.FC<PartnersMgmtPanelProps> = React.memo(
  ({ partnerAccounts, partnerStoreAccess, stores, darkMode = false, onOpenCreate, onEdit, onToggleActive, onDelete }) => (
    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onOpenCreate}
          className={`flex items-center gap-2 shadow-lg text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all ${
            darkMode
              ? 'bg-gradient-to-r from-slate-800 to-slate-700 shadow-slate-900/30 hover:from-orange-600 hover:to-orange-500'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20'
          }`}
        >
          <Users size={16} /> Nouveau Compte Partenaire
        </button>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <table className="w-full text-left">
          <thead className={`text-[10px] font-bold uppercase tracking-widest border-b ${darkMode ? 'bg-slate-900/50 text-slate-300 border-slate-800' : 'bg-slate-50/50 text-slate-500 border-slate-200'}`}>
            <tr>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Boutiques Associées</th>
              <th className="px-6 py-4">Permissions</th>
              <th className="px-6 py-4 text-center">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {partnerAccounts.map(partner => {
              const accessList = partnerStoreAccess.filter(a => a.partner_id === partner.id);
              const storeNames = accessList.map(a => {
                const s = stores.find(st => String(st.id) === String(a.store_id));
                return s?.name || 'Inconnue';
              });
              const perms = (partner.permissions || {}) as PartnerAccount['permissions'] & {
                manage_stores?: boolean;
                manage_reports?: boolean;
              };
              return (
                <tr key={partner.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'} ${!partner.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shrink-0 ${darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                        <Mail size={16} />
                      </div>
                      <span className={`font-bold text-[11px] ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{partner.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {storeNames.length > 0 ? (
                        storeNames.map((name, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-orange-100"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className={`italic text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Aucune</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {perms.manage_products && (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-indigo-100">
                          Produits
                        </span>
                      )}
                      {perms.manage_orders && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-blue-100">
                          Commandes
                        </span>
                      )}
                      {perms.view_stats && (
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-purple-100">
                          Stats
                        </span>
                      )}
                      {perms.edit_profile && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-amber-100">
                          Profil
                        </span>
                      )}
                      {perms.manage_stores && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-100">
                          Boutiques
                        </span>
                      )}
                      {perms.manage_reports && (
                        <span className="px-2.5 py-1 bg-pink-50 text-pink-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-pink-100">
                          Rapports
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="bauble_box flex justify-center">
                      <input
                        className="bauble_input"
                        id={`partner-active-${partner.id}`}
                        type="checkbox"
                        checked={partner.is_active}
                        onChange={() => onToggleActive(partner.id, partner.is_active)}
                      />
                      <label className="bauble_label" htmlFor={`partner-active-${partner.id}`} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(partner, accessList.map(a => a.store_id))}
                        className={`p-2 border rounded-lg active:scale-95 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        title="Modifier"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(partner.id)}
                        className={`p-2 border rounded-lg active:scale-95 transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-red-300 hover:bg-red-900/20 hover:text-red-200 hover:border-red-500/30' : 'bg-white border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {partnerAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className={`px-6 py-10 text-center italic font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Aucun compte partenaire créé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
);

PartnersMgmtPanel.displayName = 'PartnersMgmtPanel';

export default PartnersMgmtPanel;
