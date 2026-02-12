
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, OrderStatus, Driver, Store, Product, CategoryID, Announcement, UserProfile, DriverDocument, RIB, SupportInfo, SupportTicket, SupportMessage } from '../types';
import {
   Package, Clock, CheckCircle2, Users, MapPin, Eye,
   LayoutDashboard, ShoppingBag, Truck, Store as StoreIcon,
   Settings, Bell, Search, Filter, Trash2, ShieldAlert,
   ChevronRight, ChevronLeft, ExternalLink, X, Check, MoreVertical,
   Plus, Smartphone, MessageCircle, Camera, Link as LinkIcon, Copy, Map as MapIcon,
   Star, AlertTriangle, User, Calendar, CreditCard, Phone, Edit3, Image as ImageIcon, Bike,
   Save, Megaphone, Upload, Navigation, Trash, Info, UserCheck, UserMinus, ShieldCheck, RotateCw, LogOut, Share2, Clipboard, Scissors, Copy as CopyIcon, Quote, MessageSquare, Box,
   DollarSign, BarChart3, TrendingUp, PieChart as PieChartIcon, Receipt, AlertCircle, FileText, Download, ZoomIn, ZoomOut, Mail, Target
} from 'lucide-react';
import { CATEGORIES, MOCK_STORES } from '../constants';
import { supabase, dataUrlToBlob } from '../lib/supabase';
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
   onUpdateStatus: (id: string, status: OrderStatus) => void;
   onAssignDriver: (orderId: string, driverId: string) => void;
   onArchiveOrder: (orderId: string) => void;
   onRestoreOrder: (orderId: string) => void;
   onDeletePermanently: (orderId: string) => void;
   onBanUser: (phone: string) => void;
   onUpdateSettings: (key: string, value: string) => void;
   onCreateAnnouncement: (ann: Partial<Announcement>) => void;
   onDeleteAnnouncement: (id: string) => void;
   onLogout: () => void;
   onBack: () => void;
   setStores: React.Dispatch<React.SetStateAction<Store[]>>;
   categories: any[];
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
                        <p className="font-bold text-sm text-slate-800 mt-2">{order.storeName || stores.find(s => s.id === (order as any).storeId || s.id === (order as any).store_id)?.name || 'Magasin Inconnu'}</p>

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
                              const pos = store.maps_url || store.mapsUrl;
                              const hasPos = pos && pos.includes('query=');

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
                                          <p className={`text-[9px] font-black uppercase ${hasPos ? 'text-green-500' : 'text-slate-300'}`}>
                                             {hasPos ? 'Lié' : 'Non Lié'}
                                          </p>
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
      if (targetPos) {
         map.flyTo(targetPos, 15, { duration: 1.5 });
         // Forcer un recalcul de taille pendant le mouvement pour éviter les bords gris
         setTimeout(() => map.invalidateSize(), 600);
      }
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
   selectedOrderId?: string | null,
   onMapClick?: (lat: number, lng: number) => void,
   pickingPos?: [number, number] | null,
   pickingStore?: Store | null
}> = ({ drivers, orders, users, stores, selectedOrderId, onMapClick, pickingPos, pickingStore }) => {
   const selectedOrder = orders.find(o => o.id === selectedOrderId);

   // Détermination des entités actives pour les tracés
   const activeUserId = (selectedOrder as any)?.userId || (selectedOrder as any)?.user_id;
   const activeStoreId = (selectedOrder as any)?.storeId || (selectedOrder as any)?.store_id;

   const activeUser = selectedOrder ? (users.find(u => u.id === activeUserId) || { lastLat: selectedOrder.location?.lat, lastLng: selectedOrder.location?.lng }) : null;
   const activeStore = selectedOrder ? stores.find(s => s.id === activeStoreId) : null;
   const activeDriver = selectedOrder?.assignedDriverId ? drivers.find(d => d.id === selectedOrder.assignedDriverId) : null;

   const getStorePos = (s: Store): [number, number] | null => {
      if (s.lat && s.lng) return [s.lat, s.lng];
      const lat = s.maps_url?.match(/query=([-.\d]+),([-.\d]+)/)?.[1] || s.mapsUrl?.match(/query=([-.\d]+),([-.\d]+)/)?.[1];
      const lng = s.maps_url?.match(/query=([-.\d]+),([-.\d]+)/)?.[2] || s.mapsUrl?.match(/query=([-.\d]+),([-.\d]+)/)?.[2];
      return lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
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

   // Icône personnalisée pour chaque store avec son image
   const createStoreIcon = (store: Store) => {
      const img = store.image_url || store.image;
      if (!img) return StoreMarkerIcon;

      return L.divIcon({
         html: `<div class="relative w-10 h-10 rounded-full border-4 border-orange-500 overflow-hidden shadow-2xl bg-white transition-transform hover:scale-110">
                    <img src="${img}" class="w-full h-full object-cover"/>
                 </div>`,
         className: '',
         iconSize: [40, 40],
         iconAnchor: [20, 20] // Centré pour les cercles
      });
   };

   // Icône temporaire pour le store en cours de lien
   const pickingIcon = pickingStore ? createStoreIcon(pickingStore) : StoreMarkerIcon;

   return (
      <div className="w-full h-full relative bg-slate-50">
         <style>{`
             .leaflet-tile {
                filter: saturate(130%) contrast(110%) !important;
             }
             .leaflet-div-icon {
                background: transparent !important;
                border: none !important;
             }
          `}</style>
         <MapContainer
            center={[34.261, -6.580]} // KÉNITRA, MAROC
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ background: '#f8fafc' }}
         >
            <MapController targetPos={activeUserPos || (activeStore ? getStorePos(activeStore) : null)} />
            {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}
            <RecenterButton />
            <TileLayer
               url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* PREVIEW DU STORE EN COURS DE LIEN */}
            {pickingStore && pickingPos && (
               <Marker position={pickingPos} icon={pickingIcon}>
                  <Popup>
                     <div className="p-1 font-bold text-xs">Position de {pickingStore.name}</div>
                  </Popup>
               </Marker>
            )}

            {/* MAGASINS */}
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapInstance);
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
   orders: propOrders, users, drivers, stores, announcements: propAnnouncements, categories: propCategories, supportNumber: propSupport,
   onUpdateStatus, onAssignDriver, onArchiveOrder, onRestoreOrder, onDeletePermanently,
   onBanUser, onLogout, onBack, setStores,
   pageVisibility = { hideFinance: false, hideStatistics: false, hideAnnouncements: false }
}) => {
   const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PRODUCTS' | 'DRIVERS' | 'PARTNERS' | 'USERS' | 'FINANCE' | 'STATISTICS' | 'HISTORY' | 'CATEGORIES' | 'CONFIG' | 'MAPS' | 'SUPPORT_TICKETS'>('OVERVIEW');
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
   const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
   const [viewingImage, setViewingImage] = useState<string | null>(null);

   // États pour lier un store à la carte
   const [pickingStore, setPickingStore] = useState<Store | null>(null);
   const [pickingPos, setPickingPos] = useState<[number, number] | null>(null);
   useEffect(() => {
      if (selectedOrder) {
         setEditingOrderNotes(selectedOrder.textOrder || '');
      }
   }, [selectedOrder]);
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
   const [dateFilter, setDateFilter] = useState('');
   const [storeFilter, setStoreFilter] = useState('all');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(15);
   const [isRefreshing, setIsRefreshing] = useState(false);

   // 1s Update frequency for interpolation (especially for MAPS tab)
   useEffect(() => {
      if (activeTab !== 'MAPS') return;
      const interval = setInterval(() => {
         onBack(); // Triggers data refresh in parent
      }, 1000);
      return () => clearInterval(interval);
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

   const localProducts = stores.filter(s => !s.is_deleted).flatMap(s => s.products || []);
   const [supportNumber, setSupportNumber] = useState('+212 600 000 000');
   const [ribs, setRibs] = useState<RIB[]>([]);
   const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '', email: '' });
   const [showAddRIB, setShowAddRIB] = useState(false);
   const [editingRIB, setEditingRIB] = useState<RIB | null>(null);
   const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
   const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
   const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
   const [replyText, setReplyText] = useState('');
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
   const getWeeklyData = () => {
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
   };

   const weeklyData = getWeeklyData();

   const [editingOrderNotes, setEditingOrderNotes] = useState<string>('');
   const [showAddDriver, setShowAddDriver] = useState(false);
   const [driverProfileImage, setDriverProfileImage] = useState<string | null>(null);
   const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
   const [driverDocs, setDriverDocs] = useState<DriverDocument[]>([]);
   const [driverWarns, setDriverWarns] = useState(0);

   useEffect(() => {
      if (editingDriver) {
         setDriverDocs(editingDriver.documents || []);
         setDriverWarns(editingDriver.warns || 0);
      } else {
         setDriverDocs([]);
         setDriverWarns(0);
      }
   }, [editingDriver]);
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
   useEffect(() => {
      if (editingCategory) {
         setCategoryImagePreview(editingCategory.image_url || null);
      } else {
         setCategoryImagePreview(null);
      }
   }, [editingCategory]);

   const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onloadend = () => setCategoryImagePreview(reader.result as string);
         reader.readAsDataURL(file);
      }
   };
   const [storeImagePreview, setStoreImagePreview] = useState<string | null>(null);
   const [productImagesPreviews, setProductImagesPreviews] = useState<string[]>([]);
   const [hasProductsEnabled, setHasProductsEnabled] = useState(false);
   const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
   const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
   const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
   const [announcementImagePreview, setAnnouncementImagePreview] = useState<string | null>(null);

   // --- LOGO (pour les PDF) ---
   const logo = "LOGO.png"; // Sera géré par le chemin relatif ou base64

   // --- ACTIONS ---
   const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Copié : " + text);
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
            image_url: categoryImageURL
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


   const handleCreateProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      let productImageURL = editingProduct ? (editingProduct as any).image : (formData.get('image_url') as string);

      try {
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

         const prodData = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            store_id: formData.get('store_id') as string,
            image_url: productImageURL,
            description: formData.get('description') as string
         };

         if (editingProduct) {
            const { error } = await supabase.from('products').update(prodData).eq('id', editingProduct.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddProduct(false);
               setEditingProduct(null);
               setProductImagePreview(null);
               onBack();
            }
         } else {
            const { error } = await supabase.from('products').insert([prodData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddProduct(false);
               setProductImagePreview(null);
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
            if (error) alert("Erreur: " + error.message);
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
      const { error } = await supabase.from('drivers').update({ warns: newVal }).eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };

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

   const confirmDeleteStore = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("?? confirmDeleteStore appelée");

      if (!storeToDelete) {
         console.log("? Aucune marque sélectionnée");
         return;
      }

      console.log("?? Marque à supprimer:", storeToDelete.name, storeToDelete.id);

      try {
         // 1. Vérifier le mot de passe directement dans la base de données
         // PAS DE VÉRIFICATION DE SESSION - on vérifie juste si le mot de passe existe
         console.log("?? Mot de passe saisi:", deleteStorePassword);

         const { data: adminData, error: adminError } = await supabase
            .from('super_admins')
            .select('badge_id, username')
            .eq('badge_id', deleteStorePassword)
            .limit(1);

         console.log("?? Résultat recherche admin:", adminData);
         console.log("? Erreur recherche:", adminError);

         // Vérifier si un admin avec ce mot de passe existe
         if (adminError || !adminData || adminData.length === 0) {
            alert("? Mot de passe incorrect !\n\nAucun administrateur trouvé avec ce Badge ID.");
            console.error("Erreur admin:", adminError);
            setDeleteStorePassword('');
            return;
         }

         console.log("? Mot de passe correct ! Admin trouvé:", adminData[0].username);
         console.log("? Suppression autorisée, démarrage...");




         // 3. Supprimer tous les produits associés (CRITIQUE : Doit être fait avant le store)
         console.log("??? Suppression des produits associés...");
         const { error: productsError } = await supabase
            .from('products')
            .delete()
            .eq('store_id', storeToDelete.id);

         if (productsError) {
            console.error("? Erreur produits:", productsError);
            alert("Erreur lors de la suppression des produits : " + productsError.message);
            return;
         }
         console.log("? Produits supprimés");

         // 4. Supprimer les favoris associés (CRITIQUE : Sinon erreur fk_favorites)
         console.log("?? Suppression des favoris...");
         const { error: favError } = await supabase
            .from('favorites')
            .delete()
            .eq('store_id', storeToDelete.id);

         if (favError) console.warn("?? Erreur suppression favoris (non bloquant):", favError);

         // 5. Détacher les commandes (CRITIQUE : Sinon erreur fk_orders)
         console.log("?? Détachement des commandes...");
         const { error: ordersError } = await supabase
            .from('orders')
            .update({ store_id: null })
            .eq('store_id', storeToDelete.id);

         if (ordersError) console.warn("?? Avertissement commandes:", ordersError);

         // 6. SUPPRESSION TOTALE de la marque
         console.log("?? SUPPRESSION DÉFINITIVE de la marque...");
         const { error: storeError } = await supabase
            .from('stores')
            .delete()
            .eq('id', storeToDelete.id);

         if (storeError) {
            console.error("? Erreur suppression marque:", storeError);
            alert("Impossible de supprimer la marque (vérifiez s'il reste des dépendances) : " + storeError.message);
            return;
         }

         console.log("? Marque exterminée avec succès");

         // 7. Fermer le modal et rafraîchir
         setShowDeleteStoreModal(false);
         setStoreToDelete(null);
         setDeleteStorePassword('');
         alert("? Marque et toutes ses données associées ont été supprimées définitivement !");
         console.log("?? Rafraîchissement des données...");
         onBack();
         await fetchData();
         console.log("? Opération terminée !");
      } catch (err) {
         console.error("?? Erreur fatale lors de la suppression:", err);
         alert("Une erreur inattendue est survenue : " + (err as any)?.message);
      }
   };

   const handleDeleteDriver = async (id: string) => {
      if (!confirm("Supprimer ce livreur ?")) return;
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };

   const handleDeleteProduct = async (id: string) => {
      if (!confirm("Supprimer ce produit ?")) return;
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else onBack();
   };

   const handleUpdateOrderStatus = async (id: string, newStatus: OrderStatus) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', parseInt(id));
      if (error) alert("Erreur: " + error.message);
      else {
         onUpdateStatus(id, newStatus);
         setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
   };

   const handleUpdateOrderNotes = async (orderId: string, notes: string) => {
      const { error } = await supabase.from('orders').update({ text_order_notes: notes }).eq('id', parseInt(orderId));
      if (error) alert("Erreur: " + error.message);
      else {
         alert("Description mise à jour !");
         onBack(); // Refresh data
      }
   };

   const handleAssignDriver = async (orderId: string, driverId: string) => {
      const { error } = await supabase.from('orders').update({ assigned_driver_id: driverId || null }).eq('id', parseInt(orderId));
      if (error) alert("Erreur: " + error.message);
      else {
         onAssignDriver(orderId, driverId);
         setSelectedOrder(prev => prev ? { ...prev, assignedDriverId: driverId } : null);
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

      const { error } = await supabase.from('stores').update({
         maps_url: mapsUrl,
         lat: lat,
         lng: lng
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
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      let storeImageURL = editingStore ? editingStore.image_url : (formData.get('image_url') as string);

      try {
         if (storeImagePreview && storeImagePreview.startsWith('data:')) {
            const blob = await dataUrlToBlob(storeImagePreview);
            const fileName = `store_${Date.now()}.png`;
            const { data, error: uploadError } = await supabase.storage.from('stores').upload(fileName, blob);
            if (uploadError) {
               alert(`Erreur upload store : ${uploadError.message}`);
               return;
            }
            if (data) {
               storeImageURL = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
            }
         }

         const storeData: any = {
            name: formData.get('name') as string,
            category_id: formData.get('category_id') as string,
            delivery_time_min: parseInt(formData.get('delivery_time_min') as string),
            delivery_fee: parseFloat(formData.get('delivery_fee') as string),
            maps_url: formData.get('maps_url') as string,
            image_url: storeImageURL,
            is_active: true,
            is_open: true,
            is_featured: formData.get('is_featured') === 'on',
            is_new: formData.get('is_new') === 'on',
            has_products: formData.get('has_products') === 'on',
            description: formData.get('description') as string
         };

         if (editingStore) {
            const { error } = await supabase.from('stores').update(storeData).eq('id', editingStore.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddPartner(false);
               setEditingStore(null);
               setStoreImagePreview(null);
               onBack();
            }
         } else {
            const { error } = await supabase.from('stores').insert([storeData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddPartner(false);
               setStoreImagePreview(null);
               onBack();
            }
         }
      } catch (err) {
         alert("Erreur lors de la création du partenaire");
      }
   };

   const displayOrders = propOrders.filter(o => {
      const isHistory = o.isArchived || o.status === 'delivered';
      if (activeTab === 'HISTORY') {
         return isHistory;
      } else {
         if (isHistory) return false;
      }

      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesStore = storeFilter === 'all' || o.storeName === storeFilter;
      const matchesDate = !dateFilter || new Date(o.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
      return matchesSearch && matchesStatus && matchesStore && matchesDate;
   });

   const startIndex = (currentPage - 1) * itemsPerPage;
   const paginatedOrders = displayOrders.slice(startIndex, startIndex + itemsPerPage);
   const totalPages = Math.ceil(displayOrders.length / itemsPerPage);

   // --- GLOBAL SEARCH FILTERS ---
   const lowerSearch = searchTerm.toLowerCase();

   const filteredUsers = users.filter(u =>
      (u.fullName || '').toLowerCase().includes(lowerSearch) ||
      (u.phone || '').includes(lowerSearch) ||
      (u.email && u.email.toLowerCase().includes(lowerSearch))
   );

   const filteredDrivers = drivers.filter(d =>
      (d.full_name && d.full_name.toLowerCase().includes(lowerSearch)) ||
      (d.phone || '').includes(lowerSearch)
   );

   const filteredStores = stores.filter(s =>
      (s.name || '').toLowerCase().includes(lowerSearch) ||
      (s.category_id || '').toLowerCase().includes(lowerSearch)
   );

   const filteredProducts = localProducts.filter(p =>
      (p.name || '').toLowerCase().includes(lowerSearch) ||
      (p.storeName && p.storeName.toLowerCase().includes(lowerSearch))
   );

   const filteredCategories = dbCategories.filter(c =>
      (c.name_fr || '').toLowerCase().includes(lowerSearch) ||
      (c.name_ar || '').toLowerCase().includes(lowerSearch)
   );

   const filteredTickets = supportTickets.filter(t => {
      const matchesStatus = supportFilter === 'all' || (supportFilter === 'pending' ? t.status !== 'resolved' : t.status === 'resolved');
      const matchesSearch =
         (t.driver_name && t.driver_name.toLowerCase().includes(lowerSearch)) ||
         (t.driver_phone && t.driver_phone.includes(lowerSearch)) ||
         (t.description && t.description.toLowerCase().includes(lowerSearch));
      return matchesStatus && matchesSearch;
   });

   const prepareShareText = (order: Order) => {
      const itemsText = order.items.length > 0
         ? order.items.map(it => `- ${it.quantity}x ${it.product?.name} ${it.note ? `(Note: ${it.note})` : ''}`).join('\n')
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

?? TOTAL À PAYER: ${order.total + 15} DH
(Livraison 15 DH incluse)`;
   };

   const handleShareOrder = (order: Order) => {
      const shareText = prepareShareText(order);
      navigator.clipboard.writeText(shareText);
      alert("Détails de la commande copiés !");
   };

   const generateOrderPDF = (order: Order) => {
      const doc = new jsPDF();
      const orangeColor = '#f97316';
      const blueColor = '#1e3a8a';
      const slateDark = '#1e293b';
      const grayLight = '#94a3b8';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(blueColor);
      doc.text("DÉTAILS COMMANDE", 70, 25);
      doc.setFontSize(14);
      doc.text(`#${order.id} `, 70, 33);

      doc.setFontSize(10);
      doc.setTextColor(grayLight);
      doc.text("GÉNÉRÉ LE:", 150, 20);
      doc.setTextColor(slateDark);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date().toLocaleString(), 150, 26);

      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 45, 180, 52, 5, 5, 'FD');
      doc.setFontSize(11);
      doc.setTextColor(orangeColor);
      doc.text("INFORMATIONS CLIENT", 25, 55);
      doc.setFontSize(10);
      doc.setTextColor(slateDark);
      doc.text(`Nom: ${order.customerName} `, 25, 65);
      doc.text(`Tél: ${order.phone} `, 25, 72);

      // Localisation avec lien Google Maps cliquable
      if (order.location) {
         const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
         doc.text(`Localisation: `, 25, 79);
         doc.setTextColor('#3b82f6'); // Bleu pour le lien
         doc.textWithLink('Voir sur Google Maps', 55, 79, { url: mapsUrl });
         doc.setTextColor(slateDark); // Retour à la couleur normale
      } else {
         doc.text(`Localisation: Non spécifiée`, 25, 79);
      }

      doc.text(`Paiement: ${order.paymentMethod === 'cash' ? 'Espèces' : 'Virement'}`, 25, 86);

      // Colonne Droite: MAGASIN
      doc.setFontSize(11);
      doc.setTextColor(blueColor);
      doc.text("INFORMATIONS MAGASIN", 110, 55);
      doc.setFontSize(10);
      doc.setTextColor(slateDark);
      doc.text(`Magasin: ${order.storeName || 'Non spécifié'}`, 110, 65);

      const storeObj = stores.find(s => s.name === order.storeName);
      if (storeObj && (storeObj.maps_url || storeObj.mapsUrl)) {
         const sUrl = storeObj.maps_url || storeObj.mapsUrl || '';
         doc.text(`Localisation: `, 110, 72);
         doc.setTextColor('#3b82f6');
         doc.textWithLink('Lien Google Maps', 140, 72, { url: sUrl });
         doc.setTextColor(slateDark);
      } else {
         doc.text(`Localisation: Non spécifiée`, 110, 72);
      }

      if (order.rib) {
         doc.setFontSize(8);
         doc.text(`RIB: ${order.rib}`, 25, 91);
         doc.setFontSize(10);
      }

      let currentY = 100;

      if (order.textOrder) {
         doc.setFillColor(255, 247, 237);
         doc.roundedRect(15, currentY, 180, 25, 5, 5, 'F');
         doc.setTextColor(orangeColor);
         doc.text("NOTE DU CLIENT:", 25, currentY + 9);
         doc.setTextColor(slateDark);
         doc.setFont('helvetica', 'normal');
         doc.text(order.textOrder, 25, currentY + 17, { maxWidth: 160 });
         currentY += 30;
      }

      const tableStartY = currentY;
      const tableData = order.items.length > 0
         ? order.items.map(it => [it.quantity + 'x', it.product?.name || 'Inconnu', it.note || '-', (it.product?.price || 0) + ' DH'])
         : [['1x', 'Commande Personnalisée', '-', order.total + ' DH']];

      autoTable(doc, {
         startY: tableStartY,
         head: [['Qté', 'Produit', 'Note', 'Prix']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: blueColor, textColor: 255 },
         styles: { fontSize: 9 },
         columnStyles: { 3: { halign: 'right' } }
      });

      const lastTable = (doc as any).lastAutoTable;
      const finalY = (lastTable ? lastTable.finalY : tableStartY) + 10;
      doc.setFontSize(14);
      doc.setTextColor(orangeColor);
      doc.text(`Total à Payer: ${order.total + 15} DH`, 195, finalY, { align: 'right' });

      // Ajouter l'image de prescription sur une page dédiée si disponible
      if (order.prescription_base64) {
         try {
            let imgData = order.prescription_base64;
            if (!imgData.startsWith('data:')) {
               imgData = `data:image/jpeg;base64,${imgData}`;
            }

            // Nouvelle page pour l'ordonnance
            doc.addPage();

            // Titre de la page
            doc.setFillColor(219, 234, 254);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(blueColor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text("?? ORDONNANCE / PRESCRIPTION", 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.setTextColor(grayLight);
            doc.text(`Commande #${order.id}`, 105, 30, { align: 'center' });

            // Image en grand (presque pleine page)
            // Format A4: 210mm x 297mm
            // Marges: 15mm de chaque côté
            const imgWidth = 180; // 210 - 30 (marges)
            const imgHeight = 240; // Hauteur maximale

            doc.addImage(imgData, 'JPEG', 15, 50, imgWidth, imgHeight);

         } catch (err) {
            console.error("Erreur lors de l'ajout de l'image au PDF:", err);
         }
      }

      doc.save(`Commande_${order.id}.pdf`);
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
   const calculateFinance = () => {
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
   };

   const generateFinancePDF = () => {
      const fin = calculateFinance();
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
      if (!selectedTicket || !replyText.trim()) return;

      const { error } = await supabase
         .from('support_messages')
         .insert({
            ticket_id: selectedTicket.id,
            sender_type: 'admin',
            message: replyText.trim()
         });

      if (error) {
         alert("Erreur lors de l'envoi: " + error.message);
      } else {
         // Update last reply on ticket for list view
         await supabase.from('support_tickets').update({
            admin_reply: replyText.trim(),
            responded_at: new Date().toISOString()
         }).eq('id', selectedTicket.id);

         setReplyText('');
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
               <NavItem active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<Clock size={20} />} label="Historique" badge={propOrders.filter(o => o.isArchived).length} />
               <NavItem active={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<Filter size={20} />} label="Catégories" />
               <NavItem active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={<Settings size={20} />} label="Configuration" />
               <NavItem
                  active={activeTab === 'SUPPORT_TICKETS'}
                  onClick={() => setActiveTab('SUPPORT_TICKETS')}
                  icon={<MessageSquare size={20} />}
                  label="Support Tiquettes"
                  badge={supportTickets.filter(t => t.status !== 'resolved').length || undefined}
               />
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
                  <input type="text" placeholder="Rechercher..." className="bg-transparent border-none outline-none text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               </div>
               <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">A</div>
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
                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5">ID</th>
                                 <th className="px-8 py-5">Client</th>
                                 <th className="px-8 py-5">Magasin</th>
                                 <th className="px-8 py-5">Statut</th>
                                 <th className="px-8 py-5">Livreur</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {paginatedOrders.map(o => (
                                 <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5 font-black text-slate-400">#{o.id}</td>
                                    <td className="px-8 py-5">
                                       <div
                                          className="flex items-center gap-3 cursor-pointer group"
                                          onClick={() => {
                                             const user = users.find(u => u.phone === o.phone);
                                             if (user) setSelectedUser(user);
                                             else alert("Profil utilisateur non trouvé");
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
                                       <button
                                          onClick={() => setSelectedOrder(o)}
                                          className="font-bold text-slate-700 hover:text-orange-600 transition-colors text-left"
                                       >
                                          {o.storeName}
                                       </button>
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
                                       <button onClick={() => setSelectedOrder(o)} className="p-2.5 bg-slate-900 text-white rounded-xl"><Info size={16} /></button>
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
                        <StatCard label="Ventes Totales" value={`${calculateFinance().revenue} DH`} icon={<DollarSign size={24} />} color="bg-emerald-50 text-emerald-600" />
                        <StatCard label="Livraisons Payées" value={`${calculateFinance().deliveryFees} DH`} icon={<Truck size={24} />} color="bg-blue-50 text-blue-600" />
                        <StatCard label="Revenue Global" value={`${calculateFinance().total} DH`} icon={<TrendingUp size={24} />} color="bg-orange-50 text-orange-600" />
                     </div>

                     <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                           <h4 className="font-black text-xs uppercase tracking-widest text-slate-800">Détails des Ventes (Livraisons Terminées)</h4>
                           <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{calculateFinance().completedCount} Commandes</span>
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
                              {calculateFinance().completedOrders.map(o => (
                                 <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-black text-slate-400 group-hover:text-slate-900 transition-colors">#{o.id}</td>
                                    <td className="px-8 py-5 font-bold text-slate-600">{new Date(o.timestamp).toLocaleDateString()}</td>
                                    <td className="px-8 py-5 font-bold text-slate-800">{o.customerName}</td>
                                    <td className="px-8 py-5">
                                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.paymentMethod === 'transfer' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                          {o.paymentMethod === 'transfer' ? 'Virement' : 'Espèces'}
                                       </span>
                                    </td>
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
                              {calculateFinance().completedCount === 0 && (
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
                                    data={Object.entries(propOrders.reduce((acc, order) => {
                                       const storeName = order.storeName || 'Inconnu';
                                       acc[storeName] = (acc[storeName] || 0) + 1;
                                       return acc;
                                    }, {} as Record<string, number>))
                                       .map(([name, count]) => ({ name, count }))
                                       .sort((a, b) => b.count - a.count)
                                       .slice(0, 5)}
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
                                          Object.entries(propOrders.reduce((acc, order) => {
                                             const storeName = order.storeName || 'Inconnu';
                                             acc[storeName] = (acc[storeName] || 0) + 1;
                                             return acc;
                                          }, {} as Record<string, number>))
                                             .map(([name, count]) => ({ name, count }))
                                             .sort((a, b) => b.count - a.count)
                                             .slice(0, 5)
                                             .map((entry, index) => (
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
                                       data={[
                                          { name: 'Livrées', value: propOrders.filter(o => o.status === 'delivered').length },
                                          { name: 'Incomplètes/Annulées', value: propOrders.filter(o => ['refused', 'unavailable', 'cancelled'].includes(o.status)).length }
                                       ]}
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
                                    data={Object.values(propOrders.reduce((acc, order) => {
                                       const phone = order.phone || 'Inconnu';
                                       if (!acc[phone]) {
                                          acc[phone] = { name: order.customerName, count: 0 };
                                       }
                                       acc[phone].count += 1;
                                       return acc;
                                    }, {} as Record<string, { name: string, count: number }>))
                                       .sort((a, b) => b.count - a.count)
                                       .slice(0, 5)}
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
                                          Object.values(propOrders.reduce((acc, order) => {
                                             const phone = order.phone || 'Inconnu';
                                             if (!acc[phone]) {
                                                acc[phone] = { name: order.customerName, count: 0 };
                                             }
                                             acc[phone].count += 1;
                                             return acc;
                                          }, {} as Record<string, { name: string, count: number }>))
                                             .sort((a, b) => b.count - a.count)
                                             .slice(0, 5)
                                             .map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][index % 5]} />
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
                           selectedOrderId={selectedOrderId}
                           onMapClick={(lat, lng) => pickingStore && setPickingPos([lat, lng])}
                           pickingPos={pickingPos}
                           pickingStore={pickingStore}
                        />

                        {/* Indicateurs Flottants */}
                        <div className="absolute top-6 left-6 z-[1000] flex gap-3">
                           <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                 <span className="text-[10px] font-black uppercase text-slate-700">{propOrders.filter(o => o.status !== 'delivered' && !o.isArchived).length} Commandes</span>
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
                        <h3 className="text-xl font-black uppercase">Gestion des Livreurs</h3>
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
                                 <th className="px-8 py-5">Évaluation</th>
                                 <th className="px-8 py-5">Warnings</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y">
                              {filteredDrivers.map(d => (
                                 <tr key={d.id} className="hover:bg-slate-50">
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
                                    <td className="px-8 py-5">
                                       <div className="flex items-center gap-2">
                                          <button onClick={() => handleUpdateDriverWarns(d.id, Math.max(0, (d.warns || 0) - 1))} className="p-1 hover:bg-slate-100 rounded">-</button>
                                          <span className={`font-black ${(d.warns || 0) > 0 ? 'text-red-500' : 'text-slate-400'}`}>{d.warns || 0}</span>
                                          <button onClick={() => handleUpdateDriverWarns(d.id, (d.warns || 0) + 1)} className="p-1 hover:bg-slate-100 rounded">+</button>
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
                        {filteredStores.map(s => (
                           <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                              <div className="flex items-center gap-4">
                                 <img src={s.image_url || s.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23e2e8f0' width='100' height='100'/%3E%3C/svg%3E"} loading="lazy" className="w-16 h-16 rounded-[1.25rem] object-cover" />
                                 <div className="flex-1">
                                    <h4 className="font-black text-lg">{s.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.category_id}</p>
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <button onClick={() => handleToggleStoreStatus(s.id, 'is_open', !!s.is_open)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.is_open ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                       {s.is_open ? 'Ouvert' : 'Fermé'}
                                    </button>
                                    <button onClick={() => handleToggleStoreStatus(s.id, 'is_active', !!s.is_active)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                       {s.is_active ? 'Visible' : 'Caché'}
                                    </button>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t">
                                 <div className="flex items-center gap-1 text-orange-500"><Star size={14} fill="currentColor" /><span className="text-xs font-black">{s.rating || '4.5'}</span></div>
                                 <div className="flex gap-2">
                                    <button onClick={() => { setEditingStore(s); setStoreImagePreview(null); setShowAddPartner(true); }} className="p-2 bg-slate-100 rounded-lg"><Edit3 size={16} /></button>
                                    <button onClick={() => handleDeleteStore(s)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* CATALOGUE */}
               {activeTab === 'PRODUCTS' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                     <div onClick={() => setShowAddProduct(true)} className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer">
                        <Plus size={32} className="text-slate-300" />
                        <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Ajouter un produit</span>
                     </div>
                     {filteredProducts.map((p, idx) => (
                        <div key={p.id || idx} className="bg-white rounded-[2.5rem] border p-4 group hover:shadow-xl transition-all relative overflow-hidden">
                           <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={() => { setEditingProduct(p); setShowAddProduct(true); }} className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 rounded-xl shadow-lg hover:text-orange-600"><Edit3 size={16} /></button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-lg hover:bg-red-50"><Trash2 size={16} /></button>
                           </div>
                           <img src={p.image} loading="lazy" className="w-full h-40 object-cover rounded-[1.75rem] mb-4" />
                           <div className="p-2">
                              <h4 className="font-black text-slate-800 text-sm mb-1 truncate">{p.name}</h4>
                              <p className="text-[10px] text-slate-400 mb-2 truncate">{p.storeName || 'Marque inconnue'}</p>
                              <div className="flex justify-between items-center text-orange-600 font-black">{p.price} DH</div>
                           </div>
                        </div>
                     ))}
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
                                          <button onClick={() => { setEditingCategory(cat); setShowAddCategory(true); }} className="p-2 text-slate-400 hover:text-orange-600"><Edit3 size={16} /></button>
                                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
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
                              className="flex-1 bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-all pr-12 shadow-sm"
                              placeholder="Écrivez votre réponse..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleReplyTicket()}
                           />
                           <button
                              onClick={handleReplyTicket}
                              disabled={!replyText.trim()}
                              className="absolute right-1.5 p-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all"
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
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowDeleteStoreModal(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
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
                              <img src={storeToDelete.image_url || storeToDelete.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23e2e8f0' width='100' height='100'/%3E%3C/svg%3E"} className="w-14 h-14 rounded-xl object-cover border-2 border-red-200" />
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
                              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 outline-none rounded-2xl py-4 px-6 font-bold transition-all text-slate-800 placeholder:text-slate-300"
                           />
                           <p className="text-[10px] text-slate-400 italic">Pour des raisons de sécurité, veuillez confirmer votre identité</p>
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3 pt-4">
                           <button
                              type="button"
                              onClick={() => { setShowDeleteStoreModal(false); setDeleteStorePassword(''); }}
                              className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[1.75rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                           >
                              Annuler
                           </button>
                           <button
                              type="submit"
                              className="flex-1 bg-red-600 text-white py-4 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                              <Trash2 size={16} />
                              Supprimer Définitivement
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
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddRIB(false)}></div>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-end">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
               <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl overflow-y-auto pb-32">
                  <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 py-6 border-b flex justify-between items-center">
                     <h3 className="text-xl font-black uppercase">Commande #{selectedOrder.id}</h3>
                     <div className="flex items-center gap-2">
                        <button onClick={() => generateOrderPDF(selectedOrder)} className="p-3 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-all"><Download size={20} /></button>
                        <button onClick={() => handleShareOrder(selectedOrder)} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all"><Share2 size={20} /></button>
                        <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-100 rounded-full"><X size={20} /></button>
                     </div>
                  </header>
                  <div className="p-8 space-y-10">
                     <div className="grid grid-cols-2 gap-6">
                        <section className="bg-slate-50 p-6 rounded-[2.5rem] space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informations Client</p>
                           <p className="font-black text-lg">{selectedOrder.customerName}</p>
                           <p className="text-sm text-slate-500">{selectedOrder.phone}</p>
                        </section>
                        <section className="bg-slate-50 p-6 rounded-[2.5rem] space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Évaluation</p>
                           <div className="flex flex-col gap-3">
                              {selectedOrder.storeRating && (
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <StoreIcon size={12} className="text-orange-500" />
                                       <span className="text-[9px] font-black text-slate-500 uppercase">Magasin</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                       {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                             key={star}
                                             size={14}
                                             fill={star <= selectedOrder.storeRating! ? "#f97316" : "none"}
                                             className={star <= selectedOrder.storeRating! ? "text-orange-500" : "text-slate-300"}
                                          />
                                       ))}
                                       <span className="text-[10px] font-black text-orange-600 ml-1">{selectedOrder.storeRating}/5</span>
                                    </div>
                                 </div>
                              )}
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <Truck size={12} className="text-blue-500" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Livreur</span>
                                 </div>
                                 <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                       <Star
                                          key={star}
                                          size={14}
                                          fill={star <= (selectedOrder.driverRating || 0) ? "#eab308" : "none"}
                                          className={`cursor-pointer transition-transform hover:scale-110 ${star <= (selectedOrder.driverRating || 0) ? "text-yellow-500" : "text-slate-300"}`}
                                          onClick={() => handleUpdateDriverRating(selectedOrder.id, star)}
                                       />
                                    ))}
                                    <span className="text-[10px] font-black text-yellow-600 ml-1">{selectedOrder.driverRating || 0}/5</span>
                                 </div>
                              </div>
                              {!selectedOrder.storeRating && (
                                 <p className="text-xs text-slate-400 italic">Aucune note magasin</p>
                              )}
                           </div>
                        </section>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] flex items-center justify-between">
                           <div className="flex flex-col gap-1 w-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
                              <select
                                 value={selectedOrder.status}
                                 onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                                 className="bg-transparent font-black text-sm outline-none cursor-pointer text-slate-800 w-full"
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
                           </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2.5rem] flex items-center justify-between">
                           <div className="flex flex-col gap-1 w-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Livreur Assigné</p>
                              <select
                                 value={selectedOrder.assignedDriverId || ""}
                                 onChange={(e) => handleAssignDriver(selectedOrder.id, e.target.value)}
                                 className="bg-transparent font-black text-sm outline-none cursor-pointer text-slate-800 w-full"
                              >
                                 <option value="">Non assigné</option>
                                 {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.fullName}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                     </div>

                     {/* Timeline d'historique */}
                     {selectedOrder.statusHistory && (selectedOrder.statusHistory as any[]).length > 0 && (
                        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                              <Clock size={12} /> Suivi Statut
                           </h4>
                           <div className="space-y-4">
                              {(selectedOrder.statusHistory as any[]).map((step: any, i: number) => (
                                 <div key={i} className="flex gap-4 items-start relative pb-4 last:pb-0">
                                    {i < (selectedOrder.statusHistory as any[]).length - 1 && (
                                       <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-200"></div>
                                    )}
                                    <div className="w-5 h-5 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold z-10">
                                       {i + 1}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-xs font-black uppercase tracking-tight">{step.status}</span>
                                       <span className="text-[10px] text-slate-400">{new Date(step.timestamp).toLocaleString()}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <Info size={16} className="text-blue-500" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Notes de la Commande</p>
                           </div>
                           <button
                              onClick={() => handleUpdateOrderNotes(selectedOrder.id, editingOrderNotes)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                           >
                              <Save size={14} /> Enregistrer
                           </button>
                        </div>
                        <textarea
                           value={editingOrderNotes}
                           onChange={(e) => setEditingOrderNotes(e.target.value)}
                           placeholder="Ajouter une description ou des notes internes..."
                           className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all min-h-[120px] resize-none shadow-inner"
                        />
                     </div>

                     {/* Prescription Image */}
                     {selectedOrder.prescription_base64 && (
                        <div className="bg-blue-50 p-6 rounded-[2rem] border-l-4 border-blue-500">
                           <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                 <ImageIcon size={14} /> Ordonnance / Prescription
                              </p>
                              <button
                                 onClick={() => {
                                    const link = document.createElement('a');
                                    let imgData = selectedOrder.prescription_base64!;
                                    if (!imgData.startsWith('data:')) {
                                       imgData = `data:image/jpeg;base64,${imgData}`;
                                    }
                                    link.href = imgData;
                                    link.download = `Prescription_Commande_${selectedOrder.id}.jpg`;
                                    link.click();
                                 }}
                                 className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                              >
                                 <Download size={14} /> Télécharger
                              </button>
                           </div>
                           <div
                              onClick={() => setViewingImage(selectedOrder.prescription_base64!)}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                           >
                              {renderMediaThumbnail(selectedOrder.prescription_base64, "w-full h-48")}
                           </div>
                           <p className="text-[10px] text-slate-500 mt-2 italic">Cliquez pour agrandir</p>
                        </div>
                     )}

                     {/* Payment Receipt Image */}
                     {selectedOrder.payment_receipt_base64 && (
                        <div className="bg-emerald-50 p-6 rounded-[2rem] border-l-4 border-emerald-500">
                           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Receipt size={14} /> Reçu de Paiement
                           </p>
                           <div
                              onClick={() => setViewingImage(selectedOrder.payment_receipt_base64!)}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                           >
                              {renderMediaThumbnail(selectedOrder.payment_receipt_base64, "w-full h-48")}
                           </div>
                           <p className="text-[10px] text-slate-500 mt-2 italic">Cliquez pour agrandir</p>
                        </div>
                     )}

                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Articles Commandés</h4>
                        {selectedOrder.items.map((it, i) => (
                           <div key={i} className="flex flex-col p-4 border rounded-2xl bg-white hover:border-orange-200 transition-colors">
                              <div className="flex justify-between w-full">
                                 <span className="font-bold">{it.quantity}x {it.product?.name || 'Produit'}</span>
                                 <span className="font-black text-orange-600">{(it.product?.price || 0) * it.quantity} DH</span>
                              </div>
                              {it.note && (
                                 <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg text-slate-500 border border-slate-100 italic">
                                    Note/Option: {it.note}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>

                     <div className="bg-slate-900 p-8 rounded-[2rem] flex justify-between items-center text-white shadow-xl shadow-slate-900/20">
                        <div className="flex flex-col">
                           <span className="font-black uppercase text-[10px] opacity-50 tracking-widest">Total Global</span>
                           <span className="text-[10px] opacity-40 italic">Incluant 15 DH de livraison</span>
                        </div>
                        <span className="text-3xl font-black text-orange-500">{selectedOrder.total + 15} DH</span>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL DRIVER */}
         {
            showAddDriver && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddDriver(false)}></div>
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
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddProduct(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingProduct ? 'Modifier' : 'Nouveau'} Produit</h3>
                        <button onClick={() => setShowAddProduct(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form key={editingProduct?.id || 'new-product'} onSubmit={handleCreateProduct} className="p-8 space-y-6">
                        <div className="flex justify-center mb-6">
                           <div className="relative group">
                              <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                 {productImagePreview || editingProduct?.image ? (
                                    <img src={productImagePreview || editingProduct?.image} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                       <ImageIcon size={40} />
                                    </div>
                                 )}
                              </div>
                              <label className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-xl cursor-pointer shadow-lg hover:bg-orange-600 transition-colors">
                                 <Plus size={16} />
                                 <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       const reader = new FileReader();
                                       reader.onloadend = () => setProductImagePreview(reader.result as string);
                                       reader.readAsDataURL(file);
                                    }
                                 }} />
                              </label>
                           </div>
                        </div>
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
                              <select name="store_id" defaultValue={(editingProduct as any)?.store_id} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all appearance-none cursor-pointer" required>
                                 {stores.filter(s => !s.is_deleted).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Description</label>
                           <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none" />
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
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddPartner(false)}></div>
                  <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden">
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
                              <select name="category_id" defaultValue={editingStore?.category_id} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all appearance-none cursor-pointer">
                                 {dbCategories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name_fr}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tps Livraison [min]</label>
                              <input name="delivery_time_min" type="number" defaultValue={editingStore?.delivery_time_min || 25} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Frais Livraison [DH]</label>
                              <input name="delivery_fee" type="number" defaultValue={editingStore?.delivery_fee || 15} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
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

                        {/* Product Images Upload Section - Only shown when has_products is enabled */}
                        {hasProductsEnabled && (
                           <div className="space-y-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-[2rem] border-2 border-indigo-100">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Images Produits</h4>
                                    <p className="text-[10px] text-indigo-600 font-bold mt-1">Ajoutez jusqu'à 5 images de produits</p>
                                 </div>
                                 <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black">
                                    {productImagesPreviews.length}/5
                                 </div>
                              </div>

                              <div className="grid grid-cols-5 gap-3">
                                 {productImagesPreviews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                       <div className="w-full aspect-square bg-white rounded-xl overflow-hidden border-2 border-indigo-200 shadow-sm">
                                          <img src={preview} className="w-full h-full object-cover" alt={`Product ${index + 1}`} />
                                       </div>
                                       <button
                                          type="button"
                                          onClick={() => setProductImagesPreviews(prev => prev.filter((_, i) => i !== index))}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                       >
                                          <X size={12} />
                                       </button>
                                    </div>
                                 ))}

                                 {productImagesPreviews.length < 5 && (
                                    <label className="w-full aspect-square bg-white border-2 border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                       <Plus size={20} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                       <span className="text-[8px] font-black text-indigo-400 group-hover:text-indigo-600 uppercase mt-1">Ajouter</span>
                                       <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if (file && productImagesPreviews.length < 5) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                   setProductImagesPreviews(prev => [...prev, reader.result as string]);
                                                };
                                                reader.readAsDataURL(file);
                                             }
                                          }}
                                       />
                                    </label>
                                 )}
                              </div>
                           </div>
                        )}

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Description de la Marque</label>
                           <textarea name="description" defaultValue={editingStore?.description} rows={2} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none" placeholder="Une brève description de cette marque..." />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Google Maps URL</label>
                           <input name="maps_url" defaultValue={editingStore?.maps_url} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">Enregistrer la Marque</button>
                     </form>
                  </div>
               </div>
            )
         }



         {/* MODAL CATEGORY */}
         {
            showAddCategory && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddCategory(false)}></div>
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
         {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
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
                           <p className="font-bold text-slate-700">{selectedUser.phone}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl space-y-1 text-wrap overflow-hidden">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Bell size={12} /> Email</p>
                           <p className="font-bold text-slate-700">{selectedUser.email || 'Non renseigné'}</p>
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
         )}

         {/* MODAL ANNONCE */}
         {showAddAnnouncement && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddAnnouncement(false)}></div>
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
         )}

         {/* LIGHTBOX IMAGE WITH ZOOM */}
         {
            viewingImage && <ImageLightbox imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
         }
      </div>
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
         className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
         onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
         }}
      >
         {/* Contrôles de zoom */}
         <div className="absolute top-6 right-6 flex gap-3 z-10">
            <button
               onClick={handleDownload}
               className="bg-white/10 backdrop-blur-sm text-white p-4 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-xl"
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
               className="bg-white/10 backdrop-blur-sm text-white px-6 py-4 rounded-2xl hover:bg-white/20 transition-all active:scale-95 shadow-xl font-bold text-sm"
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
               className="bg-red-500/80 backdrop-blur-sm text-white p-4 rounded-2xl hover:bg-red-600 transition-all active:scale-95 shadow-xl"
               title="Fermer"
            >
               <X size={24} />
            </button>
         </div>

         {/* Indicateur de zoom */}
         {zoomLevel > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-bold">
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

