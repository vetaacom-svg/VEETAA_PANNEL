
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Package, RefreshCcw, ChevronRight, CheckCircle2, Clock, XCircle, PhoneCall, ArrowRight, ShoppingBag, Phone, ChevronDown } from 'lucide-react';

interface HistoryProps {
  orders: Order[];
  onOrderAgain: (order: Order) => void;
  onTrack?: () => void;
}

const History: React.FC<HistoryProps> = ({ orders, onOrderAgain, onTrack }) => {
  const [displayCount, setDisplayCount] = useState(10);

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return {
          label: 'LIVRÉE',
          color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
          icon: <CheckCircle2 className="w-3 h-3" />,
          isFinal: true,
          badgeColor: 'bg-emerald-500'
        };
      case 'refused':
        return {
          label: 'REFUSÉE',
          color: 'text-red-500 bg-red-50 border-red-100',
          icon: <XCircle className="w-3 h-3" />,
          isFinal: true,
          badgeColor: 'bg-red-500'
        };
      default:
        return {
          label: 'EN COURS',
          color: 'text-orange-500 bg-orange-50 border-orange-100',
          icon: <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />,
          isFinal: false,
          badgeColor: 'bg-orange-500'
        };
    }
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-300 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Suivi & Historique</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">État final en vert ou rouge</p>
        </div>
        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">{orders.length} commandes</span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-50">
          <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold max-w-[200px]">Votre panier est vide et vous n'avez pas encore d'achats.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.slice(0, displayCount).map((order) => {
            const config = getStatusConfig(order.status);
            return (
              <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-5 transition-all hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${config.badgeColor} text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg`}>
                      {order.storeName ? order.storeName[0] : 'V'}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 tracking-tight">{order.storeName || 'Veetaa Express'}</h3>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        ID: <span className="text-slate-900 font-bold">{order.id}</span> • {new Date(order.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-lg leading-none mb-1">{order.total + 15} DH</p>
                    <div className={`flex items-center gap-1 justify-end text-[9px] font-black px-2 py-0.5 rounded-full border ${config.color}`}>
                      {config.icon}
                      {config.label}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Produits de la commande</p>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-50 space-y-3">
                    {order.items.length > 0 ? order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-700">{item.quantity}x {item.product?.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">{(item.product?.price || 0) * item.quantity} DH</span>
                      </div>
                    )) : (
                      <p className="text-xs font-bold text-slate-500 italic">Commande par texte/image</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!config.isFinal ? (
                    <>
                      <button
                        onClick={onTrack}
                        className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-orange-100"
                      >
                        Suivre l'état
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <a
                        href="tel:+212600000000"
                        className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-xl gap-2 px-6"
                      >
                        <Phone className="w-4 h-4 text-orange-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Support</span>
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => onOrderAgain(order)}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-100"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Acheter à nouveau
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {displayCount < orders.length && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setDisplayCount(prev => Math.min(prev + 10, orders.length))}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-orange-200 hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
              >
                <ChevronDown className="w-4 h-4 animate-bounce" />
                Charger plus ({orders.length - displayCount} restantes)
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>
          )}

          {/* Show All Button */}
          {displayCount < orders.length && displayCount < orders.length - 10 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setDisplayCount(orders.length)}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
              >
                Tout afficher ({orders.length} commandes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default History;
