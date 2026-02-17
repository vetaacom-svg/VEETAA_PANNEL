
import React, { useMemo, useCallback } from 'react';
import { Store, Product } from '../types';
import { ArrowLeft, Star, ShoppingCart, Plus } from 'lucide-react';

interface StoreDetailProps {
    store: Store;
    onBack: () => void;
    onSelectProduct: (product: Product) => void;
    onAddToCart: (product: Product) => void;
}

const StoreDetail: React.FC<StoreDetailProps> = ({ store, onBack, onSelectProduct, onAddToCart }) => {
    // Memoize produits pour éviter re-renders inutiles
    const memoizedProducts = useMemo(() => store.products || [], [store.products]);
    
    // Debounce les clicks pour eviter les actions en double rapides
    const handleSelectProductDebounced = useCallback((product: Product) => {
        onSelectProduct(product);
    }, [onSelectProduct]);

    const handleAddToCartDebounced = useCallback((product: Product) => {
        onAddToCart(product);
    }, [onAddToCart]);

    return (
        <div className="animate-in fade-in duration-200 pb-20">
            {/* Hero Section */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <img src={store.image} className="w-full h-full object-cover" alt={store.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                <div className="absolute bottom-8 left-8 right-8 text-white">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">{store.name}</h1>
                            <div className="flex items-center gap-4 text-sm font-bold opacity-90">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span>4.8 (120+ avis)</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                                <span>25-35 min</span>
                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                                <span className="text-orange-400">Livraison 15 DH</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Menu / Produits</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {memoizedProducts.length > 0 ? (
                        memoizedProducts.map(product => (
                            <div
                                key={product.id}
                                className="bg-white rounded-[2.5rem] border border-slate-100 p-4 shadow-sm hover:shadow-2xl transition-shadow group"
                            >
                                <div className="relative mb-4 overflow-hidden rounded-[2rem]">
                                    <img src={product.image} className="w-full aspect-square object-cover transition-transform group-hover:scale-110" alt={product.name} />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-lg border border-slate-100/50">
                                        <span className="text-sm font-black text-orange-600">{product.price} DH</span>
                                    </div>
                                </div>
                                <div className="px-2 pb-2">
                                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-orange-600 transition-colors">{product.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold mb-4 line-clamp-2">Excellente qualité sélectionnée par Veetaa pour vous.</p>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSelectProductDebounced(product)}
                                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:bg-slate-950 transition-colors"
                                        >
                                            Détails
                                        </button>
                                        <button
                                            onClick={() => handleAddToCartDebounced(product)}
                                            className="w-14 bg-orange-600 text-white flex items-center justify-center rounded-2xl hover:bg-orange-700 active:bg-orange-800 transition-colors"
                                        >
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                                <ShoppingCart className="w-10 h-10 text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold italic">Aucun produit disponible pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreDetail;
