
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CATEGORIES, MOCK_STORES, TRANSLATIONS } from '../constants';
import { CategoryID, Language, Product, Store } from '../types';
import { Heart, Star, MapPin, Search, ChevronDown } from 'lucide-react';

interface HomeProps {
  onSelectCategory: (id: CategoryID) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  language: Language;
  isExplorerMode: boolean;
  onToggleExplorer: (active: boolean) => void;
  onSelectProduct: (product: Product) => void;
  categories: any[];
  stores: Store[];
  announcements: any[];
}

const Home: React.FC<HomeProps> = ({ onSelectCategory, favorites, onToggleFavorite, language, isExplorerMode, onToggleExplorer, onSelectProduct, categories, stores, announcements }) => {
  const [activeBanner, setActiveBanner] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const activeStores = useMemo(() => {
    return stores.filter(s => !s.isDeleted && s.is_active !== false);
  }, [stores]);

  const allProducts = useMemo(() => {
    return activeStores.flatMap(store =>
      (store.products || []).map(p => ({ ...p, storeName: store.name, storeId: store.id, category: store.category }))
    );
  }, [activeStores]);

  const displayBanners = useMemo(() => {
    if (announcements && announcements.length > 0) {
      return announcements.map(ann => ({
        title: ann.title,
        subtitle: ann.content,
        color: 'from-orange-400 to-orange-600',
        image: ann.images?.[0]
      }));
    }
    return [
      { title: language === 'ar' ? 'توصيل مجاني' : 'Livraison Gratuite', subtitle: language === 'ar' ? 'على طلبك الأول' : 'Sur votre première commande Food', color: 'from-orange-400 to-orange-600' },
      { title: language === 'ar' ? 'صيدلية 24/7' : 'Pharmacie 24/7', subtitle: language === 'ar' ? 'أدويتك في 15 d' : 'Vos médicaments en 15 min', color: 'from-emerald-400 to-emerald-600' },
      { title: language === 'ar' ? 'عروض المخبزة' : 'Promo Boulangerie', subtitle: language === 'ar' ? '-20% على الحلويات' : '-20% sur les viennoiseries', color: 'from-amber-400 to-amber-600' },
    ];
  }, [announcements, language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayBanners.length]);

  return (
    <div ref={containerRef} className="p-4 space-y-6 animate-in fade-in duration-200 pb-20">

      {!isExplorerMode && (
        <div className="relative">
          <Search className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4`} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:ring-2 focus:ring-orange-500 outline-none font-medium text-xs`}
          />
        </div>
      )}

      {!isExplorerMode && (
        <div className="relative h-44 w-full rounded-[2.5rem] overflow-hidden shadow-xl shadow-orange-50">
          {displayBanners.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 p-6 flex flex-col justify-center transition-opacity duration-500 bg-gradient-to-r ${banner.color} ${idx === activeBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <h3 className="text-xl font-black text-white mb-1 leading-tight">{banner.title}</h3>
              <p className="text-white/80 font-medium text-xs">{banner.subtitle}</p>
              {banner.image && <img src={banner.image} className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-20" alt="" />}
            </div>
          ))}
          <div className={`absolute bottom-4 ${language === 'ar' ? 'right-6' : 'left-6'} flex gap-1.5 z-20`}>
            {displayBanners.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-[width] ${idx === activeBanner ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 px-1">{t('services')}</h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:grid md:grid-cols-4 lg:grid-cols-7 md:overflow-visible">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id as CategoryID)}
              className="flex flex-col items-center gap-2 group min-w-[68px]"
            >
              <div className="w-[68px] h-[68px] rounded-[1.75rem] flex items-center justify-center bg-white shadow-lg shadow-slate-100 transition-transform active:scale-90 group-hover:scale-105 border border-slate-50 overflow-hidden">
                {cat.image_url ? (
                  <img src={cat.image_url} className="w-full h-full object-cover" alt={cat.name_fr} />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-white ${cat.color_class || 'bg-orange-500'}`}>
                    <span className="text-2xl">{cat.icon_name || '📦'}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-black text-slate-600 text-center leading-tight whitespace-nowrap">
                {language === 'ar' ? cat.name_ar : (language === 'en' ? cat.name_en : cat.name_fr)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isExplorerMode ? (
        <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-200 pb-10">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-slate-800">{language === 'ar' ? 'جميع المنتجات' : 'Tous les produits'}</h3>
            <button onClick={() => onToggleExplorer(false)} className="text-[10px] font-black uppercase text-orange-600">Réduire</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allProducts.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                onClick={() => onSelectProduct(p)}
                className="bg-white rounded-[2rem] border border-slate-50 p-4 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <img src={p.image} className="w-full aspect-square object-cover transition-transform group-hover:scale-110" alt={p.name} />
                  <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl shadow-lg">
                    <span className="text-xs font-black text-orange-600">{p.price} DH</span>
                  </div>
                </div>
                <div className="px-1">
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase truncate">{p.storeName}</p>
                </div>
                <button className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors group-hover:bg-orange-600">Acheter</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{t('popular')}</h3>
              <button className="text-orange-600 text-[10px] font-black uppercase tracking-wider">{t('viewAll')}</button>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
              {activeStores.slice(0, 6).map((store) => (
                <div key={store.id} onClick={() => onSelectCategory(store.category)} className="min-w-[240px] md:min-w-0 bg-white rounded-[2rem] border border-slate-50 overflow-hidden shadow-md relative group hover:shadow-lg transition-shadow cursor-pointer">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(store.id); }}
                    className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'} z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm transition-transform hover:scale-110 active:scale-90`}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(store.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                  </button>
                  <img src={store.image} className="w-full h-40 object-cover transition-transform group-hover:scale-105" alt={store.name} />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 text-base">{store.name}</h4>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-amber-700">4.8</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="bg-slate-50 px-2.5 py-1 rounded-xl">25 min</span>
                      <span className="text-orange-600">15 DH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* ... découverte ... */}
          <div className="flex flex-col items-center pt-2 opacity-30">
            <ChevronDown className="w-4 h-4 text-slate-400 animate-bounce" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Scrollez pour voir tout</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
