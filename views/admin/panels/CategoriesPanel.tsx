import React from 'react';
import { Plus, Image as ImageIcon, Edit3, Trash2, ListTree, GripVertical, Tag } from 'lucide-react';

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className={`text-xl font-black uppercase ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Catégories du Catalogue
          </h3>
          <p className={`text-[11px] font-bold mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCategory}
          className="flex items-center gap-2 text-white px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-slate-900 hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
        >
          <Plus size={15} /> Ajouter une Catégorie
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-[2rem] border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-100'}`}>
        {categories.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 gap-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
            <Tag size={40} />
            <p className={`text-sm font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Aucune catégorie pour le moment</p>
            <button
              type="button"
              onClick={onAddCategory}
              className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
            >
              Créer la première catégorie
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${darkMode ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-50/80 text-slate-400 border-slate-100'}`}>
              <tr>
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4">Icône</th>
                <th className="px-6 py-4">Français</th>
                <th className="px-6 py-4">Arabe</th>
                <th className="px-6 py-4 text-center">Ordre</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
              {categories.map((cat, idx) => (
                <tr
                  key={cat.id}
                  className={`group transition-all duration-150 ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}`}
                >
                  {/* Drag handle (visual only) */}
                  <td className="px-3 py-4 text-center">
                    <GripVertical
                      size={14}
                      className={`mx-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-grab ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}
                    />
                  </td>

                  {/* Icon */}
                  <td className="px-6 py-4">
                    {cat.image_url ? (
                      <div className="relative">
                        <img
                          src={cat.image_url}
                          alt={cat.name_fr}
                          className={`w-12 h-12 rounded-2xl object-cover shadow-sm border-2 transition-transform group-hover:scale-105 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm ${idx < 3 ? 'bg-orange-500 text-white' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {cat.display_order}
                        </div>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-dashed ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </td>

                  {/* Name FR */}
                  <td className="px-6 py-4">
                    <span className={`font-black text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {cat.name_fr}
                    </span>
                  </td>

                  {/* Name AR */}
                  <td className="px-6 py-4">
                    <span className={`font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} dir="rtl">
                      {cat.name_ar}
                    </span>
                  </td>

                  {/* Order */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {cat.display_order}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-1.5">
                      {/* Manage sub-categories */}
                      <button
                        type="button"
                        onClick={() => onManageSubcategories(cat)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 transition-all active:scale-95 shadow-sm shadow-indigo-200"
                        title="Gérer les sous-catégories"
                      >
                        <ListTree size={13} />
                        <span>Sous-cat.</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${darkMode
                          ? 'text-slate-400 hover:text-orange-300 hover:bg-slate-800'
                          : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-100'
                        }`}
                        title="Modifier"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${darkMode
                          ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/20'
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100'
                        }`}
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
);

CategoriesPanel.displayName = 'CategoriesPanel';

export default CategoriesPanel;
