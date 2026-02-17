
// Testing search/replace
import React, { useMemo, useCallback } from 'react';
import { CategoryID, Store, Language } from '../types';
import { MOCK_STORES, CATEGORIES } from '../constants';
import { Info, Heart, Star } from 'lucide-react';

interface CategoryDetailProps {
  category: CategoryID;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectStore: (store: Store) => void;
  stores: Store[];
  categories: any[];
  language: Language;
}

const CategoryDetail: React.FC<CategoryDetailProps> = ({ category, favorites, onToggleFavorite, onSelectStore, stores, categories, language }) => {
  const categoryInfo = categories.find(c => c.id === category);

  const isDirectOrder = [CategoryID.EXPRESS, CategoryID.BOULANGERIE, CategoryID.PRESSING, CategoryID.MARKET].includes(category);

  // Memoize stores pour cette catégorie
  const categoryStores = useMemo(() => {
    return stores.filter(s => !s.isDeleted && s.category === category);
  }, [stores, category]);

  // Debounce les clics
  const handleStoreSelect = useCallback((store: Store) => {
    onSelectStore(store);
  }, [onSelectStore]);

  const handleToggleFav = useCallback((e: React.MouseEvent<HTMLButtonElement>, storeId: string) => {
    e.stopPropagation();
    onToggleFavorite(storeId);
  }, [onToggleFavorite]);

  if (isDirectOrder && categoryStores.length === 0) {
    const systemStore: Store = {
      id: `sys-${category}`,
      name: `Service ${categoryInfo?.name}`,
      category,
      type: 'text-only',
      image: 'https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?auto=format&fit=crop&q=80&w=400',
    };
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-in slide-in-from-bottom duration-200">
        <div className={`w-32 h-32 rounded-[2.5rem] ${categoryInfo?.color} flex items-center justify-center text-white shadow-2xl animate-pulse`}>
          {categoryInfo?.icon}
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{categoryInfo?.name} Express</h2>
          <p className="text-slate-500 max-w-[280px] mx-auto text-sm font-bold">Nos coursiers dédiés s'occupent de tout pour vous.</p>
        </div>
        <button
          onClick={() => onSelectStore(systemStore)}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 active:bg-slate-950 transition-colors"
        >
          Commander maintenant
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center gap-6 mb-8 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
        <div className={`p-6 rounded-[2rem] ${categoryInfo?.color_class || 'bg-orange-500'} text-white shadow-2xl shadow-orange-200`}>
          <span className="text-4xl">{categoryInfo?.icon_name}</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{language === 'ar' ? categoryInfo?.name_ar : categoryInfo?.name_fr}</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{categoryStores.length} Établissements disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categoryStores.map(store => (
          <div
            key={store.id}
            onClick={() => handleStoreSelect(store)}
            className="flex flex-col bg-white rounded-[2.5rem] border border-slate-50 shadow-md relative overflow-hidden group hover:shadow-lg transition-shadow"
          >
            <button
              onClick={(e) => handleToggleFav(e, store.id)}
              className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-full z-10 shadow-sm"
            >
              <Heart className={`w-5 h-5 ${favorites.includes(store.id) ? 'text-red-500 fill-red-500' : 'text-slate-300'}`} />
            </button>
            <img src={store.image} className="w-full h-44 object-cover" alt={store.name} />
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-xl text-slate-900">{store.name}</h3>
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-amber-700">4.8</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded-lg italic">25-40 min</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-orange-600">
                  LIVRAISON 15 DH
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">Ouvert</span>
                <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">Populaire</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryDetail;
