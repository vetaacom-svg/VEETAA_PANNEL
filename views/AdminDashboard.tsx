
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, OrderStatus, Driver, Store, Product, CategoryID, Announcement, UserProfile, DriverDocument, RIB, SupportInfo, SupportTicket, SupportMessage, SubCategory } from '../types';
import {
   Package, Clock, CheckCircle2, Users, MapPin, Eye,
   LayoutDashboard, ShoppingBag, Truck, Store as StoreIcon,
   Settings, Bell, Search, Filter, Trash2, ShieldAlert,
   ChevronRight, ChevronLeft, ExternalLink, X, Check, MoreVertical,
   Plus, Smartphone, MessageCircle, Camera, Link as LinkIcon, Copy, Map as MapIcon,
   Star, AlertTriangle, User, Calendar, CreditCard, Phone, Edit3, Image as ImageIcon, Bike,
   Save, Megaphone, Upload, Navigation, Trash, Info, UserCheck, UserMinus, ShieldCheck, RotateCw, LogOut, Share2, Clipboard, Scissors, Copy as CopyIcon, Quote, MessageSquare, Box, History as HistoryIcon,
   DollarSign, BarChart3, TrendingUp, PieChart as PieChartIcon, Receipt, AlertCircle, FileText, Download, ZoomIn, ZoomOut, Mail, Target, ListTree, Globe, Shield, Loader2, LocateOff
} from 'lucide-react';
import { CATEGORIES, MOCK_STORES } from '../constants';
import { supabase, dataUrlToBlob } from '../lib/supabase';

// Lightweight, memoized product card to avoid re-renders while scrolling
type ProductCardProps = {
   id: string;
   name: string;
   storeName?: string;
   price?: number;
   image?: string;
   onEdit: (id: string) => void;
   onDelete: (id: string) => void;
};
const ProductCard: React.FC<ProductCardProps> = React.memo(({ id, name, storeName, price, image, onEdit, onDelete }) => {
   return (
      <div className="bg-white rounded-[2.5rem] border p-4 group hover:shadow-md transition-shadow duration-150 relative overflow-hidden" style={{ willChange: 'transform, opacity' }}>
         <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={() => onEdit(id)} className="p-2 bg-white/90 text-slate-600 rounded-xl shadow-sm hover:text-orange-600"><Edit3 size={16} /></button>
            <button onClick={() => onDelete(id)} className="p-2 bg-white/90 text-red-500 rounded-xl shadow-sm hover:bg-red-50"><Trash2 size={16} /></button>
         </div>
         <img src={image} loading="lazy" width={400} height={200} decoding="async" className="w-full h-40 object-cover rounded-[1.75rem] mb-4" />
         <div className="p-2">
            <h4 className="font-black text-slate-800 text-sm mb-1 truncate">{name}</h4>
            <p className="text-[10px] text-slate-400 mb-2 truncate">{storeName || 'Marque inconnue'}</p>
            <div className="flex justify-between items-center text-orange-600 font-black">{price} DH</div>
         </div>
      </div>
   );
}, (a, b) => a.id === b.id && a.name === b.name && a.price === b.price && a.image === b.image && a.storeName === b.storeName);

// Lightweight, memoized store card for the PARTNERS tab
type StoreCardProps = {
   id: string;
   image_url?: string;
   image?: string;
   name: string;
   category_id?: string;
   latitude?: number | null;
   longitude?: number | null;
   is_open?: boolean;
   is_active?: boolean;
   rating?: number;
   categoryImage?: string; // image de secours depuis la base de données categories
   onEdit: (id: string) => void;
   onToggleOpen: (id: string, current: boolean | undefined) => void;
   onToggleActive: (id: string, current: boolean | undefined) => void;
   onDelete: (id: string) => void;
};
const StoreCard: React.FC<StoreCardProps> = React.memo(({ id, image_url, image, name, category_id, latitude, longitude, is_open, is_active, rating, categoryImage, onEdit, onToggleOpen, onToggleActive, onDelete }) => {
   // Image directement depuis la base de données (image_url ou image)
   // Si les deux sont vides, on utilise l'image de la catégorie (chargée depuis la DB aussi)
   const imgSrc = image_url || image || categoryImage || null;

   return (
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4" style={{ willChange: 'transform, opacity' }}>
         <div className="flex items-center gap-4">
            {imgSrc ? (
               <img
                  src={imgSrc}
                  alt={name}
                  loading="lazy"
                  width={64}
                  height={64}
                  decoding="async"
                  className="w-16 h-16 rounded-[1.25rem] object-cover"
               />
            ) : (
               <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                  IMG
               </div>
            )}
            <div className="flex-1">
               <h4 className="font-black text-lg truncate">{name}</h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{category_id}</p>
               {(latitude && longitude) ? (
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                     <MapPin size={10} />
                     <span className="text-[9px] font-mono font-bold">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                  </div>
               ) : (
                  <div className="flex items-center gap-1 mt-1 text-slate-400 bg-slate-50 px-2 py-1 rounded-lg w-fit">
                     <MapPin size={10} />
                     <span className="text-[9px] font-mono">Pas de coordonnées</span>
                  </div>
               )}
            </div>
            <div className="flex flex-col gap-2">
               <button onClick={() => onToggleOpen(id, !!is_open)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${is_open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {is_open ? 'Ouvert' : 'Fermé'}
               </button>
               <button onClick={() => onToggleActive(id, !!is_active)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  {is_active ? 'Visible' : 'Caché'}
               </button>
            </div>
         </div>
         <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-1 text-orange-500"><Star size={14} fill="currentColor" /><span className="text-xs font-black">{rating || '4.5'}</span></div>
            <div className="flex gap-2">
               <button onClick={() => onEdit(id)} className="p-2 bg-slate-100 rounded-lg"><Edit3 size={16} /></button>
               <button onClick={() => onDelete(id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
            </div>
         </div>
      </div>
   );
}, (a, b) => a.id === b.id && a.name === b.name && a.image_url === b.image_url && a.image === b.image && a.is_open === b.is_open && a.is_active === b.is_active && a.rating === b.rating);

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';


interface AdminDashboardProps {
   orders: Order[];
   users: UserProfile[];
   drivers: Driver[];
   stores: Store[];
   announcements: Announcement[];
   supportNumber: string;
   deliveryZone?: 'kenitra' | 'all_morocco';
   deliveryFeePerKm?: number; // nouveau réglage (DH / km)
   onUpdateStatus: (id: string, status: OrderStatus) => void;
   onAssignDriver: (orderId: string, driverId: string) => void;
   onArchiveOrder: (orderId: string) => void;
   onRestoreOrder: (orderId: string) => void;
   onDeletePermanently: (orderId: string) => void;
   onBanUser: (phone: string) => void;
   onUpdateSettings: (key: string, value: string) => Promise<void>;
   onCreateAnnouncement: (ann: Partial<Announcement>) => void;
   onDeleteAnnouncement: (id: string) => void;
   onLogout: () => void;
   onBack: () => void;
   setStores: React.Dispatch<React.SetStateAction<Store[]>>;
   categories: any[];
   subCategories: SubCategory[];
   pageVisibility?: {
      hideFinance: boolean;
      hideStatistics: boolean;
      hideAnnouncements: boolean;
   };
}

interface AdminUser extends UserProfile {
   id: string;
   createdAt: number;
   totalOrders: number;
   isBlocked?: boolean;
}

// --- ICONS & STYLES ---
const StoreMarkerIcon = new L.Icon({
   iconUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
   iconSize: [35, 35],
   iconAnchor: [17, 35],
   popupAnchor: [0, -35],
});

const DriverIdleMarkerIcon = new L.Icon({
   iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
   iconSize: [32, 32],
   iconAnchor: [16, 32],
   className: 'filter-black'
});

const DriverBusyMarkerIcon = new L.Icon({
   iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
   iconSize: [32, 32],
   iconAnchor: [16, 32],
   className: 'filter-red'
});

const UserIdleMarkerIcon = new L.Icon({
   iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
   iconSize: [30, 30],
   iconAnchor: [15, 30],
   className: 'filter-black'
});

const UserActiveMarkerIcon = new L.Icon({
   iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
   iconSize: [35, 35],
   iconAnchor: [17, 35],
   className: 'filter-green'
});

const getOrderStoreDisplay = (order: Order) => {
   if (order.items && order.items.length > 0) {
      const uniqueStores = Array.from(new Set(order.items.map(it => it.storeName).filter(Boolean)));
      if (uniqueStores.length > 1) return "Multi-Magasins";
      if (uniqueStores.length === 1) return uniqueStores[0];
   }
   return order.storeName || 'Magasin Inconnu';
};

// Component pour afficher la barre latérale logistique
const LogisticsSidebar: React.FC<{
   orders: Order[],
   users: UserProfile[],
   stores: Store[],
   drivers: Driver[],
   selectedOrderId: string | null,
   onSelectOrder: (id: string | null) => void,
   onViewOrder: (id: string) => void,
   pickingStore: Store | null,
   onStartPicking: (store: Store) => void,
   onCancelPicking: () => void,
   onSavePicking: () => void,
   onPosChange: (lat: number, lng: number) => void,
   pickingPos: [number, number] | null
}> = ({ orders, users, stores, drivers, selectedOrderId, onSelectOrder, onViewOrder, pickingStore, onStartPicking, onCancelPicking, onSavePicking, onPosChange, pickingPos }) => {
   const [sidebarTab, setSidebarTab] = useState<'orders' | 'admin'>('orders');

   const activeOrders = orders.filter(o => o.status !== 'delivered' && !o.isArchived);

   const handleCopy = (e: React.MouseEvent, text: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      alert("Copié dans le presse-papier !");
   };

   return (
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shadow-xl z-[1001]">
         <div className="p-6 bg-slate-900 text-white">
            <h1 className="text-xl font-bold tracking-tight">Admin Morocco Map</h1>
            <div className="mt-4 flex bg-slate-800 p-1 rounded-lg">
               <button onClick={() => setSidebarTab('orders')} className={`flex-1 py-1.5 text-xs font-bold rounded ${sidebarTab === 'orders' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Commandes</button>
               <button onClick={() => setSidebarTab('admin')} className={`flex-1 py-1.5 text-xs font-bold rounded ${sidebarTab === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Admin</button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4 shadow-inner bg-slate-50/50">
            {sidebarTab === 'orders' ? (
               <div className="space-y-3">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">En direct</h2>
                  {activeOrders.length === 0 && <p className="text-xs text-slate-400 p-4 text-center italic">Aucune commande active</p>}
                  {activeOrders.map(order => (
                     <div
                        key={order.id}
                        onClick={() => onSelectOrder(selectedOrderId === order.id ? null : order.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${selectedOrderId === order.id ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-500/10' : 'border-white bg-white hover:border-slate-200 shadow-sm'}`}
                     >
                        <div className="flex justify-between items-start">
                           <span className="text-[10px] font-mono font-bold text-slate-400">#{order.id.slice(-6)}</span>
                           <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                              {order.status.toUpperCase()}
                           </span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 mt-2">{getOrderStoreDisplay(order)}</p>

                        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                 <p className="text-[11px] text-slate-700 font-bold">{order.customerName}</p>
                              </div>
                              <button
                                 onClick={(e) => handleCopy(e, order.phone)}
                                 className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-orange-500 transition-colors shadow-sm"
                                 title="Copier le numéro"
                              >
                                 <Copy size={12} />
                              </button>
                           </div>

                           {selectedOrderId === order.id && (
                              <button
                                 onClick={(e) => { e.stopPropagation(); onViewOrder(order.id); }}
                                 className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all animate-in fade-in slide-in-from-top-1"
                              >
                                 <Eye size={12} /> Voir détails
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="space-y-4">
                  {/* Vue d'ensemble (Statistiques) */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                     <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-tight">Vue d'ensemble</h3>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-3 rounded-xl">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Livreurs</p>
                           <p className="text-xl font-black text-slate-900">{drivers.length}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Clients</p>
                           <p className="text-xl font-black text-slate-900">{users.length}</p>
                        </div>
                     </div>
                  </div>

                  {/* Gestion des Stores - Positionnement Map */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><MapPin size={14} /></div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Position des Magasins</h3>
                     </div>

                     {pickingStore ? (
                        <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 animate-pulse">
                           <p className="font-bold text-slate-800 text-xs">Configuration de :</p>
                           <p className="text-sm font-black text-orange-600 mb-3">{pickingStore.name}</p>

                           <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">Latitude (X)</label>
                                    <input
                                       type="number"
                                       step="any"
                                       value={pickingPos?.[0] || ''}
                                       onChange={(e) => onPosChange(parseFloat(e.target.value), pickingPos?.[1] || 0)}
                                       className="w-full bg-white border border-orange-100 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-orange-200"
                                       placeholder="ex: 33.5"
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">Longitude (Y)</label>
                                    <input
                                       type="number"
                                       step="any"
                                       value={pickingPos?.[1] || ''}
                                       onChange={(e) => onPosChange(pickingPos?.[0] || 0, parseFloat(e.target.value))}
                                       className="w-full bg-white border border-orange-100 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-orange-200"
                                       placeholder="ex: -7.5"
                                    />
                                 </div>
                              </div>

                              {/* CHAMP DE SAISIE RAPIDE (MANUEL) */}
                              <div className="space-y-1 pt-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase">Saisie Rapide (X, Y)</label>
                                 <input
                                    type="text"
                                    placeholder="Coller ici: 34.25, -6.62"
                                    className="w-full bg-white border border-orange-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-orange-100"
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       const match = val.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
                                       if (match) {
                                          const lat = parseFloat(match[1]);
                                          const lng = parseFloat(match[2]);
                                          if (!isNaN(lat) && !isNaN(lng)) onPosChange(lat, lng);
                                       }
                                    }}
                                 />
                                 <p className="text-[8px] text-slate-400 font-bold uppercase italic mt-1">Extrait Auto X & Y</p>
                              </div>

                              {!pickingPos ? (
                                 <p className="text-[10px] text-slate-500 italic">Cliquez sur la carte ou saisissez les coordonnées...</p>
                              ) : (
                                 <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                    <Check size={12} /> Position prête !
                                 </p>
                              )}

                              <div className="flex gap-2 pt-2">
                                 <button
                                    onClick={onSavePicking}
                                    disabled={!pickingPos}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${pickingPos ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                 >
                                    Enregistrer
                                 </button>
                                 <button
                                    onClick={onCancelPicking}
                                    className="px-3 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-[10px] font-black uppercase"
                                 >
                                    Reset
                                 </button>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                           {stores.map(store => {
                              const hasCoords = store.latitude && store.longitude;

                              return (
                                 <div key={store.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                          {(store.image_url || store.image) ? (
                                             <img src={store.image_url || store.image} alt={store.name} className="w-full h-full object-cover" />
                                          ) : (
                                             <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={14} /></div>
                                          )}
                                       </div>
                                       <div>
                                          <p className="text-[11px] font-bold text-slate-800 leading-tight">{store.name}</p>
                                          {hasCoords ? (
                                             <div className="flex gap-1 mt-0.5">
                                                <span className="text-[9px] font-mono font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
                                                   X: {Number(store.latitude).toFixed(4)}
                                                </span>
                                                <span className="text-[9px] font-mono font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
                                                   Y: {Number(store.longitude).toFixed(4)}
                                                </span>
                                             </div>
                                          ) : (
                                             <p className="text-[9px] font-black uppercase text-slate-300">Non Lié</p>
                                          )}
                                       </div>
                                    </div>
                                    <button
                                       onClick={() => onStartPicking(store)}
                                       className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                       title="Lier à la carte"
                                    >
                                       <LinkIcon size={14} />
                                    </button>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};

// Helper pour afficher les images Base64 ou URL proprement
const renderMediaThumbnail = (data: string | null | undefined, size: string = "w-10 h-10") => {
   if (!data) return null;

   // Si les données ne commencent pas par "data:", on ajoute le préfixe
   let src = data;
   if (!data.startsWith('data:') && !data.startsWith('http')) {
      // Assume it's base64 without prefix
      src = `data:image/jpeg;base64,${data}`;
   }

   return (
      <div className={`${size} rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0`}>
         <img
            src={src}
            alt="media"
            className="w-full h-full object-contain"
            onError={(e) => {
               // Si l'image ne charge pas, essayer avec png
               const target = e.target as HTMLImageElement;
               if (src.includes('jpeg') && !target.src.includes('png')) {
                  target.src = src.replace('jpeg', 'png');
               }
            }}
         />
      </div>
   );
};

// Helper Component pour contrôler la carte (flyTo)
const MapController: React.FC<{ targetPos: [number, number] | null }> = ({ targetPos }) => {
   const map = useMap();

   // Fix pour les zones grises : Recalcul de la taille après l'animation d'entrée
   useEffect(() => {
      const timer = setTimeout(() => {
         map.invalidateSize({ animate: true });
      }, 500);
      return () => clearTimeout(timer);
   }, [map]);

   useEffect(() => {
      let timer: any;
      if (targetPos) {
         map.flyTo(targetPos, 15, { duration: 1.5 });
         // Forcer un recalcul de taille pendant le mouvement pour éviter les bords gris
         timer = setTimeout(() => {
            if (map && (map as any)._container) {
               map.invalidateSize();
            }
         }, 600);
      }
      return () => {
         if (timer) clearTimeout(timer);
      };
   }, [targetPos, map]);

   return null;
};

// Helper Component pour capturer les clics sur la carte
const MapEventsHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
   useMapEvents({
      click(e) {
         onMapClick(e.latlng.lat, e.latlng.lng);
      },
   });
   return null;
};

// Component pour le bouton de recentrage sur Kénitra
const RecenterButton: React.FC = () => {
   const map = useMap();
   return (
      <div className="leaflet-top leaflet-right mt-2 mr-2" style={{ zIndex: 1000 }}>
         <button
            onClick={(e) => {
               e.stopPropagation();
               e.preventDefault();
               map.flyTo([34.261, -6.580], 13, { duration: 1.5 });
            }}
            className="bg-white p-2.5 rounded-xl shadow-xl hover:bg-slate-50 border-2 border-slate-100/50 flex items-center justify-center transition-all group active:scale-95"
            title="Revenir à Kénitra"
         >
            <Target size={20} className="text-orange-500 group-hover:scale-110 transition-transform" />
         </button>
      </div>
   );
};

// Component pour afficher la carte
const MapComponent: React.FC<{
   drivers: Driver[],
   orders: Order[],
   users: UserProfile[],
   stores: Store[],
   categories: any[],
   selectedOrderId?: string | null,
   onUnlinkStore?: (id: string) => void,
   onMapClick?: (lat: number, lng: number) => void,
   pickingPos?: [number, number] | null,
   pickingStore?: Store | null
}> = ({ drivers, orders, users, stores, categories, selectedOrderId, onUnlinkStore: onUnlinkStore, onMapClick, pickingPos, pickingStore }) => {
   const selectedOrder = orders.find(o => o.id === selectedOrderId);

   // Détermination des entités actives pour les tracés
   const activeUserId = (selectedOrder as any)?.userId || (selectedOrder as any)?.user_id;
   const activeStoreId = (selectedOrder as any)?.storeId || (selectedOrder as any)?.store_id;

   const activeUser = selectedOrder ? (users.find(u => u.id === activeUserId) || { lastLat: selectedOrder.location?.lat, lastLng: selectedOrder.location?.lng }) : null;
   const activeStore = selectedOrder ? stores.find(s => s.id === activeStoreId) : null;
   const activeDriver = selectedOrder?.assignedDriverId ? drivers.find(d => d.id === selectedOrder.assignedDriverId) : null;

   const getStorePos = (s: Store): [number, number] | null => {
      // Priorité aux coordonnées stockées en base
      if (s.latitude && s.longitude) return [Number(s.latitude), Number(s.longitude)];
      if (s.lat && s.lng) return [s.lat, s.lng];

      // Fallback: tentative d'extraction depuis l'URL maps (moins fiable mais utile pour legacy)
      const latMatch = s.maps_url?.match(/@(-?\d+\.?\d*),(-?\d+\.?\d+)/) || s.maps_url?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d+)/) || s.mapsUrl?.match(/query=([-.\d]+),([-.\d]+)/);
      if (latMatch) return [parseFloat(latMatch[1]), parseFloat(latMatch[2])];

      return null;
   };

   // Extraction de la position du client depuis l'URL Google Maps ou les notes
   const getCustomerPos = (o: Order): [number, number] | null => {
      if (o.location?.lat && o.location?.lng) return [o.location.lat, o.location.lng];
      // Support maps?q=lat,lng ou maps?query=lat,lng
      const urlMatch = o.textOrder?.match(/google\.com\/maps\?(?:q|query)=([-.\d]+),([-.\d]+)/);
      if (urlMatch) return [parseFloat(urlMatch[1]), parseFloat(urlMatch[2])];
      // Support maps/.../@lat,lng,zoom
      const genericMatch = o.textOrder?.match(/@([-.\d]+),([-.\d]+)/);
      if (genericMatch) return [parseFloat(genericMatch[1]), parseFloat(genericMatch[2])];
      return null;
   };

   const activeUserPos = selectedOrder ? getCustomerPos(selectedOrder) : null;

   // Icône personnalisée pour chaque store (image réelle si dispo, sinon avatar SVG généré)
   const createStoreIcon = (store: Store) => {
      const img = store.image_url || (store as any).image;

      // Fallback 1: Image de la catégorie depuis la DB
      const category = categories.find(c => c.id === store.category_id);
      const catImg = category?.image_url;

      // Fallback 2: SVG généré (dernier recours)
      const makeInitialsSvg = (name = '') => {
         const initials = (name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('') || 'S').toUpperCase();
         const colors = ['#f97316', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];
         const hash = Array.from(initials).reduce((acc, c) => acc + c.charCodeAt(0), 0);
         const bg = colors[hash % colors.length];
         const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>` +
            `<rect rx='20' width='100%' height='100%' fill='${bg}'/>` +
            `<text x='50%' y='54%' font-family='Inter, Arial, sans-serif' font-size='52' font-weight='700' fill='#fff' text-anchor='middle' dominant-baseline='middle'>${initials}</text>` +
            `</svg>`;
         return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      };

      const fallback = catImg || makeInitialsSvg(store.name || 'Store');
      const src = img || fallback;

      return L.divIcon({
         html: `<div class="relative w-10 h-10 rounded-full border-4 border-orange-500 overflow-hidden shadow-2xl bg-white transition-transform hover:scale-110">` +
            `<img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" class="w-full h-full object-cover"/>` +
            `</div>`,
         className: '',
         iconSize: [40, 40],
         iconAnchor: [20, 20]
      });
   };

   // Icône temporaire pour le store en cours de lien
   const pickingIcon = pickingStore ? createStoreIcon(pickingStore) : StoreMarkerIcon;

   return (
      <div className="w-full h-full relative bg-slate-50">
         <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <filter id="street-darkener-admin">
               <feComponentTransfer>
                  <feFuncR type="gamma" exponent="1.8" amplitude="0.7" />
                  <feFuncG type="gamma" exponent="1.8" amplitude="0.7" />
                  <feFuncB type="gamma" exponent="1.8" amplitude="0.7" />
               </feComponentTransfer>
            </filter>
         </svg>
         <style>{`
             .leaflet-tile {
                filter: url(#street-darkener-admin) brightness(1.05) contrast(1.1) !important;
             }
             .leaflet-container {
                background: #ffffff !important;
             }
             .leaflet-div-icon {
                background: transparent !important;
                border: none !important;
             }
             .leaflet-control-attribution {
                display: none !important;
             }
          `}</style>
         <MapContainer
            center={[34.261, -6.580]} // KÉNITRA, MAROC
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ background: '#f8fafc' }}
            attributionControl={false}
         >
            <MapController targetPos={activeUserPos || (activeStore ? getStorePos(activeStore) : null)} />
            {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}
            <RecenterButton />
            <TileLayer
               url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* PREVIEW DU STORE EN COURS DE LIEN */}
            {pickingStore && pickingPos && (
               <Marker position={pickingPos} icon={pickingIcon}>
                  <Popup>
                     <div className="p-1 font-bold text-xs">Position de {pickingStore.name}</div>
                  </Popup>
               </Marker>
            )}

            {console.debug('Map stores (id → img):', stores.map(s => ({ id: s.id, img: s.image_url || (s as any).image })))}{/* MAGASINS */}
            {stores.map(store => {
               const pos = getStorePos(store);
               if (!pos) return null;
               return (
                  <Marker key={store.id} position={pos} icon={createStoreIcon(store)}>
                     <Popup>
                        <div className="p-2 min-w-[150px]">
                           <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                 {(store.image_url || store.image) ? (
                                    <img src={store.image_url || store.image} alt={store.name} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={16} /></div>
                                 )}
                              </div>
                              <div>
                                 <p className="font-black text-[10px] uppercase text-slate-400">Magasin</p>
                                 <p className="font-bold text-slate-800 leading-tight">{store.name}</p>
                              </div>
                           </div>
                           <p className="text-[10px] text-slate-500 font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-100">Cat: {store.category_id || store.category}</p>

                           {/* BOUTON DÉLIAISON (Anciennement Suppression) */}
                           {onUnlinkStore && (
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Retirer le magasin "${store.name}" de la carte ? Ses informations resteront dans le catalogue.`)) {
                                       onUnlinkStore(store.id);
                                    }
                                 }}
                                 className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all border border-orange-100"
                              >
                                 <LocateOff size={12} /> Délier de la Carte
                              </button>
                           )}
                        </div>
                     </Popup>
                  </Marker>
               );
            })}

            {/* LIVREURS */}
            {drivers.map(driver => {
               const lat = driver.lastLat ?? driver.last_lat;
               const lng = driver.lastLng ?? driver.last_lng;
               if (driver.status === 'offline' || !lat || !lng) return null;

               const isBusy = driver.status === 'busy' || orders.some(o => o.assignedDriverId === driver.id && o.status !== 'delivered');
               const activeOrder = orders.find(o => o.assignedDriverId === driver.id && o.status !== 'delivered');

               return (
                  <Marker
                     key={driver.id}
                     position={[lat, lng]}
                     icon={isBusy ? DriverBusyMarkerIcon : DriverIdleMarkerIcon}
                  >
                     <Popup autoPan={false}>
                        <div className="p-2 min-w-[150px]">
                           <h3 className="font-bold text-gray-900 text-base">{driver.full_name || driver.fullName}</h3>
                           <p className="text-[10px] text-gray-400 font-mono">ID LIVREUR: {driver.id}</p>
                           <div className="mt-2 text-xs border-t pt-2">
                              <p><b>Statut:</b> {isBusy ? '?? En mission' : '?? Libre'}</p>
                              {activeOrder && <p className="text-[10px] bg-slate-100 p-1 rounded mt-2 font-bold font-mono">#{activeOrder.id.slice(-6)}</p>}
                           </div>
                        </div>
                     </Popup>
                  </Marker>
               );
            })}

            {/* POSITION DE LIVRAISON (SI COMMANDE SÉLECTIONNÉE) */}
            {selectedOrder && activeUserPos && (
               <Marker position={activeUserPos} icon={UserActiveMarkerIcon}>
                  <Popup>
                     <div className="p-2 min-w-[180px]">
                        <p className="font-black text-[10px] uppercase text-orange-600 mb-1">Destination de livraison</p>
                        <p className="font-bold text-slate-800">{selectedOrder.customerName}</p>

                        <div className="flex items-center justify-between mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                           <p className="text-[10px] text-slate-500 font-mono font-bold">{selectedOrder.phone}</p>
                           <button
                              onClick={() => {
                                 navigator.clipboard.writeText(selectedOrder.phone);
                                 alert("Numéro copié !");
                              }}
                              className="p-1 hover:bg-white rounded text-slate-400 hover:text-orange-500 transition-colors shadow-sm"
                           >
                              <Copy size={10} />
                           </button>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Magasin</p>
                           <p className="text-[10px] font-bold text-slate-700">{selectedOrder.storeName || 'Magasin de la commande'}</p>
                        </div>

                        <p className="text-[9px] bg-orange-100 p-1.5 rounded-lg mt-3 font-black text-orange-700 text-center uppercase tracking-widest border border-orange-200">COMMANDE #{selectedOrder.id.slice(-6)}</p>
                     </div>
                  </Popup>
               </Marker>
            )}

            {/* UTILISATEURS / CLIENTS */}
            {users.map(user => {
               const lat = user.lastLat ?? (user as any).last_lat;
               const lng = user.lastLng ?? (user as any).last_lng;
               if (!lat || !lng) return null;

               const hasActiveOrder = orders.some(o => (o as any).userId === user.id && o.status !== 'delivered' && !o.isArchived);
               const activeOrder = orders.find(o => (o as any).userId === user.id && o.status !== 'delivered');

               return (
                  <Marker
                     key={user.id}
                     position={[lat, lng]}
                     icon={hasActiveOrder ? UserActiveMarkerIcon : UserIdleMarkerIcon}
                  >
                     <Popup>
                        <div className="p-2 min-w-[150px]">
                           <h3 className="font-bold text-indigo-700 text-base">{user.fullName}</h3>
                           <p className="text-[10px] text-gray-400 font-mono">ID CLIENT: {user.id}</p>
                           <div className="mt-2 text-xs border-t pt-2">
                              {hasActiveOrder ? (
                                 <div className="bg-green-50 p-2 rounded border border-green-200 text-center">
                                    <p className="text-[9px] font-bold text-green-600 uppercase">Commande active</p>
                                    <p className="font-black text-green-900 font-mono">#{activeOrder?.id.slice(-6)}</p>
                                 </div>
                              ) : <p className="text-gray-400 italic">Aucune commande</p>}
                           </div>
                        </div>
                     </Popup>
                  </Marker>
               );
            })}

            {/* TRACÉS LOGISTIQUES (Polyline) */}
            {selectedOrder && activeUser && activeStore && (
               <>
                  {/* Tracé Magasin -> Client (Pointillé) */}
                  <Polyline
                     positions={[
                        getStorePos(activeStore) as [number, number],
                        [((activeUser as any).lastLat ?? (activeUser as any).lat) as number, ((activeUser as any).lastLng ?? (activeUser as any).lng) as number]
                     ]}
                     color="#22c55e"
                     dashArray="10, 10"
                     weight={2}
                  />
                  {/* Tracé Livreur -> Magasin (Plein) */}
                  {activeDriver && (
                     <Polyline
                        positions={[
                           [activeDriver.lastLat ?? activeDriver.last_lat as number, activeDriver.lastLng ?? activeDriver.last_lng as number],
                           getStorePos(activeStore) as [number, number]
                        ]}
                        color="#ef4444"
                        weight={3}
                     />
                  )}
               </>
            )}
         </MapContainer>
      </div>
   );
};

// Component pour afficher la heatmap dans les stats
const StatisticsMapComponent: React.FC<{ orders: Order[], drivers: Driver[], users: UserProfile[], stores: Store[] }> = ({ orders, drivers, users, stores }) => {
   const [map, setMap] = useState<any>(null);
   const containerRef = useRef<HTMLDivElement>(null);
   const initTimeoutRef = useRef<any>(null);
   const heatLayerRef = useRef<any>(null);
   const diagnosticLayersRef = useRef<any>(null);

   // Helper pour extraire les coordonnées d'une commande
   const getOrderCoordinates = (order: Order): [number, number] | null => {
      // 1. GPS Direct
      if (order.location?.lat && order.location?.lng) return [order.location.lat, order.location.lng];

      // 2. Notes
      const notes = [order.textOrder, order.deliveryNote].filter(Boolean) as string[];
      for (const text of notes) {
         const match = text.match(/google\.com\/maps\?(?:q|query)=([-.\d]+),([-.\d]+)/) || text.match(/@([-.\d]+),([-.\d]+)/) || text.match(/([-.\d]+)[,\s]+([-.\d]+)/);
         if (match) {
            const lat = parseFloat(match[1]), lng = parseFloat(match[2]);
            // Basic validation for coordinates within Morocco (approx)
            if (lat > 27 && lat < 36 && lng > -18 && lng < -1) return [lat, lng];
         }
      }

      // 3. Client Fallback
      if (order.userId) {
         const user = users.find(u => u.id === order.userId);
         const lat = user?.lastLat ?? (user as any)?.last_lat ?? (user as any)?.x;
         const lng = user?.lastLng ?? (user as any)?.last_lng ?? (user as any)?.y;
         if (lat && lng) return [lat + (Math.random() - 0.5) * 0.005, lng + (Math.random() - 0.5) * 0.005];
      }

      // 4. Store Fallback as last resort
      if (order.storeName) {
         const store = stores.find(s => s.name === order.storeName);
         if (store?.lat && store?.lng) return [store.lat + (Math.random() - 0.5) * 0.01, store.lng + (Math.random() - 0.5) * 0.01];
      }

      return null;
   };

   // Helper pour extraire les coordonnées d'un magasin
   const getStoreCoordinates = (store: Store): [number, number] | null => {
      if (store.lat && store.lng) return [store.lat, store.lng];

      const lat = store.maps_url?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[1] || store.mapsUrl?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[1];
      const lng = store.maps_url?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[2] || store.mapsUrl?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[2];

      return lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
   };

   useEffect(() => {
      if (!containerRef.current || map || typeof L === 'undefined') return;

      // Prevent multiple initialization on same container
      if ((containerRef.current as any)._leaflet_id) return;

      const mapInstance = L.map(containerRef.current, {
         zoomControl: false,
         attributionControl: false
      }).setView([34.2610, -6.5802], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '' }).addTo(mapInstance);
      setMap(mapInstance);

      initTimeoutRef.current = setTimeout(() => {
         if (mapInstance && containerRef.current && containerRef.current.offsetHeight > 0) {
            mapInstance.invalidateSize();
         }
      }, 300);

      return () => {
         if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
         if (mapInstance) mapInstance.remove();
      };
   }, []);

   useEffect(() => {
      if (!map || typeof L === 'undefined') return;

      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      if (diagnosticLayersRef.current) map.removeLayer(diagnosticLayersRef.current);

      // Collecter toutes les données de chaleur
      const heatData: [number, number, number][] = [];
      const markers: L.CircleMarker[] = [];

      // 1. Ajouter les positions des commandes (intensité 1.0 - très important)
      orders.forEach(order => {
         const coords = getOrderCoordinates(order);
         if (coords) {
            heatData.push([coords[0], coords[1], 1.0]);
            markers.push(L.circleMarker(coords, { radius: 3, color: 'red', fillColor: '#ff0000', fillOpacity: 1, weight: 1 }));
         }
      });

      // 2. Ajouter les positions des livreurs (intensité 0.7)
      drivers.forEach(driver => {
         const lat = driver.lastLat ?? driver.last_lat;
         const lng = driver.lastLng ?? driver.last_lng;
         if (lat && lng) {
            heatData.push([lat, lng, 0.7]);
         }
      });

      // 3. Ajouter les positions des magasins (intensité 0.9 - zones d'activité commerciale)
      stores.forEach(store => {
         const coords = getStoreCoordinates(store);
         if (coords) {
            heatData.push([coords[0], coords[1], 0.9]);
         }
      });

      if (markers.length > 0) diagnosticLayersRef.current = L.layerGroup(markers).addTo(map);

      if (typeof (L as any).heatLayer === 'function' && heatData.length > 0) {
         // Créer la heatmap avec des paramètres optimisés
         heatLayerRef.current = (L as any).heatLayer(heatData, {
            radius: 40,
            blur: 15,
            max: 1.0,
            gradient: { 0.4: 'lime', 0.6: 'yellow', 1.0: 'red' }
         }).addTo(map);
         map.setView([34.26, -6.58], 12);
      }
   }, [map, orders, drivers, users, stores]);

   return (
      <div className="relative w-full h-full rounded-[2rem] overflow-hidden border">
         <style>{`
             .leaflet-control-attribution {
                display: none !important;
             }
         `}</style>
         <div ref={containerRef} className="w-full h-full z-0" />
         {orders.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[2px] z-10 transition-opacity">
               <div className="text-center">
                  <Package className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Aucune donnée historique</p>
               </div>
            </div>
         )}
      </div>
   );
};

// Component pour afficher les stats d'un livreur
const DriverStats: React.FC<{ driverId: string }> = ({ driverId }) => {
   const [stats, setStats] = useState<{ total: number, daily: number } | null>(null);

   useEffect(() => {
      const fetchStats = async () => {
         try {
            const { data, error } = await supabase
               .from('driver_online_stats')
               .select('*')
               .eq('driver_id', driverId)
               .maybeSingle();

            if (error) throw error;
            if (data) {
               setStats({
                  total: Math.round(data.total_online_seconds / 3600),
                  daily: Math.round(data.daily_online_seconds / 3600)
               });
            }
         } catch (err) {
            console.error("Stats fetch error:", err);
         }
      };
      fetchStats();
   }, [driverId]);

   if (!stats) return null;

   return (
      <div className="flex gap-2 mt-1">
         <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">Total: {stats.total}h</span>
         <span className="text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase">24h: {stats.daily}h</span>
      </div>
   );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
   orders: propOrders, users, drivers, stores, announcements: propAnnouncements, categories: propCategories, subCategories: propSubCategories, supportNumber: propSupport, deliveryZone: propDeliveryZone = 'kenitra', deliveryFeePerKm: propDeliveryFeePerKm,
   onUpdateStatus, onAssignDriver, onArchiveOrder, onRestoreOrder, onDeletePermanently,
   onBanUser, onUpdateSettings, onCreateAnnouncement, onDeleteAnnouncement, onLogout, onBack, setStores,
   pageVisibility = { hideFinance: false, hideStatistics: false, hideAnnouncements: false }
}) => {
   const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PRODUCTS' | 'DRIVERS' | 'PARTNERS' | 'USERS' | 'FINANCE' | 'STATISTICS' | 'HISTORY' | 'CATEGORIES' | 'CONFIG' | 'MAPS' | 'SUPPORT_TICKETS'>('OVERVIEW');
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
   const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
   const [deliveryZone, setDeliveryZone] = useState<'kenitra' | 'all_morocco'>(propDeliveryZone || 'kenitra');
   // Local state for orders to enable optimistic updates
   const [localOrders, setLocalOrders] = useState<Order[]>(propOrders);
   // delivery fee per km (configurable)
   const [feePerKm, setFeePerKm] = useState<number>(typeof (deliveryFeePerKm) !== 'undefined' ? deliveryFeePerKm : 3);
   const [savingFeePerKm, setSavingFeePerKm] = useState(false);
   const [savedFeePerKm, setSavedFeePerKm] = useState(false);
   const [viewingImage, setViewingImage] = useState<string | null>(null);
   const [currentAdmin, setCurrentAdmin] = useState<any>(null);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [productAdditionalImages, setProductAdditionalImages] = useState<string[]>([]);

   useEffect(() => {
      const adminData = localStorage.getItem('veetaa_admin_token');
      if (adminData) {
         try {
            setCurrentAdmin(JSON.parse(adminData));
         } catch (e) {
            console.error("Error parsing admin data", e);
         }
      }
   }, []);

   // Sync local orders with prop orders when props change
   useEffect(() => {
      setLocalOrders(propOrders);
   }, [propOrders]);

   // Sync delivery settings with props when they change
   useEffect(() => {
      if (propDeliveryZone) {
         setDeliveryZone(propDeliveryZone);
         console.log(`AdminDashboard: deliveryZone synced from props to ${propDeliveryZone}`);
      }
      if (typeof propDeliveryFeePerKm !== 'undefined') {
         setFeePerKm(propDeliveryFeePerKm);
         console.log(`AdminDashboard: feePerKm synced from props to ${propDeliveryFeePerKm}`);
      }
   }, [propDeliveryZone, propDeliveryFeePerKm]);

   // États pour lier un store à la carte
   const [pickingStore, setPickingStore] = useState<Store | null>(null);
   const [pickingPos, setPickingPos] = useState<[number, number] | null>(null);
   useEffect(() => {
      if (selectedOrder) {
         setEditingOrderNotes(selectedOrder.textOrder || '');
      }
   }, [selectedOrder]);

   // When an order is selected, fetch the latest row from DB to ensure we have
   // the latest base64 images (store_invoice_base64, prescription_base64, etc.)
   useEffect(() => {
      let mounted = true;
      const fetchSelectedOrder = async () => {
         if (!selectedOrder?.id) return;
         try {
            const { data, error } = await supabase
               .from('orders')
               .select('store_invoice_base64, prescription_base64, payment_receipt_base64, text_order_notes, delivery_note')
               .eq('id', parseInt(selectedOrder.id))
               .single();
            if (error) {
               // not fatal; show console for debugging
               console.warn('fetchSelectedOrder error', error);
               return;
            }
            if (!mounted || !data) return;
            setSelectedOrder(prev => prev ? {
               ...prev,
               store_invoice_base64: data.store_invoice_base64 || prev.store_invoice_base64,
               prescription_base64: data.prescription_base64 || prev.prescription_base64,
               payment_receipt_base64: data.payment_receipt_base64 || prev.payment_receipt_base64,
               textOrder: data.text_order_notes || prev.textOrder,
               deliveryNote: data.delivery_note || prev.deliveryNote
            } : prev);
         } catch (err) {
            console.error('Error fetching single order data:', err);
         }
      };

      fetchSelectedOrder();
      return () => { mounted = false; };
   }, [selectedOrder?.id]);
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
   const [dateFilter, setDateFilter] = useState('');
   const [storeFilter, setStoreFilter] = useState('all');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(15);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

   // Balance filter for drivers (24H, 2J, 3J, 4J, 5J, 7J)
   const [balanceRange, setBalanceRange] = useState<'24H' | '2J' | '3J' | '4J' | '5J' | '7J'>('24H');

   // --- Search input: use uncontrolled input + debounce to avoid re-renders on every keystroke ---
   const searchInputRef = useRef<HTMLInputElement | null>(null);
   const searchDebounceRef = useRef<number | null>(null);

   const handleSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
      const value = (e.target as HTMLInputElement).value;
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = window.setTimeout(() => {
         setSearchTerm(value);
      }, 250);
   };

   useEffect(() => {
      // sync debouncedSearchTerm (heavy filters use this)
      const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
      return () => clearTimeout(t);
   }, [searchTerm]);

   // cleanup debounce on unmount
   useEffect(() => {
      return () => { if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current); };
   }, []);

   // Selection State
   const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);


   // 1s Update frequency for interpolation (especially for MAPS tab)
   // REMOVED: Managed by Realtime subscription in App.tsx to prevent fetch storm
   useEffect(() => {
      /*
     if (activeTab !== 'MAPS') return;
     const interval = setInterval(() => {
        onBack(); // Triggers data refresh in parent
     }, 1000);
     return () => clearInterval(interval);
     */
   }, [activeTab]);
   const [dbCategories, setDbCategories] = useState<any[]>([]);

   useEffect(() => {
      if (propCategories && propCategories.length > 0) {
         setDbCategories(propCategories);
      }
   }, [propCategories]);



   const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await onBack(); // This triggers the parent to refresh data
      setTimeout(() => setIsRefreshing(false), 800);
   };

   // Reset page when filters or tab change
   useEffect(() => {
      setCurrentPage(1);
   }, [searchTerm, statusFilter, dateFilter, storeFilter, activeTab]);

   // Keep selectedOrder in sync with propOrders data in real-time
   useEffect(() => {
      if (selectedOrder) {
         const updatedOrder = propOrders.find(o => o.id === selectedOrder.id);
         if (updatedOrder) {
            // Vérifier si le champ de facture a changé
            if (updatedOrder.store_invoice_base64 !== selectedOrder.store_invoice_base64) {
               console.log("Invoice updated for order:", updatedOrder.id);
            }
            setSelectedOrder(updatedOrder);
         }
      }
   }, [propOrders, selectedOrder?.id]);

   const localProducts = stores.filter(s => !s.is_deleted).flatMap(s => s.products || []);

   const onEditProduct = useCallback((id: string) => {
      const prod = localProducts.find(x => x.id === id);
      if (!prod) return;
      setEditingProduct(prod);
      setProductImagePreview(prod.image || null);
      setProductAdditionalImages(prod.product_images || prod.images || []);
      setShowAddProduct(true);
   }, [localProducts]);

   const handleToggleStoreStatus = async (id: string, field: 'is_open' | 'is_active', current: boolean) => {
      const { error } = await supabase.from('stores').update({ [field]: !current }).eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };

   const handleDeleteStore = async (store: Store) => {
      // Compter les produits associés
      const { data: products, error } = await supabase
         .from('products')
         .select('id')
         .eq('store_id', store.id);

      if (error) {
         console.error("Erreur lors du comptage des produits:", error);
      }

      setStoreToDelete(store);
      setShowDeleteStoreModal(true);
   };

   // Store handlers (stable references for memoized StoreCard)
   const onEditStore = useCallback((id: string) => {
      const s = stores.find(x => x.id === id);
      if (!s) return;
      // Normalize older stores that may use `category` instead of `category_id`
      const normalized = { ...s, category_id: (s as any).category_id || (s as any).category } as Store;
      setEditingStore(normalized);
      setStoreImagePreview(null);
      setShowAddPartner(true);
   }, [stores]);

   const onToggleOpenStore = useCallback((id: string, current: boolean | undefined) => {
      handleToggleStoreStatus(id, 'is_open', !!current);
   }, [handleToggleStoreStatus]);

   const onToggleActiveStore = useCallback((id: string, current: boolean | undefined) => {
      handleToggleStoreStatus(id, 'is_active', !!current);
   }, [handleToggleStoreStatus]);

   const onDeleteStoreStable = useCallback((id: string) => {
      const s = stores.find(x => x.id === id);
      if (!s) return;
      handleDeleteStore(s);
   }, [stores, handleDeleteStore]);

   const handleUnlinkStore = useCallback(async (id: string) => {
      const { error } = await supabase
         .from('stores')
         .update({
            latitude: null,
            longitude: null,
            maps_url: null
         })
         .eq('id', id);

      if (error) {
         alert("Erreur lors de la déliaison : " + error.message);
      } else {
         // Mise à jour locale immédiate
         setStores(prev => prev.map(s => s.id === id ? { ...s, latitude: null, longitude: null, maps_url: null } : s));
      }
   }, [supabase]);
   const [supportNumber, setSupportNumber] = useState('+212 600 000 000');
   const [ribs, setRibs] = useState<RIB[]>([]);
   const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '', email: '' });
   const [showAddRIB, setShowAddRIB] = useState(false);
   const [editingRIB, setEditingRIB] = useState<RIB | null>(null);
   const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

   const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
   const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
   const [replyText, setReplyText] = useState('');
   const replyInputRef = useRef<HTMLInputElement | null>(null);
   const [replyHasText, setReplyHasText] = useState(false);
   const [supportFilter, setSupportFilter] = useState<'all' | 'pending' | 'resolved'>('all');
   const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
   const messagesEndRef = useRef<HTMLDivElement | null>(null);


   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };

   useEffect(() => {
      scrollToBottom();
   }, [supportMessages]);

   const fetchData = async () => {
      try {
         const { data: catData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
         if (catData) setDbCategories(catData);

         const { data: ribsData } = await supabase.from('ribs').select('*').order('id', { ascending: true });
         if (ribsData) setRibs(ribsData);

         const { data: supportInfoData } = await supabase.from('support_info').select('*').limit(1);
         if (supportInfoData && supportInfoData.length > 0) {
            setSupportInfo(supportInfoData[0]);
            setSupportNumber(supportInfoData[0].phone);
         }

         const { data: ticketsData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
         if (ticketsData) setSupportTickets(ticketsData);
      } catch (err) {
         console.error("Erreur fetchData:", err);
      }
   };

   const fetchMessages = async (ticketId: string) => {
      const { data, error } = await supabase
         .from('support_messages')
         .select('*')
         .eq('ticket_id', ticketId)
         .order('created_at', { ascending: true });

      if (error) {
         console.error("Erreur fetchMessages:", error);
      } else if (data) {
         setSupportMessages(data);
      }
   };

   useEffect(() => {
      if (selectedTicket) {
         fetchMessages(selectedTicket.id);

         const channel = supabase
            .channel(`ticket_messages_${selectedTicket.id}`)
            .on('postgres_changes', {
               event: 'INSERT',
               schema: 'public',
               table: 'support_messages',
               filter: `ticket_id=eq.${selectedTicket.id}`
            }, (payload) => {
               setSupportMessages(prev => [...prev, payload.new as SupportMessage]);
            })
            .subscribe();

         return () => {
            supabase.removeChannel(channel);
         };
      } else {
         setSupportMessages([]);
      }
   }, [selectedTicket]);

   useEffect(() => {
      fetchData();

      const channel = supabase
         .channel('support_tickets_admin')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
            fetchData();
         })
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, []);
   const weeklyData = useMemo(() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
         const date = new Date();
         date.setDate(date.getDate() - (6 - i));
         return {
            dateStr: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
            timestamp: new Date(date.setHours(0, 0, 0, 0)).getTime()
         };
      });

      return last7Days.map(day => {
         const count = propOrders.filter(o => {
            const orderDate = new Date(o.timestamp);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === day.timestamp;
         }).length;

         return {
            name: day.dateStr,
            ventes: count
         };
      });
   }, [propOrders]);

   const topStores = useMemo(() => {
      return Object.entries(propOrders.reduce((acc, order) => {
         const storeName = order.storeName || 'Inconnu';
         acc[storeName] = (acc[storeName] || 0) + 1;
         return acc;
      }, {} as Record<string, number>))
         .map(([name, count]) => ({ name, count }))
         .sort((a, b) => b.count - a.count)
         .slice(0, 5);
   }, [propOrders]);

   const successRateStats = useMemo(() => {
      return [
         { name: 'Livrées', value: propOrders.filter(o => o.status === 'delivered').length },
         { name: 'Incomplètes/Annulées', value: propOrders.filter(o => ['refused', 'unavailable', 'cancelled'].includes(o.status)).length }
      ];
   }, [propOrders]);

   const loyalClients = useMemo(() => {
      return Object.values(propOrders.reduce((acc, order) => {
         const groupingKey = (order.phone && order.phone !== 'null' && order.phone !== 'undefined')
            ? order.phone
            : `name_${order.customerName}`;

         if (!acc[groupingKey]) {
            acc[groupingKey] = { name: order.customerName, count: 0 };
         }
         acc[groupingKey].count += 1;
         return acc;
      }, {} as Record<string, { name: string, count: number }>))
         .sort((a, b) => b.count - a.count)
         .slice(0, 5);
   }, [propOrders]);

   const [editingOrderNotes, setEditingOrderNotes] = useState<string>('');
   const [showAddDriver, setShowAddDriver] = useState(false);
   const [driverProfileImage, setDriverProfileImage] = useState<string | null>(null);
   const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
   const [driverDocs, setDriverDocs] = useState<DriverDocument[]>([]);
   const [driverWarns, setDriverWarns] = useState(0);
   const [localDrivers, setLocalDrivers] = useState<Driver[]>(drivers);
   const [updatingWarnings, setUpdatingWarnings] = useState<Set<string>>(new Set());

   useEffect(() => {
      if (editingDriver) {
         setDriverDocs(editingDriver.documents || []);
         setDriverWarns(editingDriver.warns || 0);
      } else {
         setDriverDocs([]);
         setDriverWarns(0);
      }
   }, [editingDriver]);

   // Synchronize local drivers with props
   useEffect(() => {
      setLocalDrivers(drivers);
   }, [drivers]);
   const [showAddProduct, setShowAddProduct] = useState(false);
   const [showAddPartner, setShowAddPartner] = useState(false);
   const [editingStore, setEditingStore] = useState<Store | null>(null);
   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
   const [showAddCategory, setShowAddCategory] = useState(false);
   const [editingCategory, setEditingCategory] = useState<any | null>(null);
   const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
   const [showDeleteStoreModal, setShowDeleteStoreModal] = useState(false);
   const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
   const [deleteStorePassword, setDeleteStorePassword] = useState('');
   const [isDeleting, setIsDeleting] = useState(false);
   useEffect(() => {
      if (editingCategory) {
         setCategoryImagePreview(editingCategory.image_url || null);
      } else {
         setCategoryImagePreview(null);
      }
   }, [editingCategory]);

   const [showAddSubCategory, setShowAddSubCategory] = useState(false);
   const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);

   const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => setCategoryImagePreview(reader.result as string);
         reader.readAsDataURL(file);
      }
   };
   const [storeImagePreview, setStoreImagePreview] = useState<string | null>(null);
   const [isSavingStore, setIsSavingStore] = useState(false);
   const [productImagesPreviews, setProductImagesPreviews] = useState<string[]>([]);
   const [hasProductsEnabled, setHasProductsEnabled] = useState(false);
   const STORE_UI_FIELD_KEYS = ['gallery', 'custom_note', 'budget', 'image'] as const;
   const STORE_LABEL_ONLY_KEYS = ['gallery', 'budget', 'image'] as const;
   const [storeUserVisible, setStoreUserVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(['gallery', 'custom_note', 'budget', 'image'].map(k => [k, true])));
   const [storeUserLabels, setStoreUserLabels] = useState<Record<string, string>>({});
   // Unified image management - first image is always the main image
   const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
   const [extractedCoordinates, setExtractedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

   // Prevent background scroll while any modal is open (helps reduce layout thrash)
   useEffect(() => {
      const anyModalOpen = showAddPartner || showAddProduct || showAddCategory || showAddRIB || showDeleteStoreModal || showProfileModal || showAddSubCategory;
      document.body.style.overflow = anyModalOpen ? 'hidden' : '';
      return () => { document.body.style.overflow = ''; };
   }, [showAddPartner, showAddProduct, showAddCategory, showAddRIB, showDeleteStoreModal, showProfileModal, showAddSubCategory]);

   const USER_UI_FIELD_KEYS = ['name', 'price', 'image', 'description', 'custom_note'] as const;
   const LABEL_ONLY_KEYS = ['name', 'price', 'image', 'description'] as const; // show/hide only, no editable label
   const DEFAULT_LABELS: Record<string, string> = { custom_note: 'ex: commande 1' };
   const PHARMACIE_LABELS: Record<string, string> = { custom_note: "Détails ordonnance / Médicaments" };
   const [productUserVisible, setProductUserVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(USER_UI_FIELD_KEYS.map(k => [k, true])));
   const [productUserLabels, setProductUserLabels] = useState<Record<string, string>>({});
   const [productUserUsePharmacieLabels, setProductUserUsePharmacieLabels] = useState(false);
   const [productFormStoreId, setProductFormStoreId] = useState<string>('');
   const productFormStore = stores.find(s => s.id === productFormStoreId);
   const isProductFormStorePharmacie = productFormStore?.category_id === 'pharmacie' || productFormStore?.category === 'pharmacie';

   useEffect(() => {
      if (!showAddProduct) return;
      if (editingProduct) {
         setProductFormStoreId((editingProduct as any).store_id || '');
         const vis = (editingProduct as any).user_visible_fields;
         const lab = (editingProduct as any).user_field_labels || {};
         if (Array.isArray(vis)) setProductUserVisible(prev => ({ ...Object.fromEntries(USER_UI_FIELD_KEYS.map(k => [k, true])), ...Object.fromEntries(USER_UI_FIELD_KEYS.map(k => [k, vis.includes(k)])) }));
         if (lab && typeof lab === 'object') setProductUserLabels({ ...lab });
         setProductUserUsePharmacieLabels(false);
      } else {
         setProductFormStoreId(stores.filter(s => !s.is_deleted)[0]?.id || '');
         setProductUserVisible(Object.fromEntries(USER_UI_FIELD_KEYS.map(k => [k, true])));
         setProductUserLabels({});
         setProductUserUsePharmacieLabels(false);
      }
   }, [showAddProduct, editingProduct?.id]);

   useEffect(() => {
      if (productUserUsePharmacieLabels && isProductFormStorePharmacie) {
         setProductUserLabels({ ...PHARMACIE_LABELS });
      }
   }, [productUserUsePharmacieLabels, isProductFormStorePharmacie]);
   const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
   const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
   const [announcementImagePreview, setAnnouncementImagePreview] = useState<string | null>(null);
   const [mapsUrlInput, setMapsUrlInput] = useState('');
   const [extractionError, setExtractionError] = useState<string | null>(null);

   // Effet pour initialiser les coordonnées quand on édite un store
   useEffect(() => {
      if (editingStore) {
         setMapsUrlInput(editingStore.maps_url || '');
         if (editingStore.latitude && editingStore.longitude) {
            setExtractedCoordinates({ lat: editingStore.latitude, lng: editingStore.longitude });
         } else {
            setExtractedCoordinates(null);
         }
      } else {
         setMapsUrlInput('');
         setExtractedCoordinates(null);
         setExtractionError(null);
      }

      // Initialiser aussi les images produits si elles existent (pour éviter de les perdre)
      if (editingStore && editingStore.has_products) {
         setHasProductsEnabled(true);
         // Ici on devrait charger les images, mais comme elles sont liées aux produits, c'est plus complexe.
         // Pour l'instant on garde juste l'état activé.
      } else {
         setHasProductsEnabled(false);
      }
   }, [editingStore]);

   // Init store user-visible fields when partner modal opens (for stores without products)
   useEffect(() => {
      if (!showAddPartner) return;
      if (editingStore) {
         // Normalize category fields for legacy stores (category vs category_id)
         if (!(editingStore as any).category_id && (editingStore as any).category) {
            setEditingStore(prev => prev ? { ...prev, category_id: (prev as any).category } : prev);
         }

         const vis = (editingStore as any).user_visible_fields;
         const lab = (editingStore as any).user_field_labels || {};
         if (Array.isArray(vis)) setStoreUserVisible(prev => ({ ...Object.fromEntries(STORE_UI_FIELD_KEYS.map(k => [k, true])), ...Object.fromEntries(STORE_UI_FIELD_KEYS.map(k => [k, vis.includes(k)])) }));
         if (lab && typeof lab === 'object') setStoreUserLabels({ ...lab });
      } else {
         setStoreUserVisible(Object.fromEntries(STORE_UI_FIELD_KEYS.map(k => [k, true])));
         setStoreUserLabels({});
      }
   }, [showAddPartner, editingStore?.id]);

   // --- LOGO (pour les PDF) ---
   const logo = "LOGO.png"; // Sera géré par le chemin relatif ou base64

   // --- ACTIONS ---
   const copyToClipboard = (text: string, message?: string) => {
      navigator.clipboard.writeText(text);
      alert(message || ("Copié : " + text));
   };

   // Extract coordinates from Google Maps URL
   const extractCoordinatesFromUrl = (url: string) => {
      if (!url) {
         setExtractedCoordinates(null);
         return;
      }

      // Vérifier si c'est une URL raccourcie
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
         setExtractionError('URL raccourcie détectée ! Ouvrez ce lien dans votre navigateur, puis copiez l\'URL complète.');
         setExtractedCoordinates(null);
         return;
      }

      setExtractionError(null);
      extractFromFinalUrl(url);
   };

   const extractFromFinalUrl = async (url: string) => {
      // Pattern 1: @lat,lng,zoom (most common)
      const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d+)/;
      // Pattern 2: query parameter format
      const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d+)/;
      // Pattern 3: ll parameter
      const pattern3 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d+)/;
      // Pattern 4: !3d (latitude) !4d (longitude) - format alternatif
      const pattern4 = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d+)/;
      // Pattern 5: Raw coordinates "lat, lng"
      const pattern5 = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;

      let match = url.trim().match(pattern1) || url.trim().match(pattern2) || url.trim().match(pattern3) || url.trim().match(pattern4) || url.trim().match(pattern5);

      if (match) {
         const lat = parseFloat(match[1]);
         const lng = parseFloat(match[2]);
         setExtractedCoordinates({ lat, lng });

         // Si on édite un magasin existant, sauvegarder automatiquement les coordonnées
         if (editingStore) {
            const { error } = await supabase
               .from('stores')
               .update({
                  latitude: lat,
                  longitude: lng,
                  maps_url: url
               })
               .eq('id', editingStore.id);

            if (error) {
               setExtractionError('Erreur lors de la sauvegarde : ' + error.message);
            } else {
               // Succès - les coordonnées sont sauvegardées
               setExtractionError(null);

               // Mettre à jour l'état local sans recharger la page
               if (setStores) {
                  setStores(prevStores => prevStores.map(s =>
                     s.id === editingStore.id
                        ? { ...s, latitude: lat, longitude: lng, maps_url: url }
                        : s
                  ));
               }

               // Mettre à jour le magasin en cours d'édition pour refléter les changements
               setEditingStore(prev => prev ? { ...prev, latitude: lat, longitude: lng, maps_url: url } : null);
            }
         }
      } else {
         setExtractedCoordinates(null);
         setExtractionError('Impossible d\'extraire les coordonnées de cette URL.');
      }
   };



   const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      let categoryImageURL = editingCategory ? editingCategory.image_url : "";

      try {
         if (categoryImagePreview && categoryImagePreview.startsWith('data:')) {
            const blob = await dataUrlToBlob(categoryImagePreview);
            const fileName = `category_${Date.now()}.png`;
            const { data, error: uploadError } = await supabase.storage.from('stores').upload(fileName, blob); // Using 'stores' bucket as fallback if 'categories' doesn't exist
            if (uploadError) {
               alert(`Erreur upload catégorie : ${uploadError.message}`);
               return;
            }
            if (data) {
               categoryImageURL = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
            }
         }

         const catData: any = {
            id: editingCategory ? editingCategory.id : (formData.get('id') as string),
            name_fr: formData.get('name_fr') as string,
            name_ar: formData.get('name_ar') as string,
            name_en: formData.get('name_en') as string,
            display_order: parseInt(formData.get('display_order') as string) || 0,
            image_url: categoryImageURL,
            sub_categories: (formData.get('sub_categories') as string || "").split(',').map(s => s.trim()).filter(s => s !== "")
         };

         if (editingCategory) {
            const { error } = await supabase.from('categories').update(catData).eq('id', editingCategory.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddCategory(false);
               setEditingCategory(null);
               setCategoryImagePreview(null);
               fetchData();
               onBack();
            }
         } else {
            const { error } = await supabase.from('categories').insert([catData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddCategory(false);
               setCategoryImagePreview(null);
               fetchData();
               onBack();
            }
         }
      } catch (err) {
         alert("Erreur lors de la création de la catégorie");
      }
   };

   const handleCreateSubCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const subData = {
         name: formData.get('name') as string,
         category_id: formData.get('category_id') as string,
      };

      try {
         if (editingSubCategory) {
            const { error } = await supabase.from('sub_categories').update(subData).eq('id', editingSubCategory.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddSubCategory(false);
               setEditingSubCategory(null);
               onBack();
            }
         } else {
            const { error } = await supabase.from('sub_categories').insert([subData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddSubCategory(false);
               onBack();
            }
         }
      } catch (err) {
         alert("Erreur lors de la création de la sous-catégorie");
      }
   };

   const handleDeleteSubCategory = async (id: string) => {
      if (!confirm("Voulez-vous vraiment supprimer cette sous-catégorie ?")) return;
      const { error } = await supabase.from('sub_categories').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };


   const handleCreateProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      let productImageURL = editingProduct ? (editingProduct as any).image : (formData.get('image_url') as string);
      let additionalImageURLs: string[] = [];

      try {
         // Upload Main Image
         if (productImagePreview && productImagePreview.startsWith('data:')) {
            const blob = await dataUrlToBlob(productImagePreview);
            const fileName = `product_${Date.now()}.png`;
            const { data, error: uploadError } = await supabase.storage.from('products').upload(fileName, blob);
            if (uploadError) {
               alert(`Erreur upload produit : ${uploadError.message}`);
               return;
            }
            if (data) {
               productImageURL = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
            }
         }

         // Upload Additional Images
         if (productAdditionalImages.length > 0) {
            const existingImages = productAdditionalImages.filter(img => !img.startsWith('data:'));
            additionalImageURLs = [...existingImages];

            const newImages = productAdditionalImages.filter(img => img.startsWith('data:'));
            for (const imgBase64 of newImages) {
               const blob = await dataUrlToBlob(imgBase64);
               const fileName = `prod_extra_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
               const { data, error: uploadError } = await supabase.storage.from('products').upload(fileName, blob);
               if (!uploadError && data) {
                  const publicUrl = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
                  additionalImageURLs.push(publicUrl);
               }
            }
         }



         const visibleFields = USER_UI_FIELD_KEYS.filter(k => productUserVisible[k] !== false);
         const fieldLabels: Record<string, string> = {};
         USER_UI_FIELD_KEYS.forEach(k => {
            const formKey = `product_label_${k}`;
            const formVal = String(formData.get(formKey) || '');
            const v = formVal?.trim() || (productUserLabels[k]?.trim() || '');
            if (v) fieldLabels[k] = v;
         });
         const prodData = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            store_id: formData.get('store_id') as string,
            image_url: productImageURL,
            description: formData.get('description') as string,
            price_editable: formData.get('price_editable') === 'on',
            product_images: additionalImageURLs,
            user_visible_fields: visibleFields,
            user_field_labels: Object.keys(fieldLabels).length ? fieldLabels : {}
         };

         if (editingProduct) {
            const { error } = await supabase.from('products').update(prodData).eq('id', editingProduct.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddProduct(false);
               setEditingProduct(null);
               setProductImagePreview(null);
               setProductAdditionalImages([]);
               onBack();
            }
         } else {
            const { error } = await supabase.from('products').insert([prodData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddProduct(false);
               setProductImagePreview(null);
               setProductAdditionalImages([]);
               onBack();
            }
         }
      } catch (err) {
         alert("Erreur lors de la création du produit");
      }
   };

   const handleCreateDriver = async (e: React.FormEvent) => {
      console.log("handleCreateDriver START");
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const phone = formData.get('phone') as string;

      if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) {
         alert("Le numéro de téléphone doit comporter exactement 10 chiffres (ex: 0600000000)");
         return;
      }

      let profilePhotoUrl = editingDriver ? (editingDriver.profile_photo || editingDriver.profilePhoto) : "";

      try {
         if (driverProfileImage && driverProfileImage.startsWith('data:')) {
            const blob = await dataUrlToBlob(driverProfileImage);
            const fileName = `driver_${Date.now()}.png`;
            const { data, error: uploadError } = await supabase.storage.from('drivers').upload(fileName, blob);

            if (uploadError) {
               alert(`Erreur lors de l'upload de l'image : ${uploadError.message}`);
               return;
            }

            if (data) {
               profilePhotoUrl = supabase.storage.from('drivers').getPublicUrl(fileName).data.publicUrl;
            }
         }

         // Gestion des documents multiples
         let finalDocs: DriverDocument[] = [];
         for (const doc of driverDocs) {
            if (doc.url.startsWith('data:')) {
               const blob = await dataUrlToBlob(doc.url);
               const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`; // ou png, on pourrait détecter le type
               const { data, error: uploadError } = await supabase.storage.from('drivers').upload(fileName, blob);

               if (!uploadError && data) {
                  const publicUrl = supabase.storage.from('drivers').getPublicUrl(fileName).data.publicUrl;
                  finalDocs.push({ ...doc, url: publicUrl });
               } else {
                  // Fallback si erreur ou autre
                  console.error("Erreur upload doc", uploadError);
                  finalDocs.push(doc);
               }
            } else {
               finalDocs.push(doc);
            }
         }

         const driverData = {
            full_name: formData.get('full_name') as string,
            phone: phone,
            id_card_number: formData.get('id_card_number') as string,
            profile_photo: profilePhotoUrl,
            description: formData.get('description') as string,
            status: editingDriver ? editingDriver.status : 'available',
            documents: finalDocs,
            warns: driverWarns
         };

         if (editingDriver) {
            const { error } = await supabase.from('drivers').update(driverData).eq('id', editingDriver.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddDriver(false);
               setEditingDriver(null);
               setDriverProfileImage(null);
               onBack();
            }
         } else {
            const newDriver = {
               ...driverData,
               id: "LIV-" + Math.floor(1000 + Math.random() * 9000),
            };
            const { error } = await supabase.from('drivers').insert([newDriver]);
            if (error) alert("Erreur: " + error.error_description || error.message);
            else {
               setShowAddDriver(false);
               setDriverProfileImage(null);
               onBack();
            }
         }
      } catch (err) {
         console.error("handleCreateDriver ERROR:", err);
         alert("Une erreur est survenue: " + (err as any)?.message);
      }
   };



   const handleDeleteCategory = async (id: string) => {
      if (!confirm("Supprimer cette catégorie ?")) return;
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
   };

   const handleToggleUserBlock = async (phone: string, current: boolean) => {
      const { error } = await supabase.from('users').update({ is_blocked: !current }).eq('phone', phone);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };

   const handleUpdateDriverWarns = async (id: string, newVal: number) => {
      // Optimistic update: update local state immediately
      setLocalDrivers(prev => prev.map(d => d.id === id ? { ...d, warns: newVal } : d));

      // Show animation state
      setUpdatingWarnings(prev => new Set([...prev, id]));

      // Update database in background
      const { error } = await supabase.from('drivers').update({ warns: newVal }).eq('id', id);

      // Stop animation
      setTimeout(() => {
         setUpdatingWarnings(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
         });
      }, 600);

      if (error) {
         console.error("Erreur lors de la mise à jour:", error);
         // Revert on error by fetching fresh data
         setLocalDrivers(drivers);
      }
   };

   // handleDeleteStore moved earlier to avoid "Cannot access 'handleDeleteStore' before initialization"
   // (function now declared near the other store handlers).

   const confirmDeleteStore = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!storeToDelete) return;

      setIsDeleting(true);
      const prevStore = storeToDelete; // capture for potential rollback
      const storeIdToDelete = prevStore.id;

      try {
         // 1. OPTIMISTIC UPDATE: remove from local UI immediately
         setStores(prev => prev.filter(s => s.id !== storeIdToDelete));

         // 2. Verify password quickly
         const { data: adminData, error: adminError } = await supabase
            .from('super_admins')
            .select('badge_id, username')
            .eq('badge_id', deleteStorePassword)
            .limit(1);

         if (adminError || !adminData || adminData.length === 0) {
            // ROLLBACK: restore the store if password wrong
            setStores(prev => [prevStore, ...prev]);
            alert('Mot de passe incorrect !');
            setDeleteStorePassword('');
            setIsDeleting(false);
            return;
         }

         // Close modal immediately so UI is not blocked (deletion continues in background)
         setShowDeleteStoreModal(false);
         setStoreToDelete(null);
         setDeleteStorePassword('');
         setIsDeleting(false);

         // 3. Perform DB deletions in background (don't block UI)
         (async () => {
            try {
               const [productsRes, favRes, ordersRes, storeRes] = await Promise.allSettled([
                  supabase.from('products').delete().eq('store_id', storeIdToDelete),
                  supabase.from('favorites').delete().eq('store_id', storeIdToDelete),
                  supabase.from('orders').update({ store_id: null }).eq('store_id', storeIdToDelete),
                  supabase.from('stores').delete().eq('id', storeIdToDelete)
               ]);

               // if any of the critical operations failed, rollback locally and notify admin
               const storeFailed = storeRes.status === 'rejected' || storeRes.value?.error;
               if (storeFailed) {
                  setStores(prev => [prevStore, ...prev]);
                  alert('Erreur suppression marque (rollback effectué)');
                  return;
               }

               // success — optionally show a toast here
               console.info('Store deleted (background):', storeIdToDelete);
            } catch (bgErr) {
               console.error('Background deletion error', bgErr);
               // rollback UI if needed
               setStores(prev => [prevStore, ...prev]);
               alert('Erreur lors de la suppression en arrière-plan');
            }
         })();

      } catch (err) {
         // immediate rollback on unexpected error
         setStores(prev => [prevStore, ...prev]);
         alert('Erreur: ' + (err instanceof Error ? err.message : 'Inconnu'));
         setIsDeleting(false);
      }
   };

   const handleDeleteDriver = async (id: string) => {
      if (!confirm("Supprimer ce livreur ?")) return;
      setIsDeleting(true);
      try {
         // Optimistic update
         setDrivers(prev => prev.filter(d => d.id !== id));
         const { error } = await supabase.from('drivers').delete().eq('id', id);
         if (error) {
            // Rollback
            const { data } = await supabase.from('drivers').select('*');
            if (data) setDrivers(data);
            alert("Erreur: " + error.message);
            return;
         }
      } catch (err) {
         alert("Erreur: " + (err instanceof Error ? err.message : "Inconnu"));
      } finally {
         setIsDeleting(false);
      }
   };

   const handleDeleteProduct = useCallback(async (id: string) => {
      if (!confirm("Supprimer ce produit ?")) return;
      setIsDeleting(true);
      try {
         // Optimistic update (local only)
         setStores(prev => prev.map(s => ({
            ...s,
            products: s.products?.filter(p => p.id !== id) || []
         })));

         const { error } = await supabase.from('products').delete().eq('id', id);
         if (error) {
            // Rollback: reload stores from DB
            const { data: freshStores } = await supabase.from('stores').select('*');
            if (freshStores) setStores(freshStores as any);
            alert("Erreur: " + error.message);
            return;
         }
      } catch (err) {
         // Try a lightweight rollback
         try {
            const { data: freshStores } = await supabase.from('stores').select('*');
            if (freshStores) setStores(freshStores as any);
         } catch (e) {
            console.error('Rollback failed', e);
         }
         alert("Erreur: " + (err instanceof Error ? err.message : "Inconnu"));
      } finally {
         setIsDeleting(false);
      }
   }, [setStores]);

   const handleUpdateOrderStatus = async (id: string, newStatus: OrderStatus) => {
      const currentOrder = localOrders.find(o => o.id === id);
      const currentHistory = (currentOrder?.statusHistory || []).map(h => ({
         status: h.status,
         timestamp: typeof h.timestamp === 'string' ? new Date(h.timestamp).getTime() : h.timestamp
      }));
      const newHistoryEntry = { status: newStatus, timestamp: Date.now() };
      const updatedHistory = [...currentHistory, newHistoryEntry];
      const isArchivedStatus = newStatus === 'delivered' || newStatus === 'refused' || newStatus === 'unavailable';

      // OPTIMISTIC UPDATE - mise à jour immédiate du state local
      setLocalOrders(prev => prev.map(o => o.id === id ? {
         ...o,
         status: newStatus,
         statusHistory: updatedHistory,
         isArchived: isArchivedStatus
      } : o));

      if (selectedOrder && selectedOrder.id === id) {
         setSelectedOrder(prev => prev ? { ...prev, status: newStatus, statusHistory: updatedHistory, isArchived: isArchivedStatus } : null);
      }

      // Mise à jour DB en arrière-plan
      const { error } = await supabase
         .from('orders')
         .update({
            status: newStatus,
            status_history: updatedHistory,
            is_archived: isArchivedStatus
         })
         .eq('id', parseInt(id));

      if (error) {
         // ROLLBACK - restaurer l'état précédent
         setLocalOrders(prev => prev.map(o => o.id === id ? currentOrder || o : o));
         if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder(selectedOrder);
         }
         alert("Erreur mise à jour: " + error.message);
      } else {
         onUpdateStatus(id, newStatus);
      }
   };

   const handleUpdateOrderNotes = async (orderId: string, notes: string) => {
      // OPTIMISTIC UPDATE
      if (selectedOrder && selectedOrder.id === orderId) {
         setSelectedOrder(prev => prev ? { ...prev, textOrder: notes } : null);
      }

      // DB update en arrière-plan
      const { error } = await supabase.from('orders').update({ text_order_notes: notes }).eq('id', parseInt(orderId));
      if (error) {
         alert("Erreur: " + error.message);
         // Reload to fix UI if error
         const { data } = await supabase.from('orders').select('*').eq('id', parseInt(orderId)).single();
         if (data) setSelectedOrder(data as any);
      }
   };

   const handleAssignDriver = async (orderId: string, driverId: string) => {
      // OPTIMISTIC UPDATE
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedDriverId: driverId } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
         setSelectedOrder(prev => prev ? { ...prev, assignedDriverId: driverId } : null);
      }

      // DB update en arrière-plan
      const { error } = await supabase.from('orders').update({ assigned_driver_id: driverId || null }).eq('id', parseInt(orderId));
      if (error) {
         alert("Erreur: " + error.message);
         // Rollback
         setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedDriverId: undefined } : o));
         if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, assignedDriverId: undefined } : null);
         }
      } else {
         onAssignDriver(orderId, driverId);
      }
   };

   const handleToggleOrderSelection = (id: string) => {
      setSelectedOrderIds(prev =>
         prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
      );
   };

   const handleSelectAllOrders = () => {
      if (selectedOrderIds.length > 0) {
         setSelectedOrderIds([]);
      } else {
         setSelectedOrderIds(paginatedOrders.map(o => o.id));
      }
   };

   const handleDeleteSingleOrder = async (id: string) => {
      if (!confirm(`Voulez-vous vraiment supprimer la commande #${id} ?`)) return;
      try {
         // Optimistic removal from the selection
         setSelectedOrderIds(prev => prev.filter(oid => oid !== id));

         // Call parent delete handler (which updates the props list)
         if (onDeletePermanently) {
            await onDeletePermanently(id);
         } else {
            // Fallback direct delete if prop is missing
            const { error } = await supabase.from('orders').delete().eq('id', parseInt(id));
            if (error) throw error;
            alert("Commande supprimée !");
            onBack();
         }
      } catch (err: any) {
         alert("Erreur: " + err.message);
      }
   };

   const handleBulkDeleteOrders = async () => {
      if (selectedOrderIds.length === 0) return;
      if (!confirm(`Voulez-vous supprimer ces ${selectedOrderIds.length} commandes définitivement ?`)) return;

      const idsToDelete = [...selectedOrderIds];
      try {
         // Reset selection immediately for responsiveness
         setSelectedOrderIds([]);

         // Delete each one
         for (const id of idsToDelete) {
            if (onDeletePermanently) {
               await onDeletePermanently(id);
            } else {
               await supabase.from('orders').delete().eq('id', parseInt(id));
            }
         }

         if (!onDeletePermanently) {
            alert(`${idsToDelete.length} commandes supprimées !`);
            onBack();
         }
      } catch (err: any) {
         alert("Erreur lors de la suppression groupée: " + err.message);
      }
   };

   const handleViewOrder = (orderId: string) => {
      const order = propOrders.find(o => o.id === orderId);
      if (order) {
         setSelectedOrder(order);
         setActiveTab('ORDERS');
      }
   };

   const handleUpdateDriverRating = async (orderId: string, rating: number) => {
      const { error } = await supabase.from('orders').update({ driver_rating: rating }).eq('id', parseInt(orderId));
      if (error) alert("Erreur: " + error.message);
      else {
         // Update local state
         setSelectedOrder(prev => prev ? { ...prev, driverRating: rating } : null);
         // Find the order in the main list and update it too (hacky but works for now without full refresh)
         const orderIndex = propOrders.findIndex(o => o.id === orderId);
         if (orderIndex >= 0) {
            propOrders[orderIndex].driverRating = rating;
         }
         onBack(); // Refresh data from parent
      }
   };

   const handleSaveStorePosition = async () => {
      if (!pickingStore || !pickingPos) return;
      const [lat, lng] = pickingPos;
      const mapsUrl = `https://www.google.com/maps?query=${lat},${lng}`;

      // FIX: utiliser 'latitude'/'longitude' (noms corrects des colonnes DB)
      const { error } = await supabase.from('stores').update({
         maps_url: mapsUrl,
         latitude: lat,
         longitude: lng
      }).eq('id', pickingStore.id);

      if (error) {
         alert("Erreur lors de la sauvegarde : " + error.message);
      } else {
         alert("Position du magasin mise à jour avec succès !");
         setPickingStore(null);
         setPickingPos(null);
         onBack(); // Refresh
      }
   };

   const handleSaveSupportInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const data = {
         phone: formData.get('phone') as string,
         email: formData.get('email') as string
      };

      if (supportInfo.id) {
         const { error } = await supabase.from('support_info').update(data).eq('id', supportInfo.id);
         if (error) alert("Erreur: " + error.message);
         else alert("Coordonnées support mises à jour !");
      } else {
         const { error } = await supabase.from('support_info').insert([data]);
         if (error) alert("Erreur: " + error.message);
         else alert("Coordonnées support enregistrées !");
      }
      fetchData();
   };

   const handleCreateRIB = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const ribData = {
         label: formData.get('label') as string,
         rib: formData.get('rib') as string,
         full_name: formData.get('full_name') as string
      };

      if (editingRIB) {
         const { error } = await supabase.from('ribs').update(ribData).eq('id', editingRIB.id);
         if (error) alert("Erreur: " + error.message);
         else {
            setShowAddRIB(false);
            setEditingRIB(null);
            fetchData();
         }
      } else {
         const { error } = await supabase.from('ribs').insert([ribData]);
         if (error) alert("Erreur: " + error.message);
         else {
            setShowAddRIB(false);
            fetchData();
         }
      }
   };

   const handleDeleteRIB = async (id: number) => {
      if (!confirm("Supprimer ce RIB ?")) return;
      const { error } = await supabase.from('ribs').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
   };

   const handleSaveSettings = async () => {
      const { error } = await supabase.from('settings').upsert({ key: 'support_phone', value: supportNumber });
      if (error) alert("Erreur: " + error.message);
      else alert("Paramètres enregistrés !");
   };

   const handleCreateStore = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSavingStore) return;
      setIsSavingStore(true);

      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      // Local preview URL (can be a data: URI) used for optimistic UI
      // FIX: fallback sur .image car fetchData() mappe image_url → .image dans le state local
      const localPreviewUrl = storeImagePreview || editingStore?.image_url || (editingStore as any)?.image || '';

      // Build the canonical store data to persist (do NOT include data: URIs in DB)
      const storeVisibleFields = STORE_UI_FIELD_KEYS.filter(k => storeUserVisible[k] !== false);
      const storeFieldLabels: Record<string, string> = {};
      STORE_UI_FIELD_KEYS.forEach(k => {
         // prefer form values (user may have typed and not blurred) else fallback to state
         const formKey = `user_label_${k}`;
         const formVal = String(formData.get(formKey) || '');
         const val = formVal?.trim() || (storeUserLabels[k]?.trim() || '');
         if (val) storeFieldLabels[k] = val;
      });
      const formCustomOrder = String(formData.get('custom_order_description') || '');
      const customOrderVal = formCustomOrder.trim() || (storeUserLabels.custom_order_description?.trim() || '');
      if (customOrderVal) storeFieldLabels.custom_order_description = customOrderVal;
      const storeData: any = {
         name: formData.get('name') as string,
         category_id: formData.get('category_id') as string,
         sub_category: formData.get('sub_category') as string,
         delivery_time_min: parseInt(formData.get('delivery_time_min') as string),
         maps_url: formData.get('maps_url') as string,
         // keep DB image_url empty for now if we're uploading a data URI — we'll patch later
         image_url: editingStore?.image_url || (editingStore as any)?.image || '',
         is_active: true,
         is_open: true,
         is_featured: formData.get('is_featured') === 'on',
         is_new: formData.get('is_new') === 'on',
         has_products: formData.get('has_products') === 'on',
         description: formData.get('description') as string,
         latitude: extractedCoordinates?.lat || null,
         longitude: extractedCoordinates?.lng || null,
         user_visible_fields: storeVisibleFields,
         user_field_labels: Object.keys(storeFieldLabels).length ? storeFieldLabels : {}
      };

      // --- OPTIMISTIC UI: show new/updated store immediately in list ---
      if (editingStore) {
         const prevStore = editingStore;
         const optimistic = { ...prevStore, ...storeData, image_url: localPreviewUrl } as Store;
         setStores(prev => prev.map(s => s.id === prevStore.id ? optimistic : s));

         // close UI right away
         setShowAddPartner(false);
         setEditingStore(null);
         setStoreImagePreview(null);
         onBack();

         // Persist in background
         (async () => {
            try {
               const { error: updateError } = await supabase.from('stores').update(storeData).eq('id', prevStore.id);
               if (updateError) {
                  // rollback optimistic change
                  setStores(prev => prev.map(s => s.id === prevStore.id ? prevStore : s));
                  alert('Erreur: ' + updateError.message);
                  return;
               }

               // If user provided an image (data URI), upload then patch image_url
               if (storeImagePreview && storeImagePreview.startsWith('data:')) {
                  const blob = await dataUrlToBlob(storeImagePreview);
                  const fileName = `store_${Date.now()}.png`;
                  const { data: uploadData, error: uploadError } = await supabase.storage.from('stores').upload(fileName, blob);
                  if (!uploadError && uploadData) {
                     const publicUrl = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
                     await supabase.from('stores').update({ image_url: publicUrl }).eq('id', prevStore.id);
                     setStores(prev => prev.map(s => s.id === prevStore.id ? { ...s, image_url: publicUrl } : s));
                  } else if (uploadError) {
                     console.warn('store image upload failed (background):', uploadError.message);
                  }
               }
            } catch (err) {
               console.error('Background update store failed', err);
               // rollback
               setStores(prev => prev.map(s => s.id === prevStore.id ? prevStore : s));
            } finally {
               setIsSavingStore(false);
            }
         })();
      } else {
         // creating new store: optimistic add with temporary id
         const tempId = `tmp-${Date.now()}`;
         const optimisticNew: any = { ...storeData, id: tempId, image_url: localPreviewUrl, name: storeData.name };
         setStores(prev => [optimisticNew, ...prev]);

         // close UI immediately for snappy UX
         setShowAddPartner(false);
         setStoreImagePreview(null);
         onBack();

         // Persist in background (insert -> optionally upload image -> patch)
         (async () => {
            try {
               const { data: inserted, error: insertError } = await supabase.from('stores').insert([storeData]).select().single();
               if (insertError || !inserted) {
                  // remove optimistic entry
                  setStores(prev => prev.filter(s => s.id !== tempId));
                  alert('Erreur: ' + (insertError?.message || 'Impossible de créer le magasin'));
                  return;
               }

               // replace temporary item with real DB row
               const real = { ...inserted, id: String((inserted as any).id) } as Store;
               setStores(prev => prev.map(s => s.id === tempId ? real : s));

               // If user provided an image (data URI), upload then patch image_url
               if (storeImagePreview && storeImagePreview.startsWith('data:')) {
                  try {
                     const blob = await dataUrlToBlob(storeImagePreview);
                     const fileName = `store_${Date.now()}.png`;
                     const { data: uploadData, error: uploadError } = await supabase.storage.from('stores').upload(fileName, blob);
                     if (!uploadError && uploadData) {
                        const publicUrl = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
                        await supabase.from('stores').update({ image_url: publicUrl }).eq('id', real.id);
                        setStores(prev => prev.map(s => s.id === real.id ? { ...s, image_url: publicUrl } : s));
                     } else if (uploadError) {
                        console.warn('store image upload failed (background):', uploadError.message);
                     }
                  } catch (err) {
                     console.error('Background store image upload failed', err);
                  }
               }
            } catch (err) {
               console.error('Background insert store failed', err);
               setStores(prev => prev.filter(s => s.id !== tempId));
               alert('Erreur lors de la création du partenaire');
            } finally {
               setIsSavingStore(false);
            }
         })();
      }
   };

   const displayOrders = useMemo(() => {
      const terminalStatuses = ['delivered', 'refused', 'unavailable'];

      const filtered = localOrders.filter(o => {
         // HISTORY: show archived orders OR orders with terminal status (delivered, refused, unavailable)
         if (activeTab === 'HISTORY') {
            const isTerminal = terminalStatuses.includes(o.status);
            if (!o.isArchived && !isTerminal) return false;
         } else if (activeTab === 'ORDERS') {
            // ORDERS: show non-archived orders with active status (not terminal)
            const isTerminal = terminalStatuses.includes(o.status);
            if (o.isArchived || isTerminal) return false;
         }

         const matchesSearch = o.customerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || o.id.includes(debouncedSearchTerm);
         const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
         const matchesStore = storeFilter === 'all' || o.storeName === storeFilter;
         const matchesDate = !dateFilter || new Date(o.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
         return matchesSearch && matchesStatus && matchesStore && matchesDate;
      });

      // Log for debugging
      if (activeTab === 'HISTORY') {
         const invoicesCount = filtered.filter(o => o.store_invoice_base64)?.length || 0;
         console.log(`HISTORY Tab: ${filtered.length} orders (archived or terminal status), ${invoicesCount} with invoices`);
      }
      if (activeTab === 'ORDERS') {
         console.log(`ORDERS Tab: ${filtered.length} active orders displayed (non-archived, non-terminal)`);
      }

      return filtered;
   }, [localOrders, activeTab, debouncedSearchTerm, statusFilter, storeFilter, dateFilter]);

   const startIndex = (currentPage - 1) * itemsPerPage;
   const paginatedOrders = useMemo(() => displayOrders.slice(startIndex, startIndex + itemsPerPage), [displayOrders, startIndex, itemsPerPage]);
   const totalPages = useMemo(() => Math.ceil(displayOrders.length / itemsPerPage), [displayOrders.length, itemsPerPage]);

   // Diagnostic: when admin opens ORDERS tab, log counts and active filters to help debugging
   useEffect(() => {
      if (activeTab !== 'ORDERS') return;
      console.log('DEBUG ORDERS VIEW — localOrders count:', localOrders.length, 'displayOrders count:', displayOrders.length, 'paginated:', paginatedOrders.length);
      console.log('DEBUG ORDERS FILTERS', { statusFilter, storeFilter, dateFilter, search: debouncedSearchTerm });
      if (localOrders.length > 0 && displayOrders.length === 0) {
         console.warn('There are orders in the dataset but none match the current filters — try clearing search/date/status/store filters.');
      }
   }, [activeTab, localOrders.length, displayOrders.length, paginatedOrders.length, statusFilter, storeFilter, dateFilter, debouncedSearchTerm]);

   // --- GLOBAL SEARCH FILTERS ---
   const lowerSearch = debouncedSearchTerm.toLowerCase();

   const filteredUsers = useMemo(() => users.filter(u =>
      (u.fullName || '').toLowerCase().includes(lowerSearch) ||
      (u.phone || '').includes(lowerSearch) ||
      (u.email && u.email.toLowerCase().includes(lowerSearch))
   ), [users, lowerSearch]);

   const filteredDrivers = useMemo(() => localDrivers.filter(d =>
      (d.full_name && d.full_name.toLowerCase().includes(lowerSearch)) ||
      (d.phone || '').includes(lowerSearch)
   ), [localDrivers, lowerSearch]);

   const balanceRangeMs = useMemo(() => {
      if (balanceRange === '24H') return 24 * 60 * 60 * 1000;
      const days = parseInt(balanceRange.replace('J', '')) || 1;
      return days * 24 * 60 * 60 * 1000;
   }, [balanceRange]);

   const filteredStores = useMemo(() => stores.filter(s =>
      (s.name || '').toLowerCase().includes(lowerSearch) ||
      (s.category_id || '').toLowerCase().includes(lowerSearch)
   ), [stores, lowerSearch]);

   const filteredProducts = useMemo(() => localProducts.filter(p =>
      (p.name || '').toLowerCase().includes(lowerSearch) ||
      (p.storeName && p.storeName.toLowerCase().includes(lowerSearch))
   ), [localProducts, lowerSearch]);

   const filteredCategories = useMemo(() => dbCategories.filter(c =>
      (c.name_fr || '').toLowerCase().includes(lowerSearch) ||
      (c.name_ar || '').toLowerCase().includes(lowerSearch)
   ), [dbCategories, lowerSearch]);

   const filteredTickets = useMemo(() => supportTickets.filter(t => {
      const matchesStatus = supportFilter === 'all' || (supportFilter === 'pending' ? t.status !== 'resolved' : t.status === 'resolved');
      const matchesSearch =
         (t.driver_name && t.driver_name.toLowerCase().includes(lowerSearch)) ||
         (t.driver_phone && t.driver_phone.includes(lowerSearch)) ||
         (t.description && t.description.toLowerCase().includes(lowerSearch));
      return matchesStatus && matchesSearch;
   }), [supportTickets, supportFilter, lowerSearch]);

   // Memoized rendered lists (declared unconditionally to preserve Hooks order)
   const memoizedStoreCards = useMemo(() => filteredStores.map(s => {
      const cat = dbCategories.find(c => c.id === s.category_id);
      return (
         <StoreCard
            key={s.id}
            id={s.id}
            image_url={s.image_url}
            image={s.image}
            name={s.name}
            category_id={s.category_id}
            latitude={s.latitude}
            longitude={s.longitude}
            is_open={s.is_open}
            is_active={s.is_active}
            rating={s.rating}
            categoryImage={cat?.image_url}
            onEdit={onEditStore}
            onToggleOpen={onToggleOpenStore}
            onToggleActive={onToggleActiveStore}
            onDelete={onDeleteStoreStable}
         />
      );
   }), [filteredStores, dbCategories, onEditStore, onToggleOpenStore, onToggleActiveStore, onDeleteStoreStable]);

   const memoizedProductCards = useMemo(() => filteredProducts.map((p) => (
      <ProductCard
         key={p.id}
         id={p.id}
         name={p.name}
         storeName={p.storeName}
         price={p.price}
         image={p.image}
         onEdit={onEditProduct}
         onDelete={handleDeleteProduct}
      />
   )), [filteredProducts, onEditProduct, handleDeleteProduct]);

   const prepareShareText = (order: Order) => {
      const itemsText = order.items.length > 0
         ? order.items.map(it => `- ${it.quantity}x ${it.productName || it.product?.name || 'Produit'} [${it.storeName || 'N/A'}] ${it.note ? `(Note: ${it.note})` : ''}`).join('\n')
         : 'Commande personnalisée (voir note générale)';

      const locationUrl = order.location
         ? `https://www.google.com/maps/search/?api=1&query=${order.location.lat},${order.location.lng}`
         : 'Non spécifiée';

      return `?? COMMANDE #${order.id}
?? Client: ${order.customerName}
?? Tél: ${order.phone}
?? Localisation: ${locationUrl}
?? Magasin: ${order.storeName || 'N/A'}

?? NOTE GÉNÉRALE:
${order.textOrder && order.textOrder.length > 0 ? order.textOrder : 'Aucune'}

?? DÉTAILS:
${itemsText}

?? TOTAL À PAYER: ${order.total_final || (order.total + 15)} DH
(Livraison 15 DH incluse)`;
   };

   const handleShareOrder = (order: Order) => {
      const shareText = prepareShareText(order);
      copyToClipboard(shareText, "Détails de la commande copiés !");
   };





   const generateOrderPDF = (order: Order) => {
      const doc = new jsPDF();
      const orangeColor = '#f97316';
      const blueColor = '#1e3a8a';
      const slateDark = '#1e293b';
      const grayLight = '#94a3b8';

      // --- PAGE 1: VUE D'ENSEMBLE ---

      // En-tête avec Logo
      try {
         // Charger le logo (chemin relatif ou base64 si nécessaire, ici on suppose qu'il est accessible)
         // Note: En production, il est préférable de précharger l'image en base64 pour éviter les problèmes de chemin
         const logoImg = new Image();
         logoImg.src = '/ln3 (1).png';
         doc.addImage(logoImg, 'PNG', 15, 10, 40, 40);
      } catch (e) {
         console.warn("Logo non chargé", e);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(blueColor);
      doc.text("DÉTAILS COMMANDE", 70, 25);
      doc.setFontSize(16);
      doc.text(`#${order.id} `, 70, 35);

      doc.setFontSize(10);
      doc.setTextColor(grayLight);
      doc.text("GÉNÉRÉ LE:", 150, 20);
      doc.setTextColor(slateDark);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date().toLocaleString(), 150, 26);

      // Cadre Informations Générales
      doc.setDrawColor(30, 58, 138); // Bleu foncé
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 55, 180, 85, 3, 3, 'FD');

      // Colonne Gauche: Client
      doc.setFontSize(12);
      doc.setTextColor(orangeColor);
      doc.text("CLIENT", 25, 65);
      doc.setFontSize(10);
      doc.setTextColor(slateDark);
      doc.text(`Nom: ${order.customerName}`, 25, 75);
      doc.text(`Tél: ${order.phone}`, 25, 82);

      if (order.location) {
         const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
         doc.text(`Loc: `, 25, 89);
         doc.setTextColor('#3b82f6');
         doc.textWithLink('Voir sur Maps', 35, 89, { url: mapsUrl });
         doc.setTextColor(slateDark);
      } else {
         doc.text(`Loc: Non spécifiée`, 25, 89);
      }

      // Colonne Droite: Magasin (si unique) ou Info app
      doc.setFontSize(12);
      doc.setTextColor(blueColor);
      doc.text("INFO COMMANDE", 110, 65);
      doc.setFontSize(10);
      doc.setTextColor(slateDark);
      doc.text(`Statut: ${order.status.toUpperCase()}`, 110, 75);
      doc.text(`Paiement: ${order.paymentMethod === 'cash' ? 'Espèces' : 'Virement'}`, 110, 82);

      const storeDisplay = getOrderStoreDisplay(order);
      doc.text(`Magasin: ${storeDisplay}`, 110, 89, { maxWidth: 80 });

      // Add Store Location(s) iteratively
      const uniqueStoreNames = Array.from(new Set(order.items.map(it => it.storeName).filter(Boolean)));
      if (uniqueStoreNames.length === 0 && order.storeName) uniqueStoreNames.push(order.storeName);

      let currentLocY = 96;
      uniqueStoreNames.forEach(sName => {
         const storeObj = stores.find(s => s.name === sName);
         if (storeObj && (storeObj.maps_url || storeObj.mapsUrl)) {
            const sLoc = storeObj.maps_url || storeObj.mapsUrl;
            doc.setFontSize(8);
            doc.setTextColor(slateDark);
            doc.text(`${sName}:`, 110, currentLocY);
            doc.setTextColor('#3b82f6');
            doc.textWithLink('Voir sur Maps', 145, currentLocY, { url: sLoc });
            doc.setTextColor(slateDark);
            doc.setFontSize(10);
            currentLocY += 6;
         }
      });

      // Note Admin / Livraison
      if (order.deliveryNote) {
         doc.setFontSize(9);
         doc.setTextColor(orangeColor);
         doc.text("NOTE LIVRAISON:", 25, 105);
         doc.setTextColor(slateDark);
         doc.text(order.deliveryNote, 25, 112, { maxWidth: 160 });
      }

      // Note Client Globale
      if (order.textOrder) {
         doc.setFontSize(9);
         doc.setTextColor(orangeColor);
         doc.text("NOTE ADMIN:", 25, 125);
         doc.setTextColor(slateDark);
         doc.text(order.textOrder, 25, 132, { maxWidth: 160 });
      }

      // --- NEW: SUMMARY TABLE WITH NOTES ---
      const tableRows = order.items.map(it => [
         it.productName || it.product?.name || 'Produit',
         it.quantity || 1,
         it.storeName || 'N/A',
         it.note || '-'
      ]);

      autoTable(doc, {
         startY: 145,
         head: [['Produit', 'Qté', 'Magasin', 'Note/Consigne']],
         body: tableRows,
         headStyles: { fillColor: blueColor },
         styles: { fontSize: 9 },
         margin: { left: 15, right: 15 }
      });
      const totalY = 250;
      doc.setFillColor(30, 58, 138); // Fond Bleu
      doc.roundedRect(120, totalY, 75, 30, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("TOTAL À PAYER", 157, totalY + 10, { align: 'center' });
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`${(order.total_final || (order.total + 15)).toFixed(2)} DH`, 157, totalY + 22, { align: 'center' });

      // --- PAGES SUIVANTES : DÉTAIL PAR ARTICLE ---

      order.items.forEach((item, index) => {
         doc.addPage();

         // En-tête Page Article
         doc.setFillColor(241, 245, 249);
         doc.rect(0, 0, 210, 30, 'F');
         doc.setTextColor(blueColor);
         doc.setFontSize(16);
         doc.text(`ARTICLE #${index + 1}: ${item.productName || item.product?.name || 'Produit'}`, 15, 20);

         let yPos = 50;

         // Image du produit (si disponible)
         if (item.image_base64) {
            try {
               let imgData = item.image_base64;
               if (!imgData.startsWith('data:')) imgData = `data:image/jpeg;base64,${imgData}`;

               // Image large centrée
               doc.addImage(imgData, 'JPEG', 35, yPos, 140, 100); // 140x100mm
               yPos += 110;
            } catch (e) {
               doc.setTextColor(grayLight);
               doc.text("(Image non disponible)", 105, yPos + 20, { align: 'center' });
               yPos += 40;
            }
         } else {
            // Placeholder si pas d'image
            doc.setDrawColor(grayLight);
            doc.rect(55, yPos, 100, 60);
            doc.text("Aucune image", 105, yPos + 30, { align: 'center' });
            yPos += 70;
         }

         // Détails de l'article
         doc.setFontSize(14);
         doc.setTextColor(slateDark);
         doc.text(`Quantité: ${item.quantity || 1}`, 20, yPos);
         doc.text(`Prix Unitaire: ${(item.price || item.product?.price || 0).toFixed(2)} DH`, 100, yPos);

         yPos += 15;
         doc.setFontSize(16);
         doc.setTextColor(orangeColor);
         doc.text(`Total Ligne: ${((item.quantity || 1) * (item.price || item.product?.price || 0)).toFixed(2)} DH`, 20, yPos);

         yPos += 20;

         // Note de l'article (Consigne spécifique)
         if (item.note) {
            doc.setFillColor(255, 247, 237); // Fond Orange léger
            doc.roundedRect(15, yPos, 180, 40, 3, 3, 'F');

            doc.setFontSize(12);
            doc.setTextColor(orangeColor);
            doc.text("CONSIGNE SPÉCIFIQUE (NOTE):", 25, yPos + 10);

            doc.setFontSize(11);
            doc.setTextColor(slateDark);
            doc.text(item.note, 25, yPos + 20, { maxWidth: 160 });
         }

         // Footer avec pagination
         doc.setFontSize(10);
         doc.setTextColor(grayLight);
         doc.text(`Page ${index + 2} / ${order.items.length + 1}`, 105, 290, { align: 'center' });
      });

      // Sauvegarde
      doc.save(`Commande_Detaillee_Veetaa_${order.id}.pdf`);
   };

   const getStatusConfig = (status: OrderStatus) => {
      switch (status) {
         case 'pending': return { label: 'En attente', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '?' };
         case 'verification': return { label: 'En vérification', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '??' };
         case 'treatment': return { label: 'En traitement', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '??' };
         case 'delivering': return { label: 'En course', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: '??' };
         case 'progression': return { label: 'En progression', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '??' };
         case 'unavailable': return { label: 'Indisponible', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '??' };
         case 'refused': return { label: 'Refusée', color: 'bg-red-100 text-red-700 border-red-200', icon: '?' };
         case 'delivered': return { label: 'Livrée', color: 'bg-green-100 text-green-700 border-green-200', icon: '?' };
         default: return { label: status, color: 'bg-slate-100 text-slate-600', icon: '??' };
      }
   };

   // --- LOGIQUE FINANCE (RESTAURÉE) ---
   const financeStats = useMemo(() => {
      const completed = propOrders.filter(o => o.status === 'delivered');
      const revenue = completed.reduce((sum, o) => sum + o.total, 0);
      const deliveryFees = completed.length * 15;
      const total = revenue + deliveryFees;

      const dailyStats = completed.reduce((acc: any, o) => {
         const date = new Date(o.timestamp).toLocaleDateString();
         acc[date] = (acc[date] || 0) + o.total;
         return acc;
      }, {});

      return { revenue, deliveryFees, total, dailyStats, completedCount: completed.length, completedOrders: completed };
   }, [propOrders]);

   const generateFinancePDF = () => {
      const fin = financeStats;
      const doc = new jsPDF();
      const orangeColor = '#f97316';

      doc.setFontSize(22);
      doc.setTextColor(orangeColor);
      doc.text("RAPPORT FINANCIER VEETAA", 15, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Généré le: ${new Date().toLocaleString()} `, 15, 32);

      autoTable(doc, {
         startY: 45,
         head: [['Description', 'Valeur']],
         body: [
            ['Ventes Produits', `${fin.revenue} DH`],
            ['Frais de Livraison Totaux', `${fin.deliveryFees} DH`],
            ['Chiffre d\'Affaires Global', `${fin.total} DH`],
            ['Nombre total de livraisons', `${fin.completedCount} `]
         ],
         theme: 'striped',
         headStyles: { fillColor: [249, 115, 22] }
      });

      doc.save(`Finance_Veetaa_${new Date().toISOString().split('T')[0]}.pdf`);
   };

   const generateUsersPDF = () => {
      const doc = new jsPDF();
      const orangeColor = '#f97316';
      doc.setFontSize(20);
      doc.setTextColor(orangeColor);
      doc.text("LISTE DES UTILISATEURS", 15, 25);

      const tableData = users.map(u => [u.fullName, u.phone, u.email || 'N/A', u.isAdmin ? 'Admin' : 'Client', new Date().toLocaleDateString(), '0', 'Actif']);

      autoTable(doc, {
         startY: 40,
         head: [['Nom Complet', 'Téléphone', 'Email', 'Rôle', 'Inscription', 'Cmds', 'Statut']],
         body: tableData,
         theme: 'striped',
         headStyles: { fillColor: orangeColor, textColor: 255 }
      });

      doc.save(`Utilisateurs_Veetaa.pdf`);
   };

   // --- ANNOUNCEMENT HANDLERS ---
   const handleCreateAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;

      const annData = {
         title,
         content,
         images: announcementImagePreview ? [announcementImagePreview] : [],
         active: editingAnnouncement ? editingAnnouncement.active : true,
      };

      try {
         if (editingAnnouncement) {
            const { error } = await supabase.from('announcements').update(annData).eq('id', editingAnnouncement.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('announcements').insert([annData]);
            if (error) throw error;
         }
         setShowAddAnnouncement(false);
         setEditingAnnouncement(null);
         setAnnouncementImagePreview(null);
         onBack(); // Refresh data
      } catch (err) {
         console.error("Erreur annonce:", err);
         alert("Erreur lors de l'enregistrement de l'annonce");
      }
   };

   const handleDeleteAnnouncement = async (id: string) => {
      if (!confirm("Supprimer cette annonce ?")) return;
      try {
         const { error } = await supabase.from('announcements').delete().eq('id', id);
         if (error) throw error;
         onBack();
      } catch (err) {
         alert("Erreur suppression");
      }
   };

   const handleToggleAnnouncement = async (id: string, currentActive: boolean) => {
      try {
         const { error } = await supabase.from('announcements').update({ active: !currentActive }).eq('id', id);
         if (error) throw error;
         onBack();
      } catch (err) {
         alert("Erreur statut");
      }
   };

   const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
      const { error } = await supabase
         .from('support_tickets')
         .update({ status: newStatus })
         .eq('id', ticketId);

      if (error) {
         alert("Erreur: " + error.message);
      } else {
         setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
         if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
         }
      }
   };

   const handleToggleTicketSelection = (ticketId: string) => {
      setSelectedTicketIds(prev =>
         prev.includes(ticketId)
            ? prev.filter(id => id !== ticketId)
            : [...prev, ticketId]
      );
   };

   const handleSelectAllTickets = () => {
      if (selectedTicketIds.length === filteredTickets.length) {
         setSelectedTicketIds([]);
      } else {
         setSelectedTicketIds(filteredTickets.map(t => t.id));
      }
   };

   const handleDeleteSelectedTickets = async () => {
      if (selectedTicketIds.length === 0) return;

      if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTicketIds.length} ticket(s) ?`)) return;

      const { error } = await supabase
         .from('support_tickets')
         .delete()
         .in('id', selectedTicketIds);

      if (error) {
         alert("Erreur: " + error.message);
      } else {
         setSupportTickets(prev => prev.filter(t => !selectedTicketIds.includes(t.id)));
         setSelectedTicketIds([]);
         alert(`${selectedTicketIds.length} ticket(s) supprimé(s) avec succès.`);
      }
   };

   const handleReplyTicket = async () => {
      const message = replyInputRef.current?.value?.trim() || '';
      if (!selectedTicket || !message) return;

      const { error } = await supabase
         .from('support_messages')
         .insert({
            ticket_id: selectedTicket.id,
            sender_type: 'admin',
            message
         });

      if (error) {
         alert("Erreur lors de l'envoi: " + error.message);
      } else {
         // Update last reply on ticket for list view
         await supabase.from('support_tickets').update({
            admin_reply: message,
            responded_at: new Date().toISOString()
         }).eq('id', selectedTicket.id);

         // clear uncontrolled input and UI flag
         if (replyInputRef.current) replyInputRef.current.value = '';
         setReplyHasText(false);
      }
   };

   return (
      <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
         {/* Sidebar */}
         <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col sticky top-0 h-screen overflow-y-auto hidden md:flex shrink-0">
            <div className="p-6 border-b border-slate-800">
               <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="bg-orange-600 p-1.5 rounded-lg">V</span>
                  CONTROL<span className="text-orange-500">CENTER</span>
               </h1>
            </div>
            <nav className="flex-1 p-4 space-y-1">
               <NavItem active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<LayoutDashboard size={20} />} label="Vue d'ensemble" />
               <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<Package size={20} />} label="Commandes" />
               <NavItem active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={20} />} label="Utilisateurs" />
               <NavItem active={activeTab === 'PRODUCTS'} onClick={() => setActiveTab('PRODUCTS')} icon={<ShoppingBag size={20} />} label="Catalogue" />
               <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Truck size={20} />} label="Livreurs" />
               <NavItem active={activeTab === 'PARTNERS'} onClick={() => setActiveTab('PARTNERS')} icon={<StoreIcon size={20} />} label="Marques" />
               <NavItem active={activeTab === 'MAPS'} onClick={() => setActiveTab('MAPS')} icon={<MapIcon size={20} />} label="Vetaa Maps" />
               {!pageVisibility.hideFinance && (
                  <NavItem active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} icon={<DollarSign size={20} />} label="Finance" />
               )}
               {!pageVisibility.hideStatistics && (
                  <NavItem active={activeTab === 'STATISTICS'} onClick={() => setActiveTab('STATISTICS')} icon={<BarChart3 size={20} />} label="Statistiques" />
               )}
               <NavItem active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<Clock size={20} />} label="Historique" badge={localOrders.filter(o => o.isArchived).length} />

               <NavItem active={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<Filter size={20} />} label="Catégories" />
               <NavItem active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={<Settings size={20} />} label="Configuration" />
               <NavItem
                  active={activeTab === 'SUPPORT_TICKETS'}
                  onClick={() => setActiveTab('SUPPORT_TICKETS')}
                  icon={<MessageSquare size={20} />}
                  label="Support Tiquettes"
                  badge={supportTickets.filter(t => t.status !== 'resolved').length || undefined}
               />
               <div className="pt-4 mt-4 border-t border-slate-800">
                  <NavItem active={showProfileModal} onClick={() => setShowProfileModal(true)} icon={<User size={20} />} label="Mon Profil" />
               </div>
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-2">

               <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-bold">
                  <LogOut size={18} /> Déconnexion
               </button>
            </div>
         </aside>

         {/* Main Content */}
         <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-30">
               <div className="flex items-center gap-4 flex-1 max-w-xl">
                  <Search className="text-slate-400" size={16} />
                  <input ref={searchInputRef} type="text" placeholder="Rechercher..." className="bg-transparent border-none outline-none text-sm w-full" defaultValue={searchTerm} onInput={handleSearchInput} onKeyDown={e => { if ((e as React.KeyboardEvent).key === 'Escape') { const el = e.target as HTMLInputElement; el.value = ''; setSearchTerm(''); } }} />
               </div>
               <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm hover:scale-110 transition-transform active:scale-95"
               >
                  {currentAdmin?.username?.[0]?.toUpperCase() || 'A'}
               </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
               <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                     {activeTab === 'PRODUCTS' ? 'Catalogue Produits' : activeTab === 'DRIVERS' ? 'Gestion Livreurs' : activeTab === 'PARTNERS' ? 'Partenaires & Marques' : activeTab}
                  </h2>
                  <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-3 bg-white border rounded-2xl shadow-sm"><RotateCw size={18} className={isRefreshing ? 'animate-spin' : ''} /></button>
               </div>

               {/* VUE D'ENSEMBLE */}
               {activeTab === 'OVERVIEW' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Clients" value={users.length} icon={<Users size={24} />} color="bg-indigo-50 text-indigo-600" />
                        <StatCard label="Livreurs" value={drivers.length} icon={<Truck size={24} />} color="bg-emerald-50 text-emerald-600" />
                        <StatCard label="Commandes" value={propOrders.length} icon={<Package size={24} />} color="bg-orange-50 text-orange-600" />
                        <StatCard label="Catalogue" value={localProducts.length} icon={<ShoppingBag size={24} />} color="bg-blue-50 text-blue-600" />
                     </div>

                     <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm animate-in fade-in duration-700 delay-200">
                        <div className="flex justify-between items-center mb-8">
                           <div>
                              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Évolution des Ventes (7 Jours)</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Nombre de commandes par jour</p>
                           </div>
                           <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                              <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                              <span className="text-[10px] font-black uppercase text-slate-600">Commandes</span>
                           </div>
                        </div>
                        <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={weeklyData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0e70d1ff" />
                                 <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#0853bbff', fontSize: 10, fontWeight: 900 }}
                                    dy={10}
                                 />
                                 <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#da381bff', fontSize: 10, fontWeight: 900 }}
                                 />
                                 <Tooltip
                                    cursor={{ fill: '#a0a8afff' }}
                                    contentStyle={{
                                       borderRadius: '20px',
                                       border: 'none',
                                       boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                       padding: '12px 16px'
                                    }}
                                    itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}
                                    labelStyle={{ fontSize: '10px', color: '#0c418aff', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
                                 />
                                 <Bar
                                    dataKey="ventes"
                                    radius={[8, 8, 8, 8]}
                                    barSize={40}
                                 >
                                    {weeklyData.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={index === 6 ? '#0f172a' : '#eb0da8ff'} />
                                    ))}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                  </div>
               )}

               {/* COMMANDES & HISTORIQUE */}
               {(activeTab === 'ORDERS' || activeTab === 'HISTORY') && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                     {selectedOrderIds.length > 0 && (
                        <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4">
                           <div className="flex items-center gap-4 ml-4">
                              <span className="text-sm font-bold">{selectedOrderIds.length} commande(s) sélectionnée(s)</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <button onClick={() => setSelectedOrderIds([])} className="px-4 py-2 text-xs font-bold uppercase tracking-wider hover:text-slate-300">Annuler</button>
                              <button onClick={handleBulkDeleteOrders} className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                 <Trash2 size={14} /> Supprimer la sélection
                              </button>
                           </div>
                        </div>
                     )}
                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                 <th className="px-8 py-6 w-10">
                                    <input
                                       type="checkbox"
                                       checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                                       onChange={handleSelectAllOrders}
                                       className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                    />
                                 </th>
                                 <th className="px-8 py-6">ID</th>
                                 <th className="px-8 py-6">Client</th>
                                 <th className="px-8 py-6">Statut</th>
                                 <th className="px-8 py-6">Livreur</th>
                                 <th className="px-8 py-6 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {paginatedOrders.map(o => (
                                 <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${selectedOrderIds.includes(o.id) ? 'bg-orange-50/50' : ''}`}>
                                    <td className="px-8 py-5">
                                       <input
                                          type="checkbox"
                                          checked={selectedOrderIds.includes(o.id)}
                                          onChange={() => handleToggleOrderSelection(o.id)}
                                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                       />
                                    </td>
                                    <td className="px-8 py-5 font-black text-slate-400">#{o.id}</td>
                                    <td className="px-8 py-5">
                                       <div
                                          className="flex items-center gap-3 cursor-pointer group"
                                          onClick={() => {
                                             console.log('=== CLICKED ORDER ===');
                                             console.log('Order ID:', o.id);
                                             console.log('Customer Name:', o.customerName);
                                             console.log('Phone:', o.phone);
                                             console.log('UserID:', o.userId);

                                             // First try to find user in database by userId
                                             let foundUser = null;
                                             if (o.userId) {
                                                foundUser = users.find(u => u.id === o.userId);
                                                console.log('Found user by userId:', foundUser);
                                             }

                                             // If not found, try by phone
                                             if (!foundUser && o.phone) {
                                                foundUser = users.find(u => u.phone === o.phone);
                                                console.log('Found user by phone:', foundUser);
                                             }

                                             // If user found in database, use all their info
                                             if (foundUser) {
                                                console.log('Using user from database:', foundUser);
                                                setSelectedUser(foundUser);
                                             } else {
                                                // Fallback: create profile from order data with unique ID
                                                const orderBasedUser: UserProfile = {
                                                   id: `${o.id}_${o.phone}`,
                                                   fullName: o.customerName,
                                                   phone: o.phone,
                                                   email: undefined,
                                                   language: undefined,
                                                   isAdmin: false,
                                                   isBlocked: false,
                                                   lastLat: o.location?.lat,
                                                   lastLng: o.location?.lng
                                                };
                                                console.log('Creating user from order data:', orderBasedUser);
                                                setSelectedUser(orderBasedUser);
                                             }
                                          }}
                                       >
                                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black group-hover:bg-orange-600 group-hover:text-white transition-all">{o.customerName[0]}</div>
                                          <div className="flex flex-col">
                                             <span className="font-bold text-slate-700 group-hover:text-orange-600 transition-colors">{o.customerName}</span>
                                             <span className="text-[10px] text-slate-400">{o.phone}</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5">
                                       <select
                                          value={o.status}
                                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase outline-none cursor-pointer border-none appearance-none ${getStatusConfig(o.status).color}`}
                                       >
                                          <option value="pending">En attente</option>
                                          <option value="verification">Verification</option>
                                          <option value="treatment">Traitement</option>
                                          <option value="delivering">En course</option>
                                          <option value="progression">Progression</option>
                                          <option value="delivered">Livrée</option>
                                          <option value="refused">Refusée</option>
                                          <option value="unavailable">Indisponible</option>
                                       </select>
                                    </td>
                                    <td className="px-8 py-5">
                                       <select
                                          value={o.assignedDriverId || ""}
                                          onChange={(e) => handleAssignDriver(o.id, e.target.value)}
                                          className="bg-transparent font-bold text-slate-600 outline-none cursor-pointer"
                                       >
                                          <option value="">Non assigné</option>
                                          {drivers.map(d => (
                                             <option key={d.id} value={d.id}>{d.fullName}</option>
                                          ))}
                                       </select>
                                    </td>
                                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                                       <button onClick={() => setSelectedOrder(o)} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors" title="Détails"><Info size={16} /></button>
                                       <button onClick={() => handleDeleteSingleOrder(o.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all" title="Supprimer"><Trash2 size={16} /></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     {/* Pagination Controls */}
                     {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-8 pb-4">
                           <button
                              type="button"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={`p-2 rounded-xl transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'}`}
                           >
                              <ChevronLeft size={20} />
                           </button>

                           <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                 if (totalPages > 7) {
                                    const isNearCurrent = Math.abs(page - currentPage) <= 1;
                                    const isEnd = page === 1 || page === totalPages;
                                    if (isEnd || isNearCurrent) {
                                       return (
                                          <button
                                             key={page}
                                             type="button"
                                             onClick={() => setCurrentPage(page)}
                                             className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === page ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
                                          >
                                             {page}
                                          </button>
                                       );
                                    } else if (page === 2 || page === totalPages - 1) {
                                       if ((page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)) {
                                          return <span key={page} className="px-2 text-slate-400">...</span>;
                                       }
                                    }
                                    return null;
                                 }
                                 return (
                                    <button
                                       key={page}
                                       type="button"
                                       onClick={() => setCurrentPage(page)}
                                       className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === page ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
                                    >
                                       {page}
                                    </button>
                                 );
                              })}
                           </div>

                           <button
                              type="button"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={`p-2 rounded-xl transition-all ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'}`}
                           >
                              <ChevronRight size={20} />
                           </button>
                        </div>
                     )}
                  </div>
               )}



               {/* FINANCE (RESTAURÉE) */}
               {activeTab === 'FINANCE' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">Chiffre d'Affaires</h3>
                        <button onClick={generateFinancePDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors">
                           <FileText size={16} /> Exporter Rapport PDF
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="Ventes Totales" value={`${financeStats.revenue} DH`} icon={<DollarSign size={24} />} color="bg-emerald-50 text-emerald-600" />
                        <StatCard label="Livraisons Payées" value={`${financeStats.deliveryFees} DH`} icon={<Truck size={24} />} color="bg-blue-50 text-blue-600" />
                        <StatCard label="Revenue Global" value={`${financeStats.total} DH`} icon={<TrendingUp size={24} />} color="bg-orange-50 text-orange-600" />
                     </div>

                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                           <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Détails des Ventes (Livraisons Terminées)</h4>
                           <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{financeStats.completedCount} Commandes</span>
                        </div>
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5">ID</th>
                                 <th className="px-8 py-5">Date</th>
                                 <th className="px-8 py-5">Client</th>
                                 <th className="px-8 py-5">Méthode</th>
                                 <th className="px-8 py-5">Reçu</th>
                                 <th className="px-8 py-5 text-right">Montant</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {financeStats.completedOrders.map(o => (
                                 <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-black text-slate-400 group-hover:text-slate-900 transition-colors">#{o.id}</td>
                                    <td className="px-8 py-5 font-bold text-slate-600">{new Date(o.timestamp).toLocaleDateString()}</td>
                                    <td className="px-8 py-5 font-bold text-slate-800">{o.customerName}</td>
                                    <td className="px-8 py-5">
                                       {o.paymentMethod === 'transfer' && (o.paymentReceiptImage || o.payment_receipt_base64) ? (
                                          <button
                                             onClick={() => setViewingImage(o.paymentReceiptImage || o.payment_receipt_base64 || null)}
                                             className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors p-2 bg-blue-50 rounded-xl"
                                             title="Voir le reçu"
                                          >
                                             <ImageIcon size={16} />
                                             <span className="text-[10px] font-black uppercase">Voir Reçu</span>
                                          </button>
                                       ) : (
                                          <span className="text-slate-300 italic text-[10px]">Aucun reçu</span>
                                       )}
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-emerald-600">{o.total} DH</td>
                                 </tr>
                              ))}
                              {financeStats.completedCount === 0 && (
                                 <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">Aucune commande livrée pour le moment.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* STATISTIQUES (RESTAURÉE) */}
               {activeTab === 'STATISTICS' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                           <h4 className="font-black text-xs uppercase tracking-widest mb-10">Analyse Hebdomadaire</h4>
                           <div className="h-[400px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                       dataKey="name"
                                       axisLine={false}
                                       tickLine={false}
                                       tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 900 }}
                                       dy={10}
                                    />
                                    <YAxis
                                       axisLine={false}
                                       tickLine={false}
                                       tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 900 }}
                                    />
                                    <Tooltip
                                       cursor={{ fill: '#f8fafc' }}
                                       contentStyle={{
                                          borderRadius: '24px',
                                          border: 'none',
                                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                          padding: '16px 20px'
                                       }}
                                       itemStyle={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}
                                       labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '900' }}
                                    />
                                    <Bar
                                       dataKey="ventes"
                                       fill="#0f172a"
                                       radius={[12, 12, 12, 12]}
                                       barSize={60}
                                    />
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                           <h4 className="font-black text-xs uppercase tracking-widest mb-6">Heatmap de l'Activité</h4>
                           <div className="h-[400px] w-full">
                              <StatisticsMapComponent orders={propOrders} drivers={drivers} users={users} stores={stores} />
                           </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm col-span-1 lg:col-span-2">
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Magasins les Plus Commandés</h4>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Top 5 des partenaires par volume de commandes</p>
                              </div>
                              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl">
                                 <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                 <span className="text-[10px] font-black uppercase text-orange-600">Volume</span>
                              </div>
                           </div>
                           <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart
                                    data={topStores}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                 >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                       dataKey="name"
                                       type="category"
                                       axisLine={false}
                                       tickLine={false}
                                       width={100}
                                       tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                       cursor={{ fill: '#f1f5f9' }}
                                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                       {
                                          topStores.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][index % 5]} />
                                          ))
                                       }
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Taux de Succès Livraison</h4>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Comparaison des commandes livrées vs incomplètes</p>
                              </div>
                           </div>
                           <div className="h-[300px] w-full flex justify-center">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie
                                       data={successRateStats}
                                       cx="50%"
                                       cy="50%"
                                       innerRadius={60}
                                       outerRadius={90}
                                       paddingAngle={4}
                                       dataKey="value"
                                       label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                          const RADIAN = Math.PI / 180;
                                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                          return percent > 0 ? `${(percent * 100).toFixed(0)}%` : '';
                                       }}
                                       labelLine={false}
                                    >
                                       <Cell key="cell-0" fill="#10b981" />
                                       <Cell key="cell-1" fill="#ef4444" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                 </PieChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Clients les Plus Fidèles</h4>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Top 5 des clients par nombre de commandes</p>
                              </div>
                              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl">
                                 <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                 <span className="text-[10px] font-black uppercase text-indigo-600">Commandes</span>
                              </div>
                           </div>
                           <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart
                                    data={loyalClients}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                 >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                       dataKey="name"
                                       type="category"
                                       axisLine={false}
                                       tickLine={false}
                                       width={100}
                                       tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                       cursor={{ fill: '#f1f5f9' }}
                                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                       {
                                          loyalClients.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'][index % 5]} />
                                          ))
                                       }
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* MAPS INTERACTIVE (CONTROL CENTER) */}
               {activeTab === 'MAPS' && (
                  <div className="h-[calc(100vh-16rem)] w-full flex bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
                     {/* Barre Latérale Logistique */}
                     <LogisticsSidebar
                        orders={propOrders}
                        users={users}
                        stores={stores}
                        drivers={drivers}
                        selectedOrderId={selectedOrderId}
                        onSelectOrder={setSelectedOrderId}
                        onViewOrder={handleViewOrder}
                        pickingStore={pickingStore}
                        onStartPicking={setPickingStore}
                        onCancelPicking={() => { setPickingStore(null); setPickingPos(null); }}
                        onSavePicking={handleSaveStorePosition}
                        onPosChange={(lat, lng) => setPickingPos([lat, lng])}
                        pickingPos={pickingPos}
                     />

                     {/* Carte Principale */}
                     <div className="flex-1 relative">
                        <MapComponent
                           drivers={drivers}
                           orders={propOrders}
                           users={users}
                           stores={stores}
                           categories={dbCategories}
                           selectedOrderId={selectedOrderId}
                           onUnlinkStore={handleUnlinkStore}
                           onMapClick={(lat, lng) => pickingStore && setPickingPos([lat, lng])}
                           pickingPos={pickingPos}
                           pickingStore={pickingStore}
                        />

                        {/* Indicateurs Flottants */}
                        <div className="absolute top-6 left-6 z-[1000] flex gap-3">
                           <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                 <span className="text-[10px] font-black uppercase text-slate-700">{localOrders.filter(o => o.status !== 'delivered' && !o.isArchived).length} Commandes</span>
                              </div>
                              <div className="w-px h-3 bg-slate-200"></div>
                              <div className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 bg-slate-900 rounded-full"></span>
                                 <span className="text-[10px] font-black uppercase text-slate-700">{drivers.filter(d => d.status !== 'offline').length} Livreurs</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* USERS */}
               {activeTab === 'USERS' && (
                  <div className="space-y-6">
                     <div className="flex justify-end">
                        <button onClick={generateUsersPDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Users size={16} /> Exporter Liste Clients
                        </button>
                     </div>
                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr><th className="px-8 py-5">Utilisateur</th><th className="px-8 py-5">Rôle</th><th className="px-8 py-5">Statut</th><th className="px-8 py-5 text-right">Actions</th></tr>
                           </thead>
                           <tbody className="divide-y">
                              {filteredUsers.map((u, i) => (
                                 <tr key={u.id || i} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedUser(u)}>
                                    <td className="px-8 py-5 flex items-center gap-3">
                                       <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black">{u.fullName[0]}</div>
                                       <div className="flex flex-col"><span className="font-bold">{u.fullName}</span><span className="text-[10px] text-slate-400">{u.phone}</span></div>
                                    </td>
                                    <td className="px-8 py-5">{u.isAdmin ? 'Admin' : 'Client'}</td>
                                    <td className="px-8 py-5">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${u.isBlocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                          {u.isBlocked ? 'Bloqué' : 'Actif'}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                                       <button onClick={() => handleToggleUserBlock(u.phone, !!u.isBlocked)} className={`p-2 rounded-lg ${u.isBlocked ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                          {u.isBlocked ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                       </button>
                                       <button className="p-2 bg-slate-100 rounded-lg"><UserCheck size={16} /></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* DRIVERS */}
               {activeTab === 'DRIVERS' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                           <h3 className="text-xl font-black uppercase">Gestion des Livreurs</h3>
                           <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-full">
                              {['24H', '2J', '3J', '4J', '5J', '7J'].map(opt => (
                                 <button
                                    key={opt}
                                    onClick={() => setBalanceRange(opt as any)}
                                    className={`px-3 py-1 rounded-full text-[12px] font-bold ${balanceRange === opt ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border'}`}
                                 >
                                    {opt}
                                 </button>
                              ))}
                           </div>
                        </div>
                        <button onClick={() => { setEditingDriver(null); setShowAddDriver(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Plus size={16} /> Nouveau Livreur
                        </button>
                     </div>

                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5">Livreur</th>
                                 <th className="px-8 py-5">Statut</th>
                                 <th className="px-8 py-5">Livraisons</th>
                                 <th className="px-8 py-5">Balance</th>
                                 <th className="px-8 py-5">Total livraisons</th>
                                 <th className="px-8 py-5">Évaluation</th>
                                 <th className="px-8 py-5">Warnings</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y">
                              {filteredDrivers.map(d => (
                                 <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black">{d.full_name ? d.full_name[0] : '?'}</div>
                                          <div className="flex flex-col"><span className="font-bold">{d.full_name}</span><span className="text-[10px] text-slate-400">{d.phone}</span></div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${d.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                          {d.status === 'available' ? 'Disponible' : 'Occupé'}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5 font-bold">
                                       {propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered').length}
                                    </td>
                                    <td className="px-8 py-5">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const balanceOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const balanceTotal = balanceOrders.reduce((s, o) => s + (o.total || 0), 0);
                                          return (
                                             <div className="flex flex-col">
                                                <span className="font-black">{Math.round(balanceTotal)} DH</span>
                                                <span className="text-[10px] text-slate-400">{balanceOrders.length} commandes</span>
                                             </div>
                                          );
                                       })()}
                                    </td>

                                    <td className="px-8 py-5">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const feeOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const totalFees = feeOrders.reduce((s, o) => s + (o.delivery_fee ?? 0), 0);
                                          return (
                                             <div className="flex flex-col">
                                                <span className="font-black">{Math.round(totalFees)} DH</span>
                                                <span className="text-[10px] text-slate-400">{feeOrders.length} livr.</span>
                                             </div>
                                          );
                                       })()}
                                    </td>

                                    <td className="px-8 py-5">
                                       {(() => {
                                          const driverRatings = propOrders.filter(o => o.assignedDriverId === d.id && o.driverRating).map(o => o.driverRating!);
                                          const avgRating = driverRatings.length > 0 ? (driverRatings.reduce((a, b) => a + b, 0) / driverRatings.length) : 0;
                                          const roundedRating = Math.round(avgRating);
                                          return avgRating > 0 ? (
                                             <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                   <Star
                                                      key={star}
                                                      size={12}
                                                      fill={star <= roundedRating ? "#eab308" : "none"}
                                                      className={star <= roundedRating ? "text-yellow-500" : "text-slate-300"}
                                                   />
                                                ))}
                                                <span className="text-[10px] font-black text-yellow-600 ml-1">{avgRating.toFixed(1)}</span>
                                             </div>
                                          ) : (
                                             <span className="text-[10px] text-slate-400 italic">Aucune note</span>
                                          );
                                       })()}
                                    </td>
                                    <td className={`px-8 py-5 transition-all duration-300 ${updatingWarnings.has(d.id) ? 'bg-yellow-50 shadow-lg shadow-yellow-200' : ''}`}>
                                       <div className="flex items-center gap-2 justify-center">
                                          <button
                                             onClick={() => handleUpdateDriverWarns(d.id, Math.max(0, (d.warns || 0) - 1))}
                                             className={`p-1 hover:bg-slate-100 rounded transition-all ${updatingWarnings.has(d.id) ? 'opacity-50' : ''}`}
                                          >
                                             -
                                          </button>
                                          <div className={`px-3 py-1 rounded-lg font-black transition-all duration-300 ${(d.warns || 0) > 0 ? 'text-red-500 bg-red-50' : 'text-slate-400'} ${updatingWarnings.has(d.id) ? 'scale-125 animate-pulse' : 'scale-100'}`}>
                                             {d.warns || 0}
                                          </div>
                                          <button
                                             onClick={() => handleUpdateDriverWarns(d.id, (d.warns || 0) + 1)}
                                             className={`p-1 hover:bg-slate-100 rounded transition-all ${updatingWarnings.has(d.id) ? 'opacity-50' : ''}`}
                                          >
                                             +
                                          </button>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                       <div className="flex justify-end gap-2">
                                          <button onClick={() => { setEditingDriver(d); setDriverProfileImage(d.profile_photo || null); setShowAddDriver(true); }} className="p-2 bg-slate-100 rounded-lg"><Edit3 size={16} /></button>
                                          <button onClick={() => handleDeleteDriver(d.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* PARTNERS (STORES) */}
               {activeTab === 'PARTNERS' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">Partenaires & Marques</h3>
                        <button onClick={() => { setEditingStore(null); setStoreImagePreview(null); setShowAddPartner(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Plus size={16} /> Nouveau Partenaire
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {memoizedStoreCards}
                     </div>
                  </div>
               )}

               {/* CATALOGUE */}
               {activeTab === 'PRODUCTS' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" style={{ willChange: 'transform' }}>
                     <div onClick={() => {
                        setEditingProduct(null);
                        setProductImagePreview(null);
                        setProductAdditionalImages([]);
                        setShowAddProduct(true);
                     }} className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer will-change-transform">
                        <Plus size={32} className="text-slate-300" />
                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Ajouter un produit</span>
                     </div>
                     {memoizedProductCards}
                  </div>
               )}



               {/* CATEGORIES */}
               {activeTab === 'CATEGORIES' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">Catégories du Catalogue</h3>
                        <button onClick={() => { setEditingCategory(null); setShowAddCategory(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Plus size={16} /> Ajouter une Catégorie
                        </button>
                     </div>
                     <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5">Icône</th>
                                 <th className="px-8 py-5">Français</th>
                                 <th className="px-8 py-5">Arabe</th>
                                 <th className="px-8 py-5">Ordre</th>
                                 <th className="px-8 py-5">Sous-Catégories</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y">
                              {filteredCategories.map(cat => (
                                 <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                       {cat.image_url ? (
                                          <img src={cat.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100" />
                                       ) : (
                                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                             <ImageIcon size={20} />
                                          </div>
                                       )}
                                    </td>
                                    <td className="px-8 py-5 font-bold">{cat.name_fr}</td>
                                    <td className="px-8 py-5 font-bold">{cat.name_ar}</td>
                                    <td className="px-8 py-5 font-black text-slate-400">{cat.display_order}</td>
                                    <td className="px-8 py-5 text-right">
                                       <div className="flex justify-end gap-2">
                                          <button
                                             onClick={() => {
                                                setEditingCategory(cat);
                                                setShowAddSubCategory(true);
                                             }}
                                             className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
                                             title="Gérer les sous-catégories"
                                          >
                                             <ListTree size={14} />
                                             <span>Gérer</span>
                                          </button>
                                          <button onClick={() => { setEditingCategory(cat); setShowAddCategory(true); }} className="p-2 text-slate-400 hover:text-orange-600 transition-all hover:bg-orange-50 rounded-lg"><Edit3 size={16} /></button>
                                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* CONFIGURATION */}
               {activeTab === 'CONFIG' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* SUPPORT INFO */}
                        <div className="bg-white rounded-[3rem] border p-10 shadow-sm space-y-8">
                           <div className="flex items-center gap-3">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Phone size={20} /></div>
                              <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Contact Support</h3>
                           </div>
                           <form onSubmit={handleSaveSupportInfo} className="space-y-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone Support</label>
                                 <input name="phone" type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all" defaultValue={supportInfo.phone} />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Support</label>
                                 <input name="email" type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all" defaultValue={supportInfo.email} />
                              </div>
                              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Enregistrer les contacts</button>
                           </form>
                        </div>

                        {/* RIB MANAGEMENT */}
                        <div className="bg-white rounded-[3rem] border p-10 shadow-sm space-y-8">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CreditCard size={20} /></div>
                                 <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Comptes Bancaires (RIB)</h3>
                              </div>
                              <button onClick={() => { setEditingRIB(null); setShowAddRIB(true); }} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 transition-colors">
                                 <Plus size={20} />
                              </button>
                           </div>

                           <div className="space-y-4">
                              {ribs.length === 0 ? (
                                 <div className="text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400">Aucun RIB configuré</p>
                                 </div>
                              ) : (
                                 ribs.map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                                       <div className="flex flex-col gap-1">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.label}</span>
                                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">• {r.full_name}</span>
                                          <span className="font-bold text-slate-700 tracking-wider">{r.rib}</span>
                                       </div>
                                       <div className="flex gap-2">
                                          <button onClick={() => { setEditingRIB(r); setShowAddRIB(true); }} className="p-2 text-slate-400 hover:text-orange-600 transition-colors"><Edit3 size={16} /></button>
                                          <button onClick={() => handleDeleteRIB(r.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     </div>

                     {/* DELIVERY ZONE */}
                     <div className="bg-white rounded-[3rem] border p-10 shadow-sm space-y-8">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><MapPin size={20} /></div>
                           <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Zone de Livraison</h3>
                        </div>
                        <div className="space-y-4">
                           <p className="text-sm text-slate-600 font-medium">Sélectionnez la zone de livraison active pour l'application</p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button
                                 onClick={() => {
                                    setDeliveryZone('kenitra');
                                    onUpdateSettings('delivery_zone', 'kenitra');
                                 }}
                                 className={`p-6 rounded-2xl border-2 font-black uppercase text-xs tracking-widest transition-all active:scale-95 ${deliveryZone === 'kenitra'
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-lg shadow-indigo-200'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                                    }`}
                              >
                                 <MapPin size={20} className="mx-auto mb-2" />
                                 Kenitra uniquement
                                 <div className="text-[10px] text-slate-500 mt-2 font-normal">Rayon de 25 km</div>
                              </button>
                              <button
                                 onClick={() => {
                                    setDeliveryZone('all_morocco');
                                    onUpdateSettings('delivery_zone', 'all_morocco');
                                 }}
                                 className={`p-6 rounded-2xl border-2 font-black uppercase text-xs tracking-widest transition-all active:scale-95 ${deliveryZone === 'all_morocco'
                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-200'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-green-300'
                                    }`}
                              >
                                 <MapPin size={20} className="mx-auto mb-2" />
                                 Tout le Maroc
                                 <div className="text-[10px] text-slate-500 mt-2 font-normal">Pas de limite géographique</div>
                              </button>
                           </div>
                        </div>
                     </div>

                     {/* DELIVERY FEE PER KM */}
                     <div className="bg-white rounded-[3rem] border p-10 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><DollarSign size={20} /></div>
                           <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Frais de livraison — DH / km</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                           <div className="md:col-span-1 space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix par km (DH)</label>
                              <input
                                 type="number"
                                 step="0.5"
                                 min={0}
                                 value={feePerKm}
                                 onChange={e => setFeePerKm(Number(e.target.value))}
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all"
                              />
                           </div>

                           <div className="md:col-span-1 space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exemple</label>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold">
                                 <div className="text-sm">10 km → <span className="text-orange-600">{(10 * feePerKm).toFixed(2)} DH</span></div>
                                 <div className="text-xs text-slate-400">(calculé automatiquement)</div>
                              </div>
                           </div>

                           <div className="md:col-span-1 flex flex-col gap-3 md:items-end">
                              <p className="text-[10px] text-slate-500">Ce tarif sera utilisé pour calculer les frais de livraison par distance (si implémenté côté client/serveur).</p>
                              <div className="flex gap-2 items-center">
                                 <button onClick={() => { setFeePerKm(typeof propDeliveryFeePerKm !== 'undefined' ? propDeliveryFeePerKm : 3); setSavedFeePerKm(false); }} className="px-6 py-3 bg-white border rounded-2xl text-sm font-black">Annuler</button>
                                 <button
                                    onClick={async () => {
                                       try {
                                          setSavingFeePerKm(true);
                                          setSavedFeePerKm(false);
                                          await onUpdateSettings('delivery_fee_per_km', String(feePerKm));
                                          setSavedFeePerKm(true);
                                          // refresh parent settings
                                          onBack();
                                          setTimeout(() => setSavedFeePerKm(false), 2000);
                                       } catch (err) {
                                          console.error('Failed to save delivery_fee_per_km', err);
                                          alert('Erreur lors de la sauvegarde des paramètres.');
                                       } finally {
                                          setSavingFeePerKm(false);
                                       }
                                    }}
                                    className={`px-6 py-3 rounded-2xl text-sm font-black ${savingFeePerKm ? 'bg-slate-400 text-white cursor-wait' : 'bg-slate-900 text-white'}`}
                                    disabled={savingFeePerKm}
                                 >
                                    {savingFeePerKm ? 'Enregistrement...' : 'Enregistrer'}
                                 </button>
                                 {savedFeePerKm && <span className="text-xs text-emerald-600 font-black ml-2">Enregistré ✓</span>}
                              </div>
                           </div>
                        </div>
                     </div>


                     {/* ANNOUNCEMENT MANAGEMENT */}
                     <div className="bg-white rounded-[3rem] border p-10 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Megaphone size={20} /></div>
                              <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Gestion des Annonces</h3>
                           </div>
                           <button
                              onClick={() => { setEditingAnnouncement(null); setAnnouncementImagePreview(null); setShowAddAnnouncement(true); }}
                              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center gap-2"
                           >
                              <Plus size={16} /> Nouvelle Annonce
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                           {propAnnouncements.length === 0 ? (
                              <div className="col-span-full text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                 <p className="text-xs font-bold text-slate-400">Aucune annonce programmée</p>
                              </div>
                           ) : (
                              propAnnouncements.map(ann => (
                                 <div key={ann.id} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col gap-4 group hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start">
                                       <div className="flex-1">
                                          <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{ann.title}</h4>
                                          <p className="text-[10px] text-slate-400 mt-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                                       </div>
                                       <div className="bauble_box">
                                          <input
                                             className="bauble_input"
                                             id={`ann-active-${ann.id}`}
                                             type="checkbox"
                                             checked={ann.active}
                                             onChange={() => handleToggleAnnouncement(ann.id, ann.active)}
                                          />
                                          <label className="bauble_label" htmlFor={`ann-active-${ann.id}`}>Statut</label>
                                       </div>
                                    </div>

                                    {ann.images && ann.images.length > 0 && (
                                       <div className="w-full h-32 bg-white rounded-2xl overflow-hidden shadow-inner cursor-pointer" onClick={() => setViewingImage(ann.images![0])}>
                                          <img src={ann.images[0]} className="w-full h-full object-cover" />
                                       </div>
                                    )}

                                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{ann.content}</p>

                                    <div className="flex gap-2 mt-2">
                                       <button
                                          onClick={() => {
                                             setEditingAnnouncement(ann);
                                             setAnnouncementImagePreview(ann.images?.[0] || null);
                                             setShowAddAnnouncement(true);
                                          }}
                                          className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                       >
                                          Modifier
                                       </button>
                                       <button
                                          onClick={() => handleDeleteAnnouncement(ann.id)}
                                          className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>

                     <div className="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-center gap-6 text-orange-800">
                        <div className="p-4 bg-white rounded-3xl shadow-sm"><Info size={24} /></div>
                        <div className="space-y-1">
                           <p className="font-black uppercase text-[10px] tracking-widest">Information Importante</p>
                           <p className="text-xs font-bold leading-relaxed max-w-xl">Ces coordonnées sont affichées aux utilisateurs lors du processus de paiement et pour le support direct. Assurez-vous de leur exactitude.</p>
                        </div>
                     </div>
                  </div>
               )}

               {/* SUPPORT TICKETS */}
               {activeTab === 'SUPPORT_TICKETS' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">Tickets Support</h3>
                        <div className="flex gap-2">
                           {selectedTicketIds.length > 0 && (
                              <>
                                 <button
                                    onClick={handleSelectAllTickets}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all bg-indigo-500 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600"
                                 >
                                    {selectedTicketIds.length === filteredTickets.length ? 'Tout Désélectionner' : 'Tout Sélectionner'}
                                 </button>
                                 <button
                                    onClick={handleDeleteSelectedTickets}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 flex items-center gap-2"
                                 >
                                    <Trash2 size={14} /> Supprimer ({selectedTicketIds.length})
                                 </button>
                              </>
                           )}
                           {selectedTicketIds.length === 0 && (
                              <button
                                 onClick={handleSelectAllTickets}
                                 className="px-4 py-2 rounded-xl text-xs font-black uppercase transition-all bg-white text-slate-400 border hover:bg-slate-50"
                              >
                                 Tout Sélectionner
                              </button>
                           )}
                           <button onClick={() => setSupportFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${supportFilter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}>Tous</button>
                           <button onClick={() => setSupportFilter('pending')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${supportFilter === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}>En Attente</button>
                           <button onClick={() => setSupportFilter('resolved')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${supportFilter === 'resolved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}>Résolus</button>
                           <button onClick={fetchData} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"><RotateCw size={16} /></button>
                        </div>
                     </div>
                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5 w-12">
                                    <input
                                       type="checkbox"
                                       checked={selectedTicketIds.length === filteredTickets.length && filteredTickets.length > 0}
                                       onChange={handleSelectAllTickets}
                                       className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                 </th>
                                 <th className="px-8 py-5">Date</th>
                                 <th className="px-8 py-5">Livreur</th>
                                 <th className="px-8 py-5">Sujet</th>
                                 <th className="px-8 py-5">Statut</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {filteredTickets.map(t => (
                                 <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                       <input
                                          type="checkbox"
                                          checked={selectedTicketIds.includes(t.id)}
                                          onChange={() => handleToggleTicketSelection(t.id)}
                                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                       />
                                    </td>
                                    <td className="px-8 py-5 text-slate-500 font-bold">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-5">
                                       <div className="flex flex-col">
                                          <span className="font-bold">{t.driver_name || 'Inconnu'}</span>
                                          <span className="text-[10px] text-slate-400">{t.driver_phone}</span>
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 max-w-xs truncate" title={t.description}>{t.description}</td>
                                    <td className="px-8 py-5">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${t.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                          {t.status === 'resolved' ? 'Résolu' : 'En attente'}
                                       </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                       <button onClick={() => setSelectedTicket(t)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 transition-colors text-xs font-bold px-4">
                                          {t.status === 'resolved' ? 'Voir' : 'Répondre'}
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                              {supportTickets.length === 0 && (
                                 <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center text-slate-400 italic font-bold">Aucun ticket de support.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
            </div>
         </main>

         {/* MODAL SUPPORT TICKET */}
         {selectedTicket && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60" onClick={() => setSelectedTicket(null)}>
               <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                  <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
                     <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Support Ticket Details</h3>
                     <button onClick={() => setSelectedTicket(null)} className="p-2 bg-white rounded-full hover:bg-slate-200"><X size={20} /></button>
                  </header>
                  <div className="p-0 flex flex-col h-[600px]">
                     {/* Ticket Info Header (Internal) */}
                     <div className="p-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
                        <div className="flex gap-4 items-center">
                           <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Livreur</p>
                              <p className="font-bold text-slate-800 text-sm">{selectedTicket.driver_name}</p>
                           </div>
                           <div className="h-6 w-px bg-slate-200"></div>
                           <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID</p>
                              <p className="font-bold text-slate-500 text-[10px]">{selectedTicket.driver_id}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Statut</label>
                           <select
                              value={selectedTicket.status}
                              onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                              className="block bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-orange-500 transition-all cursor-pointer shadow-sm"
                           >
                              <option value="open">Ouvert</option>
                              <option value="in_progress">En cours</option>
                              <option value="resolved">Résolu</option>
                           </select>
                        </div>
                     </div>

                     {/* Chat Messages Area */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white scroll-smooth">
                        {/* Initial Description */}
                        <div className="flex justify-start">
                           <div className="max-w-[85%] space-y-1">
                              <div className="bg-slate-100 text-slate-700 p-4 rounded-2xl rounded-tl-none text-sm font-medium shadow-sm border border-slate-200/50">
                                 <p className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-1">Message Initial</p>
                                 {selectedTicket.description}
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold ml-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                           </div>
                        </div>

                        {/* Chat History */}
                        {supportMessages.map((m) => (
                           <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] space-y-1 ${m.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                                 <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm border ${m.sender_type === 'admin'
                                    ? 'bg-slate-900 text-white rounded-tr-none border-slate-800'
                                    : 'bg-orange-50 text-orange-900 rounded-tl-none border-orange-100'
                                    }`}>
                                    {m.message}
                                 </div>
                                 <p className={`text-[9px] text-slate-400 font-bold ${m.sender_type === 'admin' ? 'mr-1' : 'ml-1'}`}>
                                    {new Date(m.created_at).toLocaleString()}
                                 </p>
                              </div>
                           </div>
                        ))}
                        <div ref={messagesEndRef} />
                     </div>

                     {/* Input Area */}
                     <div className="p-4 bg-slate-50 border-t shrink-0">
                        <div className="relative flex items-center gap-2">
                           <input
                              ref={replyInputRef}
                              className="flex-1 bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-colors pr-12 shadow-sm"
                              placeholder="Écrivez votre réponse..."
                              defaultValue={replyText}
                              onInput={e => setReplyHasText(((e.target as HTMLInputElement).value || '').trim().length > 0)}
                              onKeyDown={e => (e as React.KeyboardEvent).key === 'Enter' && handleReplyTicket()}
                           />
                           <button
                              onClick={handleReplyTicket}
                              disabled={!replyHasText}
                              className="absolute right-1.5 p-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                           >
                              <ChevronRight size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL CONFIRMATION SUPPRESSION MARQUE */}
         {
            showDeleteStoreModal && storeToDelete && (
               <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/80 transition-opacity duration-150" onClick={() => setShowDeleteStoreModal(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-lg overflow-hidden transition-transform transition-opacity duration-200 ease-out transform-gpu" style={{ willChange: 'transform, opacity' }}>
                     <header className="p-8 border-b flex justify-between items-center bg-red-50">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                              <AlertTriangle size={24} />
                           </div>
                           <h3 className="text-xl font-black uppercase text-red-600">?? Confirmation Requise</h3>
                        </div>
                        <button onClick={() => { setShowDeleteStoreModal(false); setDeleteStorePassword(''); }} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                           <X size={20} />
                        </button>
                     </header>
                     <form onSubmit={confirmDeleteStore} className="p-8 space-y-6">
                        {/* Informations sur la marque */}
                        <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-red-500 space-y-3">
                           <div className="flex items-center gap-3">
                              <img src={storeToDelete.image_url || storeToDelete.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23e2e8f0' width='100' height='100'/%3E%3C/svg%3E"} width={56} height={56} decoding="async" className="w-14 h-14 rounded-xl object-cover border-2 border-red-200" style={{ willChange: 'opacity, transform' }} />
                              <div>
                                 <h4 className="font-black text-lg text-slate-800">{storeToDelete.name}</h4>
                                 <p className="text-xs text-slate-500 uppercase tracking-wider">{storeToDelete.category_id}</p>
                              </div>
                           </div>
                        </div>

                        {/* Avertissement */}
                        <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl space-y-2">
                           <div className="flex items-start gap-3">
                              <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                              <div className="space-y-2">
                                 <p className="text-sm font-black text-orange-800 uppercase tracking-wide">Action Irréversible</p>
                                 <p className="text-xs text-orange-700 leading-relaxed">
                                    Cette action va supprimer définitivement la marque <span className="font-black">{storeToDelete.name}</span> ainsi que <span className="font-black">tous ses produits associés</span>.
                                 </p>
                                 <p className="text-xs text-orange-600 italic">
                                    Cette opération ne peut pas être annulée.
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Champ mot de passe */}
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <ShieldAlert size={14} />
                              Confirmez avec votre Badge ID (Mot de passe)
                           </label>
                           <input
                              type="password"
                              value={deleteStorePassword}
                              onChange={(e) => setDeleteStorePassword(e.target.value)}
                              placeholder="Entrez votre badge ID..."
                              required
                              autoFocus
                              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 outline-none rounded-2xl py-4 px-6 font-bold transition-colors duration-150 text-slate-800 placeholder:text-slate-300"
                           />
                           <p className="text-[10px] text-slate-400 italic">Pour des raisons de sécurité, veuillez confirmer votre identité</p>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3 pt-4">
                           <button
                              type="button"
                              onClick={() => { setShowDeleteStoreModal(false); setDeleteStorePassword(''); }}
                              className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[1.75rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors duration-150"
                           >
                              Annuler
                           </button>
                           <button
                              type="submit"
                              disabled={isDeleting}
                              className="flex-1 bg-red-600 text-white py-4 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center gap-2"
                           >
                              {isDeleting ? (
                                 <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Suppression...
                                 </>
                              ) : (
                                 <>
                                    <Trash2 size={16} />
                                    Supprimer Définitivement
                                 </>
                              )}
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL RIB */}
         {
            showAddRIB && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60 transition-opacity duration-150" onClick={() => setShowAddRIB(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingRIB ? 'Modifier' : 'Nouveau'} RIB</h3>
                        <button onClick={() => setShowAddRIB(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form onSubmit={handleCreateRIB} className="p-8 space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titulaire du compte (Nom Complet)</label>
                           <input name="full_name" defaultValue={editingRIB?.full_name} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Libellé (ex: BMCE Bank, Barid Bank)</label>
                           <input name="label" defaultValue={editingRIB?.label} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro RIB (24 chiffres)</label>
                           <input name="rib" defaultValue={editingRIB?.rib} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">
                           {editingRIB ? 'Enregistrer les modifications' : 'Ajouter le compte'}
                        </button>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL COMMANDE */}
         {selectedOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
               <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSelectedOrder(null)}></div>
               <div className="relative w-full h-screen bg-white shadow-2xl overflow-y-auto">
                  <header className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-12 py-8 border-b flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                           <Package size={24} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black uppercase tracking-tight">Détails de la Commande</h3>
                           <p className="text-sm font-bold text-slate-400 font-mono">#{selectedOrder.id}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <button onClick={() => generateOrderPDF(selectedOrder)} className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                           <Download size={18} /> Télécharger PDF
                        </button>
                        <button onClick={() => handleShareOrder(selectedOrder)} className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                           <Share2 size={18} /> Partager
                        </button>
                        <div className="w-px h-8 bg-slate-200 mx-2"></div>
                        <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 hover:text-slate-600 transition-all"><X size={24} /></button>
                     </div>
                  </header>
                  <div className="p-12 max-w-[1400px] mx-auto space-y-12">
                     {/* Row 1: Client & Evaluation & Status */}
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Status Control */}
                        <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-sm space-y-4">
                           <div className="flex items-center gap-2 text-slate-400">
                              <BarChart3 size={16} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Statut de la Livraison</p>
                           </div>
                           <div className="space-y-4">
                              <select
                                 value={selectedOrder.status}
                                 onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                                 className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black transition-all outline-none appearance-none cursor-pointer"
                              >
                                 <option value="pending">En attente</option>
                                 <option value="verification">En vérification</option>
                                 <option value="treatment">En traitement</option>
                                 <option value="delivering">En course</option>
                                 <option value="progression">En progression</option>
                                 <option value="delivered">Livrée</option>
                                 <option value="refused">Refusée</option>
                                 <option value="unavailable">Indisponible</option>
                              </select>
                              <div className={`p-4 rounded-2xl flex items-center gap-3 ${selectedOrder.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                 {selectedOrder.status === 'delivered' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                 <span className="text-xs font-black uppercase tracking-widest">Actuellement : {selectedOrder.status}</span>
                              </div>
                           </div>
                        </section>

                        {/* Driver Assignment */}
                        <section className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-sm space-y-4">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Bike size={16} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Assignation Livreur</p>
                           </div>
                           <div className="space-y-4">
                              <select
                                 value={selectedOrder.assignedDriverId || ""}
                                 onChange={(e) => handleAssignDriver(selectedOrder.id, e.target.value)}
                                 className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 font-black transition-all outline-none appearance-none cursor-pointer"
                              >
                                 <option value="">Non assigné</option>
                                 {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.fullName}</option>
                                 ))}
                              </select>
                              {selectedOrder.assignedDriverId ? (
                                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl flex items-center gap-3">
                                    <UserCheck size={20} />
                                    <span className="text-xs font-black uppercase tracking-widest">Livreur Assigné</span>
                                 </div>
                              ) : (
                                 <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl flex items-center gap-3 italic">
                                    <UserMinus size={20} />
                                    <span className="text-xs font-bold">Aucun livreur pour le moment</span>
                                 </div>
                              )}
                           </div>
                        </section>

                        {/* Client Info */}
                        <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 space-y-6">
                           <div className="flex items-center gap-2 opacity-50">
                              <User size={16} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Client Destinataire</p>
                           </div>
                           <div className="space-y-4">
                              <div>
                                 <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ID</p>
                                 <p className="text-2xl font-black text-orange-400 font-mono">{selectedOrder.id}</p>
                              </div>
                              <div>
                                 <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Téléphone</p>
                                 <p className="text-2xl font-black text-orange-400 font-mono">{selectedOrder.phone}</p>
                              </div>
                              <p className="text-xl font-black leading-tight text-white">{selectedOrder.customerName}</p>
                              {selectedOrder.customerEmail && (
                                 <p className="text-sm font-semibold text-slate-300">{selectedOrder.customerEmail}</p>
                              )}
                              {selectedOrder.deliveryAddress && (
                                 <div className="pt-4 border-t border-white/20">
                                    <p className="text-[11px] text-slate-400 font-semibold mb-2 uppercase">Adresse</p>
                                    <p className="text-base text-white leading-relaxed">{selectedOrder.deliveryAddress}</p>
                                 </div>
                              )}
                           </div>
                        </section>

                        {/* Delivery Note Section */}
                        {selectedOrder.deliveryNote && (
                           <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-lg shadow-blue-100/50 space-y-4">
                              <div className="flex items-center gap-2 text-blue-600">
                                 <MapPin size={16} />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Note de Livraison</p>
                              </div>
                              <div className="bg-white/80 p-6 rounded-2xl border border-blue-100/50">
                                 <p className="text-sm font-bold text-blue-950 leading-relaxed whitespace-pre-wrap break-words">
                                    {selectedOrder.deliveryNote}
                                 </p>
                              </div>
                           </section>
                        )}
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Facture - Store Invoice */}
                        <div className="lg:col-span-1 space-y-6">
                           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-sm h-full space-y-6">
                              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                 <FileText size={14} /> Facture du Magasin
                              </h4>
                              {(() => {
                                 const invoiceData = selectedOrder.store_invoice_base64;
                                 console.log("Invoice Debug:", {
                                    orderId: selectedOrder.id,
                                    hasInvoice: !!invoiceData,
                                    invoiceLength: invoiceData?.length || 0,
                                    invoicePreview: invoiceData?.substring(0, 50) || 'null'
                                 });
                                 return invoiceData && invoiceData.trim() ? (
                                    <div className="space-y-4">
                                       {(() => {
                                          // Remove duplicate prefix if it exists
                                          const cleanedInvoiceData = invoiceData.startsWith('data:')
                                             ? invoiceData
                                             : `data:image/jpeg;base64,${invoiceData}`;
                                          return (
                                             <>
                                                <img
                                                   src={cleanedInvoiceData}
                                                   alt="Facture Magasin"
                                                   className="w-full rounded-2xl border border-slate-200 shadow-sm object-cover"
                                                   onError={(e) => {
                                                      console.error('Erreur chargement image:', e);
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                   }}
                                                />
                                                <button
                                                   onClick={() => setViewingImage(cleanedInvoiceData)}
                                                   className="w-full bg-slate-900 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                                                >
                                                   <ZoomIn size={14} /> Agrandir
                                                </button>
                                             </>
                                          );
                                       })()}
                                    </div>
                                 ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                       <FileText size={48} className="opacity-20 mb-4" />
                                       <p className="text-xs font-bold italic">Aucune facture disponible</p>
                                    </div>
                                 );
                              })()}
                           </div>
                        </div>

                        {/* Order Notes & Ratings */}
                        <div className="lg:col-span-2 space-y-8">
                           {/* Evaluation */}
                           <section className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900">
                              <div className="space-y-4">
                                 <div className="flex items-center gap-2 text-slate-400">
                                    <Truck size={16} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Note Livreur (Admin)</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                       <Star
                                          key={star}
                                          size={24}
                                          fill={star <= (selectedOrder.driverRating || 0) ? "#eab308" : "none"}
                                          className={`cursor-pointer transition-all hover:scale-125 ${star <= (selectedOrder.driverRating || 0) ? "text-yellow-500" : "text-slate-200"}`}
                                          onClick={() => handleUpdateDriverRating(selectedOrder.id, star)}
                                       />
                                    ))}
                                    <span className="text-xl font-black text-slate-800 ml-2">{selectedOrder.driverRating || 0}/5</span>
                                 </div>
                              </div>
                           </section>

                           {/* Notes Area */}
                           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-slate-400">
                                    <Edit3 size={16} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">NOTE ADMIN</p>
                                 </div>
                                 <button
                                    onClick={() => handleUpdateOrderNotes(selectedOrder.id, editingOrderNotes)}
                                    className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                                 >
                                    <Save size={14} /> Enregistrer les Notes
                                 </button>
                              </div>
                              <textarea
                                 value={editingOrderNotes}
                                 onChange={(e) => setEditingOrderNotes(e.target.value)}
                                 placeholder="Saisissez ici les informations complémentaires ou notes de suivi..."
                                 className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 rounded-3xl p-6 text-sm font-bold text-slate-700 outline-none transition-all min-h-[160px] resize-none shadow-inner"
                              />
                           </div>
                        </div>
                     </div>

                     {/* Media Section (Full Width) */}
                     <div className="space-y-8">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <ImageIcon size={14} /> Pièces Jointes & Preuves
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {/* Prescription Image */}
                           {selectedOrder.prescription_base64 && (
                              <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col gap-6">
                                 <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ordonnance</p>
                                    <button
                                       onClick={() => {
                                          const link = document.createElement('a');
                                          let imgData = selectedOrder.prescription_base64!;
                                          if (!imgData.startsWith('data:')) imgData = `data:image/jpeg;base64,${imgData}`;
                                          link.href = imgData;
                                          link.download = `Prescription_Commande_${selectedOrder.id}.jpg`;
                                          link.click();
                                       }}
                                       className="p-2 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                       <Download size={14} />
                                    </button>
                                 </div>
                                 <div
                                    onClick={() => setViewingImage(selectedOrder.prescription_base64!)}
                                    className="cursor-pointer hover:scale-[1.02] transition-transform rounded-2xl overflow-hidden border-2 border-white shadow-lg"
                                 >
                                    {renderMediaThumbnail(selectedOrder.prescription_base64, "w-full h-56")}
                                 </div>
                              </div>
                           )}

                           {/* Payment Receipt Image */}
                           {selectedOrder.payment_receipt_base64 && (
                              <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 flex flex-col gap-6">
                                 <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Reçu de Paiement</p>
                                    <button
                                       onClick={() => {
                                          const link = document.createElement('a');
                                          let imgData = selectedOrder.payment_receipt_base64!;
                                          if (!imgData.startsWith('data:')) imgData = `data:image/jpeg;base64,${imgData}`;
                                          link.href = imgData;
                                          link.download = `Recu_Commande_${selectedOrder.id}.jpg`;
                                          link.click();
                                       }}
                                       className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                    >
                                       <Download size={14} />
                                    </button>
                                 </div>
                                 <div
                                    onClick={() => setViewingImage(selectedOrder.payment_receipt_base64!)}
                                    className="cursor-pointer hover:scale-[1.02] transition-transform rounded-2xl overflow-hidden border-2 border-white shadow-lg"
                                 >
                                    {renderMediaThumbnail(selectedOrder.payment_receipt_base64, "w-full h-56")}
                                 </div>
                              </div>
                           )}
                           {!selectedOrder.prescription_base64 && !selectedOrder.payment_receipt_base64 && (
                              <div className="md:col-span-3 py-16 flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 text-slate-300">
                                 <ImageIcon size={48} className="opacity-10 mb-4" />
                                 <p className="text-sm font-bold italic">Aucune pièce jointe</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Items List Section (Expanded) */}
                     <div className="space-y-8">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <ShoppingBag size={14} /> Liste des Articles ({selectedOrder.items.length})
                           </h4>
                           <span className="px-6 py-2 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200">
                              Total Articles: {selectedOrder.items.reduce((acc, it) => acc + (it.quantity || 1), 0)}
                           </span>
                        </div>
                        <div className="bg-white rounded-[3rem] border-2 border-slate-900 overflow-hidden shadow-xl shadow-slate-100/50">
                           <table className="w-full text-left">
                              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                 <tr>
                                    <th className="px-10 py-6">Illustration & Désignation</th>
                                    <th className="px-10 py-6">Établissement</th>
                                    <th className="px-10 py-6 text-right">Prix Unitaire</th>
                                    <th className="px-10 py-6 text-right">Total Ligne</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {selectedOrder.items.map((it, i) => (
                                    <tr key={i} className="group hover:bg-slate-50/50 transition-all duration-300">
                                       <td className="px-10 py-8">
                                          <div className="flex items-center gap-6">
                                             {it.image_base64 ? (
                                                <div
                                                   onClick={() => setViewingImage(it.image_base64!)}
                                                   className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all ring-1 ring-slate-100 bg-white"
                                                >
                                                   {renderMediaThumbnail(it.image_base64, "w-full h-full")}
                                                </div>
                                             ) : (
                                                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-100">
                                                   <Box size={32} />
                                                </div>
                                             )}
                                             <div className="space-y-2">
                                                <p className="font-black text-slate-900 text-lg leading-tight tracking-tight">
                                                   {it.productName || it.product?.name || 'Produit sans nom'}
                                                </p>
                                                {it.note && (
                                                   <div className="mt-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 relative overflow-hidden group/note">
                                                      <div className="absolute top-0 left-0 w-1 h-full bg-orange-400 opacity-20 group-hover/note:opacity-50 transition-opacity" />
                                                      <div className="flex items-start gap-3">
                                                         <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                                         <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Consigne Client</p>
                                                            <p className="text-sm text-orange-950 font-bold leading-relaxed whitespace-pre-wrap break-words">
                                                               {it.note}
                                                            </p>
                                                         </div>
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-10 py-8">
                                          <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
                                             {it.storeName || 'Non spécifié'}
                                          </span>
                                       </td>
                                       <td className="px-10 py-8 text-right">
                                          <p className="text-base font-bold text-slate-500">{(it.price || it.product?.price || 0).toFixed(2)}</p>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DH / Unité</p>
                                       </td>
                                       <td className="px-10 py-8 text-right">
                                          <p className="text-xl font-black text-orange-600">
                                             {((it.quantity || 1) * (it.price || it.product?.price || 0)).toFixed(2)}
                                          </p>
                                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">DH Total</p>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* Footer Summary */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Articles</p>
                           <p className="text-2xl font-black text-slate-800 text-center">{(selectedOrder.total_products || 0).toFixed(2)} DH</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Service</p>
                           <p className="text-2xl font-black text-slate-800 text-center">{(selectedOrder.delivery_fee || 15).toFixed(2)} DH</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Paiement</p>
                           <div className="flex items-center justify-center gap-2">
                              <CreditCard size={20} className="text-blue-500" />
                              <p className="text-2xl font-black text-slate-800">{selectedOrder.payment_method === 'transfer' ? 'Virement' : 'Espèces'}</p>
                           </div>
                        </div>
                        <div className="bg-orange-500 p-8 rounded-[2.5rem] shadow-xl shadow-orange-100 space-y-2">
                           <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Montant</p>
                           <p className="text-3xl font-black text-white text-center">{(selectedOrder.total_final || (selectedOrder.total_products + selectedOrder.delivery_fee) || 0).toFixed(2)} DH</p>
                        </div>
                     </div>

                     {/* Placeholder for Future Options */}
                     <div className="pt-8 border-t border-slate-100 opacity-20 hover:opacity-100 transition-opacity">
                        <div className="flex flex-col items-center gap-4 py-8">
                           <div className="w-16 h-1 bg-slate-100 rounded-full"></div>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Espace Réservé : Actions Administratives Futures</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL DRIVER */}
         {
            showAddDriver && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddDriver(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingDriver ? 'Modifier' : 'Nouveau'} Livreur</h3>
                        <button onClick={() => setShowAddDriver(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form key={editingDriver?.id || 'new-driver'} onSubmit={handleCreateDriver} className="p-8 space-y-6">
                        <div className="flex justify-center mb-6">
                           <div className="relative group">
                              <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                 {driverProfileImage ? <img src={driverProfileImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Truck size={40} /></div>}
                              </div>
                              <label className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-xl cursor-pointer shadow-lg hover:bg-orange-600 transition-colors">
                                 <Plus size={16} />
                                 <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       const reader = new FileReader();
                                       reader.onloadend = () => setDriverProfileImage(reader.result as string);
                                       reader.readAsDataURL(file);
                                    }
                                 }} />
                              </label>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom Complet</label>
                              <input name="full_name" defaultValue={editingDriver?.full_name} required className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                              <input name="phone" defaultValue={editingDriver?.phone} required className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro CIN</label>
                           <input name="id_card_number" defaultValue={editingDriver?.id_card_number} required className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>

                        {/* AVERTISSEMENTS */}
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
                           <div>
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                 <AlertTriangle size={14} /> Avertissements (Warns)
                              </p>
                              <p className="text-xs text-red-400 mt-1">Impacte la réputation du livreur</p>
                           </div>
                           <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-red-100 p-1">
                              <button
                                 type="button"
                                 onClick={() => setDriverWarns(Math.max(0, driverWarns - 1))}
                                 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 font-bold transition-colors"
                              >
                                 -
                              </button>
                              <span className="w-8 text-center font-black text-lg text-slate-800">{driverWarns}</span>
                              <button
                                 type="button"
                                 onClick={() => setDriverWarns(driverWarns + 1)}
                                 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 font-bold transition-colors"
                              >
                                 +
                              </button>
                           </div>
                        </div>

                        {/* DOCUMENTS */}
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents & Justificatifs</label>
                              <div className="relative">
                                 <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    id="doc-upload"
                                    className="hidden"
                                    onChange={async (e) => {
                                       const files = e.target.files;
                                       if (files && files.length > 0) {
                                          const newDocs: DriverDocument[] = [];
                                          for (let i = 0; i < files.length; i++) {
                                             const file = files[i];
                                             const reader = new FileReader();
                                             await new Promise((resolve) => {
                                                reader.onloadend = () => {
                                                   newDocs.push({
                                                      id: Math.random().toString(36).substr(2, 9),
                                                      type: 'other',
                                                      label: file.name,
                                                      url: reader.result as string
                                                   });
                                                   resolve(null);
                                                };
                                                reader.readAsDataURL(file);
                                             });
                                          }
                                          setDriverDocs([...driverDocs, ...newDocs]);
                                       }
                                    }}
                                 />
                                 <label
                                    htmlFor="doc-upload"
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                                 >
                                    <Upload size={14} /> Ajouter
                                 </label>
                              </div>
                           </div>

                           <div className="space-y-3">
                              {driverDocs.length === 0 && (
                                 <p className="text-center text-xs text-slate-400 italic py-4 bg-slate-50 rounded-xl border border-dashed">Aucun document ajouté</p>
                              )}
                              {driverDocs.map((doc, idx) => (
                                 <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 group">
                                    <div
                                       className="w-12 h-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                       onClick={() => setViewingImage(doc.url)}
                                    >
                                       {renderMediaThumbnail(doc.url, "w-full h-full")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <select
                                          value={doc.type}
                                          onChange={(e) => {
                                             const newDocs = [...driverDocs];
                                             newDocs[idx].type = e.target.value as any;
                                             setDriverDocs(newDocs);
                                          }}
                                          className="text-xs font-bold bg-transparent outline-none w-full mb-1"
                                       >
                                          <option value="cin_recto">CIN Recto</option>
                                          <option value="cin_verso">CIN Verso</option>
                                          <option value="license">Permis de Conduire</option>
                                          <option value="other">Autre Document</option>
                                       </select>
                                       <p className="text-[10px] text-slate-400 truncate">{doc.label}</p>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const newDocs = driverDocs.filter((_, i) => i !== idx);
                                          setDriverDocs(newDocs);
                                       }}
                                       className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Zone</label>
                           <textarea name="description" defaultValue={editingDriver?.description} rows={3} className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all resize-none" />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Enregistrer</button>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL PRODUCT */}
         {
            showAddProduct && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddProduct(false)}></div>
                  <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh]">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingProduct ? 'Modifier' : 'Nouveau'} Produit</h3>
                        <button onClick={() => {
                           setShowAddProduct(false);
                           setEditingProduct(null);
                           setProductImagePreview(null);
                           setProductAdditionalImages([]);
                        }} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form key={editingProduct?.id || 'new-product'} id="product-form" onSubmit={handleCreateProduct} className="p-8 space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Nom du Produit</label>
                           <input name="name" defaultValue={editingProduct?.name} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Prix [DH]</label>
                              <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" required />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Boutique / Marque</label>
                              <select name="store_id" value={productFormStoreId || (editingProduct as any)?.store_id || stores.filter(s => !s.is_deleted)[0]?.id || ''} onChange={e => setProductFormStoreId(e.target.value)} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all appearance-none cursor-pointer" required>
                                 {stores.filter(s => !s.is_deleted).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                           </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Prix Editable</span>
                              <span className="text-[9px] font-bold text-slate-400">Permettre aux livreurs de modifier le prix</span>
                           </div>
                           <div className="bauble_box ml-auto">
                              <input
                                 className="bauble_input"
                                 id="price_editable_switch"
                                 name="price_editable"
                                 type="checkbox"
                                 defaultChecked={editingProduct?.price_editable}
                              />
                              <label className="bauble_label" htmlFor="price_editable_switch">Toggle</label>
                           </div>
                        </div>

                        {/* Unified Images Gallery */}
                        <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                           <div className="flex items-center justify-between">
                              <div>
                                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Galerie Photos</h4>
                                 <p className="text-[9px] text-slate-400 font-bold mt-1">La 1ère image sera l'image principale</p>
                              </div>
                              <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black">
                                 {productAdditionalImages.length + (productImagePreview || editingProduct?.image ? 1 : 0)}/4
                              </div>
                           </div>

                           <div className="grid grid-cols-4 gap-3">
                              {/* Main Image */}
                              {(productImagePreview || editingProduct?.image) && (
                                 <div className="relative group aspect-square">
                                    <div className="w-full h-full bg-white rounded-xl overflow-hidden border-2 border-orange-400 shadow-md relative">
                                       <img src={productImagePreview || editingProduct?.image} className="w-full h-full object-cover" alt="Image principale" />
                                       <div className="absolute top-1 left-1 bg-orange-500 text-white px-2 py-1 rounded text-[8px] font-black">PRINCIPALE</div>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => {
                                          setProductImagePreview(null);
                                          // Si on supprime l'image principale, utiliser la première image de la galerie comme nouvelle principale
                                          if (productAdditionalImages.length > 0) {
                                             setProductImagePreview(productAdditionalImages[0]);
                                             setProductAdditionalImages(prev => prev.slice(1));
                                          }
                                       }}
                                       className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                       <X size={10} />
                                    </button>
                                 </div>
                              )}

                              {/* Gallery Images */}
                              {productAdditionalImages.map((preview, index) => (
                                 <div key={index} className="relative group aspect-square">
                                    <div className="w-full h-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                       <img src={preview} className="w-full h-full object-cover" alt={`Image ${index + 2}`} />
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => setProductAdditionalImages(prev => prev.filter((_, i) => i !== index))}
                                       className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                       <X size={10} />
                                    </button>
                                 </div>
                              ))}

                              {/* Upload Button */}
                              {(productAdditionalImages.length + (productImagePreview || editingProduct?.image ? 1 : 0)) < 4 && (
                                 <label className="w-full aspect-square bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group">
                                    <Plus size={20} className="text-slate-300 group-hover:text-orange-400 transition-colors" />
                                    <span className="text-[9px] text-slate-400 font-bold mt-1">Ajouter image</span>
                                    <input
                                       type="file"
                                       className="hidden"
                                       accept="image/*"
                                       onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             const totalImages = productAdditionalImages.length + (productImagePreview || editingProduct?.image ? 1 : 0);
                                             if (totalImages >= 4) return;

                                             const reader = new FileReader();
                                             reader.onloadend = () => {
                                                if (typeof reader.result === 'string') {
                                                   // Si pas d'image principale, utiliser cette nouvelle comme principale
                                                   if (!productImagePreview && !editingProduct?.image) {
                                                      setProductImagePreview(reader.result);
                                                   } else {
                                                      setProductAdditionalImages(prev => [...prev, reader.result as string]);
                                                   }
                                                }
                                             };
                                             reader.readAsDataURL(file);
                                          }
                                       }}
                                    />
                                 </label>
                              )}
                           </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Description</label>
                           <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none" />
                        </div>

                        {/* Champs visibles pour l'utilisateur (app) + libellés personnalisés */}
                        <div className="bg-amber-50/80 border border-amber-100 rounded-[2rem] p-6 space-y-4">
                           <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Champs visibles dans l’app utilisateur</h4>
                           <p className="text-[9px] text-slate-500 font-medium">Cochez les champs à afficher et personnalisez les libellés. Si la boutique est une pharmacie, vous pouvez utiliser les libellés pharmacie.</p>
                           {isProductFormStorePharmacie && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={productUserUsePharmacieLabels} onChange={e => setProductUserUsePharmacieLabels(e.target.checked)} className="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                 <span className="text-xs font-bold text-slate-700">Utiliser les libellés pharmacie</span>
                              </label>
                           )}
                           <div className="grid grid-cols-1 gap-3">
                              {USER_UI_FIELD_KEYS.map(key => (
                                 <div key={key} className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-[140px]">
                                       <input type="checkbox" checked={productUserVisible[key] !== false} onChange={e => setProductUserVisible(prev => ({ ...prev, [key]: e.target.checked }))} className="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                       <span className="text-[10px] font-black text-slate-700 uppercase">{key === 'custom_note' ? 'Zone note / commande' : key === 'name' ? 'Nom' : key === 'price' ? 'Prix' : key === 'image' ? 'Image' : key === 'description' ? 'Description' : key}</span>
                                    </label>
                                    {!LABEL_ONLY_KEYS.includes(key as any) && productUserVisible[key] !== false && (
                                       <input
                                          name={`product_label_${key}`}
                                          type="text"
                                          placeholder={key === 'custom_note' ? 'Placeholder (affiché dans la zone de saisie)' : (productUserUsePharmacieLabels && isProductFormStorePharmacie ? PHARMACIE_LABELS[key] : DEFAULT_LABELS[key])}
                                          defaultValue={productUserLabels[key] ?? ''}
                                          onBlur={e => setProductUserLabels(prev => ({ ...prev, [key]: (e.target as HTMLInputElement).value }))}
                                          className="flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400"
                                          title={key === 'custom_note' ? 'Ce texte sera utilisé comme placeholder dans l\'app (pas comme libellé)' : undefined}
                                       />
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">{editingProduct ? 'Enregistrer' : 'Ajouter au Catalogue'}</button>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL PARTNER/STORE */}
         {
            showAddPartner && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddPartner(false)}></div>
                  <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh]">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingStore ? 'Modifier' : 'Nouveau'} Partenaire</h3>
                        <button onClick={() => setShowAddPartner(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form key={editingStore?.id || 'new'} onSubmit={handleCreateStore} className="p-8 space-y-6">
                        <div className="flex justify-center mb-6">
                           <div className="relative group">
                              <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                 {storeImagePreview || editingStore?.image_url || editingStore?.image ? (
                                    <img src={storeImagePreview || editingStore?.image_url || editingStore?.image} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                       <StoreIcon size={40} />
                                    </div>
                                 )}
                              </div>
                              <label className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-xl cursor-pointer shadow-lg hover:bg-orange-600 transition-colors">
                                 <Plus size={16} />
                                 <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       const reader = new FileReader();
                                       reader.onloadend = () => setStoreImagePreview(reader.result as string);
                                       reader.readAsDataURL(file);
                                    }
                                 }} />
                              </label>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Nom de la Marque</label>
                              <input name="name" defaultValue={editingStore?.name} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Catégorie</label>
                              <select
                                 name="category_id"
                                 defaultValue={editingStore?.category_id || editingStore?.category || ''}
                                 required
                                 className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all appearance-none cursor-pointer"
                                 onChange={(e) => setEditingStore(prev => prev ? { ...prev, category_id: e.target.value } : null)}
                              >
                                 <option value="">Sélectionner une catégorie</option>
                                 {dbCategories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name_fr}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sous-Catégorie</label>
                           <select
                              name="sub_category"
                              defaultValue={editingStore?.sub_category || ''}
                              className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all appearance-none cursor-pointer"
                           >
                              <option value="">Aucune</option>
                              {/* Legacy Support: sub_categories array in cat table */}
                              {dbCategories.find(c => c.id === (editingStore?.category_id || editingStore?.category))?.sub_categories?.map((sc: string) => (
                                 <option key={sc} value={sc}>{sc} (Legacy)</option>
                              ))}
                              {/* Relational Support: sub_categories table */}
                              {propSubCategories.filter(sc => sc.category_id === (editingStore?.category_id || editingStore?.category)).map(sc => (
                                 <option key={sc.id} value={sc.name}>{sc.name}</option>
                              ))}
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tps Livraison [min]</label>
                              <input name="delivery_time_min" type="number" defaultValue={editingStore?.delivery_time_min || 25} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>

                        </div>
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                           <div className="flex flex-col items-center gap-3">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Principale</span>
                              <div className="bauble_box">
                                 <input className="bauble_input" id="is_featured_switch" name="is_featured" type="checkbox" defaultChecked={editingStore?.is_featured} />
                                 <label className="bauble_label" htmlFor="is_featured_switch">Toggle</label>
                              </div>
                           </div>
                           <div className="flex flex-col items-center gap-3">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">New</span>
                              <div className="bauble_box">
                                 <input className="bauble_input" id="is_new_switch" name="is_new" type="checkbox" defaultChecked={editingStore?.is_new} />
                                 <label className="bauble_label" htmlFor="is_new_switch">Toggle</label>
                              </div>
                           </div>
                           <div className="flex flex-col items-center gap-3">
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Product</span>
                              <div className="bauble_box">
                                 <input
                                    className="bauble_input"
                                    id="has_products_switch"
                                    name="has_products"
                                    type="checkbox"
                                    defaultChecked={editingStore?.has_products}
                                    onChange={(e) => setHasProductsEnabled(e.target.checked)}
                                 />
                                 <label className="bauble_label" htmlFor="has_products_switch">Toggle</label>
                              </div>
                           </div>
                        </div>

                        {!hasProductsEnabled && (
                           <div className="bg-amber-50/80 border border-amber-100 rounded-[2rem] p-6 space-y-4">
                              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Champs visibles dans l’app utilisateur (commande personnalisée)</h4>
                              <p className="text-[9px] text-slate-500 font-medium">Pour les marques sans catalogue : cochez les champs à afficher et le placeholder de la zone de saisie.</p>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Texte sous « Commande personnalisée »</label>
                                 <input
                                    name="custom_order_description"
                                    type="text"
                                    placeholder="ex: Écrivez ici tous les produits depuis le menu et indiquez le prix total dans la case."
                                    defaultValue={storeUserLabels.custom_order_description ?? ''}
                                    onBlur={e => setStoreUserLabels(prev => ({ ...prev, custom_order_description: (e.target as HTMLInputElement).value }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-400"
                                 />
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                 {STORE_UI_FIELD_KEYS.map(key => (
                                    <div key={key} className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                                       <label className="flex items-center gap-2 cursor-pointer min-w-[140px]">
                                          <input type="checkbox" checked={storeUserVisible[key] !== false} onChange={e => setStoreUserVisible(prev => ({ ...prev, [key]: e.target.checked }))} className="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                          <span className="text-[10px] font-black text-slate-700 uppercase">{key === 'custom_note' ? 'Zone note / commande' : key === 'gallery' ? 'Galerie' : key === 'budget' ? 'Budget' : key === 'image' ? 'Photo' : key}</span>
                                       </label>
                                       {!STORE_LABEL_ONLY_KEYS.includes(key as any) && storeUserVisible[key] !== false && (
                                          <input
                                             name={`user_label_${key}`}
                                             type="text"
                                             placeholder="Placeholder (affiché dans la zone de saisie)"
                                             defaultValue={storeUserLabels[key] ?? ''}
                                             onBlur={e => setStoreUserLabels(prev => ({ ...prev, [key]: (e.target as HTMLInputElement).value }))}
                                             className="flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400"
                                             title="Ce texte sera utilisé comme placeholder dans l'app"
                                          />
                                       )}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Description de la Marque</label>
                           <textarea name="description" defaultValue={editingStore?.description} rows={2} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none" placeholder="Une brève description de cette marque..." />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Localisation (URL ou Coordonnées X, Y)</label>
                           <div className="flex gap-2">
                              <input
                                 name="maps_url"
                                 value={mapsUrlInput}
                                 onChange={(e) => setMapsUrlInput(e.target.value)}
                                 className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all"
                                 placeholder="Coller URL ou 34.24, -6.57"
                              />
                              <button
                                 type="button"
                                 onClick={() => extractCoordinatesFromUrl(mapsUrlInput)}
                                 className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-colors"
                              >
                                 Extraire
                              </button>
                           </div>

                           {extractionError && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 mt-2">
                                 <div className="p-2 bg-red-500 text-white rounded-lg">
                                    <AlertCircle size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Erreur d'extraction</p>
                                    <p className="text-xs text-red-700 mt-1">{extractionError}</p>
                                 </div>
                              </div>
                           )}

                           {extractedCoordinates && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                                 <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                    <MapPin size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Coordonnées Extraites</p>
                                    <div className="flex gap-4 mt-1">
                                       <div>
                                          <span className="text-[8px] text-emerald-500 font-bold uppercase">Latitude (X)</span>
                                          <p className="text-sm font-black text-emerald-700">{extractedCoordinates.lat}</p>
                                       </div>
                                       <div>
                                          <span className="text-[8px] text-emerald-500 font-bold uppercase">Longitude (Y)</span>
                                          <p className="text-sm font-black text-emerald-700">{extractedCoordinates.lng}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                        <button type="submit" disabled={isSavingStore} className={`w-full py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl ${isSavingStore ? 'bg-slate-700 cursor-wait opacity-80 text-slate-200' : 'bg-slate-900 text-white'}`}>
                           {isSavingStore ? 'Enregistrement...' : 'Enregistrer la Marque'}
                        </button>
                     </form>
                  </div>
               </div >
            )
         }



         {/* MODAL CATEGORY */}
         {
            showAddCategory && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddCategory(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingCategory ? 'Modifier' : 'Nouvelle'} Catégorie</h3>
                        <button onClick={() => setShowAddCategory(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form key={editingCategory?.id || 'new-category'} onSubmit={handleCreateCategory} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID (ex: food)</label>
                              <input name="id" defaultValue={editingCategory?.id} required disabled={!!editingCategory} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all disabled:opacity-50" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordre d'affichage</label>
                              <input name="display_order" type="number" defaultValue={editingCategory?.display_order || 0} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom FR</label>
                              <input name="name_fr" defaultValue={editingCategory?.name_fr} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom AR</label>
                              <input name="name_ar" defaultValue={editingCategory?.name_ar} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom EN</label>
                              <input name="name_en" defaultValue={editingCategory?.name_en} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Image de la Catégorie</label>
                           <label className="group relative flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-slate-100 rounded-[3rem] hover:border-orange-200 transition-all cursor-pointer overflow-hidden bg-slate-50/50">
                              {categoryImagePreview ? (
                                 <>
                                    <img src={categoryImagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <Camera className="text-white" size={32} />
                                    </div>
                                 </>
                              ) : (
                                 <div className="flex flex-col items-center gap-2">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Plus className="text-slate-400" /></div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Choisir une image</p>
                                 </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageChange} />
                           </label>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">Valider la Catégorie</button>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL UTILISATEUR */}
         {
            selectedUser && (
               <div key={`user_${selectedUser.id}`} className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSelectedUser(null)}></div>
                  <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                     <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Profil Utilisateur</h3>
                        <button onClick={() => setSelectedUser(null)} className="p-3 bg-white shadow-sm border rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
                     </header>
                     <div className="p-10 space-y-8">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-inner border-4 border-white">
                              {selectedUser.fullName[0]}
                           </div>
                           <div className="text-center">
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight">{selectedUser.fullName}</h4>
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedUser.isAdmin ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                 {selectedUser.isAdmin ? 'Administrateur' : 'Client standard'}
                              </span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                           <div className="bg-slate-50 p-6 rounded-3xl space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} /> Téléphone</p>
                              <p className="font-bold text-slate-700">{selectedUser.phone || 'Non renseigné'}</p>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-3xl space-y-1 text-wrap overflow-hidden">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} /> Email</p>
                              <p className="font-bold text-slate-700">{selectedUser.email || 'Non renseigné'}</p>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-3xl space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={12} /> ID Utilisateur</p>
                              <p className="font-bold text-slate-700 break-all text-xs">{selectedUser.id}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-purple-50 border border-purple-100 p-6 rounded-3xl space-y-2">
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2"><Globe size={12} /> Langue</p>
                              <p className="text-2xl font-black text-purple-700">{selectedUser.language ? selectedUser.language.toUpperCase() : 'FR'}</p>
                           </div>
                           <div className={`border p-6 rounded-3xl space-y-2 ${selectedUser.isBlocked ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${selectedUser.isBlocked ? 'text-red-600' : 'text-emerald-600'}`}><Shield size={12} /> Statut</p>
                              <p className={`font-black ${selectedUser.isBlocked ? 'text-red-700' : 'text-emerald-700'}`}>{selectedUser.isBlocked ? 'BLOQUÉ' : 'ACTIF'}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-2">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Commandes Livrées</p>
                              <p className="text-3xl font-black text-emerald-700">{propOrders.filter(o => o.phone === selectedUser.phone && o.status === 'delivered').length}</p>
                           </div>
                           <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-2">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><DollarSign size={12} /> Total Dépensé</p>
                              <p className="text-3xl font-black text-blue-700">{propOrders.filter(o => o.phone === selectedUser.phone && o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)} DH</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                           <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-2 text-center">
                              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">En attente</p>
                              <p className="text-2xl font-black text-amber-700">{propOrders.filter(o => o.phone === selectedUser.phone && o.status === 'pending').length}</p>
                           </div>
                           <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl space-y-2 text-center">
                              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">En cours</p>
                              <p className="text-2xl font-black text-yellow-700">{propOrders.filter(o => o.phone === selectedUser.phone && (o.status === 'treatment' || o.status === 'delivering' || o.status === 'progression')).length}</p>
                           </div>
                           <div className="bg-red-50 border border-red-100 p-4 rounded-2xl space-y-2 text-center">
                              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Refusées</p>
                              <p className="text-2xl font-black text-red-700">{propOrders.filter(o => o.phone === selectedUser.phone && o.status === 'refused').length}</p>
                           </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 text-center">
                           <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                              <MapPin size={24} />
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Localisation en temps réel</p>
                              {selectedUser.lastLat && selectedUser.lastLng ? (
                                 <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedUser.lastLat},${selectedUser.lastLng}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                                 >
                                    Voir sur Google Maps <ExternalLink size={14} />
                                 </a>
                              ) : (
                                 <p className="text-slate-500 font-bold text-sm italic">Aucune donnée de position disponible</p>
                              )}
                           </div>
                        </div>

                        <button
                           onClick={() => handleToggleUserBlock(selectedUser.phone, !!selectedUser.isBlocked)}
                           className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg ${selectedUser.isBlocked ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}
                        >
                           {selectedUser.isBlocked ? 'Débloquer l\'utilisateur' : 'Bloquer l\'utilisateur'}
                        </button>
                     </div>
                  </div>
               </div>
            )
         }

         {/* MODAL ANNONCE */}
         {
            showAddAnnouncement && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddAnnouncement(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                     <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="text-xl font-black uppercase">{editingAnnouncement ? 'Modifier' : 'Nouvelle'} Annonce</h3>
                        <button onClick={() => setShowAddAnnouncement(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={20} /></button>
                     </header>
                     <form onSubmit={handleCreateAnnouncement} className="p-8 space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de l'annonce</label>
                              <input
                                 name="title"
                                 required
                                 defaultValue={editingAnnouncement?.title}
                                 placeholder="Faites passer votre message..."
                                 className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all"
                              />
                           </div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Contenu</label>
                              <textarea
                                 name="content"
                                 required
                                 rows={4}
                                 defaultValue={editingAnnouncement?.content}
                                 placeholder="Détails de l'annonce ou promotion..."
                                 className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none rounded-2xl p-4 font-bold transition-all resize-none"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image de l'annonce</label>
                              <div className="flex flex-col gap-4">
                                 <div className="w-full h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden relative group">
                                    {announcementImagePreview ? (
                                       <>
                                          <img src={announcementImagePreview} className="w-full h-full object-cover" />
                                          <button
                                             type="button"
                                             onClick={() => setAnnouncementImagePreview(null)}
                                             className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                             <Trash2 size={16} />
                                          </button>
                                       </>
                                    ) : (
                                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                          <ImageIcon size={48} />
                                          <p className="text-[10px] font-black uppercase">Recommandé: 1080x1080px</p>
                                       </div>
                                    )}
                                 </div>
                                 <label className="cursor-pointer bg-slate-900 text-white p-4 rounded-[1.5rem] text-center font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-colors">
                                    <input
                                       type="file"
                                       className="hidden"
                                       accept="image/*"
                                       onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             const reader = new FileReader();
                                             reader.onloadend = () => setAnnouncementImagePreview(reader.result as string);
                                             reader.readAsDataURL(file);
                                          }
                                       }}
                                    />
                                    Choisir une image
                                 </label>
                              </div>
                           </div>
                        </div>

                        <div className="pt-4">
                           <button
                              type="submit"
                              className="w-full bg-orange-600 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all"
                           >
                              {editingAnnouncement ? 'Mettre à jour' : 'Publier maintenant'}
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL MANAGE SUB-CATEGORIES */}
         {
            showAddSubCategory && editingCategory && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => { setShowAddSubCategory(false); setEditingCategory(null); }}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                     <header className="p-8 border-b flex justify-between items-center bg-indigo-50">
                        <div>
                           <h3 className="text-xl font-black uppercase text-indigo-900">Sous-Catégories</h3>
                           <p className="text-[10px] text-indigo-600 font-bold uppercase mt-1">Catégorie : {editingCategory.name_fr}</p>
                        </div>
                        <button onClick={() => { setShowAddSubCategory(false); setEditingCategory(null); }} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"><X size={20} /></button>
                     </header>

                     <div className="p-8 space-y-6">
                        {/* Add New Sub-Category Form */}
                        <form onSubmit={handleCreateSubCategory} className="flex gap-2">
                           <input type="hidden" name="category_id" value={editingCategory.id} />
                           <input
                              name="name"
                              placeholder="Nouvelle sous-catégorie..."
                              required
                              className="flex-1 bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none rounded-2xl p-4 font-bold transition-all"
                           />
                           <button type="submit" className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 active:scale-95">
                              <Plus size={24} />
                           </button>
                        </form>

                        {/* List of Sub-Categories */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sous-catégories existantes</h4>
                           {propSubCategories.filter(sc => sc.category_id === editingCategory.id).length === 0 ? (
                              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                 <p className="text-xs font-bold text-slate-400 italic">Aucune sous-catégorie pour le moment</p>
                              </div>
                           ) : (
                              propSubCategories.filter(sc => sc.category_id === editingCategory.id).map(sc => (
                                 <div key={sc.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 hover:bg-white transition-all">
                                    <span className="font-bold text-slate-700">{sc.name}</span>
                                    <button
                                       onClick={() => handleDeleteSubCategory(sc.id)}
                                       className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            )
         }

         {/* LIGHTBOX IMAGE WITH ZOOM */}
         {
            viewingImage && <ImageLightbox imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
         }

         {/* ADMIN PROFILE MODAL */}
         {
            showProfileModal && (
               <AdminProfileModal
                  admin={currentAdmin}
                  onClose={() => setShowProfileModal(false)}
                  onLogout={onLogout}
               />
            )
         }
      </div >
   );
};

// --- COMPONENTS ---
const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }> = ({ active, onClick, icon, label, badge }) => (
   <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95' : 'hover:bg-slate-800 text-slate-400'}`}>
      <div className="flex items-center gap-3">
         <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-orange-500'}`}>{icon}</span>
         <span className={`text-xs font-black uppercase tracking-widest ${active ? 'text-white' : ''}`}>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white text-orange-500' : 'bg-slate-800 text-slate-400'}`}>{badge}</span>}
   </button>
);
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 ${color.split(' ')[0]}`}></div>
      <div className="relative z-10 flex flex-col gap-4">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${color}`}>{icon}</div>
         <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</p>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
         </div>
      </div>
   </div>
);

const AdminProfileModal: React.FC<{ admin: any; onClose: () => void; onLogout: () => void }> = ({ admin, onClose, onLogout }) => (
   <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
         <header className="p-10 border-b flex justify-between items-center bg-orange-50">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-orange-600 rounded-3xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-200">
                  {admin?.username?.[0]?.toUpperCase() || 'A'}
               </div>
               <div>
                  <h3 className="text-xl font-black uppercase text-orange-950 tracking-tighter">Mon Profil</h3>
                  <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mt-1">Administrateur Système</p>
               </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"><X size={20} /></button>
         </header>

         <div className="p-10 space-y-8">
            <div className="space-y-6">
               <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nom d'utilisateur</span>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 font-bold text-slate-800 flex items-center gap-4">
                     <User className="text-slate-400" size={18} />
                     {admin?.username || 'Non renseigné'}
                  </div>
               </div>

               <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Badge ID</span>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 font-bold text-slate-800 flex items-center gap-4">
                     <ShieldCheck className="text-slate-400" size={18} />
                     <code className="text-orange-600">{admin?.badge_id || '••••••••'}</code>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t space-y-3">
               <button
                  onClick={() => {
                     onLogout();
                     onClose();
                  }}
                  className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl bg-red-50 text-red-600 font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-100"
               >
                  <LogOut size={18} /> Déconnexion
               </button>
               <p className="text-center text-[10px] text-slate-400 font-bold uppercase">Veetaa Control Center v2.0</p>
            </div>
         </div>
      </div>
   </div>
);

const ImageLightbox: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
   const [zoomLevel, setZoomLevel] = useState(1);
   const [position, setPosition] = useState({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

   const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
   const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
   const handleReset = () => {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
   };

   const handleMouseDown = (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
         setIsDragging(true);
         setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
   };

   const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging && zoomLevel > 1) {
         setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
         });
      }
   };

   const handleMouseUp = () => setIsDragging(false);

   const handleDownload = () => {
      const link = document.createElement('a');
      let imgData = imageUrl;
      if (!imgData.startsWith('data:')) {
         imgData = `data:image/jpeg;base64,${imgData}`;
      }
      link.href = imgData;
      link.download = `Image_${Date.now()}.jpg`;
      link.click();
   };

   return (
      <div
         className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
         onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
         }}
      >
         {/* Contrôles de zoom */}
         <div className="absolute top-6 right-6 flex gap-3 z-10">
            <button
               onClick={handleDownload}
               className="bg-white/10 text-white p-4 rounded-2xl hover:bg-white/20 transition-colors active:scale-95 shadow-lg"
               title="Télécharger"
            >
               <Download size={24} />
            </button>
            <button
               onClick={handleZoomOut}
               disabled={zoomLevel <= 1}
               className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
               title="Zoom arrière"
            >
               <ZoomOut size={24} />
            </button>
            <button
               onClick={handleReset}
               className="bg-white/10 text-white px-6 py-4 rounded-2xl hover:bg-white/20 transition-colors active:scale-95 shadow-lg font-bold text-sm"
               title="Réinitialiser"
            >
               {Math.round(zoomLevel * 100)}%
            </button>
            <button
               onClick={handleZoomIn}
               disabled={zoomLevel >= 5}
               className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
               title="Zoom avant"
            >
               <ZoomIn size={24} />
            </button>
            <button
               onClick={onClose}
               className="bg-red-500/80 text-white p-4 rounded-2xl hover:bg-red-600 transition-colors active:scale-95 shadow-lg"
               title="Fermer"
            >
               <X size={24} />
            </button>
         </div>

         {/* Indicateur de zoom */}
         {zoomLevel > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 text-white px-6 py-3 rounded-full text-sm font-bold">
               Glissez pour déplacer l'image
            </div>
         )}

         {/* Image avec zoom */}
         <div
            className="relative overflow-hidden w-full h-full flex items-center justify-center p-20"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
         >
            <img
               src={imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`}
               className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-200"
               style={{
                  transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                  userSelect: 'none'
               }}
               draggable={false}
            />
         </div>
      </div>
   );
};

export default AdminDashboard;

