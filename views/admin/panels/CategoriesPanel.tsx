import React from 'react';
import { Plus, Image as ImageIcon, Edit3, Trash2, ListTree } from 'lucide-react';

export type AdminCategoryRow = {
  id: string;
  name_fr: string;
  name_ar: string;
  display_order: number;
  image_url?: string;
};

export type CategoriesPanelProps = {
  categories: AdminCategoryRow[];
  darkMode?: boolean;
  onAddCategory: () => void;
  onEditCategory: (cat: AdminCategoryRow) => void;
  onManageSubcategories: (cat: AdminCategoryRow) => void;
  onDeleteCategory: (id: string) => void;
};

const CategoriesPanel: React.FC<CategoriesPanelProps> = React.memo(
  ({ categories, darkMode = false, onAddCategory, onEditCategory, onManageSubcategories, onDeleteCategory }) => (
    <div className="space-y-6 animate-in slide-in-from-bottom-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-xl font-black uppercase ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Catégories du Catalogue</h3>
        <button
          type="button"
          onClick={onAddCategory}
          className={`text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 ${darkMode ? 'bg-slate-800' : 'bg-slate-900'}`}
        >
          <Plus size={16} /> Ajouter une Catégorie
        </button>
      </div>
      <div className={`rounded-[3rem] border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white'}`}>
        <table className="w-full text-left">
          <thead className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
            <tr>
              <th className="px-8 py-5">Icône</th>
              <th className="px-8 py-5">Français</th>
              <th className="px-8 py-5">Arabe</th>
              <th className="px-8 py-5">Ordre</th>
              <th className="px-8 py-5 text-right">Sous-catégories & actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map(cat => (
              <tr key={cat.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                <td className="px-8 py-5">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className={`w-12 h-12 rounded-xl object-cover shadow-sm border ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-300'}`}>
                      <ImageIcon size={20} />
                    </div>
                  )}
                </td>
                <td className={`px-8 py-5 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{cat.name_fr}</td>
                <td className={`px-8 py-5 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{cat.name_ar}</td>
                <td className="px-8 py-5 font-black text-slate-400">{cat.display_order}</td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onManageSubcategories(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                      title="Gérer les sous-catégories"
                    >
                      <ListTree size={14} />
                      <span>Gérer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      className={`p-2 transition-all rounded-lg ${darkMode ? 'text-slate-300 hover:text-orange-300 hover:bg-slate-900' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat.id)}
                      className={`p-2 transition-all rounded-lg ${darkMode ? 'text-slate-300 hover:text-red-300 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
);

CategoriesPanel.displayName = 'CategoriesPanel';

export default CategoriesPanel;
