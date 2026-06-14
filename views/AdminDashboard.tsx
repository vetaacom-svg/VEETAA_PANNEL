
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Order, OrderStatus, Driver, Store, Product, CategoryID, Announcement, UserProfile, DriverDocument, RIB, SupportInfo, SupportTicket, SupportMessage, SubCategory, StoreSubCategory, SocialLink, PromoCode, PartnerAccount, PartnerStoreAccess, DeliveryZone } from '../types';
import {
   Package, Clock, CheckCircle2, Users, MapPin, Eye,
   LayoutDashboard, ShoppingBag, Truck, Store as StoreIcon,
   Settings, Bell, Search, Filter, Trash2, ShieldAlert,
   ChevronRight, ChevronLeft, ChevronDown, ExternalLink, X, Check, MoreVertical,
   Plus, Smartphone, MessageCircle, Camera, Link as LinkIcon, Copy, Map as MapIcon,
   Star, AlertTriangle, User, Calendar, CreditCard, Phone, Edit3, Edit2, Image as ImageIcon, Bike,
   Save, Megaphone, Upload, Navigation, Trash, Info, UserCheck, UserMinus, ShieldCheck, RotateCw, LogOut, Share2, Clipboard, Scissors, Copy as CopyIcon, Quote, MessageSquare, Box, History as HistoryIcon,
   DollarSign, BarChart3, TrendingUp, PieChart as PieChartIcon, Receipt, AlertCircle, FileText, Download, ZoomIn, ZoomOut, Mail, Target, ListTree, Globe, Shield, Loader2, LocateOff, Ticket, Layers, ChevronUp, KeyRound
   , Moon
} from 'lucide-react';
import { CATEGORIES, MOCK_STORES } from '../constants';
import { supabase, dataUrlToBlob } from '../lib/supabase';
import {
   logAdminActivity,
   logAdminSessionOnce,
   fetchAdminLeaderboardTop7,
   type AdminLeaderboardRow,
} from '../lib/adminActivity';
import {
   getAnalyticsTimeRange,
   filterOrdersByTime,
   filterByStore,
   computeAnalyticsDerived,
   uniqueStoreNamesInRange,
   analyticsPeriodLabel,
   type AnalyticsPeriodPreset,
} from '../lib/analyticsStats';
import type { AdminTab } from './admin/adminPaths';
import { pathForTab, pathSegment, tabFromRouterPath, isKnownAdminSegment, ADMIN_TAB_TITLE_EN } from './admin/adminPaths';
import PromoCodesPanel from './admin/panels/PromoCodesPanel';
import { ResizableLiveMapFrame } from './admin/components/ResizableLiveMapFrame';
import CategoriesPanel, { type AdminCategoryRow } from './admin/panels/CategoriesPanel';
import PartnersMgmtPanel from './admin/panels/PartnersMgmtPanel';
import SupportTicketsPanel from './admin/panels/SupportTicketsPanel';
import AdminOverviewPanel from './admin/panels/AdminOverviewPanel';
import AdminFinancePanel from './admin/panels/AdminFinancePanel';
import AdminStatisticsPanel from './admin/panels/AdminStatisticsPanel';
import AdminBroadcastMailPanel from './admin/panels/AdminBroadcastMailPanel';

/** Référence stable : évite `{}` par défaut dans les props qui recréait un objet à chaque rendu (useMemo inutilement invalidé). */
const EMPTY_ADMIN_PERMISSIONS: Record<string, boolean> = {};
import { UserActiveIcon as UserActiveMarkerIcon, UserIdleIcon as UserIdleMarkerIcon, DriverBusyIcon as DriverBusyMarkerIcon, DriverIdleIcon as DriverIdleMarkerIcon, StoreIcon as StoreMarkerIcon } from '../map/components/MarkerIcons';

// Lightweight, memoized product card to avoid re-renders while scrolling
type ProductCardProps = {
   id: string;
   name: string;
   storeName?: string;
   price?: number;
   image?: string;
   darkMode?: boolean;
   onEdit: (id: string) => void;
   onDelete: (id: string) => void;
};
const ProductCard: React.FC<ProductCardProps> = React.memo(({ id, name, storeName, price, image, darkMode = false, onEdit, onDelete }) => {
   return (
      <div
         className={[
            'rounded-2xl p-3 border shadow-sm hover:shadow-md ring-1 transition-all duration-300 relative group overflow-hidden',
            darkMode
               ? 'bg-gradient-to-b from-slate-900/80 to-slate-950/80 border-slate-700/70 ring-slate-700/60 hover:ring-orange-300/30 hover:border-orange-300/30 hover:shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_10px_25px_-10px_rgba(2,6,23,0.9)]'
               : 'bg-white border-transparent ring-slate-200 hover:ring-orange-200',
         ].join(' ')}
         style={{ willChange: 'transform, opacity' }}
      >
         {darkMode && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />}
         <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
               onClick={() => onEdit(id)}
               className={[
                  'p-2.5 rounded-xl shadow-lg transition-colors',
                  darkMode ? 'bg-slate-900/60 text-slate-200 hover:text-orange-300 hover:bg-slate-800' : 'bg-white/95 text-slate-600 hover:text-orange-600',
               ].join(' ')}
            >
               <Edit3 size={14} />
            </button>
            <button
               onClick={() => onDelete(id)}
               className={[
                  'p-2.5 rounded-xl shadow-lg transition-colors',
                  darkMode ? 'bg-slate-900/60 text-red-300 hover:text-red-100 hover:bg-red-900/30' : 'bg-white/95 text-red-500 hover:bg-red-50',
               ].join(' ')}
            >
               <Trash2 size={14} />
            </button>
         </div>
         <div className={`aspect-w-16 aspect-h-12 mb-3 ${darkMode ? 'rounded-xl p-1 bg-slate-900/80 border border-slate-700/80' : ''}`}>
            <div className="relative w-full h-40 rounded-xl overflow-hidden">
               <img
                  src={image}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover ${darkMode ? 'brightness-[0.86] saturate-[0.88] contrast-[1.05]' : ''}`}
               />
               {darkMode && <div className="absolute inset-0 bg-slate-950/18" />}
            </div>
         </div>
         <div className={`px-2 pb-1 ${darkMode ? 'rounded-xl border border-slate-700/70 bg-slate-950/70 pt-2' : ''}`}>
            <h4
               className={[
                  'font-black text-sm mb-1 truncate leading-tight',
                  darkMode ? 'text-slate-100' : 'text-slate-800',
               ].join(' ')}
            >
               {name}
            </h4>
            <p
               className={[
                  'text-[10px] font-bold uppercase tracking-wider mb-3 truncate',
                  darkMode ? 'text-slate-400' : 'text-slate-400',
               ].join(' ')}
            >
               {storeName || 'Marque inconnue'}
            </p>
            <div className="flex justify-between items-center">
               <span
                  className={[
                     'px-2.5 py-1 rounded-lg text-xs font-black shadow-sm',
                     darkMode ? 'bg-orange-500/20 text-orange-100' : 'bg-orange-50 text-orange-600',
                  ].join(' ')}
               >
                  {price} DH
               </span>
            </div>
         </div>
      </div>
   );
}, (a, b) =>
   a.id === b.id &&
   a.name === b.name &&
   a.price === b.price &&
   a.image === b.image &&
   a.storeName === b.storeName &&
   a.darkMode === b.darkMode);

// Lightweight, memoized store card for the PARTNERS tab
type StoreCardProps = {
   id: string;
   image_url?: string;
   image?: string;
   darkMode?: boolean;
   name: string;
   category_id?: string;
   latitude?: number | null;
   longitude?: number | null;
   is_open?: boolean;
   is_active?: boolean;
   rating?: number;
   categoryImage?: string;
   onEdit: (id: string) => void;
   onToggleOpen: (id: string, current: boolean | undefined) => void;
   onToggleActive: (id: string, current: boolean | undefined) => void;
   onDelete: (id: string) => void;
};
const StoreCard: React.FC<StoreCardProps> = React.memo(({ id, image_url, image, darkMode = false, name, category_id, latitude, longitude, is_open, is_active, rating, categoryImage, onEdit, onToggleOpen, onToggleActive, onDelete }) => {
   const imgSrc = image_url || image || categoryImage || null;
   const finalLat = latitude != null ? Number(latitude) : null;
   const finalLng = longitude != null ? Number(longitude) : null;

   return (
      <div
         className={[
            'p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all space-y-4',
            darkMode
               ? 'bg-slate-950/60 border-slate-800/80 hover:border-orange-300/30'
               : 'bg-white border-slate-200',
         ].join(' ')}
         style={{ willChange: 'transform, opacity' }}
      >
         {/* Header avec image et actions */}
         <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
               {imgSrc ? (
                  <img
                     src={imgSrc}
                     alt={name}
                     loading="lazy"
                     width={56}
                     height={56}
                     decoding="async"
                     className={`w-14 h-14 rounded-xl object-cover flex-shrink-0 ${darkMode ? 'brightness-90' : ''}`}
                  />
               ) : (
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                     <StoreIcon size={24} />
                  </div>
               )}
               <div className="flex-1 min-w-0">
                  <h4 className={`font-black text-sm truncate leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{name}</h4>
                  <p className={`text-[9px] font-bold uppercase tracking-wider truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{category_id || 'Sans catégorie'}</p>
               </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
               <button onClick={() => onEdit(id)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:text-orange-300 hover:bg-slate-900' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}><Edit3 size={16} /></button>
               <button onClick={() => onDelete(id)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-300 hover:text-red-300 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}><Trash2 size={16} /></button>
            </div>
         </div>

         {/* Status badges */}
         <div className="flex gap-2 flex-wrap">
            <button
               onClick={() => onToggleOpen(id, !!is_open)}
               className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${is_open
                  ? (darkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700')
                  : (darkMode ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700')
                  }`}
            >
               {is_open ? '✓ Ouvert' : '✕ Fermé'}
            </button>
            <button
               onClick={() => onToggleActive(id, !!is_active)}
               className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${is_active
                  ? (darkMode ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700')
                  : (darkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600')
                  }`}
            >
               {is_active ? '👁 Visible' : '🚫 Caché'}
            </button>
         </div>

         {/* Location Section */}
         {(finalLat != null && finalLng != null && !isNaN(finalLat) && !isNaN(finalLng)) ? (
            <button
               onClick={() => onEdit(id)}
               className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${darkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25' : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'}`}
            >
               <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin size={14} className={`flex-shrink-0 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`} />
                  <div className="text-left min-w-0">
                     <p className={`text-[8px] font-black uppercase tracking-wider ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Localisation</p>
                     <p className={`text-[9px] font-mono truncate ${darkMode ? 'text-emerald-200' : 'text-emerald-700'}`}>{finalLat.toFixed(4)}, {finalLng.toFixed(4)}</p>
                  </div>
               </div>
               <Edit3 size={14} className={`flex-shrink-0 ml-2 ${darkMode ? 'text-emerald-200 group-hover:text-emerald-100' : 'text-emerald-700 group-hover:text-emerald-900'}`} />
            </button>
         ) : (
            <button
               onClick={() => onEdit(id)}
               className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider gap-2 group ${darkMode ? 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-orange-300' : 'bg-slate-100 hover:bg-orange-100 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-700'}`}
            >
               <MapPin size={14} className="flex-shrink-0" />
               Ajouter Localisation
               <span className="text-[9px] ml-1">→ URL Google Maps</span>
            </button>
         )}

         {/* Rating */}
         <div className={`flex items-center gap-1.5 pt-2 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-1 text-orange-500">
               <Star size={14} fill="currentColor" />
               <span className="text-sm font-black">{rating || '4.5'}</span>
            </div>
         </div>
      </div>
   );
}, (a, b) => a.id === b.id && a.name === b.name && a.image_url === b.image_url && a.image === b.image && a.is_open === b.is_open && a.is_active === b.is_active && a.rating === b.rating && a.darkMode === b.darkMode);

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminDashboardProps {
   orders: Order[];
   users: UserProfile[];
   drivers: Driver[];
   stores: Store[];
   announcements: Announcement[];
   supportNumber: string;
   deliveryZone?: 'kenitra' | 'all_morocco';
   deliveryFeePerKm?: number;
   deliveryBaseFee?: number;
   deliveryIncludedKm?: number;
   deliveryFixedFee?: number;
   activePresetId?: string | null;
   onUpdateStatus: (id: string, status: OrderStatus) => void;
   onAssignDriver: (orderId: string, driverId: string) => void;
   onArchiveOrder: (orderId: string) => void;
   onRestoreOrder: (orderId: string) => void;
   onDeletePermanently: (orderId: string) => void;
   onBanUser: (phone: string) => void;
   onUpdateSettings: (key: string, value: string, options?: { silent?: boolean }) => Promise<boolean>;
   onCreateAnnouncement: (ann: Partial<Announcement>) => void;
   onDeleteAnnouncement: (id: string) => void;
   onFetchOrderDetails?: (orderId: string) => Promise<void>; // ✅ ADD THIS
   onLogout: () => void;
   onBack: () => void;
   /** Recharge uniquement les annonces (évite un fetchData complet + produits après création / toggle). */
   onRefreshAnnouncements?: () => void | Promise<void>;
   setStores: React.Dispatch<React.SetStateAction<Store[]>>;
   setPartnerAccounts: React.Dispatch<React.SetStateAction<PartnerAccount[]>>;
   categories: any[];
   subCategories: SubCategory[];
   storeSubCategories: StoreSubCategory[];
   setStoreSubCategories: React.Dispatch<React.SetStateAction<StoreSubCategory[]>>;
   promoCodes: PromoCode[];
   partnerAccounts: PartnerAccount[];
   partnerStoreAccess: PartnerStoreAccess[];
   pageVisibility?: {
      hideFinance: boolean;
      hideStatistics: boolean;
      hideAnnouncements: boolean;
   };
   adminRole?: 'super_admin' | 'sub_admin' | null;
   adminPermissions?: any;
   /** Compteurs vue d'ensemble (requêtes count rapides côté App, alignés sur les listes après chargement) */
   dashboardOverviewStats?: { clients: number; drivers: number; products: number };
   /** Erreur Supabase / RLS lors du chargement des annonces (affichée dans Paramètres). */
   announcementsLoadError?: string | null;
}

interface AdminUser extends UserProfile {
   id: string;
   createdAt: number;
   totalOrders: number;
   isBlocked?: boolean;
}

// --- ICONS & STYLES ---
// Marker icons are imported from MarkerIcons.tsx at the top of the file.
// Local declarations removed to avoid duplicates and ensure consistency.


const getOrderStoreDisplay = (order: Order) => {
   if (order.items && order.items.length > 0) {
      const uniqueStores = Array.from(new Set(order.items.map(it => it.storeName).filter(Boolean)));
      if (uniqueStores.length > 1) return "Multi-Magasins";
      if (uniqueStores.length === 1) return uniqueStores[0];
   }
   return order.storeName || 'Magasin Inconnu';
};

// Composant pour gérer les clics sur la carte (utilisé dans le formulaire de zones)
const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
   useMapEvents({
      click: (e) => {
         onClick(e.latlng.lat, e.latlng.lng);
      }
   });
   return null;
};

/** Coordonnées magasin pour Leaflet (champs lat/lng ou parsing maps_url). */
function getStoreLatLngForMap(s: Store): [number, number] | null {
   let lat = s.latitude != null ? Number(s.latitude) : NaN;
   let lng = s.longitude != null ? Number(s.longitude) : NaN;
   if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const url = s.maps_url || (s as { mapsUrl?: string }).mapsUrl;
      const match =
         url?.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
         url?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
         url?.match(/query=([-.\d]+),([-.\d]+)/) ||
         url?.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (match) {
         lat = parseFloat(match[1]);
         lng = parseFloat(match[2]);
      }
   }
   if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
   return [lat, lng];
}

/** Libellés sans magasin physique réel (produits « normaux », vendeur générique, etc.). */
const GENERIC_VENDOR_LABELS = /^(vendeur|vendeuse|seller|merchant)$/i;

/** Magasin « catalogue produits » : seul ce type a un point de vente à tracer pour la logistique. */
function isLogisticsProductStore(store: Store): boolean {
   return store.type === 'products';
}

/**
 * Boutiques à tracer sur la carte pour une commande : type `products` uniquement (exclut menu-image, text-only, prescription),
 * avec coordonnées. Priorité à `store_id` sur chaque ligne ; sinon résolution par nom si ce n’est pas un libellé générique.
 */
function getOrderLogisticsMapStores(order: Order, allStores: Store[]): Store[] {
   const out: Store[] = [];
   const seen = new Set<string>();

   const add = (st: Store | undefined) => {
      if (!st || st.is_deleted) return;
      if (!isLogisticsProductStore(st)) return;
      if (!getStoreLatLngForMap(st)) return;
      const id = String(st.id);
      if (seen.has(id)) return;
      seen.add(id);
      out.push(st);
   };

   for (const it of order.items || []) {
      const sid = it.storeId;
      if (sid) {
         add(allStores.find(s => String(s.id) === String(sid)));
         continue;
      }
      const label = (it.storeName || '').trim();
      if (!label || GENERIC_VENDOR_LABELS.test(label)) continue;
      add(allStores.find(s => s.name === label));
   }

   if (order.storeId) {
      add(allStores.find(s => String(s.id) === String(order.storeId)));
   } else {
      const head = (order.storeName || '').trim();
      if (head && !GENERIC_VENDOR_LABELS.test(head)) {
         add(allStores.find(s => s.name === head));
      }
   }

   return out;
}

/** GPS structuré (`location` renseignée par l’app) — plus fiable que du texte parsé. */
function orderHasStructuredCustomerLocation(o: Order): boolean {
   return o.location != null && Number.isFinite(o.location.lat) && Number.isFinite(o.location.lng);
}

/**
 * Position client pour la page Maps : `location` si présente, sinon extraction notes / texte (zone MA approximative).
 */
function orderCustomerPosForMaps(o: Order): [number, number] | null {
   if (orderHasStructuredCustomerLocation(o)) return [o.location!.lat, o.location!.lng];
   const notes = [o.textOrder, o.deliveryNote].filter(Boolean) as string[];
   for (const text of notes) {
      const match =
         text.match(/google\.com\/maps\?(?:q|query)=([-.\d]+),([-.\d]+)/) ||
         text.match(/@([-.\d]+),([-.\d]+)/) ||
         text.match(/([-.\d]+)[,\s]+([-.\d]+)/);
      if (match) {
         const lat = parseFloat(match[1]);
         const lng = parseFloat(match[2]);
         if (lat > 20 && lat < 40 && lng > -20 && lng < 10) return [lat, lng];
      }
   }
   const t = o.textOrder || '';
   const urlMatch = t.match(/google\.com\/maps\?(?:q|query)=([-.\d]+),([-.\d]+)/);
   if (urlMatch) return [parseFloat(urlMatch[1]), parseFloat(urlMatch[2])];
   const genericMatch = t.match(/@([-.\d]+),([-.\d]+)/);
   if (genericMatch) return [parseFloat(genericMatch[1]), parseFloat(genericMatch[2])];
   return null;
}

function orderMapPositionIsApproximate(o: Order): boolean {
   return orderCustomerPosForMaps(o) != null && !orderHasStructuredCustomerLocation(o);
}

const MAPS_PAGE_STATUS_OPTIONS: OrderStatus[] = [
   'pending',
   'verification',
   'accepted',
   'preparing',
   'treatment',
   'progression',
   'delivering',
   'delivered',
   'refused',
   'unavailable',
];

function sanitizeMapPhoneDigits(phone: string): string {
   const d = (phone || '').replace(/\D/g, '');
   if (d.startsWith('0') && d.length === 10) return `212${d.slice(1)}`;
   return d;
}

/** Compare téléphones profil / commande (formats 06…, +212…, espaces). */
function normalizePhoneComparable(phone: string | undefined | null): string {
   if (!phone) return '';
   let d = String(phone).replace(/\D/g, '');
   if (d.startsWith('00')) d = d.slice(2);
   if (d.startsWith('0') && d.length >= 9) d = `212${d.slice(1)}`;
   return d;
}

/** Une commande appartient au client si user_id correspond ou si le téléphone matche (souvent la seule donnée fiable côté commande). */
function orderBelongsToUserProfile(o: Order, u: UserProfile): boolean {
   if (u.id && o.userId != null && String(o.userId).trim() !== '' && String(o.userId) === String(u.id)) return true;
   const pa = normalizePhoneComparable(o.phone);
   const pu = normalizePhoneComparable(u.phone);
   if (pa && pu && pa === pu) return true;
   if (pa.length >= 9 && pu.length >= 9 && pa.slice(-9) === pu.slice(-9)) return true;
   return false;
}

/** Montant affiché : total_final (TTC) si présent, sinon total / total_products. */
function orderMonetaryTotal(o: Order): number {
   if (typeof o.total_final === 'number' && Number.isFinite(o.total_final)) return o.total_final;
   if (typeof o.total === 'number' && Number.isFinite(o.total)) return o.total;
   if (typeof o.total_products === 'number' && Number.isFinite(o.total_products)) return o.total_products;
   return 0;
}

/** Produits vs frais livraison vs total TTC (commandes livrées / finance). */
function orderFinanceBreakdown(o: Order): { products: number; delivery: number; grand: number } {
   const grand = orderMonetaryTotal(o);
   let delivery = 0;
   if (typeof o.delivery_fee === 'number' && Number.isFinite(o.delivery_fee) && o.delivery_fee >= 0) {
      delivery = o.delivery_fee;
   } else if (typeof o.total_final === 'number' && Number.isFinite(o.total_final)) {
      const sub =
         typeof o.total_products === 'number' && Number.isFinite(o.total_products)
            ? o.total_products
            : typeof o.total === 'number' && Number.isFinite(o.total)
               ? o.total
               : 0;
      delivery = Math.max(0, grand - sub);
   }
   const products = Math.max(0, grand - delivery);
   return { products, delivery, grand };
}

/** Point de référence « dépôt / ville » pour tri par distance sur la Maps. */
const MAPS_DEPOT_CENTER: [number, number] = [34.261, -6.580];

const MAPS_SENSITIVE_STATUSES = new Set<OrderStatus>(['delivered', 'refused', 'unavailable']);

function mapsConfirmSensitiveStatus(newStatus: OrderStatus, orderId: string): boolean {
   if (!MAPS_SENSITIVE_STATUSES.has(newStatus)) return true;
   const short = String(orderId).slice(-6);
   const labels: Partial<Record<OrderStatus, string>> = {
      delivered: 'marquer comme livrée',
      refused: 'marquer comme refusée',
      unavailable: 'marquer comme indisponible',
   };
   const msg = labels[newStatus] || `passer en « ${newStatus} »`;
   return confirm(`Confirmer : ${msg} pour la commande #${short} ?`);
}

function haversineKm(a: [number, number], b: [number, number]): number {
   const R = 6371;
   const toR = (d: number) => (d * Math.PI) / 180;
   const dLat = toR(b[0] - a[0]);
   const dLon = toR(b[1] - a[1]);
   const la = toR(a[0]);
   const lb = toR(b[0]);
   const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
   return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

type MapsListSort = 'urgency' | 'oldest' | 'newest' | 'distance';
type MapsOrderFilter = 'all' | 'unassigned' | 'incidents';
type MapsZoneFilter = string | null;

/** Statuts « en attente » : utilisé pour le tri urgence liste Maps et le compteur temps d’attente commandes. */
const ORDER_WAITING_STATUSES = new Set<OrderStatus>(['pending', 'verification']);

function sortMapSidebarOrders(list: Order[], mode: MapsListSort, depot: [number, number]): Order[] {
   const copy = [...list];
   if (mode === 'oldest') return copy.sort((a, b) => a.timestamp - b.timestamp);
   if (mode === 'newest') return copy.sort((a, b) => b.timestamp - a.timestamp);
   if (mode === 'distance') {
      return copy.sort((a, b) => {
         const pa = orderCustomerPosForMaps(a);
         const pb = orderCustomerPosForMaps(b);
         const da = pa ? haversineKm(depot, pa) : 1e9;
         const db = pb ? haversineKm(depot, pb) : 1e9;
         return da - db;
      });
   }
   return copy.sort((a, b) => {
      const aw = ORDER_WAITING_STATUSES.has(a.status) ? 0 : 1;
      const bw = ORDER_WAITING_STATUSES.has(b.status) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      return a.timestamp - b.timestamp;
   });
}

function orderMapLineItemsCount(order: Order): number {
   const items = order.items || [];
   if (items.length === 0) return 0;
   return items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
}

function orderMapTotalDisplay(order: Order): string {
   const t = order.total_final ?? order.total;
   if (t == null || Number.isNaN(Number(t))) return '—';
   return `${Number(t).toFixed(2)} MAD`;
}

function orderMapPaymentLabel(order: Order): string {
   const m = order.paymentMethod || order.payment_method;
   if (m === 'transfer') return 'Virement';
   if (m === 'cash') return 'Espèces';
   return m || '—';
}

function formatDriverPositionAge(driver: Driver): string | null {
   const raw = (driver as { last_position_at?: string; updated_at?: string }).last_position_at
      || (driver as { updated_at?: string }).updated_at;
   if (!raw) return null;
   const ts = Date.parse(raw);
   if (Number.isNaN(ts)) return null;
   const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
   if (sec < 60) return 'il y a moins d’1 min';
   if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
   if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
   return `il y a ${Math.floor(sec / 86400)} j`;
}

function coerceHistoryTimestamp(t: unknown): number {
   if (typeof t === 'number' && Number.isFinite(t)) return t;
   if (typeof t === 'string') {
      const n = Date.parse(t);
      return Number.isNaN(n) ? 0 : n;
   }
   return 0;
}

function formatWaitingDurationMs(ms: number): string {
   if (!Number.isFinite(ms) || ms < 0) return '—';
   const totalSec = Math.floor(ms / 1000);
   const h = Math.floor(totalSec / 3600);
   const m = Math.floor((totalSec % 3600) / 60);
   const s = totalSec % 60;
   if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
   if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
   return `${s}s`;
}

/** Temps entre création commande et sortie de « en attente / vérification » ; si encore dans ces statuts → décompte live. */
function getOrderWaitingTimeLabel(order: Order, now: number): { label: string; active: boolean } {
   const start = order.timestamp;
   if (!Number.isFinite(start)) return { label: '—', active: false };

   if (ORDER_WAITING_STATUSES.has(order.status)) {
      return { label: formatWaitingDurationMs(now - start), active: true };
   }

   const hist = Array.isArray(order.statusHistory)
      ? [...order.statusHistory].sort((a, b) => coerceHistoryTimestamp(a.timestamp) - coerceHistoryTimestamp(b.timestamp))
      : [];
   for (const entry of hist) {
      const st = entry.status as OrderStatus;
      if (!ORDER_WAITING_STATUSES.has(st)) {
         const endTs = coerceHistoryTimestamp(entry.timestamp);
         if (endTs <= 0) break;
         return { label: formatWaitingDurationMs(endTs - start), active: false };
      }
   }

   return { label: '—', active: false };
}

const OrderWaitingTimeCell: React.FC<{ order: Order }> = ({ order }) => {
   const [, setTick] = useState(0);
   const waitingNow = ORDER_WAITING_STATUSES.has(order.status);
   useEffect(() => {
      if (!waitingNow) return;
      const id = window.setInterval(() => setTick((x) => x + 1), 1000);
      return () => window.clearInterval(id);
   }, [waitingNow, order.id]);

   const { label, active } = getOrderWaitingTimeLabel(order, Date.now());
   return (
      <span
         className={`font-mono text-[10px] font-black tracking-tight ${active ? 'text-orange-600' : 'text-slate-500'}`}
         title="Temps d’attente jusqu’au passage hors « En attente » ou « Vérification »"
      >
         {label}
      </span>
   );
};

const getDriverCoords = (d: Driver): [number, number] | null => {
   const lat = d.lastLat ?? d.last_lat ?? d.latitude;
   const lng = d.lastLng ?? d.last_lng ?? d.longitude;
   if (lat != null && lng != null) {
      const la = Number(lat);
      const lo = Number(lng);
      if (!Number.isNaN(la) && !Number.isNaN(lo)) return [la, lo];
   }
   return null;
};

const MapSidebarOrderCard: React.FC<{
   order: Order;
   selectedOrderId: string | null;
   onSelectOrder: (id: string | null) => void;
   onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
   handleCopy: (e: React.MouseEvent, text: string) => void;
}> = ({ order, selectedOrderId, onSelectOrder, onUpdateOrderStatus, handleCopy }) => {
   const [, setTick] = useState(0);
   const isWaiting = ORDER_WAITING_STATUSES.has(order.status);
   
   useEffect(() => {
      if (!isWaiting) return;
      const interval = setInterval(() => {
         setTick(t => t + 1);
      }, 5000);
      return () => clearInterval(interval);
   }, [isWaiting]);

   const waitMs = Date.now() - order.timestamp;
   const waitMins = Math.floor(waitMs / 60000);
   const isUnassigned = !order.assignedDriverId;

   let timerColor = 'text-slate-500 bg-slate-100';
   let blinkingBorder = '';
   if (isWaiting && isUnassigned) {
      if (waitMins >= 15) {
         timerColor = 'bg-red-600 text-white animate-pulse font-extrabold shadow-sm';
         blinkingBorder = 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
      } else if (waitMins >= 5) {
         timerColor = 'bg-orange-500 text-white font-bold';
         blinkingBorder = 'border-orange-300';
      }
   }

   const formattedTime = waitMins >= 60 
      ? `${Math.floor(waitMins / 60)}h ${waitMins % 60}m` 
      : `${waitMins}m`;

   const isSelected = String(selectedOrderId) === String(order.id);

   return (
      <div
         onClick={() => onSelectOrder(isSelected ? null : order.id)}
         className={`shrink-0 w-[200px] sm:w-[220px] rounded-xl border-2 p-2.5 cursor-pointer transition-all shadow-sm flex flex-col justify-between ${
            isSelected 
               ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/30' 
               : blinkingBorder || 'border-slate-100 bg-white hover:border-slate-200'
         }`}
      >
         <div>
            <div className="flex justify-between items-start gap-1">
               <span className="text-[10px] font-mono font-bold text-slate-400">#{order.id.slice(-6)}</span>
               <div className="flex items-center gap-1">
                  {isWaiting && (
                     <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${timerColor}`}>
                        ⏱️ {formattedTime}
                     </span>
                  )}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{order.status}</span>
               </div>
            </div>
            <p className="text-[11px] font-bold text-slate-800 truncate mt-1" title={getOrderStoreDisplay(order)}>{getOrderStoreDisplay(order)}</p>
            <p className="text-[9px] text-slate-600 truncate font-bold">{order.customerName}</p>
            <p className="text-[8px] text-slate-400 font-bold mt-0.5">{orderMapLineItemsCount(order)} art. · {orderMapTotalDisplay(order)}</p>
         </div>

         <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-col gap-1">
            <div className="flex justify-between items-center">
               {order.phone ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleCopy(e, order.phone); }} className="text-[8px] font-bold text-orange-600 hover:underline">Copier tél.</button>
               ) : <span />}
            </div>
            
            {onUpdateOrderStatus && (
               <div className="flex gap-1 mt-1">
                  {order.status === 'pending' && (
                     <button
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           onUpdateOrderStatus(order.id, 'confirmed');
                        }}
                        className="flex-1 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[8px] font-black uppercase text-center transition-colors"
                     >
                        ✓ Confirmer
                     </button>
                  )}
                  {order.status === 'confirmed' && (
                     <button
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           onUpdateOrderStatus(order.id, 'delivering');
                        }}
                        className="flex-1 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 text-[8px] font-black uppercase text-center transition-colors"
                     >
                        🚀 En Livraison
                     </button>
                  )}
                  {order.status === 'delivering' && (
                     <button
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           onUpdateOrderStatus(order.id, 'delivered');
                        }}
                        className="flex-1 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-[8px] font-black uppercase text-center transition-colors"
                     >
                        ✅ Livré
                     </button>
                  )}
               </div>
            )}
         </div>
      </div>
   );
};

// Bandeau cartographie (commandes + admin magasins) au-dessus de la carte live
const LogisticsSidebar: React.FC<{
   orders: Order[],
   users: UserProfile[],
   stores: Store[],
   drivers: Driver[],
   deliveryZones: DeliveryZone[],
   mapsZoneFilter: MapsZoneFilter,
   onMapsZoneFilterChange: (v: MapsZoneFilter) => void,
   onFlyToCoords?: (lat: number, lng: number) => void,
   selectedOrderId: string | null,
   onSelectOrder: (id: string | null) => void,
   onViewOrder: (id: string) => void,
   pickingStore: Store | null,
   onStartPicking: (store: Store) => void,
   onCancelPicking: () => void,
   onSavePicking: () => void,
   onPosChange: (lat: number, lng: number) => void,
   pickingPos: [number, number] | null,
   onRecenter?: () => void,
   onAssignDriver?: (orderId: string, driverId: string) => void,
   mapsOrderFilter: MapsOrderFilter,
   setMapsOrderFilter: (v: MapsOrderFilter) => void,
   mapsListSort: MapsListSort,
   setMapsListSort: (v: MapsListSort) => void,
   mapsSearchQuery: string,
   setMapsSearchQuery: (v: string) => void,
   onMapsSearchGo: () => void,
   onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void,
   mapsBandCollapsed: boolean,
   onMapsBandCollapsedChange: (collapsed: boolean) => void,
   mapLayers: { orders: boolean; stores: boolean; drivers: boolean },
   setMapLayers: React.Dispatch<React.SetStateAction<{ orders: boolean; stores: boolean; drivers: boolean }>>,
   darkModeIsOrders?: boolean,
}> = ({ orders, users, stores, drivers, deliveryZones, mapsZoneFilter, onMapsZoneFilterChange, onFlyToCoords, selectedOrderId, onSelectOrder, onViewOrder, pickingStore, onStartPicking, onCancelPicking, onSavePicking, onPosChange, pickingPos, onRecenter, onAssignDriver, mapsOrderFilter, setMapsOrderFilter, mapsListSort, setMapsListSort, mapsSearchQuery, setMapsSearchQuery, onMapsSearchGo, onUpdateOrderStatus, mapsBandCollapsed, onMapsBandCollapsedChange, mapLayers, setMapLayers, darkModeIsOrders = false }) => {
   const [sidebarTab, setSidebarTab] = useState<'orders' | 'drivers' | 'admin'>('orders');
   const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

   const filteredOrdersBase = useMemo(() => {
      let list = orders.filter(o => o.status !== 'delivered' && !o.isArchived);
      if (mapsOrderFilter === 'unassigned') list = list.filter(o => !o.assignedDriverId);
      if (mapsOrderFilter === 'incidents') list = list.filter(o => o.status === 'refused' || o.status === 'unavailable');
      if (mapsZoneFilter) {
         list = list.filter(o => {
            const store = stores.find(s => String(s.id) === String(o.storeId || (o as any).store_id));
            return store && store.zone_id === mapsZoneFilter;
         });
      }
      return list;
   }, [orders, mapsOrderFilter, mapsZoneFilter, stores]);

   const activeOrders = useMemo(
      () => sortMapSidebarOrders(filteredOrdersBase, mapsListSort, MAPS_DEPOT_CENTER),
      [filteredOrdersBase, mapsListSort]
   );

   const selectedOrderFull = useMemo(
      () => (selectedOrderId ? orders.find(o => String(o.id) === String(selectedOrderId)) : null),
      [orders, selectedOrderId]
   );

   useEffect(() => {
      if (!selectedOrderId) return;
      const el = orderCardRefs.current[String(selectedOrderId)];
      requestAnimationFrame(() => el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }));
   }, [selectedOrderId]);

   const handleCopy = (e: React.MouseEvent, text: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      alert("Copié dans le presse-papier !");
   };

   return (
      <div className="w-full flex flex-col shrink-0 z-[1001] border-b border-slate-200 bg-white shadow-sm rounded-t-[2rem] overflow-hidden">
         {/* Bandeau principal : titre + onglets + recentrer */}
         <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white shrink-0">Carte live</h1>
            <div className="flex bg-slate-800 p-0.5 rounded-lg shrink-0">
               <button type="button" onClick={() => setSidebarTab('orders')} className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase rounded-md transition-colors ${sidebarTab === 'orders' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Commandes</button>
               <button type="button" onClick={() => setSidebarTab('drivers')} className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase rounded-md transition-colors ${sidebarTab === 'drivers' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Livreurs</button>
               <button type="button" onClick={() => setSidebarTab('admin')} className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase rounded-md transition-colors ${sidebarTab === 'admin' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>Admin magasins</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 rounded-lg bg-slate-800/80 px-1.5 py-1 border border-slate-700/80" title="Affichage sur la carte">
               <span className="hidden sm:flex items-center gap-0.5 text-[8px] font-black uppercase text-slate-500 px-0.5"><Layers size={11} className="text-orange-400" /> Affichage</span>
               <button type="button" onClick={() => setMapLayers(p => ({ ...p, orders: !p.orders }))} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase transition-colors ${mapLayers.orders ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="Marqueurs commandes">
                  <Package size={12} /> <span className="hidden sm:inline">Cmd</span>
               </button>
               <button type="button" onClick={() => setMapLayers(p => ({ ...p, stores: !p.stores }))} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase transition-colors ${mapLayers.stores ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="Magasins">
                  <StoreIcon size={12} /> <span className="hidden sm:inline">Mag</span>
               </button>
               <button type="button" onClick={() => setMapLayers(p => ({ ...p, drivers: !p.drivers }))} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase transition-colors ${mapLayers.drivers ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="Livreurs">
                  <Truck size={12} /> <span className="hidden sm:inline">Liv</span>
               </button>
            </div>
            <button
               type="button"
               onClick={() => onMapsBandCollapsedChange(!mapsBandCollapsed)}
               className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[9px] sm:text-[10px] font-black uppercase text-slate-200 border border-slate-600 shrink-0"
               title={mapsBandCollapsed ? 'Afficher liste et filtres' : 'Masquer la liste pour agrandir la carte'}
            >
               {mapsBandCollapsed ? <ChevronDown size={14} className="text-orange-400" /> : <ChevronUp size={14} className="text-orange-400" />}
               <span className="max-w-[7rem] sm:max-w-none leading-tight text-left">{mapsBandCollapsed ? 'Liste' : 'Carte max'}</span>
            </button>
            {onRecenter && (
               <button type="button" onClick={onRecenter} className="ml-auto sm:ml-0 p-2 hover:bg-slate-800 rounded-xl transition-colors shrink-0" title="Recentrer sur Kénitra">
                  <Target size={18} className="text-orange-500" />
               </button>
            )}
         </div>

         {mapsBandCollapsed && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-200">
               <span className="text-[10px] font-bold text-slate-600">
                  {sidebarTab === 'orders'
                     ? `${activeOrders.length} commande(s) visible(s) sur la carte · bandeau réduit`
                     : 'Admin magasins · bandeau réduit'}
               </span>
               {sidebarTab === 'orders' && selectedOrderId && (
                  <span className="text-[10px] font-black text-orange-600">#{String(selectedOrderId).slice(-6)} sélectionnée</span>
               )}
            </div>
         )}

         {sidebarTab === 'orders' ? (
            <>
               {!mapsBandCollapsed && (
                  <>
                     <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">En direct</span>
                        
                        {/* Sélecteur Ville */}
                        <select
                           value={mapsZoneFilter ?? ''}
                           onChange={e => onMapsZoneFilterChange(e.target.value || null)}
                           className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 outline-none cursor-pointer"
                           title="Filtrer par ville"
                        >
                           <option value="">🌍 Toutes les villes</option>
                           {deliveryZones.map(z => (
                              <option key={z.id} value={z.id}>📍 {z.name}</option>
                           ))}
                        </select>

                        <select value={mapsListSort} onChange={(e) => setMapsListSort(e.target.value as MapsListSort)} className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700" title="Tri">
                           <option value="urgency">Urgence</option>
                           <option value="oldest">Plus anciennes</option>
                           <option value="newest">Plus récentes</option>
                           <option value="distance">Distance</option>
                        </select>
                        <div className="flex flex-wrap gap-1">
                           <button type="button" onClick={() => setMapsOrderFilter('all')} className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg ${mapsOrderFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Toutes</button>
                           <button type="button" onClick={() => setMapsOrderFilter('unassigned')} className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg ${mapsOrderFilter === 'unassigned' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Sans livreur</button>
                           <button type="button" onClick={() => setMapsOrderFilter('incidents')} className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg ${mapsOrderFilter === 'incidents' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Litiges</button>
                        </div>
                        <div className="flex flex-1 min-w-[12rem] max-w-md gap-1 ml-auto">
                           <input value={mapsSearchQuery} onChange={(e) => setMapsSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onMapsSearchGo()} placeholder="ID, téléphone, client…" className="flex-1 min-w-0 text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5" />
                           <button type="button" onClick={onMapsSearchGo} className="shrink-0 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-orange-600">Aller</button>
                        </div>
                     </div>

                     <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-white border-b border-slate-100 [scrollbar-width:thin]">
                        {activeOrders.length === 0 && (
                           <p className="text-xs text-slate-400 py-2 italic w-full text-center">
                              {mapsOrderFilter === 'unassigned' ? 'Aucune commande sans livreur' : mapsOrderFilter === 'incidents' ? 'Aucun litige actif' : 'Aucune commande active'}
                           </p>
                        )}
                        {activeOrders.map(order => (
                           <div
                              key={order.id}
                              ref={(el) => { orderCardRefs.current[String(order.id)] = el; }}
                              className="shrink-0"
                           >
                              <MapSidebarOrderCard
                                 order={order}
                                 selectedOrderId={selectedOrderId}
                                 onSelectOrder={onSelectOrder}
                                 onUpdateOrderStatus={onUpdateOrderStatus}
                                 handleCopy={handleCopy}
                              />
                           </div>
                        ))}
                     </div>

                     {selectedOrderFull && (
                        <div
                           className={[
                              'max-h-[min(280px,38vh)] overflow-y-auto px-3 py-3 border-b',
                              darkModeIsOrders
                                 ? 'bg-gradient-to-b from-slate-950/80 to-slate-900 border-slate-800'
                                 : 'bg-gradient-to-b from-orange-50/80 to-white border-orange-100',
                           ].join(' ')}
                           onClick={(e) => e.stopPropagation()}
                        >
                           <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <p className={`text-xs font-black ${darkModeIsOrders ? 'text-slate-100' : 'text-slate-800'}`}>
                                 Commande #{selectedOrderFull.id.slice(-6)} · <span className="text-orange-600">{getOrderStoreDisplay(selectedOrderFull)}</span>
                              </p>
                              <button
                                 type="button"
                                 onClick={() => onSelectOrder(null)}
                                 className={`text-[10px] font-black uppercase ${darkModeIsOrders ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                              >
                                 Fermer
                              </button>
                           </div>
                           <div className="flex flex-wrap gap-1.5">
                              {selectedOrderFull.phone && (
                                 <>
                                    <a
                                       href={`tel:${selectedOrderFull.phone.replace(/\s/g, '')}`}
                                       className={[
                                          'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border',
                                          darkModeIsOrders
                                             ? 'bg-emerald-950/40 text-emerald-200 border-emerald-200/20'
                                             : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                       ].join(' ')}
                                    >
                                       <Phone size={10} /> Appeler
                                    </a>
                                    <a
                                       href={`https://wa.me/${sanitizeMapPhoneDigits(selectedOrderFull.phone)}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className={[
                                          'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border',
                                          darkModeIsOrders
                                             ? 'bg-green-950/40 text-green-200 border-green-200/20'
                                             : 'bg-green-50 text-green-800 border-green-200',
                                       ].join(' ')}
                                    >
                                       <MessageCircle size={10} /> WhatsApp
                                    </a>
                                 </>
                              )}
                              {(() => {
                                 const p = orderCustomerPosForMaps(selectedOrderFull);
                                 if (!p) return null;
                                 return (
                                    <>
                                       <a
                                          href={`https://www.google.com/maps?q=${p[0]},${p[1]}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={[
                                             'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border',
                                             darkModeIsOrders
                                                ? 'bg-blue-950/40 text-blue-200 border-blue-200/20'
                                                : 'bg-blue-50 text-blue-800 border-blue-200',
                                          ].join(' ')}
                                       >
                                          <Navigation size={10} /> Maps
                                       </a>
                                       <button
                                          type="button"
                                          onClick={() => { navigator.clipboard.writeText(`${p[0].toFixed(5)}, ${p[1].toFixed(5)}`); alert('Coordonnées copiées'); }}
                                          className={[
                                             'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border',
                                             darkModeIsOrders
                                                ? 'bg-slate-900/60 border-slate-700 text-slate-200 hover:bg-slate-900'
                                                : 'bg-slate-100 border-slate-200 text-slate-800',
                                          ].join(' ')}
                                       >
                                          <Copy size={10} /> GPS
                                       </button>
                                    </>
                                 );
                              })()}
                           </div>
                           {orderMapPositionIsApproximate(selectedOrderFull) && (
                              <p
                                 className={[
                                    'text-[9px] font-bold rounded-lg px-2 py-1.5 mt-2 border',
                                    darkModeIsOrders
                                       ? 'text-amber-200 bg-amber-950/40 border-amber-200/20'
                                       : 'text-amber-700 bg-amber-50 border-amber-200',
                                 ].join(' ')}
                              >
                                 Position approximative (texte / lien).
                              </p>
                           )}
                           {!orderCustomerPosForMaps(selectedOrderFull) && (
                              <p
                                 className={[
                                    'text-[9px] font-bold rounded-lg px-2 py-1.5 mt-2 border',
                                    darkModeIsOrders
                                       ? 'text-red-200 bg-red-950/40 border-red-200/20'
                                       : 'text-red-700 bg-red-50 border-red-100',
                                 ].join(' ')}
                              >
                                 Pas de position sur la carte.
                              </p>
                           )}
                           <div className="grid sm:grid-cols-2 gap-2 mt-2">
                              {onUpdateOrderStatus && (
                                 <div
                                    className={[
                                       'p-2 rounded-xl border',
                                       darkModeIsOrders ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100',
                                    ].join(' ')}
                                 >
                                    <label className={`text-[9px] font-black uppercase mb-1 block ${darkModeIsOrders ? 'text-slate-300' : 'text-slate-500'}`}>Statut</label>
                                    <select
                                       className={[
                                          'w-full text-xs p-2 rounded-lg border-2 font-bold outline-none cursor-pointer',
                                          darkModeIsOrders
                                             ? 'bg-slate-950/50 border-slate-800 text-slate-200 hover:bg-slate-900'
                                             : 'border-slate-100 bg-white text-slate-900',
                                       ].join(' ')}
                                       value={selectedOrderFull.status}
                                       onChange={(e) => onUpdateOrderStatus(selectedOrderFull.id, e.target.value as OrderStatus)}
                                    >
                                       {MAPS_PAGE_STATUS_OPTIONS.map(st => (<option key={st} value={st}>{st}</option>))}
                                    </select>
                                 </div>
                              )}
                              <div
                                 className={[
                                    'p-2 rounded-xl border',
                                    darkModeIsOrders ? 'bg-slate-900/40 border-orange-900/30' : 'bg-white border-orange-100',
                                 ].join(' ')}
                              >
                                 <label
                                    className={`text-[9px] font-black uppercase mb-1 flex items-center gap-1 ${darkModeIsOrders ? 'text-slate-300' : 'text-slate-500'}`}
                                 >
                                    <Bike size={10} className="text-orange-500" /> Livreur
                                 </label>
                                 <select
                                    className={[
                                       'w-full text-xs p-2 rounded-lg border-2 font-bold outline-none cursor-pointer',
                                       darkModeIsOrders
                                          ? 'bg-slate-950/50 border-slate-800 text-slate-200 hover:bg-slate-900'
                                          : 'border-slate-100 bg-white text-slate-900',
                                    ].join(' ')}
                                    value={selectedOrderFull.assignedDriverId || ''}
                                    onChange={(e) => { if (e.target.value && onAssignDriver) onAssignDriver(selectedOrderFull.id, e.target.value); }}
                                 >
                                    <option value="" disabled>Choisir…</option>
                                    {drivers.filter(d => d.is_online || d.id === selectedOrderFull.assignedDriverId).map(d => {
                                       const isActive = d.status === 'busy' || orders.filter(o => o.status !== 'delivered' && !o.isArchived).some(o => o.assignedDriverId === d.id);
                                       return (<option key={d.id} value={d.id}>{isActive ? '🔴 ' : '🟢 '}{d.full_name || d.fullName}</option>);
                                    })}
                                 </select>
                              </div>
                           </div>

                           {/* Panel d'assignation rapide par distance */}
                           {onAssignDriver && (() => {
                              const selectedOrderStore = stores.find(s => String(s.id) === String(selectedOrderFull.storeId || (selectedOrderFull as any).store_id));
                              const storeCoords = selectedOrderStore ? getStoreLatLngForMap(selectedOrderStore) : null;

                              const driversWithDistance = drivers
                                 .filter(d => d.is_online || (d as any).is_online)
                                 .map(d => {
                                    const coords = getDriverCoords(d);
                                    const dist = (storeCoords && coords) ? haversineKm(storeCoords, coords) : 1e9;
                                    return { driver: d, distance: dist };
                                 })
                                 .sort((a, b) => a.distance - b.distance);

                              if (driversWithDistance.length === 0) return null;

                              return (
                                 <div className={`mt-3 p-2.5 rounded-xl border ${darkModeIsOrders ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                                    <label className={`text-[10px] font-black uppercase tracking-tight block mb-2 ${darkModeIsOrders ? 'text-slate-300' : 'text-slate-600'}`}>
                                       ⚡ Assigner le plus proche (Magasin: {selectedOrderStore?.name || '—'})
                                    </label>
                                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                                       {driversWithDistance.map(({ driver, distance }, idx) => {
                                          const isAssigned = selectedOrderFull.assignedDriverId === driver.id;
                                          const isClosest = distance !== 1e9 && idx === 0;
                                          const isBusy = driver.status === 'busy' || orders.filter(o => o.status !== 'delivered' && !o.isArchived).some(o => o.assignedDriverId === driver.id);
                                          
                                          return (
                                             <div 
                                                key={driver.id} 
                                                className={`flex items-center justify-between p-2 rounded-lg border transition-all text-[11px] font-bold ${
                                                   isAssigned
                                                      ? (darkModeIsOrders ? 'bg-orange-950/40 border-orange-500/50' : 'bg-orange-50 border-orange-200')
                                                      : isClosest
                                                         ? (darkModeIsOrders ? 'bg-indigo-950/40 border-indigo-500/40 hover:border-indigo-400' : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-300')
                                                         : (darkModeIsOrders ? 'bg-slate-950/30 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200')
                                                }`}
                                             >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                   <span className={`w-2 h-2 rounded-full shrink-0 ${isBusy ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                   <span className="truncate">{driver.full_name || driver.fullName}</span>
                                                   {isClosest && (
                                                      <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black shrink-0 uppercase tracking-wide">Proche</span>
                                                   )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                   <span className="text-[10px] text-slate-500 font-mono">
                                                      {distance === 1e9 ? 'Non localisé' : `${distance.toFixed(1)} km`}
                                                   </span>
                                                   <button
                                                      type="button"
                                                      disabled={isAssigned}
                                                      onClick={() => onAssignDriver(selectedOrderFull.id, driver.id)}
                                                      className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${
                                                         isAssigned
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-slate-900 text-white hover:bg-orange-600'
                                                      }`}
                                                   >
                                                      {isAssigned ? 'Assigné' : '✓'}
                                                   </button>
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              );
                           })()}

                           <button type="button" onClick={() => onViewOrder(selectedOrderFull.id)} className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-orange-600"><Eye size={12} /> Fiche commande</button>
                        </div>
                     )}
                  </>
               )}
            </>
         ) : sidebarTab === 'drivers' ? (
            <>
               {!mapsBandCollapsed && (
                  <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-white border-b border-slate-100 [scrollbar-width:thin]">
                     {(() => {
                        const sortedDrivers = [...drivers].sort((a, b) => {
                           const aOnline = a.is_online || (a as any).is_online ? 0 : 1;
                           const bOnline = b.is_online || (b as any).is_online ? 0 : 1;
                           return aOnline - bOnline;
                        });
                        
                        if (sortedDrivers.length === 0) {
                           return <p className="text-xs text-slate-400 py-2 italic w-full text-center">Aucun livreur disponible</p>;
                        }

                        return sortedDrivers.map(driver => {
                           const isOnline = driver.is_online || (driver as any).is_online;
                           const activeOrder = orders.find(o => o.assignedDriverId === driver.id && o.status !== 'delivered');
                           const isBusy = driver.status === 'busy' || !!activeOrder;
                           const coords = getDriverCoords(driver);
                           const zone = deliveryZones.find(z => z.id === driver.zone_id);

                           return (
                              <div
                                 key={driver.id}
                                 className={`shrink-0 w-[200px] sm:w-[220px] rounded-xl border p-2.5 bg-white shadow-sm flex flex-col justify-between ${
                                    !isOnline ? 'opacity-60 border-slate-100 bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-200'
                                 }`}
                              >
                                 <div>
                                    <div className="flex justify-between items-start gap-1">
                                       <div className="flex items-center gap-1.5 min-w-0">
                                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${!isOnline ? 'bg-slate-400' : isBusy ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                          <p className="text-[11px] font-extrabold text-slate-800 truncate leading-tight" title={driver.full_name || driver.fullName}>
                                             {driver.full_name || driver.fullName}
                                          </p>
                                       </div>
                                       {zone && (
                                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-black truncate shrink-0">
                                             📍 {zone.name}
                                          </span>
                                       )}
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1 font-mono">{driver.phone}</p>
                                    
                                    {activeOrder ? (
                                       <div className="mt-2 p-1.5 rounded-lg bg-orange-50 border border-orange-100 text-[9px] text-orange-800">
                                          <p className="font-black">Cmd #{activeOrder.id.slice(-6)} ({activeOrder.status})</p>
                                          <p className="text-[8px] truncate font-medium mt-0.5">{getOrderStoreDisplay(activeOrder)}</p>
                                       </div>
                                    ) : (
                                       <p className="text-[9px] text-slate-400 italic mt-2">
                                          {isOnline ? 'Aucune mission en cours' : 'Hors ligne'}
                                       </p>
                                    )}
                                 </div>
                                 
                                 <div className="mt-2.5 pt-2 border-t border-slate-100 flex gap-1.5">
                                    {coords && onFlyToCoords && isOnline ? (
                                       <button
                                          type="button"
                                          onClick={() => onFlyToCoords(coords[0], coords[1])}
                                          className="flex-1 py-1 rounded bg-slate-900 text-white hover:bg-orange-600 text-[8px] font-black uppercase text-center transition-colors flex items-center justify-center gap-1"
                                       >
                                          <Navigation size={9} /> Localiser
                                       </button>
                                    ) : (
                                       <div className="flex-1 text-[8px] font-bold text-slate-400 flex items-center justify-center">
                                          Non localisé
                                       </div>
                                    )}
                                    <a
                                       href={`tel:${driver.phone.replace(/\s/g, '')}`}
                                       className="flex-1 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[8px] font-black uppercase text-center transition-colors flex items-center justify-center gap-1"
                                    >
                                       <Phone size={9} /> Appeler
                                     </a>
                                 </div>
                              </div>
                           );
                        });
                     })()}
                  </div>
               )}
            </>
         ) : (
            mapsBandCollapsed ? (
               <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-bold italic">
                  Développez le bandeau (bouton « Liste ») pour configurer les magasins sur la carte.
               </div>
            ) : (
               <div className="max-h-[min(260px,40vh)] overflow-y-auto px-3 py-3 bg-slate-50 border-b border-slate-100 space-y-3">
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
                              const hasCoords = store.latitude != null && store.longitude != null && !isNaN(Number(store.latitude)) && !isNaN(Number(store.longitude));

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
            )
         )}
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

/** Recalcule la taille Leaflet après changement de layout (bandeau replié, etc.). */
const MapInvalidateOnLayoutChange: React.FC<{ token: number }> = ({ token }) => {
   const map = useMap();
   useEffect(() => {
      if (!token) return;
      const raf = requestAnimationFrame(() => map.invalidateSize({ animate: true }));
      const t2 = setTimeout(() => map.invalidateSize(), 400);
      return () => {
         cancelAnimationFrame(raf);
         clearTimeout(t2);
      };
   }, [map, token]);
   return null;
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

/** Ajuste la vue pour englober client, livreur et tous les points passés (magasins). */
const FitLogisticsBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
   const map = useMap();
   useEffect(() => {
      const t = setTimeout(() => map.invalidateSize({ animate: true }), 350);
      return () => clearTimeout(t);
   }, [map]);
   useEffect(() => {
      if (!points.length) return;
      if (points.length === 1) {
         map.setView(points[0], 14);
         return;
      }
      const b = L.latLngBounds(points);
      map.fitBounds(b, { padding: [52, 52], maxZoom: 14 });
      const t2 = setTimeout(() => map.invalidateSize(), 600);
      return () => clearTimeout(t2);
   }, [map, points]);
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

// Component pour écouter le trigger manuel de recentrage depuis l'extérieur
const RecenterController: React.FC<{ trigger?: number }> = ({ trigger }) => {
   const map = useMap();
   useEffect(() => {
      if (trigger && trigger > 0) {
         map.flyTo([34.261, -6.580], 13, { duration: 1.5 });
      }
   }, [trigger, map]);
   return null;
};

/** Vol caméra ponctuel (recherche Maps, etc.). */
const MapFlyToCoords: React.FC<{ pos: [number, number] | null; token: number }> = ({ pos, token }) => {
   const map = useMap();
   useEffect(() => {
      if (!pos || token <= 0) return;
      map.flyTo(pos, 15, { duration: 1.2 });
      const t = setTimeout(() => map.invalidateSize(), 450);
      return () => clearTimeout(t);
   }, [map, pos, token]);
   return null;
};

// Component pour afficher la carte
const MapComponent: React.FC<{
   drivers: Driver[],
   orders: Order[],
   stores: Store[],
   categories: any[],
   selectedOrderId?: string | null,
   onUnlinkStore?: (id: string) => void,
   onMapClick?: (lat: number, lng: number) => void,
   onRecenter?: () => void,
   triggerRecenter?: number,
   pickingPos?: [number, number] | null,
   pickingStore?: Store | null,
   /** Clic sur un marqueur commande : aligne le bandeau (sélection) sur cette commande. */
   onSelectOrder?: (orderId: string) => void,
   mapOrdersFilter?: MapsOrderFilter,
   mapsZoneFilter?: MapsZoneFilter,
   onAssignDriver?: (orderId: string, driverId: string) => void,
   onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void,
   /** Assigne ce livreur à la commande actuellement sélectionnée sur la Maps (clic marqueur livreur). */
   onAssignDriverToMapSelection?: (driverId: string) => void,
   mapLayers?: { orders: boolean; stores: boolean; drivers: boolean },
   flyToPos?: [number, number] | null,
   flyToToken?: number,
   layoutResizeToken?: number,
}> = ({ drivers, orders, stores, categories, selectedOrderId, onUnlinkStore: onUnlinkStore, onMapClick, onRecenter, triggerRecenter, pickingPos, pickingStore, onSelectOrder, mapOrdersFilter = 'all', mapsZoneFilter = null, onAssignDriver, onUpdateOrderStatus, onAssignDriverToMapSelection, mapLayers = { orders: true, stores: true, drivers: true }, flyToPos = null, flyToToken = 0, layoutResizeToken = 0 }) => {
   const selectedOrder = orders.find(o => String(o.id) === String(selectedOrderId));

   const activeStoreId = (selectedOrder as any)?.storeId || (selectedOrder as any)?.store_id;
   const activeStore = selectedOrder ? stores.find(s => String(s.id) === String(activeStoreId)) : null;

   // Icône personnalisée pour chaque store (image réelle si dispo, sinon avatar SVG généré)
   /** Bordure orange = magasin « produits » lié à la commande sélectionnée ; gris = autre magasin catalogue. */
   const createStoreIcon = (store: Store, linkedToSelected = false) => {
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
      const borderColor = linkedToSelected ? '#f97316' : '#94a3b8';

      return L.divIcon({
         html: `<div class="relative w-10 h-10 rounded-full overflow-hidden shadow-2xl bg-white transition-transform hover:scale-110" style="border:4px solid ${borderColor}">` +
            `<img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" class="w-full h-full object-cover"/>` +
            `</div>`,
         className: '',
         iconSize: [40, 40],
         iconAnchor: [20, 20]
      });
   };

   // Icône temporaire pour le store en cours de lien
   const pickingIcon = pickingStore ? createStoreIcon(pickingStore, true) : StoreMarkerIcon;

   // Icône personnalisée pour le livreur (selon statut)
   const createDriverIcon = (driver: Driver, activeOrder?: Order, highlightAssigned?: boolean) => {
      const isBusy = driver.status === 'busy' || !!activeOrder;
      const isOffline = driver.status === 'offline';

      let bgColor = 'bg-blue-500'; // Libre
      let shadowColor = 'shadow-blue-500/50';

      if (isBusy) {
         bgColor = 'bg-red-500'; // En mission
         shadowColor = 'shadow-red-500/50';
      } else if (isOffline) {
         bgColor = 'bg-slate-400'; // Hors ligne
         shadowColor = 'shadow-slate-400/50';
      }

      const ring = highlightAssigned ? 'box-shadow:0 0 0 4px #fbbf24,0 0 12px rgba(251,191,36,0.6);' : '';

      return L.divIcon({
         html: `<div class="relative w-8 h-8 rounded-full border-[3px] border-white shadow-lg ${bgColor} ${shadowColor} flex items-center justify-center transition-transform hover:scale-110" style="${ring}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
               <circle cx="18.5" cy="17.5" r="2.5"/>
               <circle cx="5.5" cy="17.5" r="2.5"/>
               <circle cx="15" cy="5" r="1" fill="white"/>
               <path d="M12 17.5V14l-3-3-4 3"/>
               <path d="m8 14 3-3 4-3 3.5 3"/>
               <path d="M5.5 17.5 9.5 11"/>
               <path d="M18.5 17.5 14 9"/>
            </svg>
            ${isBusy ? `<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping border border-white"></span>` : ''}
            ${!isBusy && !isOffline ? `<span class="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse border border-white"></span>` : ''}
         </div>`,
         className: '',
         iconSize: [32, 32],
         iconAnchor: [16, 16]
      });
   };

   // Icône pour les destinataires (commandes actives)
   const OrderDestinationIcon = L.divIcon({
      html: `<div class="relative w-7 h-7 rounded-full bg-white border-[3px] border-slate-800 shadow-md flex items-center justify-center transition-transform hover:scale-110 group">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-slate-800">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
         </svg>
         <span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white"></span>
      </div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
   });

   const activeOrdersArray = useMemo(() => {
      let arr = orders.filter(o => o.status !== 'delivered' && !o.isArchived);
      if (mapOrdersFilter === 'unassigned') arr = arr.filter(o => !o.assignedDriverId);
      if (mapOrdersFilter === 'incidents') arr = arr.filter(o => o.status === 'refused' || o.status === 'unavailable');
      if (mapsZoneFilter) {
         arr = arr.filter(o => {
            const store = stores.find(s => String(s.id) === String(o.storeId || (o as any).store_id));
            return store && store.zone_id === mapsZoneFilter;
         });
      }
      return arr;
   }, [orders, mapOrdersFilter, mapsZoneFilter, stores]);

   const logisticsStoresForSelected = useMemo(
      () => (selectedOrder ? getOrderLogisticsMapStores(selectedOrder, stores) : []),
      [selectedOrder, stores]
   );

   const logisticsStoreIdSet = useMemo(
      () => new Set(logisticsStoresForSelected.map(s => String(s.id))),
      [logisticsStoresForSelected]
   );

   /** Client + livreur + magasins « produits » de la commande sélectionnée (cadrage page Maps). */
   const mapPageLogisticsBoundsPoints = useMemo((): [number, number][] => {
      if (!selectedOrder) return [];
      const pts: [number, number][] = [];
      const cust = orderCustomerPosForMaps(selectedOrder);
      if (cust) pts.push(cust);
      if (selectedOrder.assignedDriverId) {
         const d = drivers.find(dr => dr.id === selectedOrder.assignedDriverId);
         if (d) {
            const lat = d.lastLat ?? d.last_lat ?? d.latitude ?? (d as any).x;
            const lng = d.lastLng ?? d.last_lng ?? d.longitude ?? (d as any).y;
            if (lat != null && lng != null) {
               const la = Number(lat);
               const lo = Number(lng);
               if (!Number.isNaN(la) && !Number.isNaN(lo)) pts.push([la, lo]);
            }
         }
      }
      for (const st of logisticsStoresForSelected) {
         const c = getStoreLatLngForMap(st);
         if (c) pts.push(c);
      }
      return pts;
   }, [selectedOrder, drivers, logisticsStoresForSelected]);

   const mapFlyTargetPos = useMemo((): [number, number] | null => {
      if (mapPageLogisticsBoundsPoints.length > 0) return null;
      if (!selectedOrder) return null;
      return (
         orderCustomerPosForMaps(selectedOrder) ||
         (activeStore ? getStoreLatLngForMap(activeStore) : null)
      );
   }, [mapPageLogisticsBoundsPoints.length, selectedOrder, activeStore]);

   const mapCatalogStores = useMemo(() => {
      let list = stores.filter(s => !s.is_deleted && isLogisticsProductStore(s) && getStoreLatLngForMap(s));
      if (mapsZoneFilter) {
         list = list.filter(s => s.zone_id === mapsZoneFilter);
      }
      return list;
   }, [stores, mapsZoneFilter]);

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
                filter: brightness(0.92) contrast(1.1) saturate(1.1) !important;
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
            <MapController targetPos={mapFlyTargetPos} />
            <MapInvalidateOnLayoutChange token={layoutResizeToken} />
            <MapFlyToCoords pos={flyToPos} token={flyToToken} />
            {mapPageLogisticsBoundsPoints.length > 0 && <FitLogisticsBounds points={mapPageLogisticsBoundsPoints} />}
            {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}
            <RecenterController trigger={triggerRecenter} />
            <TileLayer
               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Client → magasins « produits » (commande sélectionnée dans le bandeau) */}
            {selectedOrder && (() => {
               const cust = orderCustomerPosForMaps(selectedOrder);
               if (!cust) return null;
               return logisticsStoresForSelected.map((s, idx) => {
                  const c = getStoreLatLngForMap(s);
                  if (!c) return null;
                  return (
                     <Polyline
                        key={`maps-traj-${s.id}-${idx}`}
                        positions={[cust, c]}
                        pathOptions={{ color: '#FF7A00', weight: 3, dashArray: '6, 8', opacity: 0.9 }}
                     />
                  );
               });
            })()}

            {/* Magasins catalogue (réseau) — cluster si densité */}
            {mapLayers.stores && (
               <MarkerClusterGroup chunkedLoading>
                  {mapCatalogStores.map(store => {
                     const coords = getStoreLatLngForMap(store);
                     if (!coords) return null;
                     const linked = logisticsStoreIdSet.has(String(store.id));
                     return (
                        <Marker
                           key={`map-store-${store.id}`}
                           position={coords}
                           icon={createStoreIcon(store, linked)}
                           zIndexOffset={linked ? 400 : 50}
                        >
                           <Popup autoPan={false}>
                              <div className="p-1 min-w-[140px]">
                                 <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Boutique (catalogue)</p>
                                 <p className="font-bold text-gray-900 text-sm">{store.name}</p>
                                 {linked && selectedOrder && (
                                    <p className="text-[10px] font-bold text-orange-600 mt-2 border-t border-slate-100 pt-2">
                                       Sur cette commande · #{String(selectedOrder.id).slice(-6)}
                                    </p>
                                 )}
                              </div>
                           </Popup>
                        </Marker>
                     );
                  })}
               </MarkerClusterGroup>
            )}

            {/* PREVIEW DU STORE EN COURS DE LIEN */}
            {pickingStore && pickingPos && (
               <Marker position={pickingPos} icon={pickingIcon}>
                  <Popup>
                     <div className="p-1 font-bold text-xs">Position de {pickingStore.name}</div>
                  </Popup>
               </Marker>
            )}

            {/* COMMANDES EN COURS (DESTINATIONS) */}
            {mapLayers.orders && (
               <MarkerClusterGroup chunkedLoading>
                  {activeOrdersArray.map(order => {
                     const pos = orderCustomerPosForMaps(order);
                     if (!pos) return null;

                     const isSelected = String(selectedOrderId) === String(order.id);
                     const approx = orderMapPositionIsApproximate(order);
                     const waDigits = sanitizeMapPhoneDigits(order.phone || '');

                     return (
                        <Marker
                           key={`order-${order.id}`}
                           position={pos}
                           icon={OrderDestinationIcon}
                           zIndexOffset={isSelected ? 1000 : 0}
                           eventHandlers={
                              onSelectOrder
                                 ? {
                                    click: () => onSelectOrder(String(order.id)),
                                 }
                                 : undefined
                           }
                        >
                           <Popup autoPan={false} className="custom-popup">
                              <div className="p-1 min-w-[168px] max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                 <div className="flex justify-between items-center mb-1 gap-1 flex-wrap">
                                    <span className="text-[10px] font-mono font-bold text-orange-500">#{order.id.slice(-6)}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">
                                       {order.status}
                                    </span>
                                 </div>
                                 {approx && (
                                    <p className="text-[8px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 mb-1">
                                       Position approximative
                                    </p>
                                 )}
                                 <h3 className="font-bold text-gray-900 text-sm leading-tight">{order.customerName}</h3>
                                 <p className="text-[10px] text-gray-500 font-bold mt-1 max-w-[200px] truncate">{order.storeName || order.category}</p>
                                 <p className="text-[9px] text-slate-600 font-bold mt-1.5 bg-slate-50 rounded px-1.5 py-1 border border-slate-100">
                                    {orderMapLineItemsCount(order)} article(s) · {orderMapTotalDisplay(order)} · {orderMapPaymentLabel(order)}
                                 </p>
                                 {order.assignedDriverId && (
                                    <p className="text-[10px] bg-blue-50 text-blue-600 p-1 rounded mt-2 font-bold font-mono">
                                       Livreur: {drivers.find(d => d.id === order.assignedDriverId)?.full_name || order.assignedDriverId.slice(0, 4)}
                                    </p>
                                 )}
                                 <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                                    {order.phone && (
                                       <>
                                          <a href={`tel:${order.phone.replace(/\s/g, '')}`} className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                             Appeler
                                          </a>
                                          {waDigits.length >= 8 && (
                                             <a
                                                href={`https://wa.me/${waDigits}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-green-50 text-green-800 border border-green-200"
                                             >
                                                WhatsApp
                                             </a>
                                          )}
                                       </>
                                    )}
                                    <a
                                       href={`https://www.google.com/maps?q=${pos[0]},${pos[1]}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
                                    >
                                       Maps
                                    </a>
                                    <button
                                       type="button"
                                       className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                                       onClick={() => {
                                          navigator.clipboard.writeText(`${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`);
                                          alert('Coordonnées copiées');
                                       }}
                                    >
                                       Copier GPS
                                    </button>
                                 </div>
                                 {onUpdateOrderStatus && (
                                    <select
                                       className="w-full mt-2 text-[10px] font-bold p-1.5 rounded-lg border border-slate-200 bg-white"
                                       value={order.status}
                                       onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                    >
                                       {MAPS_PAGE_STATUS_OPTIONS.map(st => (
                                          <option key={st} value={st}>{st}</option>
                                       ))}
                                    </select>
                                 )}
                                 {onAssignDriver && (
                                    <select
                                       className="w-full mt-1.5 text-[10px] font-bold p-1.5 rounded-lg border border-orange-100 bg-orange-50/50"
                                       value={order.assignedDriverId || ''}
                                       onChange={(e) => {
                                          if (e.target.value) onAssignDriver(order.id, e.target.value);
                                       }}
                                    >
                                       <option value="" disabled>Livreur…</option>
                                       {drivers.filter(d => d.is_online || d.id === order.assignedDriverId).map(d => (
                                          <option key={d.id} value={d.id}>{d.full_name || d.fullName}</option>
                                       ))}
                                    </select>
                                 )}
                                 {onSelectOrder && !isSelected && (
                                    <p className="text-[8px] text-slate-500 font-bold mt-2">
                                       Clic marqueur = sélection dans la liste
                                    </p>
                                 )}
                              </div>
                           </Popup>
                        </Marker>
                     );
                  })}
               </MarkerClusterGroup>
            )}

            {/* LIVREURS */}
            {mapLayers.drivers && drivers.filter(d => !mapsZoneFilter || d.zone_id === mapsZoneFilter).map(driver => {
               const lat = driver.lastLat ?? driver.last_lat ?? driver.latitude ?? (driver as any).x;
               const lng = driver.lastLng ?? driver.last_lng ?? driver.longitude ?? (driver as any).y;
               if (!lat || !lng) return null;

               const activeOrder = orders.find(o => o.assignedDriverId === driver.id && o.status !== 'delivered');
               const isBusy = driver.status === 'busy' || !!activeOrder;
               const isOffline = driver.status === 'offline';

               const mapSelOrder = selectedOrderId ? orders.find(o => String(o.id) === String(selectedOrderId)) : null;
               const alreadyOnSelection = mapSelOrder?.assignedDriverId === driver.id;
               const highlightAssigned = !!(mapSelOrder && mapSelOrder.assignedDriverId === driver.id);
               const posAge = formatDriverPositionAge(driver);

               return (
                  <Marker
                     key={driver.id}
                     position={[Number(lat), Number(lng)]}
                     icon={createDriverIcon(driver, activeOrder, highlightAssigned)}
                     zIndexOffset={highlightAssigned ? 2200 : isBusy ? 500 : isOffline ? -100 : 100}
                  >
                     <Popup autoPan={false}>
                        <div className="p-2 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                           <h3 className="font-bold text-gray-900 text-base">{driver.full_name || driver.fullName}</h3>
                           <p className="text-[10px] text-gray-400 font-mono tracking-tighter">ID: {driver.id}</p>
                           {posAge && <p className="text-[9px] font-bold text-slate-500 mt-1">Position : {posAge}</p>}
                           <div className="mt-2 text-xs border-t pt-2">
                              {isBusy ? (
                                 <p className="text-red-600 font-black uppercase text-[10px]">📍 En mission</p>
                              ) : isOffline ? (
                                 <p className="text-slate-500 font-black uppercase text-[10px]">⚫ Hors Ligne</p>
                              ) : (
                                 <p className="text-blue-600 font-black uppercase text-[10px]">🟢 En service (Libre)</p>
                              )}

                              {activeOrder && <p className="text-[10px] bg-red-50 text-red-600 p-1 rounded mt-2 font-bold font-mono">#{activeOrder.id.slice(-6)}</p>}
                           </div>
                           {onAssignDriverToMapSelection && selectedOrderId && mapSelOrder && !isOffline && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                 {alreadyOnSelection ? (
                                    <p className="text-[9px] font-bold text-green-700">Déjà assigné à cette commande</p>
                                 ) : (
                                    <button
                                       type="button"
                                       className="w-full py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-wide hover:bg-orange-600 transition-colors"
                                       onClick={() => onAssignDriverToMapSelection(driver.id)}
                                    >
                                       Assigner à #{String(mapSelOrder.id).slice(-6)}
                                    </button>
                                 )}
                              </div>
                           )}
                           {onAssignDriverToMapSelection && !selectedOrderId && (
                              <p className="text-[9px] text-slate-500 font-bold mt-2">Sélectionnez une commande pour assigner ce livreur</p>
                           )}
                        </div>
                     </Popup>
                  </Marker>
               );
            })}

         </MapContainer>
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

// --- COMPRESS IMAGE UTILITY ---
const compressImageBase64 = (base64Str: string, maxWidth = 1000, quality = 0.7): Promise<Blob> => {
   return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
         const canvas = document.createElement('canvas');
         let width = img.width;
         let height = img.height;
         if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
         }
         canvas.width = width;
         canvas.height = height;
         const ctx = canvas.getContext('2d');
         if (!ctx) return reject(new Error('Canvas ctx null'));
         ctx.drawImage(img, 0, 0, width, height);
         canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Blob conversion failed'));
         }, 'image/jpeg', quality);
      };
      img.onerror = reject;
   });
};

const AdminDashboardInner: React.FC<AdminDashboardProps> = ({
   orders: propOrders, users, drivers, stores, announcements: propAnnouncements, announcementsLoadError, categories: propCategories, subCategories: propSubCategories,
   storeSubCategories, setStoreSubCategories,
   supportNumber: propSupport, deliveryZone: propDeliveryZone = 'kenitra', deliveryFeePerKm: propDeliveryFeePerKm,
   deliveryBaseFee: propDeliveryBaseFee, deliveryIncludedKm: propDeliveryIncludedKm, deliveryFixedFee: propDeliveryFixedFee,
   activePresetId: propActivePresetId,
   onUpdateStatus, onAssignDriver, onArchiveOrder, onRestoreOrder, onDeletePermanently,
   onBanUser, onUpdateSettings, onCreateAnnouncement, onDeleteAnnouncement, onFetchOrderDetails, onLogout, onBack, onRefreshAnnouncements, setStores,
   setPartnerAccounts,
   promoCodes,
   partnerAccounts,
   partnerStoreAccess,
   pageVisibility = { hideFinance: false, hideStatistics: false, hideAnnouncements: false },
   adminRole = 'super_admin',
   adminPermissions: adminPermissionsProp,
   dashboardOverviewStats = { clients: 0, drivers: 0, products: 0 }
}) => {
   const adminPermissions = adminPermissionsProp ?? EMPTY_ADMIN_PERMISSIONS;
   const refreshAnnouncementsOnly = () => {
      if (onRefreshAnnouncements) void onRefreshAnnouncements();
      else onBack();
   };
   const navigate = useNavigate();
   const location = useLocation();
   const activeTab = useMemo(() => tabFromRouterPath(location.pathname), [location.pathname]);
   const setActiveTab = useCallback(
      (tab: AdminTab) => {
         navigate(pathForTab(tab));
      },
      [navigate]
   );

   const routeSeg = pathSegment(location.pathname);
   useEffect(() => {
      if (routeSeg === '') {
         navigate('/overview', { replace: true });
         return;
      }
      if (!isKnownAdminSegment(routeSeg)) {
         navigate('/overview', { replace: true });
      }
   }, [routeSeg, navigate]);

   const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
   const DARK_MODE_STORAGE_KEY = 'veetaa_admin_dark_mode_v1';
   const [darkMode, setDarkMode] = useState<boolean>(() => {
      try {
         return typeof window !== 'undefined' && localStorage.getItem(DARK_MODE_STORAGE_KEY) === '1';
      } catch {
         return false;
      }
   });
   const darkModeAppliesToPages =
      darkMode &&
      (activeTab === 'OVERVIEW' ||
         activeTab === 'ORDERS' ||
         activeTab === 'HISTORY' ||
         activeTab === 'FINANCE' ||
         activeTab === 'STATISTICS' ||
         activeTab === 'CATEGORIES' ||
         activeTab === 'CONFIG' ||
         activeTab === 'CONTROLL' ||
         activeTab === 'ADMINS' ||
         activeTab === 'BROADCAST_MAIL' ||
         activeTab === 'PARTNERS' ||
         activeTab === 'PRODUCTS' ||
         activeTab === 'PARTNERS_MGMT' ||
         activeTab === 'PROMO' ||
         activeTab === 'SUPPORT_TICKETS' ||
         activeTab === 'USERS' ||
         activeTab === 'DRIVERS');
   const darkModeIsOrders = darkMode && (activeTab === 'ORDERS' || activeTab === 'HISTORY');
   const darkModeIsFinance = darkMode && activeTab === 'FINANCE';
   const darkModeIsAnalytics = darkMode && activeTab === 'STATISTICS';
   const darkModeIsCategories = darkMode && activeTab === 'CATEGORIES';
   const darkModeIsConfig = darkMode && activeTab === 'CONFIG';
   const darkModeIsControll = darkMode && activeTab === 'CONTROLL';
   const darkModeIsAdmins = darkMode && activeTab === 'ADMINS';
   const darkModeIsBroadcastMail = darkMode && activeTab === 'BROADCAST_MAIL';
   const darkModeIsStores = darkMode && activeTab === 'PARTNERS';
   const darkModeIsProducts = darkMode && activeTab === 'PRODUCTS';
   const darkModeIsPartnersMgmt = darkMode && activeTab === 'PARTNERS_MGMT';
   const darkModeIsPromo = darkMode && activeTab === 'PROMO';
   const darkModeIsSupport = darkMode && activeTab === 'SUPPORT_TICKETS';
   const darkModeIsCustomers = darkMode && activeTab === 'USERS';
   const darkModeIsDrivers = darkMode && activeTab === 'DRIVERS';
   useEffect(() => {
      try {
         localStorage.setItem(DARK_MODE_STORAGE_KEY, darkMode ? '1' : '0');
      } catch {
         // ignore storage errors
      }
   }, [darkMode]);
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
   const [mapsOrderFilter, setMapsOrderFilter] = useState<MapsOrderFilter>('all');
   const [mapsZoneFilter, setMapsZoneFilter] = useState<MapsZoneFilter>(null);
   const [mapsListSort, setMapsListSort] = useState<MapsListSort>('urgency');
   const [mapsSearchQuery, setMapsSearchQuery] = useState('');
   const [mapsFlyPos, setMapsFlyPos] = useState<[number, number] | null>(null);
   const [mapsFlyToken, setMapsFlyToken] = useState(0);
   const [mapLayers, setMapLayers] = useState({ orders: true, stores: true, drivers: true });
   const [mapsBandCollapsed, setMapsBandCollapsed] = useState(false);
   const [mapsLayoutResizeToken, setMapsLayoutResizeToken] = useState(0);
   const liveMapDefaultHeightPx = useMemo(() => {
      if (typeof window === 'undefined') return 1200;
      return Math.round(Math.max(680, window.innerHeight * 1.88));
   }, []);

   const [financePeriod, setFinancePeriod] = useState<'7d' | '30d' | 'month' | 'all' | 'custom'>('30d');
   const [financeCustomFrom, setFinanceCustomFrom] = useState('');
   const [financeCustomTo, setFinanceCustomTo] = useState('');

   const [statsPeriod, setStatsPeriod] = useState<AnalyticsPeriodPreset>('30d');
   const [statsCustomFrom, setStatsCustomFrom] = useState('');
   const [statsCustomTo, setStatsCustomTo] = useState('');
   const [statsStoreFilter, setStatsStoreFilter] = useState<string | 'all'>('all');
   const [adminLeaderboard, setAdminLeaderboard] = useState<AdminLeaderboardRow[]>([]);

   const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
   const [recenterTrigger, setRecenterTrigger] = useState(0);
   const [deliveryZone, setDeliveryZone] = useState<'kenitra' | 'all_morocco'>(propDeliveryZone || 'kenitra');
   // Local state for orders to enable optimistic updates
   const [localOrders, setLocalOrders] = useState<Order[]>(propOrders);
   // delivery fee settings (configurable)
   const [feePerKm, setFeePerKm] = useState<number>(typeof (propDeliveryFeePerKm) !== 'undefined' ? propDeliveryFeePerKm : 3);
   const [baseFee, setBaseFee] = useState<number>(typeof (propDeliveryBaseFee) !== 'undefined' ? propDeliveryBaseFee : 0);
   const [includedKm, setIncludedKm] = useState<number>(typeof (propDeliveryIncludedKm) !== 'undefined' ? propDeliveryIncludedKm : 0);
   const [fixedFee, setFixedFee] = useState<number>(typeof (propDeliveryFixedFee) !== 'undefined' ? propDeliveryFixedFee : 0);
   const [deliveryPresets, setDeliveryPresets] = useState<any[]>([]);

   const [savingFeeSettings, setSavingFeeSettings] = useState(false);
   const [savedFeeSettings, setSavedFeeSettings] = useState(false);

   /** Visibilité des onglets : calculée une fois par changement rôle / permissions (pas d’appel réseau, pas de boucle). */
   const tabVisibility = useMemo(() => {
      const all: Record<string, boolean> = {
         OVERVIEW: true,
         ORDERS: true,
         USERS: true,
         DRIVERS: true,
         PRODUCTS: true,
         PARTNERS: true,
         PROMO: true,
         MAPS: true,
         HISTORY: true,
         FINANCE: true,
         STATISTICS: true,
         CATEGORIES: true,
         PARTNERS_MGMT: true,
         SUPPORT_TICKETS: true,
         CONFIG: true,
         ADMINS: true,
         CONTROLL: true,
         BROADCAST_MAIL: true,
      };
      if (adminRole === 'super_admin') return all;
      const p = adminPermissions;
      return {
         OVERVIEW: p.viewOrders === true,
         ORDERS: p.viewOrders === true,
         USERS: p.manageUsers === true,
         DRIVERS: p.manageDrivers === true,
         PRODUCTS: p.editProducts === true,
         PARTNERS: p.editStores === true,
         PROMO: p.accessPromo === true,
         MAPS: p.accessMaps === true,
         HISTORY: p.accessHistory === true,
         FINANCE: p.accessFinance === true,
         STATISTICS: p.accessStatistics === true,
         CATEGORIES: p.accessCategories === true,
         PARTNERS_MGMT: p.accessPartnersManagement === true,
         SUPPORT_TICKETS: p.accessSupport === true,
         CONFIG: p.manageSettings === true,
         ADMINS: p.manageAdmins === true,
         CONTROLL: true,
         /** Super-admin : tout ; sous-admin : accès clients ou gestion des admins. */
         BROADCAST_MAIL: p.manageUsers === true || p.manageAdmins === true,
      };
   }, [adminRole, adminPermissions]);

   useEffect(() => {
      if (activeTab === 'CONFIG' && onRefreshAnnouncements) {
         void onRefreshAnnouncements();
      }
   }, [activeTab, onRefreshAnnouncements]);

   // Load Presets on Init (maybeSingle : pas d'erreur si la clé n'existe pas encore)
   useEffect(() => {
      const fetchPresets = async () => {
         const { data, error } = await supabase.from('settings').select('value').eq('key', 'delivery_fee_presets').maybeSingle();
         if (error) {
            console.error('delivery_fee_presets fetch:', error);
            return;
         }
         if (!data?.value) return;
         try {
            const raw = JSON.parse(data.value) as unknown[];
            if (!Array.isArray(raw)) return;
            const normalized = raw.map((p: any) => ({
               id: p.id ?? Date.now(),
               name: String(p.name ?? 'Preset'),
               feePerKm: Number(p.feePerKm) || 0,
               baseFee: Number(p.baseFee) || 0,
               includedKm: Number(p.includedKm) || 0,
               fixedFee: Number(p.fixedFee) || 0,
            }));
            setDeliveryPresets(normalized);
         } catch (e) {
            console.error('Failed to parse delivery_fee_presets', e);
         }
      };
      void fetchPresets();
   }, []);

   // Sync local state when props change
   useEffect(() => {
      if (typeof propDeliveryFeePerKm !== 'undefined') setFeePerKm(propDeliveryFeePerKm);
      if (typeof propDeliveryBaseFee !== 'undefined') setBaseFee(propDeliveryBaseFee);
      if (typeof propDeliveryIncludedKm !== 'undefined') setIncludedKm(propDeliveryIncludedKm);
      if (typeof propDeliveryFixedFee !== 'undefined') setFixedFee(propDeliveryFixedFee);
   }, [propDeliveryFeePerKm, propDeliveryBaseFee, propDeliveryIncludedKm, propDeliveryFixedFee]);

   useEffect(() => {
      setMapsLayoutResizeToken(t => t + 1);
   }, [mapsBandCollapsed]);

   const parseFeeInput = (raw: string): number => {
      const t = String(raw).trim().replace(',', '.');
      if (t === '') return 0;
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : 0;
   };

   const handleSaveDeliverySettings = async () => {
      if (![baseFee, includedKm, feePerKm, fixedFee].every((n) => Number.isFinite(n))) {
         alert('Valeurs invalides : utilisez des nombres (ex. 1.8 ou 1,8 pour les km inclus).');
         return;
      }
      try {
         setSavingFeeSettings(true);
         setSavedFeeSettings(false);

         const results = await Promise.all([
            onUpdateSettings('delivery_fee_per_km', String(feePerKm)),
            onUpdateSettings('delivery_base_fee', String(baseFee)),
            onUpdateSettings('delivery_included_km', String(includedKm)),
            onUpdateSettings('delivery_fixed_fee', String(fixedFee)),
         ]);

         if (!results.every(Boolean)) {
            alert('Erreur : une ou plusieurs valeurs n’ont pas été enregistrées (voir notification).');
            return;
         }

         setSavedFeeSettings(true);
         setTimeout(() => setSavedFeeSettings(false), 2000);
      } catch (err) {
         console.error('Failed to save delivery settings', err);
         alert('Erreur lors de la sauvegarde.');
      } finally {
         setSavingFeeSettings(false);
      }
   };

   const handleSavePreset = async () => {
      const name = window.prompt("Nom de la combinaison (ex: Standard, Nuit, Weekend) :");
      if (!name) return;

      const newPreset = {
         id: Date.now(),
         name,
         feePerKm,
         baseFee,
         includedKm,
         fixedFee
      };

      const newPresets = [...deliveryPresets, newPreset];
      setDeliveryPresets(newPresets);
      const ok = await onUpdateSettings('delivery_fee_presets', JSON.stringify(newPresets));
      if (!ok) alert('Impossible d’enregistrer la combinaison.');
   };

   const handleApplyPreset = async (preset: any) => {
      setFeePerKm(preset.feePerKm ?? 0);
      setBaseFee(preset.baseFee ?? 0);
      setIncludedKm(preset.includedKm ?? 0);
      setFixedFee(preset.fixedFee ?? 0);

      // Save settings AND set this as active preset
      try {
         setSavingFeeSettings(true);
         const results = await Promise.all([
            onUpdateSettings('delivery_fee_per_km', String(preset.feePerKm ?? 0)),
            onUpdateSettings('delivery_base_fee', String(preset.baseFee ?? 0)),
            onUpdateSettings('delivery_included_km', String(preset.includedKm ?? 0)),
            onUpdateSettings('delivery_fixed_fee', String(preset.fixedFee ?? 0)),
            onUpdateSettings('delivery_active_preset_id', String(preset.id)),
         ]);
         if (!results.every(Boolean)) {
            alert('Erreur : le préréglage n’a pas été appliqué complètement.');
            return;
         }
         setSavedFeeSettings(true);
         setTimeout(() => setSavedFeeSettings(false), 2000);
      } finally {
         setSavingFeeSettings(false);
      }
   };

   const handleDeletePreset = async (id: number) => {
      if (!window.confirm("Supprimer cette combinaison ?")) return;
      const newPresets = deliveryPresets.filter(p => p.id !== id);
      setDeliveryPresets(newPresets);
      const ok = await onUpdateSettings('delivery_fee_presets', JSON.stringify(newPresets));
      if (!ok) alert('Impossible de mettre à jour les combinaisons.');
   };
   const [viewingImage, setViewingImage] = useState<string | null>(null);
   const [currentAdmin, setCurrentAdmin] = useState<any>(null);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [productAdditionalImages, setProductAdditionalImages] = useState<string[]>([]);
   const [showAddProduct, setShowAddProduct] = useState(false);
   const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
   const [showAddStore, setShowAddStore] = useState(false);
   const [editingStore, setEditingStore] = useState<Store | null>(null);

   // Promo Codes & Partner Accounts State
   const [showAddPromo, setShowAddPromo] = useState(false);
   const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
   const [showAddPartnerAccount, setShowAddPartnerAccount] = useState(false);
   const [editingPartner, setEditingPartner] = useState<PartnerAccount | null>(null);
   const [selectedPartnerStores, setSelectedPartnerStores] = useState<string[]>([]);
   const [promoLoading, setPromoLoading] = useState(false);
   const [showAddCategory, setShowAddCategory] = useState(false);
   const [editingCategory, setEditingCategory] = useState<any | null>(null);
   const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
   const [showDeleteStoreModal, setShowDeleteStoreModal] = useState(false);
   const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
   const [deleteStorePassword, setDeleteStorePassword] = useState('');
   const [isDeleting, setIsDeleting] = useState(false);

   // --- Modal de confirmation suppression catégorie ---
   const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
   const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ id: string; name_fr: string } | null>(null);
   const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

   // --- Modal de réaffectation/suppression sous-catégorie ---
   const [showDeleteSubCatModal, setShowDeleteSubCatModal] = useState(false);
   const [deleteSubCatTarget, setDeleteSubCatTarget] = useState<{ id: string; name: string } | null>(null);
   const [deleteSubCatLinkedCount, setDeleteSubCatLinkedCount] = useState(0);
   const [deleteSubCatChoices, setDeleteSubCatChoices] = useState<Array<{ id: string; name: string }>>([]);
   const [deleteSubCatReplacement, setDeleteSubCatReplacement] = useState('');
   const [deleteSubCatLoading, setDeleteSubCatLoading] = useState(false);
   const [deleteSubCatError, setDeleteSubCatError] = useState<string | null>(null);

   // --- Modal suppression store sous-catégorie ---
   const [showDeleteStoreSubCatModal, setShowDeleteStoreSubCatModal] = useState(false);
   const [deleteStoreSubCatId, setDeleteStoreSubCatId] = useState<string | null>(null);
   const [deleteStoreSubCatName, setDeleteStoreSubCatName] = useState('');

   const handleSavePromo = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const promoData = {
         code: formData.get('code') as string,
         type: formData.get('type') as 'fixed' | 'percentage',
         value: Number(formData.get('value')),
         max_uses: Number(formData.get('max_uses')),
         min_order_amount: Number(formData.get('min_order_amount') || 0),
         is_active: true
      };

      if (!promoData.code || !promoData.value) return;

      setPromoLoading(true);
      try {
         if (editingPromo) {
            const { error } = await supabase.from('promo_codes').update(promoData).eq('id', editingPromo.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('promo_codes').insert([promoData]);
            if (error) throw error;
         }
         setShowAddPromo(false);
         setEditingPromo(null);
         onBack(); // Refresh data
      } catch (error: any) {
         alert("Erreur lors de l'enregistrement: " + error.message);
      } finally {
         setPromoLoading(false);
      }
   };

   const handleDeletePromo = async (id: string) => {
      if (!window.confirm("Supprimer ce code promo ?")) return;
      try {
         // Détacher les commandes qui pointent encore vers ce code promo (si colonne présente)
         const { error: detachErr } = await supabase
            .from('orders')
            .update({ promo_code_id: null })
            .eq('promo_code_id', id);
         if (detachErr && detachErr.code !== 'PGRST204') {
            // PGRST204: colonne absente dans certains schémas
            throw detachErr;
         }

         const { error } = await supabase.from('promo_codes').delete().eq('id', id);
         if (error) throw error;
         onBack();
      } catch (error: any) {
         alert("Erreur: " + error.message);
      }
   };

   const handleTogglePromo = async (id: string, current: boolean) => {
      try {
         const { error } = await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
         if (error) throw error;
         onBack();
      } catch (error: any) {
         alert("Erreur: " + error.message);
      }
   };

   const handleSavePartner = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const permissions = {
         manage_products: formData.get('manage_products') === 'on',
         view_stats: formData.get('view_stats') === 'on',
         manage_orders: formData.get('manage_orders') === 'on',
         edit_profile: formData.get('edit_profile') === 'on'
      };

      try {
         let partnerId = editingPartner?.id;
         if (editingPartner) {
            const { error } = await supabase.from('partner_accounts').update({
               email,
               ...(password ? { password } : {}),
               permissions
            }).eq('id', editingPartner.id);
            if (error) throw error;
            
            // Delete old access
            const { error: deleteErr } = await supabase.from('partner_store_access').delete().eq('partner_id', editingPartner.id);
            if (deleteErr) {
               console.warn('Warning during old access deletion:', deleteErr);
            }
         } else {
            // Créer le partenaire
            const { data, error } = await supabase.from('partner_accounts').insert([{
               email,
               password,
               permissions
            }]).select();

            if (error) throw error;

            // ✅ Si select() ne retourne rien, fetch par email
            if (!data || data.length === 0) {
               console.warn('⚠️ INSERT.select() vide, recherche par email...');
               const { data: searchDataArray, error: searchError } = await supabase
                  .from('partner_accounts')
                  .select('id')
                  .eq('email', email);
               const searchData = Array.isArray(searchDataArray) ? searchDataArray[0] : searchDataArray;

               if (searchError || !searchData) {
                  throw new Error('❌ Partenaire non créé: ' + (searchError?.message || 'Email non trouvé'));
               }
               partnerId = searchData?.id;
               console.log('✅ Partenaire trouvé par email:', { id: partnerId, email });
            } else {
               partnerId = data[0].id;
               console.log('✅ Partenaire créé avec select():', { id: partnerId, email });
            }
         }

         if (partnerId && selectedPartnerStores.length > 0) {
            const accessEntries = selectedPartnerStores.map(sid => ({
               partner_id: partnerId,
               store_id: sid
            }));
            const { error: accessError } = await supabase.from('partner_store_access').insert(accessEntries);
            if (accessError) {
               // If it's a foreign key constraint issue (usually related to the audit trigger), log it but don't break the whole flow if the partner was updated
               console.error('❌ partner_store_access insert failed:', accessError);
               throw accessError;
            }
            console.log('✅ Accès aux magasins créés:', selectedPartnerStores.length);
         }

         // ✅ Mise à jour IMMÉDIATE du state pour affichage instant
         if (!editingPartner && partnerId) {
            const newPartner = {
               id: partnerId,
               email,
               permissions,
               is_active: true,
               created_at: new Date().toISOString()
            };
            setPartnerAccounts(prev => [newPartner, ...prev]);
            console.log('✅ Partenaire ajouté au state:', newPartner);
         }

         // ✅ Fermer la modale et rafraîchir complet via onBack()
         setShowAddPartnerAccount(false);
         setEditingPartner(null);
         setSelectedPartnerStores([]);
         console.log('✅ Appel de onBack() pour sync complète...');
         setTimeout(() => onBack(), 500);  // Petit délai pour voir l'ajout immédiat
      } catch (err: any) {
         console.error('❌ Error saving partner:', err);
         alert('Erreur lors de la sauvegarde du partenaire: ' + (err.message || JSON.stringify(err)));
      }
   };

   const handleDeletePartner = async (id: string) => {
      if (!confirm('Supprimer ce compte partenaire ?')) return;
      try {
         // Supprimer d'abord les liaisons FK vers ce partenaire
         const { error: accessErr } = await supabase.from('partner_store_access').delete().eq('partner_id', id);
         if (accessErr) {
            alert('Erreur suppression partenaire (liaisons stores): ' + accessErr.message);
            return;
         }

         const { error } = await supabase.from('partner_accounts').delete().eq('id', id);
         if (error) {
            alert('Erreur suppression partenaire: ' + error.message);
            return;
         }
         onBack();
      } catch (err: any) {
         alert('Erreur suppression partenaire: ' + (err?.message || 'Inconnue'));
      }
   };

   const handleTogglePartner = async (id: string, current: boolean) => {
      const { error } = await supabase.from('partner_accounts').update({ is_active: !current }).eq('id', id);
      if (error) console.error(error);
      else onBack();
   };

   const generateRandomCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
         code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
   };

   useEffect(() => {
      const adminData = localStorage.getItem('veetaa_admin_token');
      if (adminData) {
         try {
            const parsed = JSON.parse(adminData);
            if (parsed && typeof parsed === 'object' && 'badge_id' in parsed) {
               delete parsed.badge_id;
               localStorage.setItem('veetaa_admin_token', JSON.stringify(parsed));
            }
            setCurrentAdmin(parsed);
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
         if (import.meta.env.DEV) console.log(`AdminDashboard: deliveryZone synced from props to ${propDeliveryZone}`);
      }
      if (typeof propDeliveryFeePerKm !== 'undefined') {
         setFeePerKm(propDeliveryFeePerKm);
         if (import.meta.env.DEV) console.log(`AdminDashboard: feePerKm synced from props to ${propDeliveryFeePerKm}`);
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
            const { data: dataArray, error } = await supabase
               .from('orders')
               .select('store_invoice_base64, prescription_base64, payment_receipt_base64, text_order_notes, delivery_note')
               .eq('id', parseInt(selectedOrder.id));
            const data = Array.isArray(dataArray) ? dataArray[0] : dataArray;
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
   const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
   const [productSortOrder, setProductSortOrder] = useState<'newest' | 'oldest' | 'name' | 'price'>('newest');
   const [storeFilter, setStoreFilter] = useState('all');
   const [storeOptionsFilter, setStoreOptionsFilter] = useState<{ is_featured?: boolean; is_new?: boolean; has_products?: boolean }>({});
   const [storeZoneFilter, setStoreZoneFilter] = useState<string>('all');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(15);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

   // Balance filter for drivers (24H, 2J, 3J, 4J, 5J, 7J)
   const [balanceRange, setBalanceRange] = useState<'24H' | '2J' | '3J' | '4J' | '5J' | '7J'>('24H');
   // Commission rate per driver (stored in localStorage)
   const [driverCommissions, setDriverCommissions] = useState<Record<string, number>>(() => {
      try { return JSON.parse(localStorage.getItem('veetaa_driver_commissions') || '{}'); } catch { return {}; }
   });
   const updateDriverCommission = (driverId: string, rate: number) => {
      const updated = { ...driverCommissions, [driverId]: Math.min(100, Math.max(0, rate)) };
      setDriverCommissions(updated);
      localStorage.setItem('veetaa_driver_commissions', JSON.stringify(updated));
   };

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
   const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
   const [showAddZone, setShowAddZone] = useState(false);
   const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
   const [newZoneForm, setNewZoneForm] = useState({ name: '', radius_km: 25, center_lat: 0, center_lng: 0 });
   const [showDeleteZoneModal, setShowDeleteZoneModal] = useState(false);
   const [zoneDeleteTarget, setZoneDeleteTarget] = useState<DeliveryZone | null>(null);
   const [zoneDeleteChoices, setZoneDeleteChoices] = useState<Array<{ id: string; name: string }>>([]);
   const [zoneDeleteLinkedCount, setZoneDeleteLinkedCount] = useState(0);
   const [zoneDeleteReplacementId, setZoneDeleteReplacementId] = useState('');
   const [zoneDeleteLoading, setZoneDeleteLoading] = useState(false);
   const [zoneDeleteError, setZoneDeleteError] = useState<string | null>(null);

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

   // Keep selectedOrder in sync with propOrders — sans écraser facture / PJ chargées via fetch dédié ou état précédent
   useEffect(() => {
      if (!selectedOrder?.id) return;
      const updatedOrder = propOrders.find(o => o.id === selectedOrder.id);
      if (!updatedOrder) return;
      if (updatedOrder.items?.length !== selectedOrder.items?.length) {
         if (import.meta.env.DEV) {
            console.log('📦 [AdminDashboard] Items count changed for order:', updatedOrder.id, 'from', selectedOrder.items?.length, 'to', updatedOrder.items?.length);
         }
      }
      setSelectedOrder(prev => {
         if (!prev || prev.id !== updatedOrder.id) return prev;
         return {
            ...updatedOrder,
            store_invoice_base64: updatedOrder.store_invoice_base64 ?? prev.store_invoice_base64,
            prescription_base64: updatedOrder.prescription_base64 ?? prev.prescription_base64,
            payment_receipt_base64: updatedOrder.payment_receipt_base64 ?? prev.payment_receipt_base64,
            deliveryNote: updatedOrder.deliveryNote ?? prev.deliveryNote,
            statusHistory:
               updatedOrder.statusHistory && updatedOrder.statusHistory.length > 0
                  ? updatedOrder.statusHistory
                  : prev.statusHistory,
         };
      });
   }, [propOrders, selectedOrder?.id]);

   /** Magasins « type produits » (catalogue) liés à la commande — seuls affichés sur la carte logistique. */
   const orderLogisticsMapStores = useMemo(() => {
      if (!selectedOrder) return [];
      return getOrderLogisticsMapStores(selectedOrder, stores);
   }, [selectedOrder, stores]);

   /** Points pour cadrer la carte : client + livreur + magasins produits géolocalisés de la commande. */
   const logisticsOrderMapBoundsPoints = useMemo((): [number, number][] => {
      if (!selectedOrder?.location?.lat || selectedOrder.location.lng == null) return [];
      const clat = Number(selectedOrder.location.lat);
      const clng = Number(selectedOrder.location.lng);
      if (Number.isNaN(clat) || Number.isNaN(clng)) return [];
      const pts: [number, number][] = [[clat, clng]];
      const driver = drivers.find(d => d.id === selectedOrder.assignedDriverId);
      if (driver) {
         const dLat = (driver as { latitude?: number }).latitude ?? driver.lastLat ?? driver.last_lat;
         const dLng = (driver as { longitude?: number }).longitude ?? driver.lastLng ?? driver.last_lng;
         if (dLat != null && dLng != null) {
            const dla = Number(dLat);
            const dln = Number(dLng);
            if (!Number.isNaN(dla) && !Number.isNaN(dln)) pts.push([dla, dln]);
         }
      }
      for (const store of orderLogisticsMapStores) {
         const c = getStoreLatLngForMap(store);
         if (c) pts.push(c);
      }
      return pts;
   }, [selectedOrder?.id, selectedOrder?.location?.lat, selectedOrder?.location?.lng, selectedOrder?.assignedDriverId, drivers, orderLogisticsMapStores]);

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
      setShowAddStore(true);
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
   const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
   const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '', email: '' });
   const [showAddRIB, setShowAddRIB] = useState(false);
   const [editingRIB, setEditingRIB] = useState<RIB | null>(null);
   const [showAddSocialLink, setShowAddSocialLink] = useState(false);
   const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(null);
   const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

   const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
   const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
   const [adminsPage, setAdminsPage] = useState(1);
   const adminsPerPage = 10;
   const [newAdminForm, setNewAdminForm] = useState({
      username: '',
      badge_id: '',
      is_active: true,
      permissions: {
         // Permissions d'actions
         viewOrders: false,
         manageUsers: false,
         manageDrivers: false,
         editProducts: false,
         editStores: false,
         viewReports: false,
         manageAdmins: false,
         manageSettings: false,
         // Accès aux pages additionnelles
         accessPromo: false,
         accessMaps: false,
         accessHistory: false,
         accessFinance: false,
         accessStatistics: false,
         accessCategories: false,
         accessPartnersManagement: false,
         accessSupport: false
      }
   });
   const [loadingAdmins, setLoadingAdmins] = useState(false);
   const [adminsList, setAdminsList] = useState<any[]>([]);
   const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);

   // =========================
   // Admins "en ligne" (presence)
   // =========================
   const ONLINE_TTL_MS = 60_000; // considéré "en ligne" si dernière activité <= 60s
   const PRESENCE_HEARTBEAT_MS = 20_000; // refresh présence toutes les ~20s
   type OnlineAdminRow = { username: string; role: string; last_seen_at: string };
   const [adminsOnline, setAdminsOnline] = useState<OnlineAdminRow[]>([]);
   const [loadingAdminsOnline, setLoadingAdminsOnline] = useState(false);
   const [presenceDisabled, setPresenceDisabled] = useState(false); // évite le spam console si table admin_presence manque
   const visibleAdmins = React.useMemo(() => {
      const start = (adminsPage - 1) * adminsPerPage;
      return adminsList.slice(start, start + adminsPerPage);
   }, [adminsList, adminsPage]);
   const [showAddAdmin, setShowAddAdmin] = useState(false);

   // Support Tickets & Messages
   const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
   const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
   const [replyText, setReplyText] = useState('');
   const [replySubmitting, setReplySubmitting] = useState(false);
   const replyInputRef = useRef<HTMLInputElement | null>(null);
   const [replyHasText, setReplyHasText] = useState(false);
   const [supportFilter, setSupportFilter] = useState<'all' | 'pending' | 'resolved'>('all');
   const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
   const messagesEndRef = useRef<HTMLDivElement | null>(null);

   // New Realtime Chat
   const [showChatWidget, setShowChatWidget] = useState(false);
   const [chatRoom, setChatRoom] = useState<'general' | 'direct'>('general');
   const [chatDirectTarget, setChatDirectTarget] = useState<any>(null);
   const [chatMessages, setChatMessages] = useState<any[]>([]);
   const [chatUsers, setChatUsers] = useState<any[]>([]);
   const [chatInput, setChatInput] = useState('');
   const [chatLoading, setChatLoading] = useState(false);
   const [chatSending, setChatSending] = useState(false);
   const [chatUnreadCount, setChatUnreadCount] = useState(0);
   const chatEndRef = useRef<HTMLDivElement | null>(null);
   const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
   const chatRoomRef = useRef(chatRoom);
   const chatDirectTargetRef = useRef(chatDirectTarget);
   const currentAdminChatRef = useRef(currentAdmin);
   const showChatWidgetRef = useRef(showChatWidget);
   /** ID de la room actuellement affichée — utilisé pour filtrer le realtime et éviter les races. */
   const activeRoomIdRef = useRef<string | null>(null);
   /** Token incrémental pour ignorer les fetchs obsolètes en cas de switch rapide. */
   const chatLoadTokenRef = useRef(0);
   /** Indique si l'utilisateur est en bas du fil — pour ne pas le téléporter quand il lit l'historique. */
   const chatStickToBottomRef = useRef(true);
   chatRoomRef.current = chatRoom;
   chatDirectTargetRef.current = chatDirectTarget;
   currentAdminChatRef.current = currentAdmin;
   showChatWidgetRef.current = showChatWidget;

   // ========== UTILITY FUNCTIONS ==========
   const showNotification = (title: string, body: string) => {
      // Simple toast notification using browser alert or you can implement a proper toast UI
      console.log(`${title}: ${body}`);
      // In production, integrate with a toast library like react-toastify or sonner
   };

   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };

   useEffect(() => {
      scrollToBottom();
   }, [supportMessages]);

   // ========== ADMIN MANAGEMENT FUNCTIONS ==========
   const fetchAdmins = async () => {
      try {
         setLoadingAdmins(true);
         const { data, error } = await supabase.rpc('admin_accounts_list_v1');

         if (error) throw error;
         setAdminsList(Array.isArray(data) ? data : []);
      } catch (err) {
         console.error('Erreur lors du chargement des admins:', err);
         showNotification('Erreur', 'Impossible de charger les admins');
      } finally {
         setLoadingAdmins(false);
      }
   };

   const fetchOnlineAdmins = useCallback(async () => {
      if (presenceDisabled) return;
      try {
         setLoadingAdminsOnline(true);
         const cutoffIso = new Date(Date.now() - ONLINE_TTL_MS).toISOString();
         const { data, error } = await supabase
            .from('admin_presence')
            .select('username, role, last_seen_at')
            .gte('last_seen_at', cutoffIso)
            .order('last_seen_at', { ascending: false });

         if (error) throw error;
         setAdminsOnline(Array.isArray(data) ? (data as OnlineAdminRow[]) : []);
      } catch (err: any) {
         const code = String(err?.code || '');
         const msg = String(err?.message || '').toLowerCase();
         if (code === 'PGRST205' || msg.includes('could not find the table')) {
            setPresenceDisabled(true);
            return;
         }
         console.error('Erreur fetch admins en ligne:', err);
      } finally {
         setLoadingAdminsOnline(false);
      }
   }, [ONLINE_TTL_MS, presenceDisabled, supabase]);

   const touchAdminPresence = useCallback(async () => {
      if (presenceDisabled) return;
      try {
         if (!currentAdmin?.username) return;
         const role = currentAdmin?.role || adminRole;
         if (!role) return;
         const nowIso = new Date().toISOString();

         const { error } = await supabase
            .from('admin_presence')
            .upsert(
               { username: String(currentAdmin.username), role: String(role), last_seen_at: nowIso },
               { onConflict: 'username' }
            );

         if (error) throw error;
      } catch (err) {
         const code = String((err as any)?.code || '');
         const msg = String((err as any)?.message || '').toLowerCase();
         if (code === 'PGRST205' || msg.includes('could not find the table')) {
            setPresenceDisabled(true);
            return;
         }
         console.error('Erreur touch admin_presence:', err);
      }
   }, [currentAdmin?.username, currentAdmin?.role, adminRole, presenceDisabled]);

   // Heartbeat : on ne l'active que sur l'onglet ADMINS pour éviter des requêtes réseau
   // et des re-renders inutiles quand l'admin est sur d'autres pages.
   useEffect(() => {
      if (!currentAdmin?.username || presenceDisabled) return;
      if (activeTab !== 'ADMINS') return;

      let cancelled = false;
      const tick = async () => {
         if (cancelled) return;
         await touchAdminPresence();
      };

      void tick();
      const id = window.setInterval(() => void tick(), PRESENCE_HEARTBEAT_MS);
      return () => {
         cancelled = true;
         window.clearInterval(id);
      };
   }, [activeTab, currentAdmin?.username, touchAdminPresence, presenceDisabled]);

   // Refresh liste "en ligne" quand on est dans l’onglet ADMINS.
   useEffect(() => {
      if (activeTab !== 'ADMINS' || presenceDisabled) return;
      let cancelled = false;

      const tick = async () => {
         if (cancelled) return;
         await fetchOnlineAdmins();
      };

      void tick();
      const id = window.setInterval(() => void tick(), 15_000);
      return () => {
         cancelled = true;
         window.clearInterval(id);
      };
   }, [activeTab, fetchOnlineAdmins, presenceDisabled]);

   const resetAdminForm = () => {
      setEditingAdmin(null);
      setShowAddAdmin(false);
      setNewAdminForm({
         username: '',
         badge_id: '',
         is_active: true,
         permissions: {
            viewOrders: false,
            manageUsers: false,
            manageDrivers: false,
            editProducts: false,
            editStores: false,
            viewReports: false,
            manageAdmins: false,
            manageSettings: false,
            accessPromo: false,
            accessMaps: false,
            accessHistory: false,
            accessFinance: false,
            accessStatistics: false,
            accessCategories: false,
            accessPartnersManagement: false,
            accessSupport: false
         }
      });
   };

   const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();

      const username = newAdminForm.username.trim();
      const badge = newAdminForm.badge_id.trim();
      if (!username) {
         showNotification('Erreur', 'Le nom utilisateur est requis');
         return;
      }

      if (!editingAdmin && !badge) {
         showNotification('Erreur', 'Le badge ID est requis pour créer un admin');
         return;
      }

      try {
         setLoadingAdmins(true);
         const { data, error } = await supabase.rpc('admin_accounts_upsert_v1', {
            p_id: editingAdmin?.id ?? null,
            p_username: username,
            p_badge_id: badge || null,
            p_permissions: newAdminForm.permissions,
            p_is_active: newAdminForm.is_active,
            p_created_by: adminRole === 'super_admin' ? 'super_admin' : 'admin',
         });

         if (error) {
            console.error('Erreur RPC admin_accounts_upsert_v1:', error);
            showNotification('Erreur', 'Impossible de sauvegarder l\'admin');
            return;
         }

         const row = Array.isArray(data) ? data[0] : null;
         if (!row?.ok) {
            if (row?.reason === 'username_exists') {
               showNotification('Erreur', 'Cet identifiant d\'admin existe déjà');
            } else if (row?.reason === 'missing_badge_for_create') {
               showNotification('Erreur', 'Le badge ID est requis pour la création');
            } else if (row?.reason === 'not_found') {
               showNotification('Erreur', 'Admin introuvable');
            } else {
               showNotification('Erreur', 'Échec de la sauvegarde admin');
            }
            return;
         }

         showNotification(
            'Succès',
            editingAdmin
               ? `Admin "${username}" mis à jour avec succès`
               : `Admin "${username}" créé avec succès`
         );

         // Réinitialiser le formulaire
         setNewAdminForm({
            username: '',
            badge_id: '',
            is_active: true,
            permissions: {
               viewOrders: false,
               manageUsers: false,
               manageDrivers: false,
               editProducts: false,
               editStores: false,
               viewReports: false,
               manageAdmins: false,
               manageSettings: false,
               accessPromo: false,
               accessMaps: false,
               accessHistory: false,
               accessFinance: false,
               accessStatistics: false,
               accessCategories: false,
               accessPartnersManagement: false,
               accessSupport: false
            }
         });

         setShowAddAdmin(false);

         // Recharger la liste
         fetchAdmins();
      } catch (err) {
         console.error('Erreur création admin:', err);
         showNotification('Erreur', 'Erreur lors de la création de l\'admin');
      } finally {
         setLoadingAdmins(false);
      }
   };

   const handleEditAdmin = (admin: any) => {
      setEditingAdmin(admin);
      setShowAddAdmin(true);
      setNewAdminForm({
         username: admin.username || '',
         // Le badge n'est jamais renvoyé par l'API sécurisée : vide = ne pas modifier.
         badge_id: '',
         is_active: admin.is_active ?? true,
         permissions: {
            ...newAdminForm.permissions,
            ...admin.permissions
         }
      });
   };

   const handleDeleteAdmin = async (id: string) => {
      if (!window.confirm('Confirmer la suppression de cet admin ?')) return;
      try {
         setAdminActionLoading(id);
         const { data, error } = await supabase.rpc('admin_accounts_delete_v1', { p_id: id });
         if (error) {
            console.error('Erreur suppression admin:', error);
            showNotification('Erreur', 'Impossible de supprimer l\'admin');
            return;
         }
         const row = Array.isArray(data) ? data[0] : null;
         if (!row?.ok) {
            showNotification('Erreur', row?.reason === 'not_found' ? 'Admin introuvable' : 'Suppression refusée');
            return;
         }
         showNotification('Succès', 'Admin supprimé avec succès');
         fetchAdmins();
      } catch (err) {
         console.error('Erreur suppression admin:', err);
         showNotification('Erreur', 'Erreur lors de la suppression de l\'admin');
      } finally {
         setAdminActionLoading(null);
      }
   };

   // Charger les admins quand l'onglet ADMINS s'affiche
   useEffect(() => {
      if (activeTab === 'ADMINS' && adminRole === 'super_admin') {
         fetchAdmins();
      }
   }, [activeTab, adminRole]);

   const fetchData = async () => {
      try {
         const { data: catData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
         if (catData) setDbCategories(catData);

         const { data: ribsData } = await supabase.from('ribs').select('*').order('id', { ascending: true });
         if (ribsData) setRibs(ribsData);
         const { data: slData } = await supabase.from('social_links').select('*').order('display_order', { ascending: true });
         if (slData) setSocialLinks(slData);

         const { data: supportInfoData } = await supabase.from('support_info').select('*').limit(1);
         if (supportInfoData && supportInfoData.length > 0) {
            setSupportInfo(supportInfoData[0]);
            setSupportNumber(supportInfoData[0].phone);
         }

         const { data: ticketsData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
         if (ticketsData) setSupportTickets(ticketsData);

         // Charger les zones de livraison
         const { data: zonesData } = await supabase.from('delivery_zones').select('*').order('name', { ascending: true });
         if (zonesData) setDeliveryZones(zonesData);
      } catch (err) {
         console.error("Erreur fetchData:", err);
      }
   };

   // Gestion des zones de livraison
   const handleCreateZone = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newZoneForm.name.trim()) return;

      const zoneData = {
         name: newZoneForm.name.trim(),
         radius_km: newZoneForm.radius_km,
         center_lat: newZoneForm.center_lat,
         center_lng: newZoneForm.center_lng,
         is_active: true
      };

      try {
         if (editingZone) {
            const { error } = await supabase.from('delivery_zones').update(zoneData).eq('id', editingZone.id);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddZone(false);
               setEditingZone(null);
               setNewZoneForm({ name: '', radius_km: 25, center_lat: 0, center_lng: 0 });
               fetchData();
            }
         } else {
            const { error } = await supabase.from('delivery_zones').insert([zoneData]);
            if (error) alert("Erreur: " + error.message);
            else {
               setShowAddZone(false);
               setNewZoneForm({ name: '', radius_km: 25, center_lat: 0, center_lng: 0 });
               fetchData();
            }
         }
      } catch (err) {
         alert("Erreur lors de la création de la zone");
      }
   };

   const handleDeleteZone = async (zoneId: string) => {
      setZoneDeleteLoading(true);
      setZoneDeleteError(null);
      setZoneDeleteReplacementId('');
      const targetZone = deliveryZones.find(z => String(z.id) === String(zoneId)) || null;
      setZoneDeleteTarget(targetZone);
      try {
         const [{ data: linkedStores, error: countErr }, { data: zoneChoices, error: zonesErr }] = await Promise.all([
            supabase.from('stores').select('id').eq('zone_id', zoneId),
            supabase.from('delivery_zones').select('id, name').neq('id', zoneId).order('name', { ascending: true }),
         ]);
         if (countErr) {
            setZoneDeleteError(countErr.message || 'Impossible de vérifier les stores liés.');
            setZoneDeleteLinkedCount(0);
            setZoneDeleteChoices([]);
            setShowDeleteZoneModal(true);
            return;
         }
         if (zonesErr) {
            setZoneDeleteError(zonesErr.message || 'Impossible de charger les villes de remplacement.');
            setZoneDeleteLinkedCount(linkedStores?.length || 0);
            setZoneDeleteChoices([]);
            setShowDeleteZoneModal(true);
            return;
         }
         setZoneDeleteLinkedCount(linkedStores?.length || 0);
         setZoneDeleteChoices((zoneChoices || []).map(z => ({ id: String(z.id), name: String((z as any).name || 'Ville') })));
         setShowDeleteZoneModal(true);
      } catch {
         setZoneDeleteError('Erreur lors de la préparation de la suppression.');
         setZoneDeleteLinkedCount(0);
         setZoneDeleteChoices([]);
         setShowDeleteZoneModal(true);
      } finally {
         setZoneDeleteLoading(false);
      }
   };

   const confirmDeleteZone = async () => {
      if (!zoneDeleteTarget?.id || zoneDeleteLoading) return;
      setZoneDeleteLoading(true);
      setZoneDeleteError(null);
      try {
         if (zoneDeleteLinkedCount > 0) {
            const nextZoneId = zoneDeleteReplacementId || null;
            const { error: relinkErr } = await supabase
               .from('stores')
               .update({ zone_id: nextZoneId })
               .eq('zone_id', zoneDeleteTarget.id);
            if (relinkErr) {
               setZoneDeleteError(relinkErr.message || 'Impossible de réaffecter les stores.');
               return;
            }
         }

         const { error } = await supabase.from('delivery_zones').delete().eq('id', zoneDeleteTarget.id);
         if (error) {
            setZoneDeleteError(error.message || 'Impossible de supprimer la zone.');
            return;
         }

         setShowDeleteZoneModal(false);
         setZoneDeleteTarget(null);
         setZoneDeleteChoices([]);
         setZoneDeleteLinkedCount(0);
         setZoneDeleteReplacementId('');
         setZoneDeleteError(null);
         fetchData();
      } catch {
         setZoneDeleteError('Erreur lors de la suppression de la zone.');
      } finally {
         setZoneDeleteLoading(false);
      }
   };

   const handleEditZone = (zone: DeliveryZone) => {
      setEditingZone(zone);
      setNewZoneForm({ 
         name: zone.name, 
         radius_km: zone.radius_km,
         center_lat: zone.center_lat || 0,
         center_lng: zone.center_lng || 0
      });
      setShowAddZone(true);
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

   const statsTimeRange = useMemo(
      () => getAnalyticsTimeRange(statsPeriod, statsCustomFrom, statsCustomTo),
      [statsPeriod, statsCustomFrom, statsCustomTo]
   );

   const analyticsPeriodLabelStr = useMemo(
      () => analyticsPeriodLabel(statsPeriod, statsCustomFrom, statsCustomTo),
      [statsPeriod, statsCustomFrom, statsCustomTo]
   );

   const ordersInAnalyticsTime = useMemo(
      () => filterOrdersByTime(propOrders, statsTimeRange.start, statsTimeRange.end),
      [propOrders, statsTimeRange.start, statsTimeRange.end]
   );

   const statsStoreOptions = useMemo(() => uniqueStoreNamesInRange(ordersInAnalyticsTime), [ordersInAnalyticsTime]);

   const ordersForAnalytics = useMemo(
      () => filterByStore(ordersInAnalyticsTime, statsStoreFilter),
      [ordersInAnalyticsTime, statsStoreFilter]
   );

   const analyticsSnapshot = useMemo(() => {
      const derived = computeAnalyticsDerived(
         ordersForAnalytics,
         propOrders,
         drivers,
         statsTimeRange.start,
         statsTimeRange.end,
         statsPeriod
      );
      return {
         ...derived,
         periodLabel: analyticsPeriodLabelStr,
         totalOrdersInRange: ordersForAnalytics.length,
      };
   }, [
      ordersForAnalytics,
      propOrders,
      drivers,
      statsTimeRange.start,
      statsTimeRange.end,
      statsPeriod,
      analyticsPeriodLabelStr,
   ]);

   useEffect(() => {
      logAdminSessionOnce();
   }, []);

   useEffect(() => {
      if (statsStoreFilter !== 'all' && !statsStoreOptions.includes(statsStoreFilter)) {
         setStatsStoreFilter('all');
      }
   }, [statsStoreOptions, statsStoreFilter]);

   useEffect(() => {
      if (activeTab !== 'STATISTICS') return;
      let cancelled = false;
      (async () => {
         const fromIso = new Date(statsTimeRange.start).toISOString();
         const toIso = new Date(statsTimeRange.end).toISOString();
         const rows = await fetchAdminLeaderboardTop7(fromIso, toIso);
         if (!cancelled) setAdminLeaderboard(rows);
      })();
      return () => {
         cancelled = true;
      };
   }, [activeTab, statsTimeRange.start, statsTimeRange.end]);

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
   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
   useEffect(() => {
      if (editingCategory) {
         setCategoryImagePreview(editingCategory.image_url || null);
      } else {
         setCategoryImagePreview(null);
      }
   }, [editingCategory]);

   const [showAddSubCategory, setShowAddSubCategory] = useState(false);
   const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);

   // --- Store Sub-Categories (onglets spécifiques par magasin) ---
   const [newStoreSubCatName, setNewStoreSubCatName] = useState('');
   const [isAddingStoreSubCat, setIsAddingStoreSubCat] = useState(false);
   const [productStoreSubCategoryId, setProductStoreSubCategoryId] = useState<string>('');

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
      const anyModalOpen = showAddPartnerAccount || showAddStore || showAddProduct || showAddCategory || showAddRIB || showAddSocialLink || showDeleteStoreModal || showProfileModal || showAddSubCategory;
      if (anyModalOpen) {
         document.body.style.overflow = 'hidden';
      } else {
         document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
   }, [showAddPartnerAccount, showAddStore, showAddProduct, showAddCategory, showAddRIB, showAddSocialLink, showDeleteStoreModal, showProfileModal, showAddSubCategory]);

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
      setProductStoreSubCategoryId('');
      if (editingProduct) {
         setProductFormStoreId((editingProduct as any).store_id || '');
         setProductStoreSubCategoryId((editingProduct as any).store_sub_category_id || '');
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

   // Init store user-visible fields when store modal opens
   useEffect(() => {
      if (!showAddStore) return;
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
   }, [showAddStore, editingStore?.id]);

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
         console.log('🎯 COORDINATES EXTRACTED:', { lat, lng, url });
         setExtractedCoordinates({ lat, lng });

         // Si on édite un magasin existant, sauvegarder automatiquement les coordonnées
         if (editingStore) {
            console.log('🔄 AUTO-SAVING to Supabase for store:', editingStore.id);
            const { error, data: dataArray } = await supabase
               .from('stores')
               .update({
                  latitude: lat,
                  longitude: lng,
                  maps_url: url
               })
               .eq('id', editingStore.id)
               .select();
            const data = Array.isArray(dataArray) ? dataArray[0] : dataArray;

            console.log('💾 AUTO-SAVE RESULT:', {
               hasError: !!error,
               errorMsg: error?.message,
               savedData: data
            });

            if (error) {
               console.error('❌ AUTO-SAVE FAILED:', error);
               setExtractionError('Erreur lors de la sauvegarde : ' + error.message);
            } else {
               // Succès - les coordonnées sont sauvegardées
               console.log('✅ AUTO-SAVE SUCCESS!');
               setExtractionError(null);

               // Mettre à jour l'état local sans recharger la page
               if (setStores) {
                  console.log('📝 Calling setStores callback to update local state');
                  setStores(prevStores => prevStores.map(s =>
                     s.id === editingStore.id
                        ? { ...s, latitude: lat, longitude: lng, maps_url: url }
                        : s
                  ));
               } else {
                  console.warn('⚠️ setStores callback NOT available!');
               }

               // Mettre à jour le magasin en cours d'édition pour refléter les changements
               setEditingStore(prev => prev ? { ...prev, latitude: lat, longitude: lng, maps_url: url } : null);
            }
         }
      } else {
         console.warn('⚠️ Could not extract coordinates from URL:', url);
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
            const { id: _omitId, ...categoryUpdate } = catData;
            const { error } = await supabase.from('categories').update(categoryUpdate).eq('id', editingCategory.id);
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

   const handleCreateStoreSubCategory = async () => {
      if (!editingStore || !newStoreSubCatName.trim()) return;
      setIsAddingStoreSubCat(true);
      const catId = editingStore.category_id || (editingStore as any).category || '';
      const { data, error } = await supabase
         .from('store_sub_categories')
         .insert([{ name: newStoreSubCatName.trim(), category_id: catId, store_id: editingStore.id }])
         .select()
         .single();
      if (error) {
         alert('Erreur : ' + error.message);
      } else if (data) {
         setStoreSubCategories(prev => [...prev, data]);
         setNewStoreSubCatName('');
      }
      setIsAddingStoreSubCat(false);
   };

   const handleDeleteStoreSubCategory = (id: string) => {
      const sc = storeSubCategories.find(s => s.id === id);
      setDeleteStoreSubCatId(id);
      setDeleteStoreSubCatName((sc as any)?.name || '');
      setShowDeleteStoreSubCatModal(true);
   };

   const confirmDeleteStoreSubCategory = async () => {
      if (!deleteStoreSubCatId) return;
      const { error } = await supabase.from('store_sub_categories').delete().eq('id', deleteStoreSubCatId);
      if (error) { alert('Erreur : ' + error.message); return; }
      setStoreSubCategories(prev => prev.filter(sc => sc.id !== deleteStoreSubCatId));
      setShowDeleteStoreSubCatModal(false);
      setDeleteStoreSubCatId(null);
      setDeleteStoreSubCatName('');
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
      setDeleteSubCatLoading(true);
      setDeleteSubCatError(null);
      setDeleteSubCatReplacement('');
      try {
         // 1) Charger la sous-catégorie cible pour connaître sa catégorie
         const { data: targetSub, error: targetErr } = await supabase
            .from('sub_categories')
            .select('id, name, category_id')
            .eq('id', id)
            .single();
         if (targetErr) {
            setDeleteSubCatError(targetErr.message);
            setShowDeleteSubCatModal(true);
            return;
         }

         // 2) Vérifier les produits liés
         const [{ data: linkedProducts, error: linkedErr }, { data: choicesData, error: choicesErr }] = await Promise.all([
            supabase.from('products').select('id').eq('sub_category_id', id),
            supabase.from('sub_categories').select('id, name').eq('category_id', (targetSub as any).category_id).neq('id', id).order('name', { ascending: true })
         ]);

         if (linkedErr) { setDeleteSubCatError(linkedErr.message); setShowDeleteSubCatModal(true); return; }

         setDeleteSubCatTarget({ id, name: (targetSub as any).name || id });
         setDeleteSubCatLinkedCount(linkedProducts?.length || 0);
         setDeleteSubCatChoices((choicesData || []) as Array<{ id: string; name: string }>);
         setShowDeleteSubCatModal(true);
      } catch {
         setDeleteSubCatError('Erreur lors de la préparation.');
         setShowDeleteSubCatModal(true);
      } finally {
         setDeleteSubCatLoading(false);
      }
   };

   const confirmDeleteSubCategory = async () => {
      if (!deleteSubCatTarget || deleteSubCatLoading) return;
      setDeleteSubCatLoading(true);
      setDeleteSubCatError(null);
      try {
         const linkedCount = deleteSubCatLinkedCount;
         if (linkedCount > 0) {
            const replacementId = deleteSubCatReplacement || null;
            const { error: reassignErr } = await supabase
               .from('products')
               .update({ sub_category_id: replacementId })
               .eq('sub_category_id', deleteSubCatTarget.id);
            if (reassignErr) { setDeleteSubCatError(reassignErr.message); return; }
         }

         const { error } = await supabase.from('sub_categories').delete().eq('id', deleteSubCatTarget.id);
         if (error) { setDeleteSubCatError(error.message); return; }

         setShowDeleteSubCatModal(false);
         setDeleteSubCatTarget(null);
         setDeleteSubCatLinkedCount(0);
         setDeleteSubCatChoices([]);
         setDeleteSubCatReplacement('');
         setDeleteSubCatError(null);
         onBack();
      } catch {
         setDeleteSubCatError('Erreur lors de la suppression.');
      } finally {
         setDeleteSubCatLoading(false);
      }
   };


   const handleCreateProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmittingProduct) return;
      setIsSubmittingProduct(true);
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      let productImageURL = editingProduct ? (editingProduct as any).image : (formData.get('image_url') as string);
      let additionalImageURLs: string[] = [];

      try {
         // Upload Main Image (Compressed)
         if (productImagePreview && productImagePreview.startsWith('data:')) {
            const blob = await compressImageBase64(productImagePreview);
            const fileName = `product_${Date.now()}.jpg`;
            const { data, error: uploadError } = await supabase.storage.from('products').upload(fileName, blob);
            if (uploadError) {
               alert(`Erreur upload produit : ${uploadError.message}`);
               setIsSubmittingProduct(false);
               return;
            }
            if (data) {
               productImageURL = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
            }
         }

         // Upload Additional Images (Compressed & Parallel)
         if (productAdditionalImages.length > 0) {
            const existingImages = productAdditionalImages.filter(img => !img.startsWith('data:'));
            additionalImageURLs = [...existingImages];

            const newImages = productAdditionalImages.filter(img => img.startsWith('data:'));

            const uploadPromises = newImages.map(async (imgBase64) => {
               const blob = await compressImageBase64(imgBase64);
               const fileName = `prod_extra_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
               const { data, error: uploadError } = await supabase.storage.from('products').upload(fileName, blob);
               if (!uploadError && data) {
                  return supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
               }
               return null;
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            additionalImageURLs.push(...uploadedUrls.filter((url): url is string => url !== null));
         }

         const visibleFields = USER_UI_FIELD_KEYS.filter(k => productUserVisible[k] !== false);
         const fieldLabels: Record<string, string> = {};
         USER_UI_FIELD_KEYS.forEach(k => {
            const formKey = `product_label_${k}`;
            const formVal = String(formData.get(formKey) || '');
            const v = formVal?.trim() || (productUserLabels[k]?.trim() || '');
            if (v) fieldLabels[k] = v;
         });
         // budget_label: champ spécial pour personnaliser le libellé (titre) du budget dans l'app
         const productBudgetLabel = String(formData.get('product_label_budget_label') || '').trim()
            || (productUserLabels['budget_label']?.trim() || '');
         if (productBudgetLabel) fieldLabels['budget_label'] = productBudgetLabel;
         const selectedStoreSubCatId = productStoreSubCategoryId || (editingProduct as any)?.store_sub_category_id || null;
         const prodData: Record<string, any> = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            store_id: formData.get('store_id') as string,
            image_url: productImageURL,
            description: formData.get('description') as string,
            price_editable: formData.get('price_editable') === 'on',
            product_images: additionalImageURLs,
            user_visible_fields: visibleFields,
            user_field_labels: Object.keys(fieldLabels).length ? fieldLabels : {},
            store_sub_category_id: selectedStoreSubCatId || null,
         };

         if (editingProduct) {
            const { data: extProdArray, error } = await supabase.from('products').update(prodData).eq('id', editingProduct.id).select();
            const extProd = Array.isArray(extProdArray) ? extProdArray[0] : extProdArray;
            if (error) alert("Erreur: " + error.message);
            else if (extProd) {
               logAdminActivity('product_update');
               setStores(prev => prev.map(s => String(s.id) === String(prodData.store_id)
                  ? { ...s, products: s.products?.map(p => p.id === extProd.id ? extProd : p) }
                  : s
               ));
               setShowAddProduct(false);
               setEditingProduct(null);
               setProductImagePreview(null);
               setProductAdditionalImages([]);
               onBack();
            }
         } else {
            const { data: extProdArray, error } = await supabase.from('products').insert([prodData]).select();
            const extProd = Array.isArray(extProdArray) ? extProdArray[0] : extProdArray;
            if (error) alert("Erreur: " + error.message);
            else if (extProd) {
               logAdminActivity('product_create');
               setStores(prev => prev.map(s => String(s.id) === String(prodData.store_id)
                  ? { ...s, products: [extProd, ...(s.products || [])] }
                  : s
               ));
               setShowAddProduct(false);
               setProductImagePreview(null);
               setProductAdditionalImages([]);
               onBack();
            }
         }
      } catch (err) {
         console.error(err);
         alert("Erreur lors de la création du produit");
      } finally {
         setIsSubmittingProduct(false);
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
            warns: driverWarns,
            zone_id: (formData.get('zone_id') as string) || null,
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
            // ✅ ID unique avec timestamp + random
            const uniqueId = "LIV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
            
            // ✅ Vérifier si le téléphone existe déjà
            const phone = driverData.phone;
            const { data: existingDriver, error: checkError } = await supabase
               .from('drivers')
               .select('id, phone')
               .eq('phone', phone)
               .maybeSingle();
            
            if (checkError) {
               console.error("Erreur vérification téléphone:", checkError);
            }
            
            if (existingDriver) {
               alert("❌ Un livreur avec ce numéro de téléphone existe déjà !\n\nTéléphone: " + phone);
               return;
            }
            
            const newDriver = {
               ...driverData,
               id: uniqueId,
            };
            
            const { error } = await supabase.from('drivers').insert([newDriver]);
            if (error) {
               console.error("Erreur insertion driver:", error);
               if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
                  alert("❌ Ce numéro de téléphone existe déjà !");
               } else {
                  alert("❌ Erreur: " + (error.message || "Problème lors de la création"));
               }
            } else {
               setShowAddDriver(false);
               setEditingDriver(null);
               setDriverWarns(0);
               setDriverProfileImage(null);
               setDriverDocs([]);
               onBack();
            }
         }
      } catch (err) {
         console.error("handleCreateDriver ERROR:", err);
         alert("Une erreur est survenue: " + (err as any)?.message);
      }
   };



   const handleDeleteCategory = (id: string) => {
      const cat = filteredCategories.find((c: any) => c.id === id);
      setDeleteCategoryTarget({ id, name_fr: (cat as any)?.name_fr || id });
      setShowDeleteCategoryModal(true);
   };

   const confirmDeleteCategory = async () => {
      if (!deleteCategoryTarget || deleteCategoryLoading) return;
      setDeleteCategoryLoading(true);
      try {
         // Sécuriser les FK produits -> sous-catégories de cette catégorie
         const { data: subRows, error: subErr } = await supabase
            .from('sub_categories')
            .select('id')
            .eq('category_id', deleteCategoryTarget.id);
         if (subErr) throw new Error(subErr.message);

         const subIds = (subRows || []).map((r: any) => r.id).filter(Boolean);
         if (subIds.length > 0) {
            const { error: detachErr } = await supabase
               .from('products')
               .update({ sub_category_id: null })
               .in('sub_category_id', subIds);
            if (detachErr) throw new Error(detachErr.message);
         }

         const { error } = await supabase.from('categories').delete().eq('id', deleteCategoryTarget.id);
         if (error) throw new Error(error.message);

         setShowDeleteCategoryModal(false);
         setDeleteCategoryTarget(null);
         fetchData();
      } catch (err: any) {
         alert("Erreur suppression catégorie: " + (err?.message || 'Inconnue'));
      } finally {
         setDeleteCategoryLoading(false);
      }
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

         // 3. Suppressions en chaîne (ordre FK) — ne pas lancer stores.delete en parallèle
         // des produits/favoris, sinon violation de clé étrangère et rollback UI.
         (async () => {
            const rollback = () => setStores(prev => [prevStore, ...prev]);
            const sid = storeIdToDelete;

            try {
               const { error: eProd } = await supabase.from('products').delete().eq('store_id', sid);
               if (eProd) {
                  rollback();
                  alert(`Erreur suppression marque (produits): ${eProd.message}`);
                  return;
               }

               const { error: eFav } = await supabase.from('favorites').delete().eq('store_id', sid);
               if (eFav) {
                  rollback();
                  alert(`Erreur suppression marque (favoris): ${eFav.message}`);
                  return;
               }

               const { error: eAudit } = await supabase.from('partner_store_access_audit').delete().eq('store_id', sid);
               if (eAudit) {
                  rollback();
                  alert(`Erreur suppression marque (audit partenaires): ${eAudit.message}`);
                  return;
               }

               const { error: ePsa } = await supabase.from('partner_store_access').delete().eq('store_id', sid);
               if (ePsa) {
                  rollback();
                  alert(`Erreur suppression marque (accès partenaires): ${ePsa.message}`);
                  return;
               }

               const { error: eOrd } = await supabase.from('orders').update({ store_id: null }).eq('store_id', sid);
               if (eOrd) {
                  rollback();
                  alert(`Erreur suppression marque (commandes): ${eOrd.message}`);
                  return;
               }

               const { error: eStore } = await supabase.from('stores').delete().eq('id', sid);
               if (eStore) {
                  rollback();
                  alert(`Erreur suppression marque: ${eStore.message}`);
                  return;
               }

               console.info('Store deleted (background):', sid);
            } catch (bgErr) {
               console.error('Background deletion error', bgErr);
               rollback();
               alert('Erreur lors de la suppression en arrière-plan: ' + (bgErr instanceof Error ? bgErr.message : 'Inconnu'));
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
         setLocalDrivers(prev => prev.filter(d => d.id !== id));

         // Détacher d'abord les commandes assignées au livreur
         const { error: detachErr } = await supabase
            .from('orders')
            .update({ assigned_driver_id: null })
            .eq('assigned_driver_id', id);
         if (detachErr) throw detachErr;

         const { error } = await supabase.from('drivers').delete().eq('id', id);
         if (error) {
            // Rollback
            const { data } = await supabase.from('drivers').select('*');
            if (data) setLocalDrivers(data as Driver[]);
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

         // Détacher les références connues avant suppression pour éviter les FK blockers
         // 1) order_items.product_id -> null (si table/colonne existent)
         {
            const { error: detachOrderItemErr } = await supabase
               .from('order_items')
               .update({ product_id: null })
               .eq('product_id', id);
            if (detachOrderItemErr && !['PGRST205', '42P01', 'PGRST204'].includes(String(detachOrderItemErr.code || ''))) {
               throw detachOrderItemErr;
            }
         }
         // 2) favorites.product_id -> delete rows (si table/colonne existent)
         {
            const { error: favErr } = await supabase
               .from('favorites')
               .delete()
               .eq('product_id', id);
            if (favErr && !['PGRST205', '42P01', 'PGRST204'].includes(String(favErr.code || ''))) {
               throw favErr;
            }
         }

         const { error } = await supabase.from('products').delete().eq('id', id);
         if (error) {
            await onBack();
            alert("Erreur: " + error.message);
            return;
         }
      } catch (err) {
         try {
            await onBack();
         } catch (e) {
            console.error('Rollback failed', e);
         }
         alert("Erreur: " + (err instanceof Error ? err.message : "Inconnu"));
      } finally {
         setIsDeleting(false);
      }
   }, [setStores, onBack]);

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
         logAdminActivity(`order_status:${newStatus}`);
         onUpdateStatus(id, newStatus);
      }
   };

   const handleMapsOrderStatusChange = (id: string, newStatus: OrderStatus) => {
      if (!mapsConfirmSensitiveStatus(newStatus, id)) return;
      void handleUpdateOrderStatus(id, newStatus);
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
         const { data: orderArray } = await supabase.from('orders').select('*').eq('id', parseInt(orderId));
         const data = Array.isArray(orderArray) ? orderArray[0] : orderArray;
         if (data) setSelectedOrder(data as any);
      } else {
         logAdminActivity('order_notes');
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
         logAdminActivity('assign_driver');
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
         // ✅ Charger les détails complets (y compris les items depuis order_items)
         if (onFetchOrderDetails) {
            onFetchOrderDetails(orderId).catch(err => console.error('Error fetching order details:', err));
         }
      }
   };

   const handleMapsSearchGo = () => {
      const q = mapsSearchQuery.trim().toLowerCase();
      if (!q) {
         alert('Saisissez un critère de recherche.');
         return;
      }
      const pool = localOrders.filter(o => o.status !== 'delivered' && !o.isArchived);
      const qCompact = q.replace(/\s/g, '');
      const qDigits = q.replace(/\D/g, '');
      const hit = pool.find(o => {
         const idStr = String(o.id).toLowerCase();
         const name = (o.customerName || '').toLowerCase();
         const phone = (o.phone || '').replace(/\s/g, '').toLowerCase();
         return (
            idStr.includes(q) ||
            idStr.endsWith(qCompact) ||
            name.includes(q) ||
            (qDigits.length >= 6 && phone.includes(qDigits)) ||
            (qCompact.length >= 6 && phone.includes(qCompact))
         );
      });
      if (!hit) {
         alert('Aucune commande active ne correspond.');
         return;
      }
      setSelectedOrderId(String(hit.id));
      const pos = orderCustomerPosForMaps(hit);
      if (pos) {
         setMapsFlyPos(pos);
         setMapsFlyToken(t => t + 1);
      } else {
         alert('Commande sélectionnée dans la liste, mais sans position sur la carte.');
      }
   };

   const handleMapsZoneFilter = (zoneId: string | null) => {
      setMapsZoneFilter(zoneId);
      if (!zoneId) return;
      const zone = deliveryZones.find(z => z.id === zoneId);
      if (!zone) return;
      const lat = zone.center_lat;
      const lng = zone.center_lng;
      if (lat != null && lng != null) {
         setMapsFlyPos([Number(lat), Number(lng)]);
         setMapsFlyToken(t => t + 1);
      }
   };

   const handleFlyToCoords = (lat: number, lng: number) => {
      setMapsFlyPos([lat, lng]);
      setMapsFlyToken(t => t + 1);
   };

   useEffect(() => {
      if (activeTab !== 'MAPS') return;
      const onKey = (e: KeyboardEvent) => {
         const el = e.target as HTMLElement;
         if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
         if (e.key === 'Escape') {
            e.preventDefault();
            setSelectedOrderId(null);
         }
         if (e.key === 'Enter' && selectedOrderId) {
            e.preventDefault();
            handleViewOrder(selectedOrderId);
         }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [activeTab, selectedOrderId, handleViewOrder]);

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

   const handleSaveSocialLink = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const slData = {
         platform: formData.get('platform') as string,
         url: formData.get('url') as string,
         icon_name: formData.get('icon_name') as string,
         display_order: parseInt(formData.get('display_order') as string) || 0,
         is_active: formData.get('is_active') === 'on'
      };

      if (editingSocialLink) {
         const { error } = await supabase.from('social_links').update(slData).eq('id', editingSocialLink.id);
         if (error) alert("Erreur: " + error.message);
         else {
            setShowAddSocialLink(false);
            setEditingSocialLink(null);
            fetchData();
         }
      } else {
         const { error } = await supabase.from('social_links').insert([slData]);
         if (error) alert("Erreur: " + error.message);
         else {
            setShowAddSocialLink(false);
            fetchData();
         }
      }
   };

   const handleDeleteSocialLink = async (id: number) => {
      if (!confirm("Supprimer ce lien social ?")) return;
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
   };

   const handleToggleSocialLink = async (id: number, current_status: boolean) => {
      const { error } = await supabase.from('social_links').update({ is_active: !current_status }).eq('id', id);
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
      // budget_label: champ spécial pour personnaliser le libellé (titre) du budget dans l'app
      const storeBudgetLabel = String(formData.get('user_label_budget_label') || '').trim()
         || (storeUserLabels['budget_label']?.trim() || '');
      if (storeBudgetLabel) storeFieldLabels['budget_label'] = storeBudgetLabel;
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
         // ✅ FIX: Si extractedCoordinates existe, l'utiliser. Sinon, garder les anciennes coordonnées du magasin existant
         latitude: extractedCoordinates?.lat !== undefined ? extractedCoordinates.lat : (editingStore?.latitude || null),
         longitude: extractedCoordinates?.lng !== undefined ? extractedCoordinates.lng : (editingStore?.longitude || null),
         user_visible_fields: storeVisibleFields,
         user_field_labels: Object.keys(storeFieldLabels).length ? storeFieldLabels : {},
         zone_id: formData.get('zone_id') as string || null,
         phone: (formData.get('phone') as string || '').trim() || null
      };

      // 🔍 DEBUG: Log the store data being saved
      console.log('📊 SAVING STORE:', {
         storeName: storeData.name,
         hasExtractedCoords: !!extractedCoordinates,
         extractedCoords: extractedCoordinates,
         finalLat: storeData.latitude,
         finalLng: storeData.longitude
      });

      // --- OPTIMISTIC UI: show new/updated store immediately in list ---
      if (editingStore) {
         const prevStore = editingStore;
         const optimistic = { ...prevStore, ...storeData, image_url: localPreviewUrl } as Store;
         setStores(prev => prev.map(s => s.id === prevStore.id ? optimistic : s));

         // close UI right away
         setShowAddStore(false);
         setEditingStore(null);
         setStoreImagePreview(null);
         setExtractedCoordinates(null); // Reset coordinates after save
         setMapsUrlInput(''); // Clear URL input
         setExtractionError(null); // Clear any extraction errors
         onBack();

         // Persist in background (upload image FIRST -> then update with image_url)
         (async () => {
            try {
               // ✅ STEP 1: Upload image FIRST if provided (data URI)
               let finalImageUrl = storeData.image_url; // default to existing or empty
               if (storeImagePreview && storeImagePreview.startsWith('data:')) {
                  try {
                     console.log('📸 Starting image upload...');
                     const blob = await dataUrlToBlob(storeImagePreview);
                     console.log('✅ Blob created, size:', blob.size, 'type:', blob.type);

                     const timestamp = Date.now();
                     const random = Math.random().toString(36).substring(7);
                     const fileName = `store_${prevStore.id}_${timestamp}_${random}.png`;

                     console.log('📤 Uploading to bucket "stores" with name:', fileName);
                     const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('stores')
                        .upload(fileName, blob, {
                           cacheControl: '0',
                           upsert: true // Overwrite if exists
                        });

                     if (uploadError) {
                        console.error('❌ Image upload ERROR:', uploadError);
                        throw uploadError;
                     }

                     if (!uploadData) {
                        console.error('❌ Upload returned no data');
                        throw new Error('Upload returned no data');
                     }

                     console.log('✅ Upload successful:', uploadData);
                     finalImageUrl = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
                     console.log('✅ Image URL generated:', finalImageUrl);
                  } catch (err) {
                     console.error('❌ Image upload failed:', err);
                     // Don't continue - require successful image upload for edit
                     alert('Erreur upload image: ' + (err instanceof Error ? err.message : String(err)));
                     // Rollback optimistic UI
                     setStores(prev => prev.map(s => s.id === prevStore.id ? prevStore : s));
                     return;
                  }
               } else {
                  console.log('⏭️  No new image provided, keeping existing:', finalImageUrl);
               }

               // ✅ STEP 2: Update store WITH the image URL already set
               const storeDataWithImage = { ...storeData, image_url: finalImageUrl };
               console.log('💾 UPDATING SUPABASE for store ID:', prevStore.id);
               const { error: updateError, data: updateDataArray } = await supabase.from('stores').update(storeDataWithImage).eq('id', prevStore.id).select();
               const updateData = Array.isArray(updateDataArray) ? updateDataArray[0] : updateDataArray;

               console.log('📡 SUPABASE RESPONSE:', {
                  hasError: !!updateError,
                  errorMsg: updateError?.message,
                  returnedData: updateData
               });

               if (updateError) {
                  // rollback optimistic change
                  setStores(prev => prev.map(s => s.id === prevStore.id ? prevStore : s));
                  alert('Erreur: ' + updateError.message);
                  return;
               }

               // Update local state with DB response to ensure consistency (with correct image_url)
               if (updateData) {
                  console.log('✅ UPDATE SUCCESS! With image_url:', updateData.image_url);
                  setStores(prev => prev.map(s => s.id === prevStore.id ? updateData : s));
               }
            } catch (err) {
               console.error('Background update store failed', err);
               // rollback
               setStores(prev => prev.map(s => s.id === prevStore.id ? prevStore : s));
            } finally {
               setIsSavingStore(false);
               setShowAddStore(false);
               setEditingStore(null);
               setStoreImagePreview(null);
            }
         })();
      } else {
         // creating new store: optimistic add with temporary id
         const tempId = `tmp-${Date.now()}`;
         const optimisticNew: any = { ...storeData, id: tempId, image_url: localPreviewUrl, name: storeData.name };
         setStores(prev => [optimisticNew, ...prev]);

         // close UI immediately for snappy UX
         setShowAddStore(false);
         setStoreImagePreview(null);
         onBack();

         // Persist in background (upload image FIRST -> then insert with image_url)
         (async () => {
            try {
               // ✅ STEP 1: Upload image FIRST if provided (data URI)
               let finalImageUrl = storeData.image_url; // default to empty or existing URL
               if (storeImagePreview && storeImagePreview.startsWith('data:')) {
                  try {
                     console.log('📸 Starting image upload for new store...');
                     const blob = await dataUrlToBlob(storeImagePreview);
                     console.log('✅ Blob created, size:', blob.size, 'type:', blob.type);

                     const timestamp = Date.now();
                     const random = Math.random().toString(36).substring(7);
                     const fileName = `store_new_${timestamp}_${random}.png`;

                     console.log('📤 Uploading to bucket "stores" with name:', fileName);
                     const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('stores')
                        .upload(fileName, blob, {
                           cacheControl: '0',
                           upsert: true // Overwrite if exists
                        });

                     if (uploadError) {
                        console.error('❌ Image upload ERROR:', uploadError);
                        throw uploadError;
                     }

                     if (!uploadData) {
                        console.error('❌ Upload returned no data');
                        throw new Error('Upload returned no data');
                     }

                     console.log('✅ Upload successful:', uploadData);
                     finalImageUrl = supabase.storage.from('stores').getPublicUrl(fileName).data.publicUrl;
                     console.log('✅ Image URL generated:', finalImageUrl);
                  } catch (err) {
                     console.error('❌ Image upload failed:', err);
                     // Ask user to retry
                     alert('Erreur upload image: ' + (err instanceof Error ? err.message : String(err)));
                     // Rollback optimistic UI
                     setStores(prev => prev.filter(s => s.id !== tempId));
                     return;
                  }
               } else {
                  console.log('⏭️  No new image provided');
               }

               // ✅ STEP 2: Insert store WITH the image URL already set
               const storeDataWithImage = { ...storeData, image_url: finalImageUrl };
               const { data: insertedArray, error: insertError } = await supabase.from('stores').insert([storeDataWithImage]).select();
               const inserted = Array.isArray(insertedArray) ? insertedArray[0] : insertedArray;
               if (insertError || !inserted) {
                  // remove optimistic entry
                  setStores(prev => prev.filter(s => s.id !== tempId));
                  alert('Erreur: ' + (insertError?.message || 'Impossible de créer le magasin'));
                  return;
               }

               // replace temporary item with real DB row (now with correct image_url)
               const real = { ...inserted, id: String((inserted as any).id) } as Store;
               setStores(prev => prev.map(s => s.id === tempId ? real : s));
               console.log('✅ Store created with image_url:', real.image_url);

               // --- Handle Partner Linking ---
               const partnerId = formData.get('partner_id') as string;
               if (partnerId) {
                  // For a new store, simple insert
                  await supabase.from('partner_store_access').insert([{ partner_id: partnerId, store_id: real.id }]);
                  onBack(); // Refresh to show link in UI
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

   // Diagnostic dev uniquement (évite travail console en prod à chaque changement de filtres / commandes)
   useEffect(() => {
      if (!import.meta.env.DEV || activeTab !== 'ORDERS') return;
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

   const filteredStores = useMemo(() => stores.filter(s => {
      if (s.is_deleted) return false;

      const matchesSearch = (s.name || '').toLowerCase().includes(lowerSearch) ||
         (s.category_id || '').toLowerCase().includes(lowerSearch);

      const matchesOptions = (!storeOptionsFilter.is_featured || s.is_featured) &&
         (!storeOptionsFilter.is_new || s.is_new) &&
         (!storeOptionsFilter.has_products || s.has_products);

      const matchesZone = storeZoneFilter === 'all' || s.zone_id === storeZoneFilter;

      return matchesSearch && matchesOptions && matchesZone;
   }), [stores, lowerSearch, storeOptionsFilter, storeZoneFilter]);

   const filteredProducts = useMemo(() => {
      let result = localProducts.filter(p => {
         const matchesSearch = (p.name || '').toLowerCase().includes(lowerSearch) ||
            (p.storeName && p.storeName.toLowerCase().includes(lowerSearch));
         const matchesStore = selectedStoreFilter === 'all' || p.storeName === selectedStoreFilter;
         return matchesSearch && matchesStore;
      });

      // Sort
      if (productSortOrder === 'newest') {
         result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else if (productSortOrder === 'oldest') {
         result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      } else if (productSortOrder === 'name') {
         result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else if (productSortOrder === 'price') {
         result.sort((a, b) => (b.price || 0) - (a.price || 0));
      }

      return result;
   }, [localProducts, lowerSearch, selectedStoreFilter, productSortOrder]);

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
            darkMode={darkModeIsStores}
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
  }), [filteredStores, dbCategories, onEditStore, onToggleOpenStore, onToggleActiveStore, onDeleteStoreStable, darkModeIsStores]);

   const memoizedProductCards = useMemo(() => filteredProducts.map((p) => (
      <ProductCard
         key={p.id}
         id={p.id}
         name={p.name}
         storeName={p.storeName}
         price={p.price}
         image={p.image}
         darkMode={darkModeIsProducts}
         onEdit={onEditProduct}
         onDelete={handleDeleteProduct}
      />
   )), [filteredProducts, onEditProduct, handleDeleteProduct, darkModeIsProducts]);

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

?? TOTAL À PAYER: ${order.total_final || 0} DH
(Livraison ${(order.total_final || 0) - (order.total || 0)} DH incluse)`;
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

      // En-tête avec Logo (Désactivé pour éviter le bug de jsPDF avec les images non préchargées)
      /* 
      try {
         const logoImg = new Image();
         logoImg.src = '/ln3 (1).png';
         doc.addImage(logoImg, 'PNG', 15, 10, 40, 40);
      } catch (e) {
         console.warn("Logo non chargé", e);
      }
      */

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
      doc.text(`${(order.total_final || 0).toFixed(2)} DH`, 157, totalY + 22, { align: 'center' });

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
         case 'pending': return { label: 'En attente', color: 'bg-amber-50 text-amber-600 border border-amber-200/50' };
         case 'verification': return { label: 'Vérification', color: 'bg-blue-50 text-blue-600 border border-blue-200/50' };
         case 'treatment': return { label: 'Traitement', color: 'bg-indigo-50 text-indigo-600 border border-indigo-200/50' };
         case 'delivering': return { label: 'En course', color: 'bg-emerald-50 text-emerald-600 border border-emerald-200/50' };
         case 'progression': return { label: 'Progression', color: 'bg-cyan-50 text-cyan-600 border border-cyan-200/50' };
         case 'delivered': return { label: 'Livrée', color: 'bg-slate-50 text-slate-500 border border-slate-200/50' };
         case 'refused': return { label: 'Refusée', color: 'bg-red-50 text-red-600 border border-red-200/50' };
         case 'unavailable': return { label: 'Indisponible', color: 'bg-slate-100 text-slate-400 border border-slate-300/50' };
         default: return { label: status, color: 'bg-slate-50 text-slate-600 border border-slate-200' };
      }
   };

   // Variante sombre pour l'onglet ORDERS (UI seulement).
   const getStatusConfigDark = (status: OrderStatus) => {
      switch (status) {
         case 'pending': return { label: 'En attente', color: 'bg-amber-950/40 text-amber-200 border border-amber-200/20' };
         case 'verification': return { label: 'Vérification', color: 'bg-blue-950/40 text-blue-200 border border-blue-200/20' };
         case 'treatment': return { label: 'Traitement', color: 'bg-indigo-950/40 text-indigo-200 border border-indigo-200/20' };
         case 'delivering': return { label: 'En course', color: 'bg-emerald-950/40 text-emerald-200 border border-emerald-200/20' };
         case 'progression': return { label: 'Progression', color: 'bg-cyan-950/40 text-cyan-200 border border-cyan-200/20' };
         case 'delivered': return { label: 'Livrée', color: 'bg-slate-900/40 text-slate-200 border border-slate-700/60' };
         case 'refused': return { label: 'Refusée', color: 'bg-red-950/40 text-red-200 border border-red-200/20' };
         case 'unavailable': return { label: 'Indisponible', color: 'bg-slate-900/30 text-slate-300 border border-slate-700/50' };
         default: return { label: status, color: 'bg-slate-900/40 text-slate-200 border border-slate-700/60' };
      }
   };

   const financeTimeRange = useMemo(() => {
      const now = Date.now();
      const end = now;
      let start = 0;
      if (financePeriod === '7d') start = now - 7 * 86400000;
      else if (financePeriod === '30d') start = now - 30 * 86400000;
      else if (financePeriod === 'month') {
         const d = new Date();
         d.setHours(0, 0, 0, 0);
         d.setDate(1);
         start = d.getTime();
      } else if (financePeriod === 'custom' && financeCustomFrom && financeCustomTo) {
         const a = new Date(financeCustomFrom);
         a.setHours(0, 0, 0, 0);
         const b = new Date(financeCustomTo);
         b.setHours(23, 59, 59, 999);
         return { start: a.getTime(), end: b.getTime() };
      } else if (financePeriod === 'all') start = 0;
      else start = now - 30 * 86400000;
      return { start, end };
   }, [financePeriod, financeCustomFrom, financeCustomTo]);

   const financePeriodLabelStr = useMemo(() => {
      if (financePeriod === '7d') return '7 derniers jours';
      if (financePeriod === '30d') return '30 derniers jours';
      if (financePeriod === 'month') {
         return `Mois en cours (${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`;
      }
      if (financePeriod === 'all') return 'Toutes périodes';
      if (financePeriod === 'custom' && financeCustomFrom && financeCustomTo) {
         return `Du ${financeCustomFrom} au ${financeCustomTo}`;
      }
      return 'Période personnalisée';
   }, [financePeriod, financeCustomFrom, financeCustomTo]);

   /** CA du mois calendaire en cours (carte Overview). */
   const overviewMonthRevenue = useMemo(() => {
      const now = new Date();
      const endMs = now.getTime();
      const startD = new Date(now.getFullYear(), now.getMonth(), 1);
      startD.setHours(0, 0, 0, 0);
      return propOrders
         .filter(o => o.status === 'delivered' && o.timestamp >= startD.getTime() && o.timestamp <= endMs)
         .reduce((s, o) => s + orderFinanceBreakdown(o).grand, 0);
   }, [propOrders]);

   // --- LOGIQUE FINANCE ---
   const financeStats = useMemo(() => {
      const { start, end } = financeTimeRange;
      const completed = propOrders.filter(o => {
         if (o.status !== 'delivered') return false;
         const t = o.timestamp;
         return t >= start && t <= end;
      });

      let revenue = 0;
      let deliveryFees = 0;
      let total = 0;
      let cashCount = 0;
      let cashAmt = 0;
      let trCount = 0;
      let trAmt = 0;

      const dailyMap: Record<string, number> = {};
      for (const o of completed) {
         const b = orderFinanceBreakdown(o);
         revenue += b.products;
         deliveryFees += b.delivery;
         total += b.grand;
         const pm = o.paymentMethod || o.payment_method || 'cash';
         if (pm === 'transfer') {
            trCount += 1;
            trAmt += b.grand;
         } else {
            cashCount += 1;
            cashAmt += b.grand;
         }
         const iso = new Date(o.timestamp).toISOString().slice(0, 10);
         dailyMap[iso] = (dailyMap[iso] || 0) + b.grand;
      }

      const dailyStats = Object.entries(dailyMap)
         .sort(([a], [b]) => a.localeCompare(b))
         .map(([dateKey, amount]) => ({
            dateKey,
            date: new Date(`${dateKey}T12:00:00`).toLocaleDateString('fr-FR'),
            amount,
         }));

      const avgBasket = completed.length ? Math.round((total / completed.length) * 100) / 100 : 0;

      let trendVsPreviousPct: number | null = null;
      if (financePeriod !== 'all' && start > 0) {
         const span = Math.max(86400000, end - start);
         const prevStart = start - span;
         const prevEnd = start;
         const prevTotal = propOrders
            .filter(o => o.status === 'delivered' && o.timestamp >= prevStart && o.timestamp < prevEnd)
            .reduce((s, o) => s + orderFinanceBreakdown(o).grand, 0);
         if (prevTotal > 0) trendVsPreviousPct = Math.round(((total - prevTotal) / prevTotal) * 100);
      }

      return {
         revenue,
         deliveryFees,
         total,
         completedCount: completed.length,
         completedOrders: completed,
         dailyStats,
         paymentCash: { count: cashCount, amount: cashAmt },
         paymentTransfer: { count: trCount, amount: trAmt },
         avgBasket,
         periodLabel: financePeriodLabelStr,
         trendVsPreviousPct,
      };
   }, [propOrders, financeTimeRange, financePeriodLabelStr, financePeriod]);

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
      doc.text(`Période: ${fin.periodLabel}`, 15, 38);

      autoTable(doc, {
         startY: 48,
         head: [['Description', 'Valeur']],
         body: [
            ['Ventes Produits', `${fin.revenue} DH`],
            ['Frais de Livraison Totaux', `${fin.deliveryFees} DH`],
            ['Chiffre d\'Affaires Global', `${fin.total} DH`],
            ['Panier moyen', `${fin.avgBasket} DH`],
            ['Espèces (montant)', `${fin.paymentCash.amount} DH (${fin.paymentCash.count} cmd.)`],
            ['Virement (montant)', `${fin.paymentTransfer.amount} DH (${fin.paymentTransfer.count} cmd.)`],
            ['Nombre total de livraisons', `${fin.completedCount} `]
         ],
         theme: 'striped',
         headStyles: { fillColor: [249, 115, 22] }
      });

      doc.save(`Finance_Veetaa_${new Date().toISOString().split('T')[0]}.pdf`);
   };

   const generateAnalyticsPDF = useCallback(() => {
      const s = analyticsSnapshot;
      const doc = new jsPDF();
      const orange: [number, number, number] = [249, 115, 22];
      doc.setFontSize(18);
      doc.setTextColor(orange[0], orange[1], orange[2]);
      doc.text('RAPPORT ANALYTICS VEETAA', 14, 22);
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      let yHead = 30;
      doc.text(`Période : ${s.periodLabel}`, 14, yHead);
      yHead += 6;
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, yHead);
      if (statsStoreFilter !== 'all') {
         yHead += 6;
         doc.text(`Magasin : ${statsStoreFilter}`, 14, yHead);
      }
      const startY = yHead + 8;

      autoTable(doc, {
         startY,
         head: [['Indicateur', 'Valeur']],
         body: [
            ['Commandes (période)', String(s.totalOrdersInRange)],
            ['Panier moyen (livrées)', `${s.basketAvgDelivered} DH`],
            ['Temps moy. création → livraison (h)', s.avgDeliveryHours != null ? String(s.avgDeliveryHours) : '—'],
            ['Clients nouveaux (1ère commande)', String(s.newClients)],
            ['Clients récurrents', String(s.returningClients)],
            ['Taux réachat (2+ cmd / client)', s.repurchaseRatePct != null ? `${s.repurchaseRatePct} %` : '—'],
            [
               'Tendance commandes vs période préc.',
               s.trendVentesPct != null ? `${s.trendVentesPct >= 0 ? '+' : ''}${s.trendVentesPct} %` : '—',
            ],
            [
               'Tendance CA livré vs période préc.',
               s.trendCaPct != null ? `${s.trendCaPct >= 0 ? '+' : ''}${s.trendCaPct} %` : '—',
            ],
         ],
         theme: 'striped',
         headStyles: { fillColor: orange },
      });

      const afterKpi = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 40;
      autoTable(doc, {
         startY: afterKpi + 10,
         head: [['Top admins (activité)', 'Événements']],
         body:
            adminLeaderboard.length > 0
               ? adminLeaderboard.map(r => [r.label, String(r.count)])
               : [['(Table Supabase non configurée ou aucune donnée)', '—']],
         theme: 'striped',
         headStyles: { fillColor: orange },
      });

      const afterAdm = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterKpi + 40;
      const orangeColor: [number, number, number] = [249, 115, 22];
      const slateColor: [number, number, number] = [30, 41, 59];
      const lightSlate: [number, number, number] = [148, 163, 184];
      autoTable(doc, {
         startY: afterAdm + 10,
         head: [['Magasin', 'CA livré (DH)']],
         body: s.topStoresCa.length ? s.topStoresCa.map(x => [x.name, String(x.value)]) : [['—', '—']],
         theme: 'grid',
      });

      const afterStores = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterAdm + 40;
      autoTable(doc, {
         startY: afterStores + 10,
         head: [['Produit (livrées)', 'Quantité']],
         body: s.topProducts.length ? s.topProducts.map(p => [p.name, String(p.value)]) : [['—', '—']],
         theme: 'grid',
      });

      doc.save(`Analytics_Veetaa_${new Date().toISOString().split('T')[0]}.pdf`);
   }, [analyticsSnapshot, adminLeaderboard, statsStoreFilter]);

   const generateUsersPDF = () => {
      const doc = new jsPDF();
      const orangeColor: [number, number, number] = [249, 115, 22]; // #f97316
      const slateColor: [number, number, number] = [30, 41, 59]; // Slate 800
      const lightSlate: [number, number, number] = [148, 163, 184]; // Slate 400

      // Header background
      doc.setFillColor(slateColor[0], slateColor[1], slateColor[2]);
      doc.rect(0, 0, 210, 45, 'F');

      // Logo/Branding
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("VEETAA", 15, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
      doc.text("ADMINISTRATION DASHBOARD", 15, 28);

      // Report Info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("RAPPORT CLIENTS", 155, 20, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Document généré le: ${new Date().toLocaleString()}`, 155, 28, { align: 'right' });
      doc.text(`Total clients: ${users.length}`, 155, 33, { align: 'right' });

      // Build data-rich rows
      const tableData = users.map(u => {
         const userOrders = propOrders.filter(o => o.phone === u.phone);
         const deliveredCount = userOrders.filter(o => o.status === 'delivered').length;
         const totalSpent = userOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);
         const status = u.isBlocked ? 'BLOQUÉ' : 'ACTIF';

         return [
            u.fullName || 'Sans nom',
            u.phone || 'N/A',
            u.email || 'N/A',
            u.isAdmin ? 'Admin' : 'Client',
            deliveredCount.toString(),
            `${totalSpent} DH`,
            status
         ];
      });

      autoTable(doc, {
         startY: 55,
         head: [['Nom Complet', 'Téléphone', 'Email', 'Rôle', 'Cmds', 'Total', 'Statut']],
         body: tableData,
         theme: 'grid',
         headStyles: {
            fillColor: orangeColor,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 4
         },
         bodyStyles: {
            fontSize: 9,
            textColor: [51, 65, 85],
            cellPadding: 4
         },
         columnStyles: {
            0: { fontStyle: 'bold', textColor: [30, 41, 59] },
            1: { fontStyle: 'normal' },
            4: { halign: 'center' },
            5: { halign: 'right', fontStyle: 'bold', textColor: [249, 115, 22] },
            6: { halign: 'center' }
         },
         alternateRowStyles: {
            fillColor: [248, 250, 252]
         },
         margin: { left: 15, right: 15 },
         didDrawPage: (data) => {
            // Footer on each page
            const str = `Page ${(doc.internal as any).getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
            doc.text(str, 195, 285, { align: 'right' });
            doc.text("Veetaa Admin Logistics System - Rapport de gestion confidentiel", 15, 285);
         }
      });

      doc.save(`Rapport_Clients_Veetaa_${new Date().toISOString().split('T')[0]}.pdf`);
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
         refreshAnnouncementsOnly();
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
         refreshAnnouncementsOnly();
      } catch (err) {
         alert("Erreur suppression");
      }
   };

   const handleToggleAnnouncement = async (id: string, currentActive: boolean) => {
      try {
         const { error } = await supabase.from('announcements').update({ active: !currentActive }).eq('id', id);
         if (error) throw error;
         refreshAnnouncementsOnly();
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

      setReplySubmitting(true);
      try {
         const { error } = await supabase
            .from('support_messages')
            .insert({
               ticket_id: selectedTicket.id,
               sender_type: 'admin',
               message
            });

         if (error) {
            alert("Erreur lors de l'envoi: " + error.message);
            return;
         }

         // Optimistic & partial update: update local ticket in UI immediately
         setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, admin_reply: message, responded_at: new Date().toISOString() } : t));
         setSelectedTicket(prev => prev ? { ...prev, admin_reply: message, responded_at: new Date().toISOString() } : prev);

         await supabase.from('support_tickets').update({
            admin_reply: message,
            responded_at: new Date().toISOString()
         }).eq('id', selectedTicket.id);

         // clear uncontrolled input and UI flag
         if (replyInputRef.current) replyInputRef.current.value = '';
         setReplyText('');
         setReplyHasText(false);
         logAdminActivity('support_reply');
         showNotification('Succès', 'Réponse envoyée');
      } catch (err) {
         console.error('Erreur lors de l’envoi du ticket:', err);
         alert('Erreur lors de l’envoi de la réponse');
      } finally {
         setReplySubmitting(false);
      }
   };

   const getDirectChatRoomId = useCallback((userId1: string, userId2: string) =>
      [String(userId1), String(userId2)].sort().join('_'), []);

   /** Calcule la room courante (ou null si direct sans cible). */
   const computeCurrentRoomId = useCallback((): string | null => {
      if (chatRoom === 'general') return 'general';
      if (chatRoom === 'direct' && chatDirectTarget?.id && currentAdmin?.id) {
         return getDirectChatRoomId(String(currentAdmin.id), String(chatDirectTarget.id));
      }
      return null;
   }, [chatRoom, chatDirectTarget?.id, currentAdmin?.id, getDirectChatRoomId]);

   /** Détecte si une room directe concerne l'admin courant. */
   const isDirectRoomForAdmin = useCallback((roomId: string, adminId: string) => {
      if (!roomId || roomId === 'general') return false;
      const parts = roomId.split('_');
      if (parts.length !== 2) return false;
      const sid = String(adminId);
      return parts[0] === sid || parts[1] === sid;
   }, []);

   /** Le message arrive-t-il dans la vue actuellement affichée ? */
   const isChatMessageInCurrentView = useCallback((msg: any, meId: string) => {
      if (!showChatWidgetRef.current) return false;
      const room = chatRoomRef.current;
      const target = chatDirectTargetRef.current;
      if (msg.room_id === 'general' && room === 'general') return true;
      if (room === 'direct' && target?.id) {
         return msg.room_id === getDirectChatRoomId(String(meId), String(target.id));
      }
      return false;
   }, [getDirectChatRoomId]);

   /** Insertion idempotente : ignore si l'id existe déjà (anti-doublon optimiste/realtime). */
   const upsertMessage = useCallback((msg: any) => {
      setChatMessages(prev => {
         if (msg?.id != null && prev.some(m => m.id === msg.id)) return prev;
         return [...prev, msg];
      });
   }, []);

   const loadChatUsers = useCallback(async () => {
      const [accRes, superRes] = await Promise.all([
         supabase.from('admin_accounts').select('id,username,is_active').order('username', { ascending: true }),
         supabase.from('super_admins').select('id,username').order('username', { ascending: true }),
      ]);
      const list: any[] = [];
      const seen = new Set<string>();
      if (accRes.data) {
         for (const a of accRes.data) {
            if (a.is_active === false) continue;
            const sid = String(a.id);
            if (seen.has(sid)) continue;
            seen.add(sid);
            list.push({ ...a, chatRole: 'admin' as const });
         }
      }
      if (superRes.data) {
         for (const s of superRes.data) {
            const sid = String(s.id);
            if (seen.has(sid)) continue;
            seen.add(sid);
            list.push({ ...s, chatRole: 'super' as const });
         }
      }
      list.sort((a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'fr'));
      if (!accRes.error && !superRes.error) {
         setChatUsers(list);
      } else {
         console.error('loadChatUsers:', accRes.error || superRes.error);
      }
   }, []);

   /** Crée la room si besoin — appelée uniquement à la première écriture. */
   const ensureRoomExists = useCallback(async (roomId: string, isGeneral: boolean) => {
      const { error } = await supabase
         .from('chat_rooms')
         .upsert({
            room_id: roomId,
            is_general: isGeneral,
            name: isGeneral ? 'General' : 'Direct chat',
            created_at: new Date().toISOString()
         }, { onConflict: 'room_id' });
      if (error) console.error('Erreur ensureRoomExists:', error);
   }, []);

   /** Charge les 200 derniers messages d'une room avec garde anti race-condition. */
   const loadChatMessages = useCallback(async () => {
      const roomId = computeCurrentRoomId();
      activeRoomIdRef.current = roomId;
      if (!roomId) {
         setChatMessages([]);
         setChatLoading(false);
         return;
      }
      const token = ++chatLoadTokenRef.current;
      setChatLoading(true);
      // Reset immédiat pour éviter d'afficher l'historique de l'autre salon pendant le fetch
      setChatMessages([]);

      const { data, error } = await supabase
         .from('chat_messages')
         .select('*')
         .eq('room_id', roomId)
         .order('created_at', { ascending: false })
         .limit(200);

      // Fetch obsolète : un autre load a démarré entre-temps
      if (token !== chatLoadTokenRef.current) return;

      if (!error && data) {
         setChatMessages(data.reverse());
         chatStickToBottomRef.current = true;
      } else if (error) {
         console.error('Erreur chargement chat:', error);
      }
      setChatLoading(false);
   }, [computeCurrentRoomId]);

   const sendChatMessage = useCallback(async () => {
      const message = chatInput.trim();
      if (!message || !currentAdmin?.id) return;
      if (chatRoom === 'direct' && !chatDirectTarget?.id) return;
      if (chatSending) return;

      setChatSending(true);
      try {
         const roomId = chatRoom === 'general'
            ? 'general'
            : getDirectChatRoomId(String(currentAdmin.id), String(chatDirectTarget!.id));
         const recipient = chatRoom === 'direct' ? chatDirectTarget!.id : null;
         const isGeneral = chatRoom === 'general';

         await ensureRoomExists(roomId, isGeneral);

         // Récupère la ligne insérée (avec son id) pour upsert anti-doublon avec le payload realtime
         const { data, error } = await supabase
            .from('chat_messages')
            .insert({
               room_id: roomId,
               is_general: isGeneral,
               sender_id: currentAdmin.id,
               sender_name: currentAdmin.username,
               recipient_id: recipient,
               message,
            })
            .select()
            .single();

         if (error) {
            console.error('sendChatMessage:', error);
            alert('Erreur envoi chat: ' + error.message);
            return;
         }

         setChatInput('');
         if (data) {
            chatStickToBottomRef.current = true;
            upsertMessage(data);
         }
      } catch (err) {
         console.error('Erreur sendChatMessage:', err);
      } finally {
         setChatSending(false);
      }
   }, [chatInput, currentAdmin?.id, currentAdmin?.username, chatRoom, chatDirectTarget?.id, chatSending, getDirectChatRoomId, ensureRoomExists, upsertMessage]);

   /** Charge users + messages quand le widget s'ouvre ou que la room change. */
   useEffect(() => {
      if (!showChatWidget) return;
      loadChatMessages();
   }, [showChatWidget, chatRoom, chatDirectTarget?.id, currentAdmin?.id, loadChatMessages]);

   useEffect(() => {
      if (!showChatWidget) return;
      loadChatUsers();
   }, [showChatWidget, loadChatUsers]);

   /**
    * UNE SEULE subscription Realtime (gère la vue ET le badge unread).
    * Channel unique par admin pour éviter les collisions multi-onglet/multi-utilisateur.
    */
   useEffect(() => {
      const meId = currentAdmin?.id ? String(currentAdmin.id) : '';
      if (!meId) return;

      const channel = supabase
         .channel(`admin-chat-${meId}`)
         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
            const msg = payload?.new as any;
            if (!msg) return;

            // Pertinence pour cet admin : salon général OU direct le concernant
            const relevant = msg.room_id === 'general' || isDirectRoomForAdmin(msg.room_id, meId);
            if (!relevant) return;

            // Si le message s'adresse à la vue actuellement affichée → l'ajouter (avec dedup)
            if (msg.room_id === activeRoomIdRef.current) {
               upsertMessage(msg);
            }

            // Badge unread : pas pour mes propres messages, pas si la vue actuelle l'affiche déjà
            if (String(msg.sender_id) === meId) return;
            if (isChatMessageInCurrentView(msg, meId)) return;
            setChatUnreadCount((c) => Math.min(c + 1, 99));
         })
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [currentAdmin?.id, isDirectRoomForAdmin, isChatMessageInCurrentView, upsertMessage]);

   /** Auto-scroll intelligent : ne déplace pas l'utilisateur s'il est en train de relire l'historique. */
   useEffect(() => {
      if (!showChatWidget) return;
      const el = chatScrollContainerRef.current;
      if (!el) return;
      if (!chatStickToBottomRef.current) return;
      // requestAnimationFrame pour laisser le DOM peindre les nouveaux messages
      requestAnimationFrame(() => {
         if (chatScrollContainerRef.current) {
            chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
         }
      });
   }, [chatMessages, showChatWidget, chatRoom, chatDirectTarget?.id]);

   /** Détecte si l'user a scrollé vers le haut → on désactive l'auto-scroll tant qu'il ne revient pas en bas. */
   const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      chatStickToBottomRef.current = distanceFromBottom < 80;
   }, []);

   /** Échap pour fermer le widget. */
   useEffect(() => {
      if (!showChatWidget) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') setShowChatWidget(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [showChatWidget]);


   return (
      <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
         <style>{`
            .custom-scrollbar::-webkit-scrollbar {
               width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
               background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
               background: rgba(255, 255, 255, 0.1);
               border-radius: 10px;
            }
            .custom-scrollbar:hover::-webkit-scrollbar-thumb {
               background: rgba(255, 255, 255, 0.2);
            }
            /* Style pour cacher complètement la scrollbar blanche par défaut */
            .custom-scrollbar {
               scrollbar-width: thin;
               scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
            }
         `}</style>
         {/* Sidebar */}
         <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#0F172A] text-slate-300 flex flex-col sticky top-0 h-screen overflow-hidden hidden md:flex shrink-0 border-r border-slate-800 transition-all duration-300`}>
            <div className={`p-6 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
               <div className="flex items-center gap-3 flex-col w-full">
                  <div className="flex items-center gap-3 w-full">
                     <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20 shrink-0">
                        <span className="text-white font-black text-lg">V</span>
                     </div>
                     {!isSidebarCollapsed && (
                        <h1 className="text-xs font-black text-white tracking-widest group cursor-default animate-in fade-in duration-500">
                           VEETAA <span className="text-orange-500">ADMIN</span>
                        </h1>
                     )}
                  </div>
                  {!isSidebarCollapsed && adminRole && (
                     <div className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg mt-2 ${adminRole === 'super_admin' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                        {adminRole === 'super_admin' ? '⭐ Super admin' : '💼 Sub-admin'}
                     </div>
                  )}
               </div>
            </div>

            <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-3'} space-y-1 overflow-y-auto custom-scrollbar`}>
               <div className="mb-4">
                  {!isSidebarCollapsed && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 animate-in fade-in duration-500">Main</p>}
                  {tabVisibility.OVERVIEW && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<LayoutDashboard size={18} />} label="Overview" />
                  )}
                  {tabVisibility.ORDERS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<Package size={18} />} label="Orders" badge={statusFilter === 'all' ? localOrders.filter(o => o.status !== 'delivered' && !o.isArchived).length : undefined} />
                  )}
                  {tabVisibility.MAPS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'MAPS'} onClick={() => setActiveTab('MAPS')} icon={<MapIcon size={18} />} label="Live map" />
                  )}
                  {tabVisibility.HISTORY && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<Clock size={18} />} label="History" />
                  )}
                  {tabVisibility.SUPPORT_TICKETS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'SUPPORT_TICKETS'} onClick={() => setActiveTab('SUPPORT_TICKETS')} icon={<MessageSquare size={18} />} label="Support" badge={supportTickets.filter(t => t.status !== 'resolved').length || undefined} />
                  )}
               </div>

               <div className="mb-4">
                  {!isSidebarCollapsed && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 animate-in fade-in duration-500">Catalog & data</p>}
                  {tabVisibility.USERS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={18} />} label="Customers" />
                  )}
                  {tabVisibility.DRIVERS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Truck size={18} />} label="Drivers" />
                  )}
                  {tabVisibility.PRODUCTS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'PRODUCTS'} onClick={() => setActiveTab('PRODUCTS')} icon={<ShoppingBag size={18} />} label="Products" />
                  )}
                  {tabVisibility.PARTNERS && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'PARTNERS'} onClick={() => setActiveTab('PARTNERS')} icon={<StoreIcon size={18} />} label="Stores" />
                  )}
                  {tabVisibility.PARTNERS_MGMT && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'PARTNERS_MGMT'} onClick={() => setActiveTab('PARTNERS_MGMT')} icon={<ShieldCheck size={18} />} label="Partner accounts" />
                  )}
                  {tabVisibility.PROMO && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'PROMO'} onClick={() => setActiveTab('PROMO')} icon={<Ticket size={18} />} label="Promo codes" />
                  )}
                  {tabVisibility.FINANCE && !pageVisibility.hideFinance && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} icon={<DollarSign size={18} />} label="Finance" />
                  )}
                  {tabVisibility.STATISTICS && !pageVisibility.hideStatistics && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'STATISTICS'} onClick={() => setActiveTab('STATISTICS')} icon={<BarChart3 size={18} />} label="Analytics" />
                  )}
                  {tabVisibility.CATEGORIES && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<Filter size={18} />} label="Categories" />
                  )}
                  {tabVisibility.CONFIG && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={<Settings size={18} />} label="Settings" />
                  )}
               </div>

               <div className="mb-4">
                  {!isSidebarCollapsed && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 animate-in fade-in duration-500">System</p>}
                  {tabVisibility.CONTROLL && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'CONTROLL'} onClick={() => setActiveTab('CONTROLL')} icon={<Globe size={18} />} label="La Controll" />
                  )}
                  {adminRole === 'super_admin' && (
                     <NavItem isCollapsed={isSidebarCollapsed} active={activeTab === 'ADMINS'} onClick={() => setActiveTab('ADMINS')} icon={<UserCheck size={18} />} label="Admins" />
                  )}
                  {tabVisibility.BROADCAST_MAIL && (
                     <NavItem
                        isCollapsed={isSidebarCollapsed}
                        active={activeTab === 'BROADCAST_MAIL'}
                        onClick={() => setActiveTab('BROADCAST_MAIL')}
                        icon={<Mail size={18} />}
                        label="Annonce e-mail"
                     />
                  )}
               </div>
            </nav>

            <div className={`p-4 border-t border-slate-800 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
               <button onClick={onLogout} title="Log out" className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all text-[11px] font-bold uppercase tracking-wider`}>
                  <LogOut size={16} />
                  {!isSidebarCollapsed && <span>Log out</span>}
               </button>
            </div>
         </aside>

         {/* Main Content */}
         <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F8FAFC]">
            <header
               className={[
                  'h-14 flex items-center justify-between px-8 sticky top-0 z-40 transition-shadow',
                  darkModeAppliesToPages ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
               ].join(' ')}
            >
               <div className="flex items-center gap-6 flex-1">
                  <button
                     onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                     className={[
                        'p-2 border rounded-xl transition-all active:scale-95 shadow-sm',
                        darkModeAppliesToPages
                           ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                           : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
                     ].join(' ')}
                     title={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
                  >
                     <ListTree size={18} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>

                  <div
                     className={[
                        'flex items-center gap-3 flex-1 max-w-xl px-4 py-1.5 rounded-xl border transition-all shadow-sm',
                        darkModeAppliesToPages
                           ? 'bg-slate-900/50 border-slate-700/80 focus-within:bg-slate-900 focus-within:border-orange-400/40 focus-within:shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_8px_24px_-12px_rgba(251,146,60,0.35)]'
                           : 'bg-slate-100/50 border-slate-200 focus-within:bg-white focus-within:border-orange-300/70 focus-within:ring-2 focus-within:ring-orange-500/10',
                     ].join(' ')}
                  >
                     <div
                        className={[
                           'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                           darkModeAppliesToPages ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-400 border border-slate-200',
                        ].join(' ')}
                     >
                        <Search size={14} />
                     </div>
                     <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search…"
                        className={[
                           'border-none outline-none text-xs w-full font-medium rounded-lg px-1.5 py-1',
                           darkModeAppliesToPages
                              ? 'bg-slate-950/80 text-slate-100 placeholder:text-slate-400 caret-orange-400'
                              : 'bg-transparent text-slate-900 placeholder:text-slate-500',
                        ].join(' ')}
                        defaultValue={searchTerm}
                        onInput={handleSearchInput}
                        onKeyDown={e => { if ((e as React.KeyboardEvent).key === 'Escape') { const el = e.target as HTMLInputElement; el.value = ''; setSearchTerm(''); } }}
                     />
                     <span
                        className={[
                           'hidden md:inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                           darkModeAppliesToPages ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-slate-500 border border-slate-200',
                        ].join(' ')}
                        title="Raccourci recherche"
                     >
                        /
                     </span>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                     <span className={[
                        'text-[10px] font-bold uppercase tracking-widest',
                           darkModeAppliesToPages ? 'text-slate-300' : 'text-slate-500',
                     ].join(' ')}>
                        Online
                     </span>
                  </div>
                  <button
                     type="button"
                     onClick={() => {
                        setShowChatWidget((prev) => {
                           const next = !prev;
                           if (next) setChatUnreadCount(0);
                           return next;
                        });
                     }}
                     className="relative flex items-center gap-2 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/25 transition hover:from-orange-400 hover:to-amber-400 hover:shadow-orange-500/35 active:scale-[0.97]"
                     title={chatUnreadCount > 0 ? `${chatUnreadCount} unread message(s)` : 'Open team chat'}
                  >
                     <MessageCircle size={16} className="opacity-95" aria-hidden />
                     Chat
                     {chatUnreadCount > 0 && (
                        <span
                           aria-live="polite"
                           aria-label={`${chatUnreadCount} nouveau(x) message(s) non lu(s)`}
                           className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white"
                        >
                           {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                        </span>
                     )}
                  </button>
                  <div className={['h-4 w-px', darkModeAppliesToPages ? 'bg-slate-700' : 'bg-slate-200'].join(' ')}></div>
                  <button
                     type="button"
                     onClick={() => setDarkMode(prev => !prev)}
                     className={[
                        'w-auto px-3 h-10 rounded-xl flex items-center justify-center font-bold text-[11px] transition-all active:scale-95',
                        darkModeAppliesToPages
                           ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
                           : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100',
                     ].join(' ')}
                     title={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
                  >
                     <Moon size={16} className="mr-2" aria-hidden />
                     {darkMode ? 'Sombre' : 'Clair'}
                  </button>
                  <button
                     onClick={() => setShowProfileModal(true)}
                     className={[
                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all active:scale-95',
                        darkModeAppliesToPages
                           ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
                           : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100',
                     ].join(' ')}
                  >
                     {currentAdmin?.username?.[0]?.toUpperCase() || 'A'}
                  </button>
               </div>
            </header>

            <div
              className={[
                'flex-1 overflow-y-auto p-8 space-y-8 pb-32 custom-scrollbar',
                darkModeAppliesToPages ? 'bg-slate-950 text-slate-100' : 'bg-transparent text-slate-900',
              ].join(' ')
              }
            >
               {showChatWidget && (
                  <div className="fixed bottom-6 right-6 z-50 flex h-[min(580px,calc(100vh-5rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl ring-1 ring-white/10">
                     <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-3">
                        <div className="flex items-center gap-2">
                           <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                           </span>
                           <span className="text-sm font-bold tracking-tight text-white">Chat équipe</span>
                        </div>
                        <button
                           type="button"
                           onClick={() => setShowChatWidget(false)}
                           aria-label="Fermer le chat (Échap)"
                           title="Fermer (Échap)"
                           className="rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-400 transition hover:bg-white/5 hover:text-white"
                        >
                           Fermer
                        </button>
                     </div>
                     <div className="flex shrink-0 gap-1.5 border-b border-white/10 bg-slate-900 p-2">
                        <button
                           type="button"
                           onClick={() => { setChatRoom('general'); setChatDirectTarget(null); }}
                           className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition ${chatRoom === 'general' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        >
                           Salon général
                        </button>
                        <button
                           type="button"
                           onClick={() => { setChatRoom('direct'); setChatDirectTarget(null); }}
                           className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition ${chatRoom === 'direct' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        >
                           Message privé
                        </button>
                     </div>

                     <div className="flex min-h-0 flex-1 flex-col bg-slate-800/30">
                        {chatRoom === 'direct' && !chatDirectTarget ? (
                           <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
                              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                 Choisir un administrateur
                              </p>
                              {chatUsers.filter((u) => String(u.id) !== String(currentAdmin?.id)).length === 0 ? (
                                 <p className="rounded-xl border border-white/5 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
                                    Aucun autre administrateur disponible pour un message privé.
                                 </p>
                              ) : (
                                 chatUsers
                                    .filter((u) => String(u.id) !== String(currentAdmin?.id))
                                    .map((user) => (
                                       <button
                                          key={String(user.id)}
                                          type="button"
                                          onClick={() => setChatDirectTarget(user)}
                                          className="mb-2 flex w-full items-center gap-3 rounded-xl border border-white/5 bg-slate-900/70 p-3 text-left transition hover:border-orange-500/30 hover:bg-slate-800"
                                       >
                                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-black text-orange-300">
                                             {user.username?.[0]?.toUpperCase() || '?'}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                             <div className="truncate text-sm font-bold text-white">{user.username}</div>
                                             <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                {user.chatRole === 'super' ? 'Super admin' : 'Administrateur'}
                                             </div>
                                          </div>
                                          <MessageCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                       </button>
                                    ))
                              )}
                           </div>
                        ) : (
                           <>
                              {chatRoom === 'direct' && chatDirectTarget && (
                                 <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/90 px-2 py-2">
                                    <button
                                       type="button"
                                       onClick={() => setChatDirectTarget(null)}
                                       className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-bold text-orange-400 hover:bg-white/5"
                                    >
                                       <ChevronLeft size={18} aria-hidden />
                                       Admins
                                    </button>
                                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-300">
                                       Avec <span className="text-white">{chatDirectTarget.username}</span>
                                    </span>
                                 </div>
                              )}
                              <div
                                 ref={chatScrollContainerRef}
                                 onScroll={handleChatScroll}
                                 className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
                              >
                                 {chatLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
                                       <Loader2 className="h-6 w-6 animate-spin text-orange-500" aria-hidden />
                                       <p className="text-xs font-medium">Chargement des messages…</p>
                                    </div>
                                 ) : (
                                    (() => {
                                       const visible = chatMessages.filter((msg) => {
                                          if (chatRoom === 'general') return msg.room_id === 'general';
                                          if (chatRoom === 'direct' && chatDirectTarget && currentAdmin?.id) {
                                             return (
                                                msg.room_id ===
                                                getDirectChatRoomId(String(currentAdmin.id), String(chatDirectTarget.id))
                                             );
                                          }
                                          return false;
                                       });
                                       if (visible.length === 0) {
                                          return (
                                             <p className="py-10 text-center text-xs text-slate-500">
                                                Aucun message encore. Écrivez le premier 👋
                                             </p>
                                          );
                                       }
                                       return visible.map((msg) => {
                                          const isSelf = String(msg.sender_id) === String(currentAdmin?.id);
                                          return (
                                             <div
                                                key={msg.id ?? `m-${msg.sender_id}-${msg.created_at}`}
                                                className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                                             >
                                                <div
                                                   className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm ${isSelf
                                                         ? 'rounded-br-md bg-orange-500 text-white'
                                                         : 'rounded-bl-md border border-white/10 bg-slate-900 text-slate-100'
                                                      }`}
                                                >
                                                   <div
                                                      className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${isSelf ? 'text-orange-100/90' : 'text-slate-500'}`}
                                                   >
                                                      {msg.sender_name || 'Inconnu'} ·{' '}
                                                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                                         hour: '2-digit',
                                                         minute: '2-digit',
                                                      })}
                                                   </div>
                                                   <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</div>
                                                </div>
                                             </div>
                                          );
                                       });
                                    })()
                                 )}
                                 <div ref={chatEndRef} className="h-px shrink-0" />
                              </div>
                           </>
                        )}
                     </div>

                     {(chatRoom === 'general' || (chatRoom === 'direct' && chatDirectTarget)) && (
                        <div className="shrink-0 space-y-2 border-t border-white/10 bg-slate-950 p-3">
                           <textarea
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendChatMessage();
                                 }
                              }}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                              placeholder={
                                 chatRoom === 'general'
                                    ? 'Message pour tout le salon…'
                                    : `Message pour ${chatDirectTarget?.username || '…'}`
                              }
                           />
                           <button
                              type="button"
                              onClick={sendChatMessage}
                              disabled={chatSending || !chatInput.trim()}
                              className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-orange-900/40 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
                           >
                              {chatSending ? 'Envoi…' : 'Envoyer'}
                           </button>
                        </div>
                     )}
                  </div>
               )}
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                     {ADMIN_TAB_TITLE_EN[activeTab] ?? activeTab}
                  </h2>
                  <div className="flex items-center gap-2">
                     {activeTab === 'USERS' && (
                        <button
                           onClick={generateUsersPDF}
                           className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-orange-200"
                        >
                           <Users size={14} /> Export
                        </button>
                     )}
                     <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50"><RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} /></button>
                  </div>
               </div>

               {/* VUE D'ENSEMBLE */}
               {activeTab === 'OVERVIEW' && (
                  <AdminOverviewPanel
                     dashboardOverviewStats={dashboardOverviewStats}
                     orders={propOrders}
                     weeklyData={weeklyData}
                     monthRevenueTotal={overviewMonthRevenue}
                     onGoToOrders={() => setActiveTab('ORDERS')}
                     darkMode={darkMode}
                  />
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
                     <div
                        className={[
                           'rounded-2xl shadow-sm overflow-hidden',
                           darkModeIsOrders ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-200',
                        ].join(' ')}
                     >
                        <table className="w-full text-left">
                           <thead
                              className={[
                                 'text-[10px] font-bold uppercase tracking-widest border-b',
                                 darkModeIsOrders
                                    ? 'bg-slate-900/60 text-slate-300 border-slate-800'
                                    : 'bg-slate-50/50 text-slate-500 border-slate-200',
                              ].join(' ')}
                           >
                              <tr>
                                 <th className="px-6 py-4 w-10 hidden">
                                    <input
                                       type="checkbox"
                                       checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                                       onChange={handleSelectAllOrders}
                                       className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                    />
                                 </th>
                                 <th className="px-6 py-4">Détails</th>
                                 <th className="px-6 py-4">Client</th>
                                 <th className="px-6 py-4">Statut</th>
                                 <th className="px-6 py-4 w-[100px]" title="Waiting time — attente jusqu’hors En attente / Vérification">
                                    WT.
                                 </th>
                                 <th className="px-6 py-4">Livreur</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {paginatedOrders.map(o => (
                                 <tr
                                    key={o.id}
                                    className={[
                                       'transition-colors',
                                       darkModeIsOrders ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50',
                                       selectedOrderIds.includes(o.id) ? (darkModeIsOrders ? 'bg-orange-500/10' : 'bg-orange-50/50') : '',
                                    ].join(' ')}
                                 >
                                    <td className="px-6 py-4 hidden">
                                       <input
                                          type="checkbox"
                                          checked={selectedOrderIds.includes(o.id)}
                                          onChange={() => handleToggleOrderSelection(o.id)}
                                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                       />
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col">
                                          <span className={`text-[11px] font-black ${darkModeIsOrders ? 'text-slate-300' : 'text-slate-400'}`}>#{o.id}</span>
                                          <span
                                             className={[
                                                'text-[9px] font-bold mt-0.5 uppercase tracking-tighter',
                                                darkModeIsOrders ? 'text-slate-300' : 'text-slate-500',
                                             ].join(' ')}
                                          >
                                             {new Date(o.timestamp).toLocaleDateString('fr-FR')}
                                          </span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div
                                          className="flex items-center gap-3 cursor-pointer group"
                                          onClick={() => {
                                             console.log('=== CLICKED ORDER ===');
                                             let foundUser = null;
                                             if (o.userId) { foundUser = users.find(u => u.id === o.userId); }
                                             if (!foundUser && o.phone) { foundUser = users.find(u => u.phone === o.phone); }
                                             if (foundUser) { setSelectedUser(foundUser); }
                                             else {
                                                setSelectedUser({
                                                   id: `${o.id}_${o.phone}`,
                                                   fullName: o.customerName,
                                                   phone: o.phone,
                                                   isAdmin: false,
                                                   isBlocked: false,
                                                   lastLat: o.location?.lat,
                                                   lastLng: o.location?.lng
                                                } as UserProfile);
                                             }
                                          }}
                                       >
                                          <div
                                             className={[
                                                'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all shrink-0',
                                                darkModeIsOrders ? 'bg-slate-800 text-slate-300 group-hover:bg-orange-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-orange-600 group-hover:text-white',
                                             ].join(' ')}
                                          >
                                             {o.customerName[0]}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                             <span
                                                className={[
                                                   'font-bold group-hover:text-orange-600 transition-colors truncate text-[11px]',
                                                   darkModeIsOrders ? 'text-slate-200' : 'text-slate-700',
                                                ].join(' ')}
                                             >
                                                {o.customerName}
                                             </span>
                                             <span className={['text-[9px] font-medium tracking-tight', darkModeIsOrders ? 'text-slate-400' : 'text-slate-400'].join(' ')}>
                                                {o.phone}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="relative group/select inline-block">
                                          <select
                                             value={o.status}
                                             onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                                             className={[
                                                'pl-3 pr-6 py-1 rounded-lg text-[9px] font-bold uppercase outline-none cursor-pointer border appearance-none transition-all',
                                                darkModeIsOrders ? getStatusConfigDark(o.status).color : getStatusConfig(o.status).color,
                                             ].join(' ')}
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
                                          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                       <OrderWaitingTimeCell order={o} />
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="relative group/select inline-block max-w-[140px]">
                                          <select
                                             value={o.assignedDriverId || ""}
                                             onChange={(e) => handleAssignDriver(o.id, e.target.value)}
                                             className={[
                                                'w-full pl-3 pr-6 py-1 rounded-lg text-[10px] font-bold outline-none cursor-pointer appearance-none transition-all truncate',
                                                darkModeIsOrders
                                                   ? 'bg-slate-950/50 border border-slate-800 text-slate-200 hover:bg-slate-900'
                                                   : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white',
                                             ].join(' ')}
                                          >
                                             <option value="">Non assigné</option>
                                             {drivers.filter(d => d.is_online || d.id === o.assignedDriverId).map(d => (
                                                <option key={d.id} value={d.id}>{d.fullName || d.full_name}</option>
                                             ))}
                                          </select>
                                          <User size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-1.5">
                                          <button
                                             onClick={() => handleViewOrder(o.id)}
                                             className={[
                                                'p-2 rounded-lg border active:scale-95 transition-all',
                                                darkModeIsOrders ? 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                                             ].join(' ')}
                                             title="Détails"
                                          >
                                             <Info size={14} />
                                          </button>
                                          <button
                                             onClick={() => handleDeleteSingleOrder(o.id)}
                                             className={[
                                                'p-2 rounded-lg border active:scale-95 transition-all',
                                                darkModeIsOrders
                                                   ? 'bg-slate-900/70 border-slate-800 text-red-300 hover:bg-red-900/30 hover:text-red-200'
                                                   : 'bg-white border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200',
                                             ].join(' ')}
                                             title="Supprimer"
                                          >
                                             <Trash2 size={14} />
                                          </button>
                                       </div>
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
                              className={`p-2 rounded-xl transition-all ${
                                 currentPage === 1
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : darkModeIsOrders
                                       ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 shadow-sm border border-slate-800'
                                       : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'
                              }`}
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
                                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                                                   currentPage === page
                                                      ? 'bg-orange-600 text-white shadow-lg'
                                                      : darkModeIsOrders
                                                         ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 shadow-sm'
                                                         : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
                                                }`}
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
                                       className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                                          currentPage === page
                                             ? 'bg-orange-600 text-white shadow-lg'
                                             : darkModeIsOrders
                                                ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800 shadow-sm'
                                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
                                       }`}
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
                                 className={`p-2 rounded-xl transition-all ${
                                    currentPage === totalPages
                                       ? 'text-slate-300 cursor-not-allowed'
                                       : darkModeIsOrders
                                          ? 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 shadow-sm border border-slate-800'
                                          : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'
                                 }`}
                           >
                              <ChevronRight size={20} />
                           </button>
                        </div>
                     )}
                  </div>
               )}



               {/* FINANCE (RESTAURÉE) */}
               {activeTab === 'FINANCE' && (
                  <AdminFinancePanel
                     darkMode={darkModeIsFinance}
                     financeStats={financeStats}
                     financePeriod={financePeriod}
                     onFinancePeriodChange={setFinancePeriod}
                     financeCustomFrom={financeCustomFrom}
                     financeCustomTo={financeCustomTo}
                     onFinanceCustomFromChange={setFinanceCustomFrom}
                     onFinanceCustomToChange={setFinanceCustomTo}
                     onExportPdf={generateFinancePDF}
                     onViewReceipt={setViewingImage}
                  />
               )}

               {/* STATISTIQUES (RESTAURÉE) */}
               {activeTab === 'STATISTICS' && (
                  <AdminStatisticsPanel
                     darkMode={darkModeIsAnalytics}
                     analytics={analyticsSnapshot}
                     statsPeriod={statsPeriod}
                     onStatsPeriodChange={setStatsPeriod}
                     statsCustomFrom={statsCustomFrom}
                     statsCustomTo={statsCustomTo}
                     onStatsCustomFromChange={setStatsCustomFrom}
                     onStatsCustomToChange={setStatsCustomTo}
                     statsStoreFilter={statsStoreFilter}
                     onStatsStoreFilterChange={setStatsStoreFilter}
                     statsStoreOptions={statsStoreOptions}
                     adminLeaderboard={adminLeaderboard}
                     orders={propOrders}
                     drivers={drivers}
                     users={users}
                     stores={stores}
                     onExportPdf={generateAnalyticsPDF}
                  />
               )}

               {/* MAPS INTERACTIVE — cadre redimensionnable (hauteur px + localStorage) */}
               {activeTab === 'MAPS' && (
                  <div className="animate-in zoom-in-95 duration-500 min-w-0">
                     <ResizableLiveMapFrame
                        defaultHeightPx={liveMapDefaultHeightPx}
                        minHeightPx={520}
                        unboundedVerticalResize
                        storageKey="veetaa-admin-live-map-frame-height-v1"
                        gripLabel="TIRER"
                        showBottomResizeGrip
                        showBottomExpandControls
                        bottomContentMaxHeight="min(42dvh, 380px)"
                        bottomGripTitle="TIRER"
                        bottomGripHint="Agrandir ou réduire tout le cadre par le bas"
                        autoScrollWhileResizeDrag
                        top={(
                           <LogisticsSidebar
                              orders={localOrders}
                              users={users}
                              stores={stores}
                              drivers={drivers}
                              deliveryZones={deliveryZones}
                              mapsZoneFilter={mapsZoneFilter}
                              onMapsZoneFilterChange={handleMapsZoneFilter}
                              onFlyToCoords={handleFlyToCoords}
                              selectedOrderId={selectedOrderId}
                              onSelectOrder={setSelectedOrderId}
                              onViewOrder={handleViewOrder}
                              pickingStore={pickingStore}
                              onStartPicking={setPickingStore}
                              onCancelPicking={() => { setPickingStore(null); setPickingPos(null); }}
                              onSavePicking={handleSaveStorePosition}
                              onPosChange={(lat, lng) => setPickingPos([lat, lng])}
                              pickingPos={pickingPos}
                              onRecenter={() => { setSelectedOrderId(null); setRecenterTrigger(prev => prev + 1); }}
                              onAssignDriver={handleAssignDriver}
                              mapsOrderFilter={mapsOrderFilter}
                              setMapsOrderFilter={setMapsOrderFilter}
                              mapsListSort={mapsListSort}
                              setMapsListSort={setMapsListSort}
                              mapsSearchQuery={mapsSearchQuery}
                              setMapsSearchQuery={setMapsSearchQuery}
                              onMapsSearchGo={handleMapsSearchGo}
                              onUpdateOrderStatus={handleMapsOrderStatusChange}
                              mapsBandCollapsed={mapsBandCollapsed}
                              onMapsBandCollapsedChange={setMapsBandCollapsed}
                              mapLayers={mapLayers}
                              setMapLayers={setMapLayers}
                              darkModeIsOrders={darkModeIsOrders}
                           />
                        )}
                        map={(ctx) => (
                           <>
                              <MapComponent
                                 drivers={drivers}
                                 orders={localOrders}
                                 stores={stores}
                                 categories={dbCategories}
                                 selectedOrderId={selectedOrderId}
                                 onUnlinkStore={handleUnlinkStore}
                                 onMapClick={(lat, lng) => pickingStore && setPickingPos([lat, lng])}
                                 onRecenter={() => { setSelectedOrderId(null); setRecenterTrigger(prev => prev + 1); }}
                                 triggerRecenter={recenterTrigger}
                                 pickingPos={pickingPos}
                                 pickingStore={pickingStore}
                                 onSelectOrder={(id) => setSelectedOrderId(id)}
                                 mapOrdersFilter={mapsOrderFilter}
                                 mapsZoneFilter={mapsZoneFilter}
                                 onAssignDriver={handleAssignDriver}
                                 onUpdateOrderStatus={handleMapsOrderStatusChange}
                                 onAssignDriverToMapSelection={(driverId) => {
                                    if (selectedOrderId) void handleAssignDriver(selectedOrderId, driverId);
                                 }}
                                 mapLayers={mapLayers}
                                 flyToPos={mapsFlyPos}
                                 flyToToken={mapsFlyToken}
                                 layoutResizeToken={mapsLayoutResizeToken + ctx.resizeToken}
                              />
                              <div className="pointer-events-auto absolute right-4 top-4 z-[1000] max-w-[calc(100%-1.5rem)]">
                                 <div className="flex flex-wrap items-center justify-end gap-1 rounded-2xl border border-slate-600 bg-slate-900/93 px-2.5 py-2 shadow-xl backdrop-blur-md">
                                    <span className="flex items-center gap-1 px-1 text-[8px] font-black uppercase text-slate-400"><Layers size={12} className="shrink-0 text-orange-400" /> Carte</span>
                                    <button type="button" onClick={() => setMapLayers(p => ({ ...p, orders: !p.orders }))} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black uppercase ${mapLayers.orders ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Commandes"><Package size={13} /></button>
                                    <button type="button" onClick={() => setMapLayers(p => ({ ...p, stores: !p.stores }))} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black uppercase ${mapLayers.stores ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Magasins"><StoreIcon size={13} /></button>
                                    <button type="button" onClick={() => setMapLayers(p => ({ ...p, drivers: !p.drivers }))} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black uppercase ${mapLayers.drivers ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`} title="Livreurs"><Truck size={13} /></button>
                                 </div>
                              </div>
                              <div className="pointer-events-none absolute left-6 top-6 z-[1000] flex max-w-[min(22rem,calc(100%-2rem))] flex-col items-start gap-2">
                                 <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
                                    <div className="flex items-center gap-1.5">
                                       <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                                       <span className="text-[10px] font-black uppercase text-slate-700">{localOrders.filter(o => o.status !== 'delivered' && !o.isArchived).length} actives</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-orange-600">{localOrders.filter(o => o.status !== 'delivered' && !o.isArchived && !o.assignedDriverId).length} sans livreur</span>
                                    <span className="text-[9px] font-bold text-red-600">{localOrders.filter(o => o.status !== 'delivered' && !o.isArchived && !orderCustomerPosForMaps(o)).length} sans position</span>
                                    <div className="hidden h-3 w-px bg-slate-200 sm:block" />
                                    <div className="flex items-center gap-1.5">
                                       <span className="h-2 w-2 rounded-full bg-slate-900"></span>
                                       <span className="text-[10px] font-black uppercase text-slate-700">{drivers.filter(d => d.is_online).length} Livreurs</span>
                                    </div>
                                    {mapsZoneFilter && (() => {
                                       const zone = deliveryZones.find(z => z.id === mapsZoneFilter);
                                       if (!zone) return null;
                                       return (
                                          <>
                                             <div className="hidden h-3 w-px bg-slate-200 sm:block" />
                                             <span className="text-[9px] font-black uppercase text-indigo-600">
                                                📍 {zone.name}
                                             </span>
                                          </>
                                       );
                                    })()}
                                 </div>

                                 {/* KPIs temps réel */}
                                 {(() => {
                                    const waitingOrders = localOrders.filter(o => o.status !== 'delivered' && !o.isArchived && ORDER_WAITING_STATUSES.has(o.status));
                                    const avgWaitMs = waitingOrders.length > 0 
                                       ? waitingOrders.reduce((sum, o) => sum + (Date.now() - o.timestamp), 0) / waitingOrders.length 
                                       : 0;
                                    const avgWaitMins = Math.round(avgWaitMs / 60000);

                                    const criticalOrdersCount = localOrders.filter(o => 
                                       o.status !== 'delivered' && 
                                       !o.isArchived && 
                                       ORDER_WAITING_STATUSES.has(o.status) && 
                                       !o.assignedDriverId && 
                                       (Date.now() - o.timestamp) > 900000
                                    ).length;

                                    const deliveredToday = localOrders.filter(o => 
                                       o.status === 'delivered' && 
                                       new Date(o.timestamp).toDateString() === new Date().toDateString()
                                    ).length;

                                    return (
                                       <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
                                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                                             <Clock size={11} className="text-indigo-500" />
                                             <span>Attente moy : <span className="font-extrabold text-slate-800">{avgWaitMins} min</span></span>
                                          </div>
                                          {criticalOrdersCount > 0 && (
                                             <div className="flex items-center gap-1 text-[9px] font-black text-red-600 animate-pulse">
                                                <AlertTriangle size={11} className="text-red-500" />
                                                <span>🚨 {criticalOrdersCount} critique(s)</span>
                                             </div>
                                          )}
                                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                                             <CheckCircle2 size={11} className="text-emerald-500" />
                                             <span>Livrées : <span className="font-extrabold text-slate-800">{deliveredToday}</span></span>
                                          </div>
                                       </div>
                                    );
                                 })()}

                                 <div className="pointer-events-auto rounded-lg border border-slate-200 bg-slate-100/95 px-2.5 py-1 text-[9px] font-bold text-slate-600">
                                    <span className="font-black text-slate-500">Raccourcis</span> · Échap désélectionne · Entrée ouvre la fiche
                                 </div>
                                 {mapsOrderFilter === 'unassigned' && (
                                    <div className="pointer-events-auto rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[10px] font-bold text-white shadow-md">
                                       Filtre actif : commandes <span className="font-black text-orange-400">sans livreur</span> (liste + marqueurs).
                                    </div>
                                 )}
                                 {mapsOrderFilter === 'incidents' && (
                                    <div className="pointer-events-auto rounded-xl border border-red-700 bg-red-900/90 px-3 py-2 text-[10px] font-bold text-white shadow-md">
                                       Filtre <span className="font-black">Litiges</span> : refus / indisponible (liste + marqueurs).
                                    </div>
                                 )}
                                 {selectedOrderId && !pickingStore && (() => {
                                    const o = localOrders.find(x => String(x.id) === String(selectedOrderId));
                                    if (!o) return null;
                                    const pos = orderCustomerPosForMaps(o);
                                    if (!pos) {
                                       return (
                                          <div className="pointer-events-auto rounded-2xl border border-red-200 bg-red-50/95 px-3.5 py-2.5 text-[11px] font-bold leading-snug text-red-900 shadow-md backdrop-blur-sm">
                                             <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-red-700">Position client</span>
                                             Aucune position exploitable pour #{String(o.id).slice(-6)} : pas de trajets ni marqueur carte. Complétez la fiche ou les notes avec un lien / coordonnées.
                                          </div>
                                       );
                                    }
                                    if (orderMapPositionIsApproximate(o)) {
                                       return (
                                          <div className="pointer-events-auto rounded-2xl border border-amber-200/80 bg-amber-50/95 px-3.5 py-2.5 text-[11px] font-bold leading-snug text-amber-950 shadow-md backdrop-blur-sm">
                                             <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-amber-800">Position approximative</span>
                                             Coordonnées déduites du texte pour #{String(o.id).slice(-6)} — vérifiez avant d’envoyer un livreur.
                                          </div>
                                       );
                                    }
                                    return null;
                                 })()}
                              </div>
                           </>
                        )}
                        bottom={(
                           <div className="flex flex-wrap items-center justify-between gap-4 p-4 px-6">
                              <div className="flex items-center gap-3">
                                 <MapPin size={20} className="text-orange-500" />
                                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Légende de la carte</h3>
                              </div>
                              <div className="flex min-w-0 flex-wrap items-center gap-6 md:gap-8">
                                 <div className="flex items-center gap-3 border-r border-slate-100 pr-4 md:pr-8">
                                    <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-800 bg-white">
                                       <Package size={10} className="text-slate-800" />
                                       <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-orange-500"></span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">Commande Active</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative h-4 w-4 rounded-full border-2 border-blue-200 bg-blue-500">
                                       <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-blue-300"></span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">Livreur Libre</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative h-4 w-4 rounded-full border-2 border-red-200 bg-red-500">
                                       <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-red-300"></span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">En Mission</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="h-4 w-4 rounded-full border-2 border-slate-200 bg-slate-400"></div>
                                    <span className="text-xs font-bold text-slate-500">Hors Ligne</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative h-5 w-5 shrink-0 rounded-full border-[3px] border-orange-500 bg-white shadow-sm" />
                                    <span className="text-xs font-bold text-slate-700">Magasin · commande sélectionnée</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative h-5 w-5 shrink-0 rounded-full border-[3px] border-slate-400 bg-white shadow-sm" />
                                    <span className="text-xs font-bold text-slate-600">Autre magasin (catalogue)</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <svg width="40" height="10" viewBox="0 0 40 10" className="shrink-0" aria-hidden>
                                       <line x1="0" y1="5" x2="40" y2="5" stroke="#FF7A00" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" />
                                    </svg>
                                    <span className="text-xs font-bold text-slate-700">Trajet client → magasins (commande sélectionnée)</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-orange-400 bg-orange-100 text-[10px] font-black text-orange-800">3</div>
                                    <span className="text-xs font-bold text-slate-700">Regroupement (zoom)</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative h-4 w-4 shrink-0 rounded-full border-2 border-white bg-blue-500" style={{ boxShadow: '0 0 0 3px #fbbf24' }} />
                                    <span className="text-xs font-bold text-slate-700">Livreur de la commande sélectionnée</span>
                                 </div>
                              </div>
                           </div>
                        )}
                     />
                  </div>
               )}

               {/* USERS */}
               {activeTab === 'USERS' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                     <div
                        className={[
                           'rounded-2xl shadow-sm overflow-hidden',
                           darkModeIsCustomers ? 'bg-slate-950/50 border border-slate-800' : 'bg-white border border-slate-200',
                        ].join(' ')}
                     >
                        <table className="w-full text-left">
                           <thead
                              className={[
                                 'text-[10px] font-bold uppercase tracking-widest border-b',
                                 darkModeIsCustomers
                                    ? 'bg-slate-900/60 text-slate-300 border-slate-800'
                                    : 'bg-slate-50/50 text-slate-500 border-slate-200',
                              ].join(' ')}
                           >
                              <tr>
                                 <th className="px-6 py-4">Utilisateur</th>
                                 <th className="px-6 py-4">Rôle</th>
                                 <th className="px-6 py-4">Statut</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm">
                              {(filteredUsers.length === 0 && !lowerSearch ? (users || []) : filteredUsers).map((u, i) => (
                                 <tr
                                    key={u.id || i}
                                    className={[
                                       'transition-colors cursor-pointer group',
                                       darkModeIsCustomers ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50/80',
                                    ].join(' ')}
                                    onClick={() => setSelectedUser(u)}
                                 >
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div
                                             className={[
                                                'w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black transition-all shrink-0',
                                                darkModeIsCustomers
                                                   ? 'bg-slate-900/50 text-slate-300 group-hover:bg-orange-600 group-hover:text-white'
                                                   : 'bg-slate-100 text-slate-500 group-hover:bg-orange-600 group-hover:text-white',
                                             ].join(' ')}
                                          >
                                             {u.fullName[0]}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                             <span
                                                className={[
                                                   'font-bold group-hover:text-orange-600 transition-colors truncate text-[11px]',
                                                   darkModeIsCustomers ? 'text-slate-200' : 'text-slate-700',
                                                ].join(' ')}
                                             >
                                                {u.fullName}
                                             </span>
                                             <span
                                                className={[
                                                   'text-[9px] font-medium tracking-tight',
                                                   darkModeIsCustomers ? 'text-slate-400' : 'text-slate-400',
                                                ].join(' ')}
                                             >
                                                {u.phone}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span
                                          className={[
                                             'px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border',
                                             u.isAdmin
                                                ? darkModeIsCustomers
                                                   ? 'bg-indigo-950/30 text-indigo-200 border-indigo-200/20'
                                                   : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                : darkModeIsCustomers
                                                  ? 'bg-slate-900/30 text-slate-200 border-slate-700'
                                                  : 'bg-slate-50 text-slate-500 border-slate-100',
                                          ].join(' ')}
                                       >
                                          {u.isAdmin ? 'Administrateur' : 'Client'}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span
                                          className={[
                                             'px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border',
                                             u.isBlocked
                                                ? darkModeIsCustomers
                                                   ? 'bg-red-950/35 text-red-200 border-red-200/20'
                                                   : 'bg-red-50 text-red-600 border-red-100'
                                                : darkModeIsCustomers
                                                  ? 'bg-emerald-950/35 text-emerald-200 border-emerald-200/20'
                                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                          ].join(' ')}
                                       >
                                          {u.isBlocked ? 'Bloqué' : 'Actif'}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                          <button
                                             onClick={() => handleToggleUserBlock(u.phone, !!u.isBlocked)}
                                             className={[
                                                'p-2 rounded-lg border transition-all active:scale-95',
                                                u.isBlocked
                                                   ? darkModeIsCustomers
                                                      ? 'bg-emerald-950/35 text-emerald-200 border-emerald-200/20 hover:bg-emerald-900/40'
                                                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                   : darkModeIsCustomers
                                                     ? 'bg-red-950/35 text-red-200 border-red-200/20 hover:bg-red-900/40'
                                                     : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100',
                                             ].join(' ')}
                                             title={u.isBlocked ? "Débloquer" : "Bloquer"}
                                          >
                                             {u.isBlocked ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                          </button>
                                          <button
                                             className={[
                                                'p-2 rounded-lg border transition-all active:scale-95',
                                                darkModeIsCustomers
                                                   ? 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900'
                                                   : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                                             ].join(' ')}
                                             onClick={() => setSelectedUser(u)}
                                             title="Détails"
                                          >
                                             <Edit3 size={14} />
                                          </button>
                                       </div>
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
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">

                     <div className="flex flex-wrap items-center gap-4">
                        <div
                           className={[
                              'flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm min-w-[200px]',
                              darkModeIsDrivers ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200',
                           ].join(' ')}
                        >
                           <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                              <Truck size={16} />
                           </div>
                           <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Livreurs</p>
                              <h4 className={['text-lg font-black leading-none mt-0.5', darkModeIsDrivers ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{filteredDrivers.length}</h4>
                           </div>
                        </div>

                        <div
                           className={[
                              'flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm min-w-[200px]',
                              darkModeIsDrivers ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200',
                           ].join(' ')}
                        >
                           <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                              <CheckCircle2 size={16} />
                           </div>
                           <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Disponibles</p>
                              <h4 className={['text-lg font-black leading-none mt-0.5', darkModeIsDrivers ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                                 {filteredDrivers.filter(d => d.status === 'available').length}
                              </h4>
                           </div>
                        </div>

                        <div
                           className={[
                              'flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm min-w-[200px]',
                              darkModeIsDrivers ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200',
                           ].join(' ')}
                        >
                           <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100/50">
                              <MapPin size={16} />
                           </div>
                           <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En Mission / Occupé</p>
                              <h4 className={['text-lg font-black leading-none mt-0.5', darkModeIsDrivers ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                                 {filteredDrivers.filter(d => d.status !== 'available').length}
                              </h4>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-between items-center">
                        <div
                           className={[
                              'flex items-center gap-1 p-1 rounded-xl border shadow-sm',
                              darkModeIsDrivers ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200',
                           ].join(' ')}
                        >
                           {['24H', '2J', '3J', '4J', '5J', '7J'].map(opt => (
                              <button
                                 key={opt}
                                 onClick={() => setBalanceRange(opt as any)}
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    balanceRange === opt
                                       ? 'bg-slate-900 text-white shadow-sm'
                                       : darkModeIsDrivers
                                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                 }`}
                              >
                                 {opt}
                              </button>
                           ))}
                        </div>
                        <button onClick={() => { setEditingDriver(null); setShowAddDriver(true); }} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                           <Plus size={16} /> Nouveau Livreur
                        </button>
                     </div>

                     <div
                        className={[
                           'rounded-2xl shadow-sm overflow-hidden border',
                           darkModeIsDrivers ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200',
                        ].join(' ')}
                     >
                        <table className="w-full text-left">
                           <thead
                              className={[
                                 'text-[10px] font-bold uppercase tracking-widest border-b',
                                 darkModeIsDrivers ? 'bg-slate-900/60 text-slate-300 border-slate-800' : 'bg-slate-50/50 text-slate-500 border-slate-200',
                              ].join(' ')}
                           >
                              <tr>
                                 <th className="px-4 py-3 whitespace-nowrap">Livreur</th>
                                 <th className="px-4 py-3 whitespace-nowrap">Statut</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-center">Livraisons</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-center">Ville</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-right">Balance</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-right">Frais Totaux</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-right">Commission Admin</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-right">Net Livreur</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-center">Évaluation</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-center">Warnings</th>
                                 <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y text-sm border-t-transparent">
                              {filteredDrivers.map(d => (
                                 <tr
                                    key={d.id}
                                    className={[
                                       'transition-colors cursor-pointer group',
                                       darkModeIsDrivers ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50/80',
                                    ].join(' ')}
                                 >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                       <div className="flex items-center gap-3">
                                          <div
                                             className={[
                                                'w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black transition-all shrink-0 group-hover:bg-orange-600 group-hover:text-white',
                                                darkModeIsDrivers ? 'bg-slate-900/40 text-slate-300' : 'bg-slate-100 text-slate-500',
                                             ].join(' ')}
                                          >
                                             {d.full_name ? d.full_name[0] : '?'}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                             <span
                                                className={[
                                                   'font-bold group-hover:text-orange-600 transition-colors truncate text-[11px]',
                                                   darkModeIsDrivers ? 'text-slate-200' : 'text-slate-700',
                                                ].join(' ')}
                                             >
                                                {d.full_name}
                                             </span>
                                             <span
                                                className={[
                                                   'text-[9px] font-medium tracking-tight',
                                                   darkModeIsDrivers ? 'text-slate-400' : 'text-slate-400',
                                                ].join(' ')}
                                             >
                                                {d.phone}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                       <span
                                          className={[
                                             'px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border',
                                             d.status === 'available'
                                                ? darkModeIsDrivers
                                                   ? 'bg-emerald-950/35 text-emerald-200 border-emerald-200/20'
                                                   : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : darkModeIsDrivers
                                                   ? 'bg-orange-950/35 text-orange-200 border-orange-200/20'
                                                   : 'bg-orange-50 text-orange-600 border-orange-100',
                                          ].join(' ')}
                                       >
                                          {d.status === 'available' ? 'Disponible' : 'Occupé'}
                                       </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-black text-slate-700 text-center text-xs">
                                       {propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered').length}
                                    </td>
                                     {/* Ville / Zone */}
                                     <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {(() => {
                                           const zone = deliveryZones.find(z => z.id === (d as any).zone_id);
                                           return zone ? (
                                              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                 <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                                 {zone.name}
                                              </span>
                                           ) : (
                                              <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">—</span>
                                           );
                                        })()}
                                     </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const balanceOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const balanceTotal = balanceOrders.reduce((s, o) => s + orderFinanceBreakdown(o).grand, 0);
                                          return (
                                             <div className="flex flex-col">
                                                <span className="font-black text-slate-700">{Math.round(balanceTotal)} DH</span>
                                                <span className="text-[9px] font-medium text-slate-400">{balanceOrders.length} cmds</span>
                                             </div>
                                          );
                                       })()}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const feeOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const totalFees = feeOrders.reduce((s, o) => s + orderFinanceBreakdown(o).delivery, 0);
                                          return (
                                             <div className="flex flex-col">
                                                <span className="font-black text-slate-700">{Math.round(totalFees)} DH</span>
                                                <span className="text-[9px] font-medium text-slate-400">{feeOrders.length} livr.</span>
                                             </div>
                                          );
                                       })()}
                                    </td>

                                    {/* Commission Admin */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const feeOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const totalFees = feeOrders.reduce((s, o) => s + orderFinanceBreakdown(o).delivery, 0);
                                          const rate = driverCommissions[d.id] ?? 25;
                                          const adminShare = totalFees * (rate / 100);
                                          return (
                                             <div className="flex flex-col items-end gap-1.5">
                                                <span className="font-black text-orange-600">{Math.round(adminShare)} DH</span>
                                                <div className="flex items-center bg-white border border-orange-200 rounded-lg overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
                                                   <input
                                                      type="number"
                                                      min={0}
                                                      max={100}
                                                      value={rate}
                                                      onChange={(e) => updateDriverCommission(d.id, Number(e.target.value))}
                                                      className="w-10 text-center bg-transparent py-1 pl-1 text-[11px] font-black text-orange-700 outline-none"
                                                   />
                                                   <div className="px-1.5 bg-orange-50 border-l border-orange-100 flex items-center justify-center h-full">
                                                      <span className="text-[9px] font-black text-orange-500">%</span>
                                                   </div>
                                                </div>
                                             </div>
                                          );
                                       })()}
                                    </td>

                                    {/* Net Livreur */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                       {(() => {
                                          const windowStart = Date.now() - balanceRangeMs;
                                          const feeOrders = propOrders.filter(o => o.assignedDriverId === d.id && o.status === 'delivered' && (o.timestamp || 0) >= windowStart);
                                          const totalFees = feeOrders.reduce((s, o) => s + orderFinanceBreakdown(o).delivery, 0);
                                          const rate = driverCommissions[d.id] ?? 25;
                                          const driverShare = totalFees * (1 - rate / 100);
                                          return (
                                             <div className="flex flex-col justify-center">
                                                <span className="font-black text-emerald-600">{Math.round(driverShare)} DH</span>
                                                <span className="text-[9px] font-bold text-emerald-400/80">{100 - rate}% des frais</span>
                                             </div>
                                          );
                                       })()}
                                    </td>

                                    {/* Evaluation */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                       <div className="flex items-center justify-center">
                                          {(() => {
                                             const driverRatings = propOrders.filter(o => o.assignedDriverId === d.id && o.driverRating).map(o => o.driverRating!);
                                             const avgRating = driverRatings.length > 0 ? (driverRatings.reduce((a, b) => a + b, 0) / driverRatings.length) : 0;
                                             return avgRating > 0 ? (
                                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                                   <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                                   <span className="text-[10px] font-black text-yellow-600">{avgRating.toFixed(1)}</span>
                                                </div>
                                             ) : (
                                                <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 uppercase tracking-wider">N/A</span>
                                             );
                                          })()}
                                       </div>
                                    </td>

                                    {/* Warnings */}
                                    <td className={`px-4 py-3 whitespace-nowrap transition-all duration-300 ${updatingWarnings.has(d.id) ? 'bg-yellow-50' : ''}`}>
                                       <div className="flex items-center gap-1 justify-center">
                                          <button
                                             onClick={(e) => { e.stopPropagation(); handleUpdateDriverWarns(d.id, Math.max(0, (d.warns || 0) - 1)); }}
                                             className={`w-5 h-5 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-md transition-all ${updatingWarnings.has(d.id) ? 'opacity-50' : ''}`}
                                          >
                                             -
                                          </button>
                                          <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black transition-all duration-300 ${(d.warns || 0) > 0 ? 'text-red-500 bg-red-50 border border-red-100' : 'text-slate-400 bg-slate-50 border border-slate-100'} ${updatingWarnings.has(d.id) ? 'scale-125' : ''}`}>
                                             {d.warns || 0}
                                          </div>
                                          <button
                                             onClick={(e) => { e.stopPropagation(); handleUpdateDriverWarns(d.id, (d.warns || 0) + 1); }}
                                             className={`w-5 h-5 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-md transition-all ${updatingWarnings.has(d.id) ? 'opacity-50' : ''}`}
                                          >
                                             +
                                          </button>
                                       </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                       <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                          <button
                                             onClick={() => { setEditingDriver(d); setDriverProfileImage(d.profile_photo || null); setShowAddDriver(true); }}
                                             className={[
                                                'p-2 rounded-lg border active:scale-95 transition-all',
                                                darkModeIsDrivers
                                                   ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                   : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                                             ].join(' ')}
                                             title="Modifier"
                                          >
                                             <Edit3 size={14} />
                                          </button>
                                          <button
                                             onClick={() => handleDeleteDriver(d.id)}
                                             className={[
                                                'p-2 rounded-lg border active:scale-95 transition-all',
                                                darkModeIsDrivers
                                                   ? 'bg-red-950/30 border-red-200/20 text-red-200 hover:bg-red-900/40 hover:text-red-100'
                                                   : 'bg-red-50 text-red-500 border border-red-100 hover:bg-red-100',
                                             ].join(' ')}
                                             title="Supprimer"
                                          >
                                             <Trash2 size={14} />
                                          </button>
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
                  <div>
                     {/* FILTRES */}
                     <div className={[
                        'mb-6 flex gap-4 items-end flex-wrap p-5 rounded-2xl border shadow-sm',
                        darkModeIsStores ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200',
                     ].join(' ')}>
                        {/* Filtres Toggles */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[300px]">
                           <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${darkModeIsStores ? 'text-slate-400' : 'text-slate-400'}`}>Filtrer par Type</label>
                           <div className="flex flex-wrap gap-2">
                              <button
                                 onClick={() => setStoreOptionsFilter(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                                 className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${storeOptionsFilter.is_featured
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                    : darkModeIsStores
                                       ? 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-orange-400/70 hover:bg-slate-800'
                                       : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-400 hover:bg-orange-50/70'
                                    }`}
                              >
                                 ⭐ Principales
                              </button>
                              <button
                                 onClick={() => setStoreOptionsFilter(prev => ({ ...prev, is_new: !prev.is_new }))}
                                 className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${storeOptionsFilter.is_new
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                    : darkModeIsStores
                                       ? 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-orange-400/70 hover:bg-slate-800'
                                       : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-400 hover:bg-orange-50/70'
                                    }`}
                              >
                                 ✨ Nouveaux
                              </button>
                              <button
                                 onClick={() => setStoreOptionsFilter(prev => ({ ...prev, has_products: !prev.has_products }))}
                                 className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${storeOptionsFilter.has_products
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                    : darkModeIsStores
                                       ? 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-orange-400/70 hover:bg-slate-800'
                                       : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-orange-400 hover:bg-orange-50/70'
                                    }`}
                              >
                                 📦 Avec Catalogue
                              </button>
                           </div>
                        </div>

                         {/* Filtre par Ville / Zone */}
                         <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${darkModeIsStores ? 'text-slate-400' : 'text-slate-400'}`}>
                               🏙️ Filtrer par Ville
                            </label>
                            <select
                               value={storeZoneFilter}
                               onChange={(e) => setStoreZoneFilter(e.target.value)}
                               className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-400/50 ${
                                  darkModeIsStores
                                     ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-orange-400/70'
                                     : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-400'
                               }`}
                            >
                               <option value="all">🌍 Toutes les villes</option>
                               {deliveryZones.map(zone => (
                                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                               ))}
                            </select>
                         </div>

                        {/* Effacer & Stats */}
                        <div className="ml-auto flex gap-4 items-end">
                           {Object.values(storeOptionsFilter).some(v => v) && (
                              <button
                                 onClick={() => setStoreOptionsFilter({})}
                                 className={`text-[10px] font-black uppercase transition-colors px-3 py-2 ${darkModeIsStores ? 'text-slate-400 hover:text-red-300' : 'text-slate-400 hover:text-red-500'}`}
                              >
                                 ✕ Effacer
                              </button>
                           )}
                           <div className="flex flex-col items-end">
                              <span className={`font-black text-sm ${darkModeIsStores ? 'text-orange-300' : 'text-orange-600'}`}>{filteredStores.length}</span>
                              <span className={`text-[9px] ${darkModeIsStores ? 'text-slate-400' : 'text-slate-500'}`}>Marques trouvées</span>
                           </div>
                           <button onClick={() => { setEditingStore(null); setStoreImagePreview(null); setShowAddStore(true); }} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${darkModeIsStores ? 'bg-slate-800 text-slate-100 hover:bg-orange-600' : 'bg-slate-900 text-white hover:bg-orange-600'}`}>
                              <Plus size={16} /> Nouvelle Marque
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ willChange: 'transform' }}>
                        {memoizedStoreCards}
                     </div>
                  </div>
               )}

               {/* CATALOGUE */}
               {activeTab === 'PRODUCTS' && (
                  <div>
                     {/* FILTRES */}
                     <div
                        className={[
                           'mb-6 flex gap-4 items-end flex-wrap p-5 rounded-2xl border shadow-sm',
                           darkModeIsProducts
                              ? 'bg-slate-900/55 border-slate-800/80 backdrop-blur-sm shadow-slate-950/30'
                              : 'bg-white border-slate-200',
                        ].join(' ')}
                     >
                        {/* Filtre par Store */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                           <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: darkModeIsProducts ? '#94a3b8' : undefined }}>
                              Filtrer par Marque
                           </label>
                           <select
                              value={selectedStoreFilter}
                              onChange={(e) => setSelectedStoreFilter(e.target.value)}
                              className={[
                                 'w-full px-4 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all shadow-sm',
                                 darkModeIsProducts
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-orange-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-orange-500',
                              ].join(' ')}
                           >
                              <option value="all">Toutes les marques — {localProducts.length} produit{localProducts.length !== 1 ? 's' : ''}</option>
                              {stores.filter(s => s.products?.length).map(s => (
                                 <option key={s.id} value={s.name}>• {s.name} ({s.products?.length || 0})</option>
                              ))}
                           </select>
                        </div>

                        {/* Tri */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                           <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: darkModeIsProducts ? '#94a3b8' : undefined }}>
                              Trier par
                           </label>
                           <select
                              value={productSortOrder}
                              onChange={(e) => setProductSortOrder(e.target.value as any)}
                              className={[
                                 'w-full px-4 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all shadow-sm',
                                 darkModeIsProducts
                                    ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-orange-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-orange-500',
                              ].join(' ')}
                           >
                              <option value="newest">📅 Plus récents</option>
                              <option value="oldest">📅 Plus anciens</option>
                              <option value="name">🔤 Nom (A-Z)</option>
                              <option value="price">💰 Prix (élevé)</option>
                           </select>
                        </div>

                        {/* Stats */}
                        <div className="ml-auto flex gap-4 text-xs">
                           <div className="flex flex-col items-end">
                              <span className={`font-black ${darkModeIsProducts ? 'text-orange-300' : 'text-orange-600'}`}>{filteredProducts.length}</span>
                              <span className={`${darkModeIsProducts ? 'text-slate-400' : 'text-slate-500'}`}>Produits trouvés</span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" style={{ willChange: 'transform' }}>
                        <div onClick={() => {
                           setEditingProduct(null);
                           setProductImagePreview(null);
                           setProductAdditionalImages([]);
                           setShowAddProduct(true);
                        }} className={[
                           'rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all shadow-sm ring-1 min-h-[220px]',
                           darkModeIsProducts
                              ? 'bg-gradient-to-b from-slate-900/80 to-slate-950/80 border-slate-700/80 hover:border-orange-300/70 hover:bg-slate-900/40 ring-orange-200/20 hover:shadow-[0_0_0_1px_rgba(251,146,60,0.12),0_10px_25px_-10px_rgba(2,6,23,0.9)]'
                              : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 ring-transparent hover:ring-orange-200',
                        ].join(' ')}>
                           <div
                              className={[
                                 'w-12 h-12 flex items-center justify-center rounded-xl transition-colors',
                                 darkModeIsProducts ? 'bg-slate-950/30 border border-slate-800/70' : 'bg-slate-50',
                              ].join(' ')}
                           >
                              <Plus
                                 size={24}
                                 className={darkModeIsProducts ? 'text-slate-200 group-hover:text-orange-300' : 'text-slate-400 group-hover:text-orange-500'}
                              />
                           </div>
                           <span className={[
                              'font-black text-[10px] uppercase tracking-widest text-center mt-2',
                              darkModeIsProducts ? 'text-slate-300' : 'text-slate-500',
                           ].join(' ')}>
                              Nouveau<br />Produit
                           </span>
                        </div>
                        {memoizedProductCards}
                     </div>
                  </div>
               )}



               {activeTab === 'CATEGORIES' && (
                  <CategoriesPanel
                     categories={filteredCategories as AdminCategoryRow[]}
                     darkMode={darkModeIsCategories}
                     onAddCategory={() => {
                        setEditingCategory(null);
                        setShowAddCategory(true);
                     }}
                     onEditCategory={cat => {
                        setEditingCategory(cat as any);
                        setShowAddCategory(true);
                     }}
                     onManageSubcategories={cat => {
                        setEditingCategory(cat as any);
                        setShowAddSubCategory(true);
                     }}
                     onDeleteCategory={id => handleDeleteCategory(String(id))}
                  />
               )}

               {/* CONFIGURATION */}
               {activeTab === 'CONFIG' && (
                  <div
                     className={[
                        'space-y-8 animate-in slide-in-from-bottom-6 duration-500',
                        darkModeIsConfig
                           ? '[&_.bg-white]:bg-slate-950/60 [&_.bg-slate-50]:bg-slate-900/60 [&_.bg-slate-50/50]:bg-slate-900/50 [&_.bg-slate-50/60]:bg-slate-900/60 [&_.text-slate-900]:text-slate-100 [&_.text-slate-800]:text-slate-100 [&_.text-slate-700]:text-slate-200 [&_.text-slate-600]:text-slate-300 [&_.text-slate-500]:text-slate-400 [&_.border-slate-200]:border-slate-800 [&_.border-slate-100]:border-slate-800'
                           : '',
                     ].join(' ')}
                  >
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SUPPORT INFO */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-7">
                           <div className="flex items-center gap-3.5">
                              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl shadow-sm"><Phone size={22} /></div>
                              <div>
                                 <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Contact Support</h3>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">Informations client</p>
                              </div>
                           </div>
                           <form onSubmit={handleSaveSupportInfo} className="space-y-5">
                              <div className="space-y-2.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📱 Téléphone Support</label>
                                 <input name="phone" type="text" className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-3.5 px-5 font-bold outline-none transition-all" defaultValue={supportInfo.phone} placeholder="+212 6 XX XX XX XX" />
                              </div>
                              <div className="space-y-2.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📧 Email Support</label>
                                 <input name="email" type="email" className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-3.5 px-5 font-bold outline-none transition-all" defaultValue={supportInfo.email} placeholder="support@example.com" />
                              </div>
                              <button type="submit" className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg hover:from-orange-600 hover:to-orange-500 active:scale-95 transition-all">Enregistrer les contacts</button>
                           </form>
                        </div>

                        {/* RIB MANAGEMENT */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-7">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3.5">
                                 <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-xl shadow-sm"><CreditCard size={22} /></div>
                                 <div>
                                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Comptes Bancaires</h3>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">Gestion des RIB</p>
                                 </div>
                              </div>
                              <button onClick={() => { setEditingRIB(null); setShowAddRIB(true); }} className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-orange-600 active:scale-95 transition-all shadow-sm" title="Ajouter un RIB">
                                 <Plus size={20} />
                              </button>
                           </div>

                           <div className="space-y-3">
                              {ribs.length === 0 ? (
                                 <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                    <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400">Aucun RIB configuré</p>
                                 </div>
                              ) : (
                                 ribs.map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all group">
                                       <div className="flex flex-col gap-1.5 flex-1">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.label}</span>
                                          <span className="text-[10px] font-bold text-orange-600">{r.full_name}</span>
                                          <span className="font-bold text-slate-700 font-mono text-sm">{r.rib}</span>
                                       </div>
                                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingRIB(r); setShowAddRIB(true); }} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Modifier"><Edit3 size={16} /></button>
                                          <button onClick={() => handleDeleteRIB(r.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer"><Trash2 size={16} /></button>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     </div>

                     {/* SOCIAL LINKS MANAGEMENT */}
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-7">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3.5">
                              <div className="p-3 bg-gradient-to-br from-pink-50 to-pink-100 text-pink-600 rounded-xl shadow-sm"><Share2 size={22} /></div>
                              <div>
                                 <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Réseaux Sociaux</h3>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">Liens de présence</p>
                              </div>
                           </div>
                           <button onClick={() => { setEditingSocialLink(null); setShowAddSocialLink(true); }} className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-orange-600 active:scale-95 transition-all shadow-sm" title="Ajouter un réseau social">
                              <Plus size={20} />
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {socialLinks.length === 0 ? (
                              <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                 <Share2 size={32} className="mx-auto text-slate-300 mb-2" />
                                 <p className="text-xs font-bold text-slate-400">Aucun réseau social configuré</p>
                              </div>
                           ) : (
                              socialLinks.map(link => (
                                 <div key={link.id} className={`p-5 rounded-xl border-2 flex flex-col gap-3.5 transition-all ${link.is_active ? 'bg-slate-50 border-slate-200 hover:shadow-md' : 'bg-slate-50/50 opacity-60 border-slate-200'}`}>
                                    <div className="flex justify-between items-start">
                                       <div className="flex-1 min-w-0">
                                          <h4 className="font-black text-slate-800 uppercase text-sm">{link.platform}</h4>
                                          <p className="text-[9px] text-slate-400 font-bold mt-1 truncate" title={link.url}>{link.url}</p>
                                       </div>
                                       <div className="bauble_box ml-2">
                                          <input
                                             className="bauble_input"
                                             id={`sl-active-${link.id}`}
                                             type="checkbox"
                                             checked={link.is_active}
                                             onChange={() => handleToggleSocialLink(link.id, !!link.is_active)}
                                          />
                                          <label className="bauble_label" htmlFor={`sl-active-${link.id}`}></label>
                                       </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3.5 border-t border-slate-200">
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordre: {link.display_order}</span>
                                       <div className="flex gap-1.5">
                                          <button onClick={() => { setEditingSocialLink(link); setShowAddSocialLink(true); }} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Modifier"><Edit3 size={14} /></button>
                                          <button onClick={() => handleDeleteSocialLink(link.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer"><Trash2 size={14} /></button>
                                       </div>
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>

                     {/* GESTION DES ZONES DE LIVRAISON */}
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-7">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3.5">
                              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-xl shadow-sm"><MapPin size={22} /></div>
                           <div>
                                 <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Zones de Livraison</h3>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">Créez et gérez les zones (villes)</p>
                              </div>
                           </div>
                           <button
                              onClick={() => {
                                 setShowAddZone(true);
                                 setEditingZone(null);
                                 setNewZoneForm({ name: '', radius_km: 25, center_lat: 0, center_lng: 0 });
                              }}
                              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all active:scale-95 flex items-center gap-2"
                           >
                              <Plus size={14} /> Nouvelle Zone
                           </button>
                        </div>

                        {showAddZone && (
                           <form onSubmit={handleCreateZone} className="bg-purple-50/50 rounded-xl p-5 space-y-4 border border-purple-100">
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Nom de la zone</label>
                                    <input
                                       type="text"
                                       value={newZoneForm.name}
                                       onChange={(e) => setNewZoneForm({ ...newZoneForm, name: e.target.value })}
                                       placeholder="ex: Casablanca"
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                       required
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Rayon (km)</label>
                                    <input
                                       type="number"
                                       value={newZoneForm.radius_km}
                                       onChange={(e) => setNewZoneForm({ ...newZoneForm, radius_km: parseInt(e.target.value) || 0 })}
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                       min="1"
                                       required
                                    />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Latitude (centre)</label>
                                    <input
                                       type="number"
                                       step="any"
                                       value={newZoneForm.center_lat}
                                       onChange={(e) => setNewZoneForm({ ...newZoneForm, center_lat: parseFloat(e.target.value) || 0 })}
                                       placeholder="33.5731"
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                       required
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Longitude (centre)</label>
                                    <input
                                       type="number"
                                       step="any"
                                       value={newZoneForm.center_lng}
                                       onChange={(e) => setNewZoneForm({ ...newZoneForm, center_lng: parseFloat(e.target.value) || 0 })}
                                       placeholder="-7.5898"
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                                       required
                                    />
                                 </div>
                              </div>
                              {/* 🗺️ MAP PICKER */}
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin size={12} />
                                    Cliquez sur la carte pour définir le centre
                                 </label>
                                 <div className="h-[300px] rounded-xl overflow-hidden border border-slate-200">
                                    <MapContainer
                                       center={[newZoneForm.center_lat || 33.5731, newZoneForm.center_lng || -7.5898]}
                                       zoom={12}
                                       style={{ height: '100%', width: '100%' }}
                                    >
                                       <TileLayer
                                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                       />
                                       {/* Cercle de rayon */}
                                       {newZoneForm.center_lat && newZoneForm.center_lng && newZoneForm.radius_km > 0 && (
                                          <Circle
                                             center={[newZoneForm.center_lat, newZoneForm.center_lng]}
                                             radius={newZoneForm.radius_km * 1000} // km to meters
                                             pathOptions={{
                                                color: '#9333ea',
                                                fillColor: '#9333ea',
                                                fillOpacity: 0.15,
                                                weight: 2
                                             }}
                                          />
                                       )}
                                       {/* Marqueur au centre */}
                                       {newZoneForm.center_lat && newZoneForm.center_lng && (
                                          <Marker
                                             position={[newZoneForm.center_lat, newZoneForm.center_lng]}
                                             icon={L.divIcon({
                                                className: 'custom-marker',
                                                html: `<div style="background:#9333ea;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
                                                iconSize: [16, 16],
                                                iconAnchor: [8, 8]
                                             })}
                                          />
                                       )}
                                       {/* Click handler */}
                                       <MapClickHandler onClick={(lat, lng) => {
                                          setNewZoneForm(prev => ({ ...prev, center_lat: lat, center_lng: lng }));
                                       }} />
                                    </MapContainer>
                                 </div>
                                 <p className="text-[9px] text-slate-400">
                                    Cercle violet = zone couverte ({newZoneForm.radius_km} km de rayon)
                                 </p>
                              </div>

                              <div className="flex gap-3">
                                 <button
                                    type="submit"
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all"
                                 >
                                    {editingZone ? 'Modifier' : 'Créer'}
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => { setShowAddZone(false); setEditingZone(null); }}
                                    className="px-6 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                                 >
                                    Annuler
                                 </button>
                              </div>
                           </form>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                           {deliveryZones.map((zone) => (
                              <div key={zone.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                 <div>
                                    <p className="font-black text-slate-800">{zone.name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">{zone.radius_km} km</p>
                                    <p className="text-[9px] text-slate-400">{zone.center_lat?.toFixed(4)}, {zone.center_lng?.toFixed(4)}</p>
                                 </div>
                                 <div className="flex gap-1">
                                    <button
                                       onClick={() => handleEditZone(zone)}
                                       className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                       <Edit3 size={14} />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteZone(zone.id)}
                                       className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* DELIVERY FEE SETTINGS */}
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3.5">
                              <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 rounded-xl shadow-sm"><DollarSign size={22} /></div>
                              <div>
                                 <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Frais de Livraison</h3>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">Configuration des tarifs</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button
                                 onClick={handleSavePreset}
                                 className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 flex items-center gap-2"
                              >
                                 <Save size={14} /> Sauver Combinaison
                              </button>
                              <button
                                 onClick={handleSaveDeliverySettings}
                                 disabled={savingFeeSettings}
                                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md ${savingFeeSettings ? 'bg-slate-400 text-white cursor-wait' : 'bg-slate-900 text-white hover:bg-orange-600 shadow-orange-900/10'}`}
                              >
                                 {savingFeeSettings ? '...' : 'Enregistrer GLOBAL'}
                              </button>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           <div className="space-y-2.5">
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">💰 Frais de Base (DH)</label>
                                 <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Actuel: {propDeliveryBaseFee ?? 0}</span>
                              </div>
                              <input
                                 type="number"
                                 min={0}
                                 step="any"
                                 value={Number.isFinite(baseFee) ? baseFee : 0}
                                 onChange={(e) => {
                                    setBaseFee(parseFeeInput(e.target.value));
                                    void onUpdateSettings('delivery_active_preset_id', '');
                                 }}
                                 className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-4 px-5 font-bold outline-none transition-all text-sm"
                                 placeholder="0.00"
                              />
                           </div>

                           <div className="space-y-2.5">
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📏 Km Inclus</label>
                                 <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Actuel: {propDeliveryIncludedKm ?? 0}</span>
                              </div>
                              <input
                                 type="number"
                                 min={0}
                                 step="any"
                                 value={Number.isFinite(includedKm) ? includedKm : 0}
                                 onChange={(e) => {
                                    setIncludedKm(parseFeeInput(e.target.value));
                                    void onUpdateSettings('delivery_active_preset_id', '');
                                 }}
                                 className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-4 px-5 font-bold outline-none transition-all text-sm"
                                 placeholder="0"
                              />
                           </div>

                           <div className="space-y-2.5">
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📈 Prix / Km (DH)</label>
                                 <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Actuel: {propDeliveryFeePerKm ?? 3}</span>
                              </div>
                              <input
                                 type="number"
                                 step="any"
                                 min={0}
                                 value={Number.isFinite(feePerKm) ? feePerKm : 0}
                                 onChange={(e) => {
                                    setFeePerKm(parseFeeInput(e.target.value));
                                    void onUpdateSettings('delivery_active_preset_id', '');
                                 }}
                                 className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-4 px-5 font-bold outline-none transition-all text-sm"
                                 placeholder="0.00"
                              />
                           </div>

                           <div className="space-y-2.5">
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🎯 Autre: Frais Fixe (DH)</label>
                                 <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Actuel: {propDeliveryFixedFee ?? 0}</span>
                              </div>
                              <input
                                 type="number"
                                 min={0}
                                 step="any"
                                 value={Number.isFinite(fixedFee) ? fixedFee : 0}
                                 onChange={(e) => {
                                    setFixedFee(parseFeeInput(e.target.value));
                                    void onUpdateSettings('delivery_active_preset_id', '');
                                 }}
                                 className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl py-4 px-5 font-bold outline-none transition-all text-sm"
                                 placeholder="0.00"
                              />
                           </div>
                        </div>

                        {/* PRESETS SECTION */}
                        <div className="pt-6 border-t border-slate-100">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-4">✨ Combinaisons Enregistrées</label>

                           {deliveryPresets.length === 0 ? (
                              <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 text-center">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune combinaison enregistrée</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {deliveryPresets.map(preset => {
                                    const isActive = propActivePresetId === String(preset.id);
                                    return (
                                       <div key={preset.id} className={`bg-slate-50 border-2 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all group ${isActive ? 'border-orange-500 shadow-sm' : 'border-slate-200'}`}>
                                          <div className="flex justify-between items-start">
                                             <div className="flex items-center gap-2">
                                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">{preset.name}</h4>
                                                {isActive && <span className="text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">APPLIQUÉ</span>}
                                             </div>
                                             <button onClick={() => handleDeletePreset(preset.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12} />
                                             </button>
                                          </div>
                                          <div className="grid grid-cols-2 gap-y-1 text-[9px] font-bold text-slate-500 uppercase">
                                             <span>Base: <span className="text-orange-600">{preset.baseFee} DH</span></span>
                                             <span>Prix/Km: <span className="text-orange-600">{preset.feePerKm} DH</span></span>
                                             <span>Inclus: <span className="text-orange-600">{preset.includedKm} Km</span></span>
                                             <span>Fixe: <span className="text-orange-600">{preset.fixedFee} DH</span></span>
                                          </div>
                                          <button
                                             onClick={() => handleApplyPreset(preset)}
                                             className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-600 hover:text-white hover:border-orange-600'}`}
                                          >
                                             {isActive ? 'Actualiser' : 'Appliquer'}
                                          </button>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </div>

                        {savedFeeSettings && (
                           <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                              <CheckCircle2 size={14} /> ✓ Paramètres globaux enregistrés
                           </div>
                        )}
                     </div>


                     {/* ANNOUNCEMENT MANAGEMENT */}
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-7">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3.5">
                              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-xl shadow-sm"><Megaphone size={22} /></div>
                              <div>
                                 <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Gestion des Annonces</h3>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">Messages promotionnels</p>
                              </div>
                           </div>
                           <button
                              onClick={() => { setEditingAnnouncement(null); setAnnouncementImagePreview(null); setShowAddAnnouncement(true); }}
                              className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                           >
                              <Plus size={16} /> Annonce
                           </button>
                        </div>

                        {announcementsLoadError && (
                           <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[11px] font-bold leading-relaxed space-y-2">
                              <p className="font-black uppercase text-[10px] tracking-widest">Chargement des annonces impossible</p>
                              <p className="opacity-90">{announcementsLoadError}</p>
                              <p className="text-[10px] font-medium text-red-700/90">
                                 Souvent : politique RLS Supabase sur la table <code className="bg-red-100 px-1 rounded">announcements</code> — autoriser au moins{' '}
                                 <code className="bg-red-100 px-1 rounded">SELECT</code> pour le rôle <code className="bg-red-100 px-1 rounded">anon</code> (clé utilisée par le panneau)
                                 ou connecter un utilisateur autorisé.
                              </p>
                              <button
                                 type="button"
                                 onClick={() => refreshAnnouncementsOnly()}
                                 className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-700"
                              >
                                 Réessayer
                              </button>
                           </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                           {!announcementsLoadError && propAnnouncements.length === 0 ? (
                              <div className="col-span-full text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                 <Megaphone size={32} className="mx-auto text-slate-300 mb-2" />
                                 <p className="text-xs font-bold text-slate-400">Aucune annonce programmée</p>
                              </div>
                           ) : !announcementsLoadError ? (
                              propAnnouncements.map(ann => (
                                 <div key={ann.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col gap-3.5 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start gap-2">
                                       <div className="flex-1 min-w-0">
                                          <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{ann.title}</h4>
                                          <p className="text-[9px] text-slate-400 font-bold mt-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                                       </div>
                                       <div className="bauble_box">
                                          <input
                                             className="bauble_input"
                                             id={`ann-active-${ann.id}`}
                                             type="checkbox"
                                             checked={ann.active}
                                             onChange={() => handleToggleAnnouncement(ann.id, ann.active)}
                                          />
                                          <label className="bauble_label" htmlFor={`ann-active-${ann.id}`}></label>
                                       </div>
                                    </div>

                                    {ann.images && ann.images.length > 0 && (
                                       <div className="w-full h-28 bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setViewingImage(ann.images![0])}>
                                          <img src={ann.images[0]} className="w-full h-full object-cover" />
                                       </div>
                                    )}

                                    <p className="text-[10px] text-slate-600 font-medium line-clamp-2 leading-relaxed">{ann.content}</p>

                                    <div className="flex gap-2.5 mt-1 pt-3 border-t border-slate-200">
                                       <button
                                          onClick={() => {
                                             setEditingAnnouncement(ann);
                                             setAnnouncementImagePreview(ann.images?.[0] || null);
                                             setShowAddAnnouncement(true);
                                          }}
                                          className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 active:scale-95 transition-all"
                                       >
                                          Modifier
                                       </button>
                                       <button
                                          onClick={() => handleDeleteAnnouncement(ann.id)}
                                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                          title="Supprimer"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </div>
                                 </div>
                              ))
                           ) : null}
                        </div>
                     </div>

                     {/* Info Box */}
                     <div className="p-5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 flex items-start gap-4">
                        <div className="p-2.5 bg-orange-600 text-white rounded-lg flex-shrink-0"><Info size={20} /></div>
                        <div className="space-y-1">
                           <p className="font-black uppercase text-[9px] text-orange-800 tracking-widest">Information Importante</p>
                           <p className="text-[10px] font-bold text-orange-700 leading-relaxed">Ces paramètres sont affichés aux utilisateurs lors du processus de paiement et support. Assurez-vous de leur exactitude.</p>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'PROMO' && (
                  <PromoCodesPanel
                     promoCodes={promoCodes}
                     darkMode={darkModeIsPromo}
                     onOpenCreate={() => {
                        setEditingPromo(null);
                        setShowAddPromo(true);
                     }}
                     onEdit={promo => {
                        setEditingPromo(promo);
                        setShowAddPromo(true);
                     }}
                     onDelete={handleDeletePromo}
                     onToggleActive={handleTogglePromo}
                  />
               )}

               {activeTab === 'CONTROLL' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                     <div className={['rounded-2xl border p-6 shadow-sm', darkModeIsControll ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'].join(' ')}>
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <h3 className={`text-xl font-black tracking-tight ${darkModeIsControll ? 'text-slate-100' : 'text-slate-900'}`}>La Controll</h3>
                              <p className={`mt-1 text-sm font-medium ${darkModeIsControll ? 'text-slate-400' : 'text-slate-500'}`}>
                                 Raccourcis officiels vers les applications VEETAA.
                              </p>
                           </div>
                           <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-orange-700">
                              Stream deck
                           </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                           {[
                              { label: 'PARTENAIRE', url: 'https://veetaa-partnaire.vercel.app/' },
                              { label: 'PANNEL', url: 'https://veetaa-pannel.vercel.app/' },
                              { label: 'LIVRAUR', url: 'https://veetaa-livreur.vercel.app/' },
                              { label: 'WEBSITE', url: 'https://www.veetaa.com/' },
                              { label: 'USER APK', url: 'https://veetaa-apk-user.vercel.app/' },
                              { label: 'APK BACKUP', url: 'https://veetaa-website-nine.vercel.app/' },
                           ].map((x) => (
                              <a
                                 key={x.label}
                                 href={x.url}
                                 target="_blank"
                                 rel="noreferrer"
                                 className={[
                                    'group flex items-center justify-between rounded-2xl border px-5 py-4 shadow-sm transition hover:border-orange-200 hover:shadow-md',
                                    darkModeIsControll ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900/80' : 'border-slate-200 bg-slate-50 hover:bg-white',
                                 ].join(' ')}
                              >
                                 <div className="min-w-0">
                                    <div className={`text-xs font-black uppercase tracking-widest ${darkModeIsControll ? 'text-slate-100' : 'text-slate-900'}`}>
                                       {x.label}
                                    </div>
                                    <div className={`mt-1 truncate text-[11px] font-semibold ${darkModeIsControll ? 'text-slate-400' : 'text-slate-500'}`}>
                                       {x.url}
                                    </div>
                                 </div>
                                 <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition group-hover:bg-orange-500">
                                    <ExternalLink size={18} aria-hidden />
                                 </div>
                              </a>
                           ))}
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'PARTNERS_MGMT' && (
                  <PartnersMgmtPanel
                     partnerAccounts={partnerAccounts}
                     partnerStoreAccess={partnerStoreAccess}
                     stores={stores}
                     darkMode={darkModeIsPartnersMgmt}
                     onOpenCreate={() => {
                        setEditingPartner(null);
                        setSelectedPartnerStores([]);
                        setShowAddPartnerAccount(true);
                     }}
                     onEdit={(partner, storeIds) => {
                        setEditingPartner(partner);
                        setSelectedPartnerStores(storeIds);
                        setShowAddPartnerAccount(true);
                     }}
                     onToggleActive={handleTogglePartner}
                     onDelete={handleDeletePartner}
                  />
               )}

               {/* ADMINS MANAGEMENT */}
               {activeTab === 'ADMINS' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                     <section className={['rounded-2xl border p-4 shadow-sm sm:p-5', darkModeIsAdmins ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-white'].join(' ')}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                           <div>
                              <h2 className={`text-lg font-black tracking-tight sm:text-xl ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-900'}`}>Admins</h2>
                              <p className={`mt-1 max-w-xl text-sm font-medium ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                                 Comptes sous-administrateurs et droits d&apos;accès au panneau.
                              </p>
                           </div>
                           <div className="flex flex-wrap items-center gap-2">
                              <button
                                 type="button"
                                 onClick={() => fetchAdmins()}
                                 disabled={loadingAdmins}
                                 className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 ${darkModeIsAdmins ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-300/60 hover:text-orange-300' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'}`}
                              >
                                 <RotateCw size={15} className={loadingAdmins ? 'animate-spin' : ''} />
                                 Actualiser
                              </button>
                              <button
                                 type="button"
                                 onClick={() => {
                                    setEditingAdmin(null);
                                    setNewAdminForm({
                                       username: '',
                                       badge_id: '',
                                       is_active: true,
                                       permissions: {
                                          viewOrders: false,
                                          manageUsers: false,
                                          manageDrivers: false,
                                          editProducts: false,
                                          editStores: false,
                                          viewReports: false,
                                          manageAdmins: false,
                                          manageSettings: false,
                                          accessPromo: false,
                                          accessMaps: false,
                                          accessHistory: false,
                                          accessFinance: false,
                                          accessStatistics: false,
                                          accessCategories: false,
                                          accessPartnersManagement: false,
                                          accessSupport: false,
                                       },
                                    });
                                    setShowAddAdmin(true);
                                 }}
                                 className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-orange-500 ${darkModeIsAdmins ? 'bg-slate-800' : 'bg-slate-900'}`}
                              >
                                 <Plus size={16} strokeWidth={2.5} />
                                 Nouvel admin
                              </button>
                           </div>
                        </div>
                     </section>

                     {/* ADMINS EN LIGNE */}
                     <section className={['rounded-2xl border p-4 sm:p-5', darkModeIsAdmins ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/60'].join(' ')}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                           <div>
                              <h3 className={`text-base font-black ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-900'}`}>Admins en ligne</h3>
                              <p className={`mt-1 text-sm ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                                 Basé sur la dernière activité (&lt;= 60s)
                              </p>
                           </div>

                           <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${darkModeIsAdmins ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                 <CheckCircle2 size={14} className="text-emerald-600" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    Total: {adminsOnline.length}
                                 </span>
                              </span>
                              <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${darkModeIsAdmins ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                                    Super: {adminsOnline.filter(a => a.role === 'super_admin').length}
                                 </span>
                              </span>
                              <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${darkModeIsAdmins ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                                    Sub: {adminsOnline.filter(a => a.role === 'sub_admin').length}
                                 </span>
                              </span>
                              <button
                                 type="button"
                                 onClick={() => void fetchOnlineAdmins()}
                                 disabled={loadingAdminsOnline}
                                 className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors disabled:opacity-50 ${darkModeIsAdmins ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-300/60 hover:text-orange-300' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600'}`}
                              >
                                 <RotateCw size={15} className={loadingAdminsOnline ? 'animate-spin' : ''} />
                                 Actualiser
                              </button>
                           </div>
                        </div>

                        <div className="mt-4">
                           {loadingAdminsOnline ? (
                              <div className={`py-8 text-center ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                                 <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                              </div>
                           ) : adminsOnline.length === 0 ? (
                              <div className="py-8 text-center">
                                 <p className={`text-sm font-medium ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>Aucun admin en ligne pour l’instant.</p>
                                 <p className={`text-xs mt-1 ${darkModeIsAdmins ? 'text-slate-500' : 'text-slate-400'}`}>Assurez-vous que les admins ont ouvert la page du panel.</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                 {adminsOnline.map((a) => {
                                    const secondsAgo = Math.max(
                                       0,
                                       Math.round((Date.now() - new Date(a.last_seen_at).getTime()) / 1000)
                                    );
                                    return (
                                       <div key={a.username} className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${darkModeIsAdmins ? 'border-slate-700 bg-slate-950/70' : 'border-slate-100 bg-white'}`}>
                                          <div className="min-w-0">
                                             <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black shrink-0 ${darkModeIsAdmins ? 'bg-orange-500/20 text-orange-200' : 'bg-orange-100 text-orange-700'}`}>
                                                   {String(a.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                   <div className={`truncate font-bold ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-900'}`}>{a.username}</div>
                                                   <div className={`text-xs ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                                                      Dernière activité: {secondsAgo}s
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                          <span
                                             className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                                a.role === 'super_admin'
                                                   ? (darkModeIsAdmins ? 'bg-orange-500/15 text-orange-200 border border-orange-500/30' : 'bg-orange-50 text-orange-700')
                                                   : (darkModeIsAdmins ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30' : 'bg-blue-50 text-blue-700')
                                             }`}
                                          >
                                             {a.role === 'super_admin' ? 'Super' : 'Sub'}
                                          </span>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                     </section>

                     {(showAddAdmin || editingAdmin) && (
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                           <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                    <UserCheck size={22} strokeWidth={2.25} />
                                 </div>
                                 <div>
                                    <h3 className="text-base font-black text-slate-900">
                                       {editingAdmin ? 'Modifier l’administrateur' : 'Nouvel administrateur'}
                                    </h3>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                       {editingAdmin
                                          ? 'Identifiants et permissions du compte sélectionné.'
                                          : 'Créez un compte avec un nom d’utilisateur et un badge (mot de passe).'}
                                    </p>
                                 </div>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => resetAdminForm()}
                                 className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                              >
                                 Fermer
                              </button>
                           </div>

                           <form onSubmit={handleCreateAdmin} className="mt-6 space-y-8">
                              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                 <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                       <User size={14} className="text-slate-400" />
                                       Nom d&apos;utilisateur
                                    </label>
                                    <input
                                       type="text"
                                       value={newAdminForm.username}
                                       onChange={e => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
                                       placeholder="ex. equipe_kenitra"
                                       required
                                       className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-1 focus:ring-orange-400/30"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                       <KeyRound size={14} className="text-slate-400" />
                                       Badge ID (mot de passe)
                                    </label>
                                    <input
                                       type="password"
                                       value={newAdminForm.badge_id}
                                       onChange={e => setNewAdminForm({ ...newAdminForm, badge_id: e.target.value })}
                                       placeholder="••••••••"
                                       required={!editingAdmin}
                                       className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 px-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-1 focus:ring-orange-400/30"
                                    />
                                    {editingAdmin && (
                                       <p className="text-[11px] font-medium text-slate-500">
                                          Laissez vide pour conserver le badge actuel.
                                       </p>
                                    )}
                                 </div>
                              </div>

                              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
                                 <div className="mb-5 flex items-center gap-2">
                                    <Settings size={18} className="text-orange-500" />
                                    <div>
                                       <p className="text-sm font-black text-slate-800">Permissions</p>
                                       <p className="text-xs font-medium text-slate-500">
                                          Actions métier puis accès aux onglets du menu.
                                       </p>
                                    </div>
                                 </div>

                                 <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</p>
                                 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {(
                                       [
                                          { perm: 'viewOrders' as const, label: 'Commandes', Icon: Package },
                                          { perm: 'manageUsers' as const, label: 'Clients', Icon: Users },
                                          { perm: 'manageDrivers' as const, label: 'Livreurs', Icon: Truck },
                                          { perm: 'editProducts' as const, label: 'Produits', Icon: ShoppingBag },
                                          { perm: 'editStores' as const, label: 'Marques', Icon: StoreIcon },
                                          { perm: 'viewReports' as const, label: 'Rapports', Icon: BarChart3 },
                                          { perm: 'manageAdmins' as const, label: 'Admins', Icon: UserCheck },
                                          { perm: 'manageSettings' as const, label: 'Configuration', Icon: Settings },
                                       ] as const
                                    ).map(({ perm, label, Icon }) => {
                                       const on = newAdminForm.permissions[perm];
                                       return (
                                          <label
                                             key={perm}
                                             className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${on
                                                   ? 'border-orange-200 bg-orange-50/60 ring-1 ring-orange-500/20'
                                                   : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                          >
                                             <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={e =>
                                                   setNewAdminForm({
                                                      ...newAdminForm,
                                                      permissions: { ...newAdminForm.permissions, [perm]: e.target.checked },
                                                   })
                                                }
                                                className="h-4 w-4 shrink-0 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                             />
                                             <Icon size={16} className={on ? 'text-orange-600' : 'text-slate-400'} strokeWidth={2.25} />
                                             <span className={`text-xs font-bold ${on ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
                                          </label>
                                       );
                                    })}
                                 </div>

                                 <p className="mb-3 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Pages du menu
                                 </p>
                                 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {(
                                       [
                                          { key: 'accessPromo' as const, label: 'Codes promo', Icon: Ticket },
                                          { key: 'accessMaps' as const, label: 'Live Map', Icon: MapIcon },
                                          { key: 'accessHistory' as const, label: 'Historique', Icon: HistoryIcon },
                                          { key: 'accessFinance' as const, label: 'Finance', Icon: DollarSign },
                                          { key: 'accessStatistics' as const, label: 'Analytics', Icon: PieChartIcon },
                                          { key: 'accessCategories' as const, label: 'Catégories', Icon: Filter },
                                          { key: 'accessPartnersManagement' as const, label: 'Partenaires', Icon: ShieldCheck },
                                          { key: 'accessSupport' as const, label: 'Support', Icon: MessageSquare },
                                       ] as const
                                    ).map(({ key, label, Icon }) => {
                                       const on = newAdminForm.permissions[key];
                                       return (
                                          <label
                                             key={key}
                                             className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${on
                                                   ? 'border-orange-200 bg-white ring-1 ring-orange-500/15'
                                                   : 'border-slate-200 bg-white/80 hover:border-slate-300'
                                                }`}
                                          >
                                             <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={e =>
                                                   setNewAdminForm({
                                                      ...newAdminForm,
                                                      permissions: { ...newAdminForm.permissions, [key]: e.target.checked },
                                                   })
                                                }
                                                className="h-4 w-4 shrink-0 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                             />
                                             <Icon size={16} className={on ? 'text-orange-600' : 'text-slate-400'} strokeWidth={2.25} />
                                             <span className={`text-xs font-bold ${on ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
                                          </label>
                                       );
                                    })}
                                 </div>

                                 <p className="mt-5 border-t border-slate-200/80 pt-4 text-xs leading-relaxed text-slate-500">
                                    Les <span className="font-semibold text-slate-700">actions</span> contrôlent les opérations (commandes,
                                    catalogue, etc.). Les <span className="font-semibold text-slate-700">pages</span> affichent ou masquent
                                    les entrées du menu latéral.
                                 </p>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                 <button
                                    type="button"
                                    onClick={() => resetAdminForm()}
                                    className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
                                 >
                                    Annuler
                                 </button>
                                 <button
                                    type="submit"
                                    className="rounded-xl bg-slate-900 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-orange-500"
                                 >
                                    {editingAdmin ? 'Enregistrer' : 'Créer le compte'}
                                 </button>
                              </div>
                           </form>
                        </div>
                     )}

                     <div className={['rounded-2xl border p-5 shadow-sm sm:p-6', darkModeIsAdmins ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-white'].join(' ')}>
                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                           <div>
                              <h3 className={`text-base font-black ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-900'}`}>Comptes</h3>
                              <p className={`text-sm ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>Liste des sous-admins et résumé des droits.</p>
                           </div>
                        </div>

                        <div className={`overflow-x-auto rounded-xl border ${darkModeIsAdmins ? 'border-slate-800' : 'border-slate-100'}`}>
                           <table className="w-full min-w-[720px] text-left text-sm">
                              <thead className={`border-b ${darkModeIsAdmins ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-slate-50/80'}`}>
                                 <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       Utilisateur
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       Rôle
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       Statut
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       Permissions
                                    </th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       Actions
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className={`divide-y ${darkModeIsAdmins ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                 {loadingAdmins ? (
                                    <tr>
                                       <td colSpan={5} className="px-4 py-12 text-center">
                                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                                       </td>
                                    </tr>
                                 ) : adminsList.length === 0 ? (
                                    <tr>
                                       <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-slate-400">
                                          Aucun sous-admin pour l’instant. Utilisez « Nouvel admin » pour en créer un.
                                       </td>
                                    </tr>
                                 ) : (
                                    visibleAdmins.map(admin => (
                                       <tr key={admin.id} className={`transition-colors ${darkModeIsAdmins ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'}`}>
                                          <td className="px-4 py-3.5">
                                             <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${darkModeIsAdmins ? 'bg-orange-500/20 text-orange-200' : 'bg-orange-100 text-orange-700'}`}>
                                                   {String(admin.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                   <div className={`truncate font-bold ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-900'}`}>{admin.username}</div>
                                                   <div className={`truncate text-xs ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                                                      {admin.display_name || '—'}
                                                   </div>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-4 py-3.5">
                                             <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${darkModeIsAdmins ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {admin.role}
                                             </span>
                                          </td>
                                          <td className="px-4 py-3.5">
                                             <span
                                                className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${admin.is_active
                                                      ? 'bg-emerald-50 text-emerald-700'
                                                      : 'bg-red-50 text-red-700'
                                                   }`}
                                             >
                                                {admin.is_active ? 'Actif' : 'Inactif'}
                                             </span>
                                          </td>
                                          <td className="px-4 py-3.5">
                                             <div className="flex max-w-[280px] flex-wrap gap-1">
                                                {admin.permissions &&
                                                   Object.entries(admin.permissions)
                                                      .filter(([, val]) => val === true)
                                                      .map(([key]) => (
                                                         <span
                                                            key={key}
                                                            className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${darkModeIsAdmins ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600'}`}
                                                         >
                                                            {key}
                                                         </span>
                                                      ))}
                                                {(!admin.permissions ||
                                                   Object.values(admin.permissions).every(v => v === false)) && (
                                                      <span className="text-xs italic text-slate-400">Aucune</span>
                                                   )}
                                             </div>
                                          </td>
                                          <td className="px-4 py-3.5 text-center">
                                             <div className="flex justify-center gap-1">
                                                <button
                                                   type="button"
                                                   onClick={() => handleEditAdmin(admin)}
                                                   className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-600"
                                                   title="Modifier"
                                                >
                                                   <Edit2 size={16} />
                                                </button>
                                                <button
                                                   type="button"
                                                   onClick={() => handleDeleteAdmin(admin.id)}
                                                   disabled={adminActionLoading === admin.id}
                                                   className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                   title="Supprimer"
                                                >
                                                   {adminActionLoading === admin.id ? (
                                                      <Loader2 className="animate-spin" size={16} />
                                                   ) : (
                                                      <Trash2 size={16} />
                                                   )}
                                                </button>
                                             </div>
                                          </td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>

                        <div className={`mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between ${darkModeIsAdmins ? 'border-slate-800' : 'border-slate-100'}`}>
                           <p className={`text-sm ${darkModeIsAdmins ? 'text-slate-400' : 'text-slate-500'}`}>
                              {visibleAdmins.length} sur {adminsList.length} compte(s)
                           </p>
                           <div className="flex flex-wrap items-center gap-2">
                              <button
                                 type="button"
                                 disabled={adminsPage <= 1}
                                 onClick={() => setAdminsPage(p => Math.max(1, p - 1))}
                                 className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${darkModeIsAdmins ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                              >
                                 Précédent
                              </button>
                              <span className={`text-xs font-bold ${darkModeIsAdmins ? 'text-slate-300' : 'text-slate-600'}`}>
                                 Page {adminsPage} / {Math.max(1, Math.ceil(adminsList.length / adminsPerPage))}
                              </span>
                              <button
                                 type="button"
                                 disabled={adminsPage >= Math.ceil(adminsList.length / adminsPerPage)}
                                 onClick={() =>
                                    setAdminsPage(p =>
                                       Math.min(Math.ceil(adminsList.length / adminsPerPage) || 1, p + 1)
                                    )
                                 }
                                 className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${darkModeIsAdmins ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                              >
                                 Suivant
                              </button>
                           </div>
                        </div>

                        <div className={`mt-5 rounded-xl border p-4 text-sm ${darkModeIsAdmins ? 'border-slate-800 bg-slate-900/50 text-slate-300' : 'border-slate-100 bg-slate-50/60 text-slate-600'}`}>
                           <p className={`mb-2 font-bold ${darkModeIsAdmins ? 'text-slate-100' : 'text-slate-800'}`}>Rappel</p>
                           <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed sm:text-sm">
                              <li>Le super-admin a accès à tout le panneau.</li>
                              <li>Les sous-admins ne voient que ce qui est coché ci-dessus.</li>
                              <li>Seul un super-admin peut gérer cette page.</li>
                           </ul>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'BROADCAST_MAIL' &&
                  (tabVisibility.BROADCAST_MAIL ? (
                     <AdminBroadcastMailPanel users={users} darkMode={darkModeIsBroadcastMail} />
                  ) : (
                     <div className={['rounded-2xl border p-10 text-center shadow-sm', darkModeIsBroadcastMail ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'].join(' ')}>
                        <p className={`text-sm font-bold ${darkModeIsBroadcastMail ? 'text-slate-200' : 'text-slate-700'}`}>Accès non autorisé</p>
                        <p className={`mt-2 text-xs ${darkModeIsBroadcastMail ? 'text-slate-400' : 'text-slate-500'}`}>
                           Cette page est réservée aux super-administrateurs et aux comptes avec accès Clients ou Admins.
                        </p>
                     </div>
                  ))}

               {activeTab === 'SUPPORT_TICKETS' && (
                  <SupportTicketsPanel
                     supportFilter={supportFilter}
                     onSupportFilterChange={setSupportFilter}
                     selectedTicketIds={selectedTicketIds}
                     filteredTickets={filteredTickets}
                     supportTickets={supportTickets}
                     onSelectAllTickets={handleSelectAllTickets}
                     onDeleteSelectedTickets={handleDeleteSelectedTickets}
                     onToggleTicketSelection={handleToggleTicketSelection}
                     onOpenTicket={setSelectedTicket}
                     onRefresh={fetchData}
                     darkMode={darkModeIsSupport}
                  />
               )}
            </div>
         </main>

         {/* MODAL SUPPORT TICKET */}
         {selectedTicket && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}>
               <div
                  className={[
                     'w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300',
                     darkModeIsSupport ? 'bg-slate-950 border border-slate-800 text-slate-100' : 'bg-white',
                  ].join(' ')}
                  onClick={e => e.stopPropagation()}
               >
                  <header
                     className={[
                        'px-8 py-6 border-b flex justify-between items-center',
                        darkModeIsSupport ? 'border-slate-800 bg-slate-900/70' : 'border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100',
                     ].join(' ')}
                  >
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl shadow-lg"><MessageSquare size={24} /></div>
                        <div>
                           <h3 className={`font-black text-lg uppercase tracking-tight ${darkModeIsSupport ? 'text-slate-100' : 'text-slate-800'}`}>Détails du Ticket</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Support Client</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setSelectedTicket(null)}
                        className={[
                           'p-2.5 rounded-xl transition-colors',
                           darkModeIsSupport ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                        ].join(' ')}
                     >
                        <X size={20} />
                     </button>
                  </header>
                  <div className="p-0 flex flex-col h-[600px]">
                     {/* Ticket Info Header */}
                     <div
                        className={[
                           'px-6 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0',
                           darkModeIsSupport ? 'bg-slate-900/60 border-slate-800' : 'bg-gradient-to-r from-slate-50 to-slate-100',
                        ].join(' ')}
                     >
                        <div className="flex min-w-0 flex-wrap items-center gap-5">
                           <div className="min-w-[140px] space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Livreur</p>
                              <p className="font-bold text-slate-800 text-sm truncate">{selectedTicket.driver_name}</p>
                           </div>
                           <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>
                           <div className="min-w-[160px] space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID</p>
                              <p className="font-bold text-slate-600 text-[10px] font-mono truncate">{selectedTicket.driver_id}</p>
                           </div>
                           {selectedTicket.driver_phone && (
                              <>
                                 <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                                 <div className="hidden sm:block min-w-[150px] space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Téléphone</p>
                                    <p className="font-bold text-slate-600 text-[11px] font-mono">{selectedTicket.driver_phone}</p>
                                 </div>
                              </>
                           )}
                        </div>
                        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
                           {selectedTicket.driver_phone && (
                              <a
                                 href={`tel:${String(selectedTicket.driver_phone).replace(/[^0-9+]/g, '')}`}
                                 className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
                                 title={`Appeler ${selectedTicket.driver_phone}`}
                              >
                                 <Phone size={14} aria-hidden />
                                 Appeler
                              </a>
                           )}
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Statut</label>
                           <select
                              value={selectedTicket.status}
                              onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                              className={[
                                 'min-w-[140px] border-2 focus:border-orange-500 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase outline-none transition-all cursor-pointer shadow-sm',
                                 darkModeIsSupport ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-200',
                              ].join(' ')}
                           >
                              <option value="open">Ouvert</option>
                              <option value="in_progress">En cours</option>
                              <option value="resolved">Résolu</option>
                           </select>
                        </div>
                     </div>

                     {/* Chat Messages Area */}
                     <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-4 scroll-smooth ${darkModeIsSupport ? 'bg-slate-950' : 'bg-white'}`}>
                        {/* Initial Description */}
                        <div className="flex justify-start">
                           <div className="max-w-[85%] space-y-1.5">
                              <div className={`p-4 rounded-2xl rounded-tl-none text-sm font-medium shadow-sm border ${darkModeIsSupport ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200/50'}`}>
                                 <p className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-2">Message Initial</p>
                                 <p className={`${darkModeIsSupport ? 'text-slate-200' : 'text-slate-700'} leading-relaxed`}>{selectedTicket.description}</p>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold ml-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                           </div>
                        </div>

                        {/* Chat History */}
                        {supportMessages.map((m) => (
                           <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] space-y-1.5 ${m.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                                 <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm border ${m.sender_type === 'admin'
                                    ? 'bg-orange-600 text-white rounded-tr-none border-orange-700'
                                    : darkModeIsSupport
                                       ? 'bg-slate-900 text-slate-200 rounded-tl-none border-slate-800'
                                       : 'bg-slate-100 text-slate-700 rounded-tl-none border-slate-200'
                                    }`}>
                                    <p className="leading-relaxed">{m.message}</p>
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
                     <div
                        className={[
                           'px-6 py-4 border-t shrink-0',
                           darkModeIsSupport ? 'bg-slate-900/70 border-slate-800' : 'bg-gradient-to-r from-slate-50 to-slate-100',
                        ].join(' ')}
                     >
                        <div className="relative flex items-center gap-2">
                           <input
                              ref={replyInputRef}
                              className={[
                                 'flex-1 border-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-5 py-3.5 text-sm font-bold outline-none transition-all shadow-sm placeholder:text-slate-400',
                                 darkModeIsSupport ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-200',
                              ].join(' ')}
                              placeholder="Écrivez votre réponse..."
                              defaultValue={replyText}
                              onInput={e => setReplyHasText(((e.target as HTMLInputElement).value || '').trim().length > 0)}
                              onKeyDown={e => (e as React.KeyboardEvent).key === 'Enter' && handleReplyTicket()}
                           />
                           <button
                              onClick={handleReplyTicket}
                              disabled={!replyHasText || replySubmitting}
                              className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                              title="Envoyer"
                           >
                              {replySubmitting ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={20} />}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {showDeleteZoneModal && (
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm" onClick={() => !zoneDeleteLoading && setShowDeleteZoneModal(false)}>
               <div
                  className={[
                     'w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden',
                     darkModeIsConfig ? 'bg-slate-950 border border-slate-800 text-slate-100' : 'bg-white border border-slate-200',
                  ].join(' ')}
                  onClick={e => e.stopPropagation()}
               >
                  <header className={['px-6 py-5 border-b flex items-start justify-between gap-4', darkModeIsConfig ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'].join(' ')}>
                     <div>
                        <h3 className={`text-base font-black uppercase tracking-widest ${darkModeIsConfig ? 'text-slate-100' : 'text-slate-900'}`}>
                           Supprimer la ville
                        </h3>
                        <p className={`mt-1 text-xs ${darkModeIsConfig ? 'text-slate-400' : 'text-slate-500'}`}>
                           {zoneDeleteTarget?.name ? `Zone: ${zoneDeleteTarget.name}` : 'Zone sélectionnée'}
                        </p>
                     </div>
                     <button
                        type="button"
                        disabled={zoneDeleteLoading}
                        onClick={() => setShowDeleteZoneModal(false)}
                        className={[
                           'p-2 rounded-xl transition-colors',
                           darkModeIsConfig ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-200',
                        ].join(' ')}
                     >
                        <X size={18} />
                     </button>
                  </header>

                  <div className="px-6 py-5 space-y-4">
                     <div className={['rounded-xl border p-4 text-sm', darkModeIsConfig ? 'border-slate-800 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'].join(' ')}>
                        {zoneDeleteLinkedCount > 0
                           ? `${zoneDeleteLinkedCount} store(s) sont liés à cette ville. Choisissez une ville de remplacement ou laissez vide pour les détacher.`
                           : 'Aucun store lié à cette ville. Vous pouvez supprimer directement.'}
                     </div>

                     {zoneDeleteLinkedCount > 0 && (
                        <div className="space-y-2">
                           <label className={`text-[10px] font-black uppercase tracking-widest ${darkModeIsConfig ? 'text-slate-400' : 'text-slate-500'}`}>
                              Ville de remplacement
                           </label>
                           <select
                              value={zoneDeleteReplacementId}
                              onChange={e => setZoneDeleteReplacementId(e.target.value)}
                              className={[
                                 'w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none',
                                 darkModeIsConfig
                                    ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-orange-400'
                                    : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400',
                              ].join(' ')}
                              disabled={zoneDeleteLoading}
                           >
                              <option value="">Aucune (détacher les stores)</option>
                              {zoneDeleteChoices.map(z => (
                                 <option key={z.id} value={z.id}>
                                    {z.name}
                                 </option>
                              ))}
                           </select>
                        </div>
                     )}

                     {zoneDeleteError && (
                        <div className={['rounded-xl border p-3 text-xs font-bold', darkModeIsConfig ? 'border-red-500/40 bg-red-900/20 text-red-200' : 'border-red-200 bg-red-50 text-red-700'].join(' ')}>
                           {zoneDeleteError}
                        </div>
                     )}
                  </div>

                  <footer className={['px-6 py-4 border-t flex items-center justify-end gap-2', darkModeIsConfig ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'].join(' ')}>
                     <button
                        type="button"
                        disabled={zoneDeleteLoading}
                        onClick={() => setShowDeleteZoneModal(false)}
                        className={[
                           'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors',
                           darkModeIsConfig ? 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100',
                        ].join(' ')}
                     >
                        Annuler
                     </button>
                     <button
                        type="button"
                        disabled={zoneDeleteLoading}
                        onClick={() => void confirmDeleteZone()}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-60"
                     >
                        {zoneDeleteLoading ? 'Suppression...' : 'Confirmer'}
                     </button>
                  </footer>
               </div>
            </div>
         )}

         {/* MODAL AJOUT/MODIF CODE PROMO */}
         {showAddPromo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60" onClick={() => { setShowAddPromo(false); setEditingPromo(null); }}>
               <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                  <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl">
                           <Ticket size={24} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">
                           {editingPromo ? 'Modifier Code Promo' : 'Nouveau Code Promo'}
                        </h3>
                     </div>
                     <button onClick={() => { setShowAddPromo(false); setEditingPromo(null); }} className="p-2 bg-white rounded-full hover:bg-slate-200"><X size={20} /></button>
                  </header>

                  <form onSubmit={handleSavePromo} className="p-8 space-y-6">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                              <span>Code Promotionnel</span>
                              {!editingPromo && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const input = document.getElementById('promo-code-input') as HTMLInputElement;
                                       if (input) input.value = generateRandomCode();
                                    }}
                                    className="text-orange-600 hover:text-orange-700 underline"
                                 >
                                    Générer Auto
                                 </button>
                              )}
                           </label>
                           <input
                              id="promo-code-input"
                              name="code"
                              type="text"
                              required
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black uppercase tracking-widest focus:border-orange-500 outline-none transition-all"
                              defaultValue={editingPromo?.code || ''}
                              placeholder="EX: ETE2024"
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type de Remise</label>
                              <select
                                 name="type"
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all cursor-pointer"
                                 defaultValue={editingPromo?.type || 'fixed'}
                              >
                                 <option value="fixed">Montant Fixe (DH)</option>
                                 <option value="percentage">Pourcentage (%)</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur</label>
                              <input
                                 name="value"
                                 type="number"
                                 required
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all"
                                 defaultValue={editingPromo?.value}
                                 placeholder="ex: 15"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limite d'Usage</label>
                              <input
                                 name="max_uses"
                                 type="number"
                                 required
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all"
                                 defaultValue={editingPromo?.max_uses || 100}
                                 placeholder="ex: 50"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min. Commande (DH)</label>
                              <input
                                 name="min_order_amount"
                                 type="number"
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-orange-500 outline-none transition-all"
                                 defaultValue={editingPromo?.min_order_amount || 0}
                                 placeholder="ex: 100"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                        <AlertCircle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-orange-800 leading-relaxed uppercase">
                           Le code sera activé immédiatement dès sa création. Il se désactivera automatiquement une fois la limite d'usage atteinte.
                        </p>
                     </div>

                     <button
                        type="submit"
                        disabled={promoLoading}
                        className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                     >
                        {promoLoading ? 'Traitement...' : editingPromo ? 'Enregistrer les modifications' : 'Créer le Code Promo'}
                     </button>
                  </form>
               </div>
            </div>
         )}
         {/* MODAL AJOUT/MODIF PARTENAIRE */}
         {showAddPartnerAccount && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowAddPartnerAccount(false); setEditingPartner(null); }}>
               <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <header className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 flex justify-between items-center sticky top-0 z-10">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl shadow-lg"><Users size={24} /></div>
                        <div>
                           <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                              {editingPartner ? 'Modifier' : 'Nouveau'} Compte Partenaire
                           </h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{editingPartner ? 'Mise à jour des droits d\'accès' : 'Création d\'un nouveau compte'}</p>
                        </div>
                     </div>
                     <button onClick={() => { setShowAddPartnerAccount(false); setEditingPartner(null); }} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"><X size={20} /></button>
                  </header>
                  <form onSubmit={handleSavePartner} className="p-8 space-y-7">
                     {/* Email Input */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           📧 Email de Connexion
                        </label>
                        <input name="email" type="text" required autoComplete="username" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 px-5 font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-300" defaultValue={editingPartner?.email} placeholder="Identifiant ou e-mail partenaire" />
                     </div>

                     {/* Password Input */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           🔐 {editingPartner ? 'Nouveau Mot de Passe (optionnel)' : 'Mot de Passe'}
                        </label>
                        <input name="password" type="password" {...(editingPartner ? {} : { required: true })} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 px-5 font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-300" placeholder="••••••••" />
                     </div>

                     {/* Authorized Stores */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           🏪 Boutiques Autorisées
                        </label>
                        <div className="max-h-52 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border-2 border-slate-200 space-y-2.5">
                           {stores.filter(s => s.is_active !== false).map(store => (
                              <label key={store.id} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${selectedPartnerStores.includes(store.id) ? 'bg-white border-2 border-orange-300 shadow-sm' : 'hover:bg-white border-2 border-transparent'}`}>
                                 <input type="checkbox" checked={selectedPartnerStores.includes(store.id)} onChange={(e) => {
                                    if (e.target.checked) setSelectedPartnerStores([...selectedPartnerStores, store.id]);
                                    else setSelectedPartnerStores(selectedPartnerStores.filter(id => id !== store.id));
                                 }} className="accent-orange-500 w-5 h-5 cursor-pointer" />
                                 <div className="flex items-center gap-3 flex-1">
                                    {store.image_url && <img src={store.image_url} className="w-9 h-9 rounded-lg object-cover border border-slate-200" />}
                                    <span className="font-bold text-sm text-slate-700">{store.name}</span>
                                 </div>
                              </label>
                           ))}
                        </div>
                     </div>

                     {/* Permissions Grid */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           ✓ Permissions d'Accès
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                           <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 transition-all hover:shadow-md hover:border-emerald-400">
                              <input type="checkbox" name="manage_products" defaultChecked={editingPartner ? editingPartner.permissions?.manage_products !== false : true} className="accent-emerald-600 w-5 h-5 cursor-pointer" />
                              <div className="flex items-center gap-2.5 flex-1">
                                 <ShoppingBag size={18} className="text-emerald-600" />
                                 <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Produits</span>
                              </div>
                           </label>
                           <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 transition-all hover:shadow-md hover:border-blue-400">
                              <input type="checkbox" name="manage_orders" defaultChecked={editingPartner ? editingPartner.permissions?.manage_orders !== false : true} className="accent-blue-600 w-5 h-5 cursor-pointer" />
                              <div className="flex items-center gap-2.5 flex-1">
                                 <Package size={18} className="text-blue-600" />
                                 <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Commandes</span>
                              </div>
                           </label>
                           <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 transition-all hover:shadow-md hover:border-purple-400">
                              <input type="checkbox" name="view_stats" defaultChecked={editingPartner ? editingPartner.permissions?.view_stats !== false : true} className="accent-purple-600 w-5 h-5 cursor-pointer" />
                              <div className="flex items-center gap-2.5 flex-1">
                                 <BarChart3 size={18} className="text-purple-600" />
                                 <span className="text-xs font-black text-purple-700 uppercase tracking-wider">Stats</span>
                              </div>
                           </label>
                           <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 transition-all hover:shadow-md hover:border-amber-400">
                              <input type="checkbox" name="edit_profile" defaultChecked={editingPartner ? editingPartner.permissions?.edit_profile !== false : true} className="accent-amber-600 w-5 h-5 cursor-pointer" />
                              <div className="flex items-center gap-2.5 flex-1">
                                 <Edit3 size={18} className="text-amber-600" />
                                 <span className="text-xs font-black text-amber-700 uppercase tracking-wider">Profil</span>
                              </div>
                           </label>
                        </div>
                     </div>

                     {/* Info Box */}
                     <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex items-start gap-3">
                        <Info size={20} className="text-blue-600 shrink-0 mt-0.5 font-bold" />
                        <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-wide">
                           Le partenaire pourra accéder à ses boutiques et droits associés. Seules les boutiques cochées et les permissions activées seront accessibles.
                        </p>
                     </div>

                     {/* Submit Button */}
                     <button type="submit" className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4.5 rounded-xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all hover:from-orange-600 hover:to-orange-500 hover:shadow-orange-500/30 flex items-center justify-center gap-2">
                        <Users size={18} />
                        {editingPartner ? 'Enregistrer les Modifications' : 'Créer le Compte'}
                     </button>
                  </form>
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

         {/* MODAL SOCIAL LINK */}
         {
            showAddSocialLink && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60 transition-opacity duration-150" onClick={() => setShowAddSocialLink(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingSocialLink ? 'Modifier' : 'Nouveau'} Lien Social</h3>
                        <button onClick={() => setShowAddSocialLink(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form onSubmit={handleSaveSocialLink} className="p-8 space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plateforme (ex: Facebook, Instagram)</label>
                           <input name="platform" defaultValue={editingSocialLink?.platform} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL du profil / lien</label>
                           <input name="url" type="url" defaultValue={editingSocialLink?.url} required placeholder="https://..." className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="flex gap-4">
                           <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de l'icône (lucide)</label>
                              <input name="icon_name" defaultValue={editingSocialLink?.icon_name} placeholder="facebook" className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="w-1/3 space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordre</label>
                              <input name="display_order" type="number" defaultValue={editingSocialLink?.display_order || 0} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all text-center" />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <div className="bauble_box">
                              <input className="bauble_input" id="is_active_link" name="is_active" type="checkbox" defaultChecked={editingSocialLink ? editingSocialLink.is_active : true} />
                              <label className="bauble_label" htmlFor="is_active_link">Toggle</label>
                           </div>
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Lien Actif (Visible)</span>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">
                           {editingSocialLink ? 'Enregistrer les modifications' : 'Ajouter le lien'}
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
               <div
                  className={[
                     'relative w-full h-screen shadow-2xl overflow-y-auto',
                     darkModeIsOrders ? 'bg-slate-950' : 'bg-white',
                  ].join(' ')}
               >
                  <header
                     className={[
                        'sticky top-0 backdrop-blur-md z-10 px-12 py-8 border-b flex justify-between items-center',
                        darkModeIsOrders ? 'bg-slate-950/70 border-slate-800' : 'bg-white/90 border-b border-slate-200',
                     ].join(' ')}
                  >
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                           <Package size={24} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black uppercase tracking-tight">Détails de la Commande</h3>
                           <p className={`text-sm font-bold font-mono ${darkModeIsOrders ? 'text-slate-300' : 'text-slate-400'}`}>#{selectedOrder.id}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <button
                           onClick={() => generateOrderPDF(selectedOrder)}
                           className={[
                              'flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm',
                              darkModeIsOrders
                                 ? 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-500'
                                 : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white',
                           ].join(' ')}
                        >
                           <Download size={18} /> Télécharger PDF
                        </button>
                        <button
                           onClick={() => handleShareOrder(selectedOrder)}
                           className={[
                              'flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm',
                              darkModeIsOrders
                                 ? 'bg-blue-950/40 text-blue-200 hover:bg-blue-500'
                                 : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white',
                           ].join(' ')}
                        >
                           <Share2 size={18} /> Partager
                        </button>
                        <div className={`w-px h-8 mx-2 ${darkModeIsOrders ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <button
                           onClick={() => setSelectedOrder(null)}
                           className={[
                              'p-3 rounded-2xl transition-all',
                              darkModeIsOrders ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600',
                           ].join(' ')}
                        >
                           <X size={24} />
                        </button>
                     </div>
                  </header>
                  <div className={['p-12 max-w-[1400px] mx-auto space-y-12', darkModeIsOrders ? 'text-slate-100' : ''].join(' ')}>
                     {/* Row 1: Client & Evaluation & Status */}
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Status Control */}
                        <section
                           className={[
                              'p-8 rounded-[2.5rem] border-2 shadow-sm space-y-4',
                              darkModeIsOrders ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-900',
                           ].join(' ')}
                        >
                           <div className="flex items-center gap-2 text-slate-400">
                              <BarChart3 size={16} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Statut de la Livraison</p>
                           </div>
                           <div className="space-y-4">
                              <select
                                 value={selectedOrder.status}
                                 onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                                 className={[
                                    'w-full border-2 focus:rounded-2xl rounded-2xl px-6 py-4 font-black transition-all outline-none appearance-none cursor-pointer',
                                    darkModeIsOrders
                                       ? 'bg-slate-950/40 border-slate-800 text-slate-200 focus:border-orange-400'
                                       : 'bg-slate-50 border-transparent focus:border-orange-500',
                                 ].join(' ')}
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
                              <div
                                 className={[
                                    'p-4 rounded-2xl flex items-center gap-3',
                                    selectedOrder.status === 'delivered'
                                       ? darkModeIsOrders
                                          ? 'bg-emerald-950/35 text-emerald-200'
                                          : 'bg-emerald-50 text-emerald-600'
                                       : darkModeIsOrders
                                          ? 'bg-orange-950/35 text-orange-200'
                                          : 'bg-orange-50 text-orange-600',
                                 ].join(' ')}
                              >
                                 {selectedOrder.status === 'delivered' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                 <span className="text-xs font-black uppercase tracking-widest">Actuellement : {selectedOrder.status}</span>
                              </div>
                           </div>
                        </section>

                        {/* Driver Assignment */}
                        <section
                           className={[
                              'p-8 rounded-[2.5rem] border-2 shadow-sm space-y-4',
                              darkModeIsOrders ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-900',
                           ].join(' ')}
                        >
                           <div className="flex items-center gap-2 text-slate-400">
                              <Bike size={16} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Assignation Livreur</p>
                           </div>
                           <div className="space-y-4">
                              <select
                                 value={selectedOrder.assignedDriverId || ""}
                                 onChange={(e) => handleAssignDriver(selectedOrder.id, e.target.value)}
                                 className={[
                                    'w-full border-2 focus:rounded-2xl rounded-2xl px-6 py-4 font-black transition-all outline-none appearance-none cursor-pointer',
                                    darkModeIsOrders
                                       ? 'bg-slate-950/40 border-slate-800 text-slate-200 focus:border-blue-400'
                                       : 'bg-slate-50 border-transparent focus:border-blue-500',
                                 ].join(' ')}
                              >
                                 <option value="">Non assigné</option>
                                 {drivers.filter(d => d.is_online || d.id === selectedOrder.assignedDriverId).map(d => (
                                    <option key={d.id} value={d.id}>{d.fullName || d.full_name}</option>
                                  ))}
                              </select>
                              {selectedOrder.assignedDriverId ? (
                                 <div
                                    className={[
                                       'p-4 rounded-2xl flex items-center gap-3',
                                       darkModeIsOrders ? 'bg-blue-950/35 text-blue-200' : 'bg-blue-50 text-blue-600',
                                    ].join(' ')}
                                 >
                                    <UserCheck size={20} />
                                    <span className="text-xs font-black uppercase tracking-widest">Livreur Assigné</span>
                                 </div>
                              ) : (
                                 <div
                                    className={[
                                       'p-4 rounded-2xl flex items-center gap-3 italic',
                                       darkModeIsOrders ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-50 text-slate-400',
                                    ].join(' ')}
                                 >
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
                           <section
                              className={[
                                 'p-8 rounded-[2.5rem] border-2 shadow-lg space-y-4',
                                 darkModeIsOrders
                                    ? 'bg-gradient-to-br from-blue-950/40 to-indigo-950/30 border-slate-700 shadow-none'
                                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-900 shadow-blue-100/50',
                              ].join(' ')}
                           >
                              <div className="flex items-center gap-2 text-blue-600">
                                 <MapPin size={16} />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Note de Livraison</p>
                              </div>
                              <div className={['p-6 rounded-2xl border', darkModeIsOrders ? 'bg-slate-950/40 border-slate-800' : 'bg-white/80 border-blue-100/50'].join(' ')}>
                                 <p className={['text-sm font-bold leading-relaxed whitespace-pre-wrap break-words', darkModeIsOrders ? 'text-blue-200' : 'text-blue-950'].join(' ')}>
                                    {selectedOrder.deliveryNote}
                                 </p>
                              </div>
                           </section>
                        )}
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Facture - Store Invoice */}
                        <div className="lg:col-span-1 space-y-6">
                           <div
                              className={[
                                 'p-8 rounded-[2.5rem] border-2 shadow-sm h-full space-y-6',
                                 darkModeIsOrders ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-900',
                              ].join(' ')}
                           >
                              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                 <FileText size={14} /> Facture du Magasin
                              </h4>
                              {(() => {
                                 const invoiceData = selectedOrder.store_invoice_base64;
                                 if (import.meta.env.DEV) {
                                    console.log('Invoice Debug:', {
                                       orderId: selectedOrder.id,
                                       hasInvoice: !!invoiceData,
                                       invoiceLength: invoiceData?.length || 0,
                                       invoicePreview: invoiceData?.substring(0, 50) || 'null',
                                    });
                                 }
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
                                                   className={[
                                                      'w-full rounded-2xl border shadow-sm object-cover',
                                                      darkModeIsOrders ? 'border-slate-700' : 'border-slate-200',
                                                   ].join(' ')}
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
                                    <div className={['flex flex-col items-center justify-center py-12 text-slate-300', darkModeIsOrders ? '' : ''].join(' ')}>
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
                          <section
                             className={[
                                'p-8 rounded-[2.5rem] border-2',
                                darkModeIsOrders ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-900',
                             ].join(' ')}
                          >
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
                                    <span className={['text-xl font-black ml-2', darkModeIsOrders ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{selectedOrder.driverRating || 0}/5</span>
                                 </div>
                              </div>
                           </section>

                           {/* Interactive Logistics Map */}
                           {selectedOrder.location && selectedOrder.location.lat && selectedOrder.location.lng && (
                           <section
                              className={[
                                 'rounded-[2.5rem] border-2 shadow-sm overflow-hidden h-[400px] relative',
                                 darkModeIsOrders ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-slate-900',
                              ].join(' ')}
                           >
                                 <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
                                    <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border-2 border-slate-900 shadow-xl">
                                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Localisation Logistique</p>
                                       <p className="text-xs font-black text-slate-800">Client, livreur &amp; magasins produits</p>
                                       <p className="text-[9px] font-bold text-slate-500 mt-1 leading-tight">Ignoré : Vendeur, menu, texte, ordonnance</p>
                                    </div>
                                    <div className="flex gap-2">
                                       <a
                                          href={`https://www.google.com/maps?q=${selectedOrder.location.lat},${selectedOrder.location.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="bg-white hover:bg-slate-50 text-slate-900 p-2 rounded-xl border-2 border-slate-900 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                       >
                                          <Navigation size={14} />
                                          <span className="text-[9px] font-black uppercase">Ouvrir Maps</span>
                                       </a>
                                    </div>
                                 </div>

                                 <MapContainer
                                    center={[selectedOrder.location.lat, selectedOrder.location.lng]}
                                    zoom={12}
                                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                                    className="w-full h-[400px] z-0"
                                    attributionControl={false}
                                 >
                                    <FitLogisticsBounds points={logisticsOrderMapBoundsPoints} />
                                    <TileLayer
                                       url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    />


                                    {/* Client Marker */}
                                    <Marker
                                       position={[selectedOrder.location.lat, selectedOrder.location.lng]}
                                       icon={UserActiveMarkerIcon}
                                    >
                                       <Popup className="custom-popup">
                                          <div className="p-2">
                                             <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Client</p>
                                             <p className="font-bold text-slate-800">{selectedOrder.customerName}</p>
                                          </div>
                                       </Popup>
                                    </Marker>

                                    {/* Assigned Driver Marker */}
                                    {(() => {
                                       const driver = drivers.find(d => d.id === selectedOrder.assignedDriverId);
                                       if (driver && driver.lastLat && driver.lastLng) {
                                          return (
                                             <Marker
                                                position={[driver.lastLat, driver.lastLng]}
                                                icon={DriverBusyMarkerIcon}
                                             >
                                                <Popup className="custom-popup">
                                                   <div className="p-2">
                                                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Livreur</p>
                                                      <p className="font-bold text-slate-800">{driver.fullName}</p>
                                                   </div>
                                                </Popup>
                                             </Marker>
                                          );
                                       }
                                       return null;
                                    })()}

                                    {/* Magasins type « produits » (catalogue) liés à la commande — pas menu / texte / ordonnance */}
                                    {(() => {
                                       const createIcon = (s: Store) => {
                                          const img = s.image_url || (s as { image?: string }).image;
                                          const category = propCategories.find(c => c.id === s.category_id);
                                          const catImg = category?.image_url;
                                          const makeInitialsSvg = (name = '') => {
                                             const initials = (name.split(' ').map(str => str[0]).filter(Boolean).slice(0, 2).join('') || 'S').toUpperCase();
                                             const colors = ['#f97316', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];
                                             const hash = Array.from(initials).reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                             const bg = colors[hash % colors.length];
                                             const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect rx='20' width='100%' height='100%' fill='${bg}'/><text x='50%' y='54%' font-family='Inter, Arial, sans-serif' font-size='52' font-weight='700' fill='#fff' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
                                             return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
                                          };
                                          const fallback = catImg || makeInitialsSvg(s.name || 'Store');
                                          const src = img || fallback;
                                          return L.divIcon({
                                             html: `<div class="relative w-10 h-10 rounded-full border-4 border-orange-500 overflow-hidden shadow-2xl bg-white transition-transform hover:scale-110"><img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" class="w-full h-full object-cover"/></div>`,
                                             className: '',
                                             iconSize: [40, 40],
                                             iconAnchor: [20, 20]
                                          });
                                       };

                                       return orderLogisticsMapStores.map((store, idx) => {
                                          const coords = getStoreLatLngForMap(store);
                                          if (!coords) return null;
                                          return (
                                             <Marker
                                                key={`store-order-${store.id}-${idx}`}
                                                position={[coords[0], coords[1]]}
                                                icon={createIcon(store)}
                                             >
                                                <Popup className="custom-popup">
                                                   <div className="p-2">
                                                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Boutique (catalogue)</p>
                                                      <p className="font-bold text-slate-800">{store.name}</p>
                                                   </div>
                                                </Popup>
                                             </Marker>
                                          );
                                       });
                                    })()}

                                    {/* Lignes client → magasins « produits » uniquement */}
                                    {selectedOrder?.location && (
                                       <>
                                          {orderLogisticsMapStores.map((s, idx) => {
                                             const c = getStoreLatLngForMap(s);
                                             if (!c) return null;
                                             return (
                                                <Polyline
                                                   key={`traj-${s.id}-${idx}`}
                                                   positions={[
                                                      [selectedOrder.location.lat, selectedOrder.location.lng],
                                                      [c[0], c[1]]
                                                   ]}
                                                   pathOptions={{
                                                      color: "#FF7A00",
                                                      weight: 3,
                                                      dashArray: "6, 8",
                                                      opacity: 0.9
                                                   }}
                                                />
                                             );
                                          })}
                                       </>
                                    )}
                                 </MapContainer>
                              </section>
                           )}
                           {/* Notes Area */}
                           <div
                              className={[
                                 'p-8 rounded-[2.5rem] border-2 shadow-sm space-y-4',
                                 darkModeIsOrders ? 'bg-slate-950/40 border-slate-700' : 'bg-white border-slate-900',
                              ].join(' ')}
                           >
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
                                 className={[
                                    'w-full border-2 rounded-3xl p-6 text-sm font-bold outline-none transition-all min-h-[160px] resize-none shadow-inner',
                                    darkModeIsOrders
                                       ? 'bg-slate-950/40 border-slate-800 focus:border-orange-400 text-slate-100'
                                       : 'bg-slate-50 border-transparent focus:border-slate-200 text-slate-700',
                                 ].join(' ')}
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
                              <div
                                 className={[
                                    'md:col-span-3 py-16 flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed',
                                    darkModeIsOrders ? 'bg-slate-950/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-300',
                                 ].join(' ')}
                              >
                                 <ImageIcon size={48} className="opacity-10 mb-4" />
                                 <p className={['text-sm font-bold italic', darkModeIsOrders ? 'text-slate-300' : 'text-slate-300'].join(' ')}>Aucune pièce jointe</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Items List Section (Redesigned) */}
                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-100 rounded-[1.5rem] flex items-center justify-center text-orange-600 shadow-sm border border-orange-200/50">
                                 <ShoppingBag size={24} />
                              </div>
                              <div>
                                 <h4 className={['text-base font-black uppercase tracking-widest', darkModeIsOrders ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Liste des Articles</h4>
                                 <p className={['text-[11px] font-bold uppercase tracking-widest mt-0.5', darkModeIsOrders ? 'text-slate-400' : 'text-slate-400'].join(' ')}>Vérification des produits commandés — {(selectedOrder.items || []).length} lignes</p>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-1">
                              <div className="px-6 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center gap-2">
                                 <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                 Total: {(selectedOrder.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)} Articles
                              </div>
                           </div>
                        </div>

                        <div className="relative group/items">
                           {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                              <div
                                 className={[
                                    'rounded-[3.5rem] border-2 border-dashed p-24 flex flex-col items-center justify-center text-center space-y-5',
                                    darkModeIsOrders ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-200',
                                 ].join(' ')}
                              >
                                 <div
                                    className={[
                                       'w-24 h-24 rounded-[3rem] shadow-2xl flex items-center justify-center border animate-bounce-subtle',
                                       darkModeIsOrders
                                          ? 'bg-slate-900 border-slate-700 shadow-none text-slate-300'
                                          : 'bg-white border-slate-100 shadow-slate-200/50 text-slate-300',
                                    ].join(' ')}
                                 >
                                    <Package size={48} strokeWidth={1} />
                                 </div>
                                 <div className="space-y-2">
                                    <h5 className={['text-lg font-black uppercase tracking-widest', darkModeIsOrders ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Aucun article dans cette commande</h5>
                                    <p className={['text-sm font-bold max-w-sm mx-auto leading-relaxed', darkModeIsOrders ? 'text-slate-400' : 'text-slate-400'].join(' ')}>
                                       Les données des produits ne sont pas encore disponibles. Cela peut arriver si la commande est en cours de traitement ou si une erreur est survenue lors de l'enregistrement.
                                    </p>
                                 </div>
                              </div>
                           ) : (
                              <div
                                 className={[
                                    'rounded-[3.5rem] border-2 overflow-hidden shadow-2xl',
                                    darkModeIsOrders ? 'bg-slate-950/50 border-slate-700 shadow-none' : 'bg-white border-slate-900 shadow-slate-200/40',
                                 ].join(' ')}
                              >
                                 <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                       <thead
                                          className={[
                                             'bg-slate-50/80 backdrop-blur-md text-[11px] font-black uppercase tracking-widest border-b',
                                             darkModeIsOrders ? 'text-slate-300 border-slate-800 bg-slate-900/60' : 'text-slate-500 border-slate-100',
                                          ].join(' ')}
                                       >
                                          <tr>
                                             <th className="px-10 py-8">Illustration & Désignation</th>
                                             <th className="px-10 py-8">Établissement</th>
                                             <th className="px-10 py-8 text-right">Prix Unitaire</th>
                                             <th className="px-10 py-8 text-right">Total Ligne</th>
                                          </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                          {selectedOrder.items.map((it, i) => {
                                             const pName = it.productName || it.product?.name || 'Produit sans nom';
                                             const sName = it.storeName || 'Non spécifié';
                                             const unitPrice = Number(it.price || it.product?.price || 0);
                                             const qty = Number(it.quantity || 1);
                                             const imgSource = it.image_base64 || it.product?.image || it.product?.images?.[0];

                                             return (
                                                <tr key={i} className="group hover:bg-orange-50/40 transition-all duration-300 ease-out">
                                                   <td className="px-10 py-10">
                                                      <div className="flex items-center gap-8">
                                                         <div className="relative shrink-0">
                                                            {imgSource ? (
                                                               <div
                                                                  onClick={() => setViewingImage(imgSource)}
                                                                  className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-2 border-white shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-500 ring-1 ring-slate-100 bg-white"
                                                               >
                                                                  {it.image_base64
                                                                     ? renderMediaThumbnail(it.image_base64, "w-full h-full object-cover")
                                                                     : <img src={imgSource} className="w-full h-full object-cover" alt="Product" />
                                                                  }
                                                               </div>
                                                            ) : (
                                                               <div className="w-28 h-28 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-200 transition-colors group-hover:border-orange-200 group-hover:text-orange-200">
                                                                  <Box size={40} strokeWidth={1} />
                                                               </div>
                                                            )}
                                                            <div className="absolute -top-3 -right-3 bg-orange-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                                                               x{qty}
                                                            </div>
                                                         </div>
                                                         <div className="space-y-3">
                                                            <p className="font-black text-slate-900 text-xl leading-tight tracking-tight group-hover:text-orange-600 transition-colors">
                                                               {pName}
                                                            </p>
                                                            {it.note && (
                                                               <div className="mt-4 p-5 bg-orange-50/50 rounded-3xl border border-orange-100 group/note relative overflow-hidden backdrop-blur-sm shadow-sm ring-1 ring-orange-100/50">
                                                                  <div className="absolute top-0 left-0 w-2 h-full bg-orange-500 opacity-20" />
                                                                  <div className="flex items-start gap-4">
                                                                     <Info size={16} className="text-orange-500 shrink-0 mt-1" />
                                                                     <div className="space-y-1">
                                                                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Note Client</p>
                                                                        <p className="text-sm text-orange-950 font-bold leading-relaxed whitespace-pre-wrap">
                                                                           {it.note}
                                                                        </p>
                                                                     </div>
                                                                  </div>
                                                               </div>
                                                            )}
                                                         </div>
                                                      </div>
                                                   </td>
                                                   <td className="px-10 py-10">
                                                      <span className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200/50 group-hover:bg-white group-hover:text-orange-600 group-hover:border-orange-100 transition-all shadow-sm group-hover:shadow-orange-100/50">
                                                         {sName}
                                                      </span>
                                                   </td>
                                                   <td className="px-10 py-10 text-right">
                                                      <p className="text-xl font-black text-slate-800 leading-none tabular-nums">{(unitPrice).toFixed(2)}</p>
                                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">DH / Unité</p>
                                                   </td>
                                                   <td className="px-10 py-10 text-right">
                                                      <div className="flex flex-col items-end">
                                                         <p className="text-3xl font-black text-orange-600 leading-none tabular-nums tracking-tighter">
                                                            {(qty * unitPrice).toFixed(2)}
                                                         </p>
                                                         <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-2">DH Total</p>
                                                      </div>
                                                   </td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Footer Summary */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Articles</p>
                           <p className="text-2xl font-black text-slate-800 text-center">{(selectedOrder.total || 0).toFixed(2)} DH</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 group relative space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Service (Livraison)</p>
                           <p className="text-2xl font-black text-slate-800 text-center">{((selectedOrder.total_final || 0) - (selectedOrder.total || 0)).toFixed(2)} DH</p>
                           <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl pointer-events-none">
                              Calculé: Total Final - Articles
                           </div>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-900 space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Paiement</p>
                           <div className="flex items-center justify-center gap-2">
                              <CreditCard size={20} className="text-blue-500" />
                              <p className="text-2xl font-black text-slate-800">{selectedOrder.payment_method === 'transfer' ? 'Virement' : 'Espèces'}</p>
                           </div>
                        </div>
                        <div className="bg-orange-500 p-8 rounded-[2.5rem] shadow-xl shadow-orange-100 group relative space-y-2">
                           <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">Montant Total</p>
                           <p className="text-3xl font-black text-white text-center">{(selectedOrder.total_final || 0).toFixed(2)} DH</p>
                           <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[8px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl pointer-events-none">
                              Total = Articles ({(selectedOrder.total || 0).toFixed(2)}) + Livraison ({((selectedOrder.total_final || 0) - (selectedOrder.total || 0)).toFixed(2)})
                           </div>
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
                  <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-300">
                     <header className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-black uppercase tracking-tight">{editingDriver ? 'Modifier' : 'Nouveau'} Livreur</h3>
                        <button onClick={() => setShowAddDriver(false)} className="p-1.5 bg-slate-100/50 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
                     </header>
                     <form key={editingDriver?.id || 'new-driver'} onSubmit={handleCreateDriver} className="p-6 space-y-5">
                        <div className="flex justify-center mb-4">
                           <div className="relative group">
                              <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm flex items-center justify-center">
                                 {driverProfileImage ? <img src={driverProfileImage} className="w-full h-full object-cover" /> : <div className="text-slate-300"><Truck size={32} /></div>}
                              </div>
                              <label className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-1.5 rounded-lg cursor-pointer shadow-md hover:bg-orange-600 transition-colors">
                                 <Plus size={14} />
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
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nom Complet</label>
                              <input name="full_name" defaultValue={editingDriver?.full_name} required className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none rounded-xl px-3 py-2 text-sm font-bold transition-all shadow-sm" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Téléphone</label>
                              <input name="phone" defaultValue={editingDriver?.phone} required className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none rounded-xl px-3 py-2 text-sm font-bold transition-all shadow-sm" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Numéro CIN</label>
                           <input name="id_card_number" defaultValue={editingDriver?.id_card_number} required className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none rounded-xl px-3 py-2 text-sm font-bold transition-all shadow-sm" />
                        </div>

                        {/* AVERTISSEMENTS */}
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between shadow-sm">
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
                                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors border border-slate-200"
                                 >
                                    <Upload size={12} /> Ajouter
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
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
                           <textarea name="description" defaultValue={editingDriver?.description} rows={2} className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 outline-none rounded-xl px-3 py-2 text-sm font-bold transition-all resize-none shadow-sm" />
                        </div>

                        {/* VILLE / ZONE */}
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                              Ville / Zone de livraison
                           </label>
                           <select
                              name="zone_id"
                              defaultValue={(editingDriver as any)?.zone_id ?? ""}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all shadow-sm"
                           >
                              <option value="">— Aucune ville assignée —</option>
                              {deliveryZones.filter(z => z.is_active !== false).map(zone => (
                                 <option key={zone.id} value={zone.id}>{zone.name}</option>
                              ))}
                           </select>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                           {editingDriver ? 'Sauvegarder' : 'Ajouter Livreur'}
                        </button>
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
                  <div
                     className={[
                        'relative w-full max-w-xl rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95 duration-300',
                        darkModeIsProducts ? 'bg-slate-950/95 text-slate-100' : 'bg-white',
                     ].join(' ')}
                  >
                     <header
                        className={[
                           'p-5 border-b flex justify-between items-center',
                           darkModeIsProducts ? 'border-slate-800 bg-slate-900/40' : 'bg-slate-50/50',
                        ].join(' ')}
                     >
                        <h3 className="text-lg font-black uppercase tracking-tight">{editingProduct ? 'Modifier' : 'Nouveau'} Produit</h3>
                        <button onClick={() => {
                           setShowAddProduct(false);
                           setEditingProduct(null);
                           setProductImagePreview(null);
                           setProductAdditionalImages([]);
                        }} className={[
                           'p-1.5 rounded-full transition-colors',
                           darkModeIsProducts ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-200' : 'bg-slate-100 hover:bg-slate-200',
                        ].join(' ')}><X size={18} /></button>
                     </header>
                     <form key={editingProduct?.id || 'new-product'} id="product-form" onSubmit={handleCreateProduct} className="p-6 space-y-5">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nom du Produit</label>
                           <input
                              name="name"
                              defaultValue={editingProduct?.name}
                              className={[
                                 'w-full border focus:border-orange-500 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all shadow-sm',
                                 darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200',
                              ].join(' ')}
                              required
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prix [DH]</label>
                              <input
                                 name="price"
                                 type="number"
                                 step="0.01"
                                 defaultValue={editingProduct?.price}
                                 className={[
                                    'w-full border focus:border-orange-500 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all shadow-sm',
                                    darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200',
                                 ].join(' ')}
                                 required
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Boutique / Marque</label>
                              <select
                                 name="store_id"
                                 value={productFormStoreId || (editingProduct as any)?.store_id || stores.filter(s => !s.is_deleted)[0]?.id || ''}
                                 onChange={e => setProductFormStoreId(e.target.value)}
                                 className={[
                                    'w-full border focus:border-orange-500 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all appearance-none cursor-pointer shadow-sm',
                                    darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200',
                                 ].join(' ')}
                                 required
                              >
                                 {stores.filter(s => !s.is_deleted).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                           </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sous-Catégorie</label>
                           <select
                              name="sub_category"
                              value={editingProduct?.sub_category || ''}
                              onChange={(e) => setEditingProduct(prev => prev ? { ...prev, sub_category: e.target.value } : null)}
                              className={[
                                 'w-full border focus:border-orange-500 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all appearance-none cursor-pointer shadow-sm',
                                 darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200',
                              ].join(' ')}
                           >
                              <option value="">Aucune</option>
                              {propSubCategories.filter(sc => {
                                 const selectedStore = stores.find(s => s.id === (productFormStoreId || (editingProduct as any)?.store_id));
                                 const catId = selectedStore?.category_id || (selectedStore as any)?.category;
                                 return sc.category_id === catId;
                              }).map(sc => (
                                 <option key={sc.id} value={sc.name}>{sc.name}</option>
                              ))}
                           </select>
                        </div>

                        {/* Store-specific sub-category (onglet) */}
                        {(() => {
                           const currentStoreId = productFormStoreId || (editingProduct as any)?.store_id || '';
                           const storeSpecificSubCats = storeSubCategories.filter(sc => sc.store_id === currentStoreId);
                           if (storeSpecificSubCats.length === 0) return null;
                           return (
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Onglet du Magasin</label>
                                 <select
                                    value={productStoreSubCategoryId}
                                    onChange={e => setProductStoreSubCategoryId(e.target.value)}
                                    className={[
                                       'w-full border focus:border-orange-500 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all appearance-none cursor-pointer shadow-sm',
                                       darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200',
                                    ].join(' ')}
                                 >
                                    <option value="">Aucun onglet</option>
                                    {storeSpecificSubCats.map(sc => (
                                       <option key={sc.id} value={sc.id}>{sc.name}</option>
                                    ))}
                                 </select>
                              </div>
                           );
                        })()}

                        <div className={[
                           'flex items-center gap-3 p-3 rounded-xl border shadow-sm',
                           darkModeIsProducts ? 'bg-slate-900/30 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-100',
                        ].join(' ')}>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Prix Editable</span>
                              <span className="text-[9px] font-bold text-slate-400">Permettre aux livreurs de modifier le prix</span>
                           </div>
                           <div className="bauble_box ml-auto scale-[0.8] origin-right">
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
                        <div className={[
                           'space-y-3 p-4 rounded-xl border shadow-sm',
                           darkModeIsProducts ? 'bg-slate-900/30 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-100',
                        ].join(' ')}>
                           <div className="flex items-center justify-between">
                              <div>
                                 <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Galerie Photos</h4>
                                 <p className="text-[9px] text-slate-400 font-bold mt-0.5">La 1ère image sera l'image principale</p>
                              </div>
                              <div className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                                 {productAdditionalImages.length + (productImagePreview || editingProduct?.image ? 1 : 0)}/20
                              </div>
                           </div>

                           <div className="grid grid-cols-4 gap-3">
                              {/* Main Image */}
                              {(productImagePreview || editingProduct?.image) && (
                                 <div className="relative group aspect-square">
                                    <div className={[
                                       'w-full h-full rounded-xl overflow-hidden border-2 border-orange-400 shadow-md relative',
                                       darkModeIsProducts ? 'bg-slate-950/30' : 'bg-white',
                                    ].join(' ')}>
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
                                    <div className={[
                                       'w-full h-full rounded-xl overflow-hidden border shadow-sm',
                                       darkModeIsProducts ? 'bg-slate-950/30 border-slate-800' : 'bg-white border-slate-200',
                                    ].join(' ')}>
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
                              {(productAdditionalImages.length + (productImagePreview || editingProduct?.image ? 1 : 0)) < 20 && (
                                 <label
                                    className={[
                                       'w-full aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group',
                                       darkModeIsProducts
                                          ? 'bg-slate-950/30 border-slate-800 hover:border-orange-400/70 hover:bg-slate-900/20'
                                          : 'bg-white border-slate-200 hover:border-orange-400 hover:bg-orange-50',
                                    ].join(' ')}
                                 >
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
                                             if (totalImages >= 20) return;

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
                           <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: darkModeIsProducts ? '#94a3b8' : undefined }}>Description</label>
                           <textarea
                              name="description"
                              defaultValue={editingProduct?.description}
                              rows={3}
                              className={[
                                 'w-full border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none',
                                 darkModeIsProducts ? 'bg-slate-900/40 text-slate-100 border-slate-800' : 'bg-slate-50',
                              ].join(' ')}
                           />
                        </div>

                        {/* Champs visibles pour l'utilisateur (app) + libellés personnalisés */}
                        <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4 space-y-3 shadow-sm">
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
                                 <div
                                    key={key}
                                    className={[
                                       'flex flex-wrap items-center gap-3 rounded-xl p-3 border',
                                       darkModeIsProducts ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-100',
                                    ].join(' ')}
                                 >
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
                                          className={[
                                             'flex-1 min-w-[160px] border rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400',
                                             darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800',
                                          ].join(' ')}
                                          title={key === 'custom_note' ? 'Ce texte sera utilisé comme placeholder dans l\'app (pas comme libellé)' : undefined}
                                       />
                                    )}
                                 </div>
                              ))}
                           </div>
                           {/* 💰 Budget Label */}
                           <div
                              className={[
                                 'flex flex-wrap items-center gap-3 rounded-xl p-3 border mt-1',
                                 darkModeIsProducts ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-amber-200',
                              ].join(' ')}
                           >
                              <div className="flex flex-col min-w-[140px]">
                                 <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">💰 Libellé du Budget</span>
                                 <span className="text-[9px] text-slate-400 font-medium mt-0.5">Titre affiché au-dessus du champ Budget (app)</span>
                              </div>
                              <input
                                 name="product_label_budget_label"
                                 type="text"
                                 placeholder="Ex: Votre Budget"
                                 defaultValue={productUserLabels['budget_label'] ?? ''}
                                 onBlur={e => setProductUserLabels(prev => ({ ...prev, budget_label: (e.target as HTMLInputElement).value }))}
                                 className={[
                                    'flex-1 min-w-[160px] border rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-400',
                                    darkModeIsProducts ? 'bg-slate-900/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800',
                                 ].join(' ')}
                              />
                           </div>
                        </div>

                        <button
                           type="submit"
                           disabled={isSubmittingProduct}
                           className={`w-full bg-gradient-to-r ${isSubmittingProduct ? 'from-slate-400 to-slate-300 cursor-wait' : 'from-slate-900 to-slate-800 hover:shadow-xl active:scale-95'} text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all flex items-center justify-center gap-2`}
                        >
                           {isSubmittingProduct ? (
                              <>
                                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Création en cours...
                              </>
                           ) : (
                              editingProduct ? 'Enregistrer' : 'Ajouter au Catalogue'
                           )}
                        </button>
                     </form>
                  </div>
               </div >
            )
         }

         {/* MODAL BOUTIQUE / MARQUE */}
         {
            showAddStore && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddStore(false)}></div>
                  <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                     <header className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                           <div className="p-2.5 bg-slate-900 text-white rounded-lg"><StoreIcon size={22} /></div>
                           <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">{editingStore ? 'Modifier' : 'Nouvelle'} Marque</h3>
                        </div>
                        <button onClick={() => setShowAddStore(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
                     </header>
                     <form key={editingStore?.id || 'new'} onSubmit={handleCreateStore} className="p-8 space-y-5">
                        <div className="flex justify-center mb-4">
                           <div className="relative group">
                              <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border-3 border-slate-200 shadow-md">
                                 {storeImagePreview || editingStore?.image_url || editingStore?.image ? (
                                    <img src={storeImagePreview || editingStore?.image_url || editingStore?.image} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                       <StoreIcon size={36} />
                                    </div>
                                 )}
                              </div>
                              <label className="absolute -bottom-1.5 -right-1.5 bg-orange-500 text-white p-1.5 rounded-lg cursor-pointer shadow-md hover:bg-orange-600 transition-colors">
                                 <Plus size={14} />
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
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Nom de la Marque</label>
                              <input name="name" defaultValue={editingStore?.name} required className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all text-sm" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Propriétaire (Partenaire)</label>
                              <select
                                 name="partner_id"
                                 defaultValue={partnerStoreAccess.find(a => a.store_id === editingStore?.id)?.partner_id || ''}
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all appearance-none cursor-pointer text-sm"
                              >
                                 <option value="">Aucun partenaire</option>
                                 {partnerAccounts.map(pa => (
                                    <option key={pa.id} value={pa.id}>{pa.email}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Catégorie</label>
                              <select
                                 name="category_id"
                                 defaultValue={editingStore?.category_id || editingStore?.category || ''}
                                 required
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all appearance-none cursor-pointer text-sm"
                                 onChange={(e) => setEditingStore(prev => prev ? { ...prev, category_id: e.target.value, sub_category: '' } : null)}
                              >
                                 <option value="">Sélectionner une catégorie</option>
                                 {dbCategories.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name_fr}</option>
                                 ))}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sous-Catégorie</label>
                              <select
                                 name="sub_category"
                                 value={editingStore?.sub_category || ''}
                                 onChange={(e) => setEditingStore(prev => prev ? { ...prev, sub_category: e.target.value } : null)}
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all appearance-none cursor-pointer text-sm"
                              >
                                 <option value="">Aucune</option>
                                 {dbCategories.find(c => c.id === (editingStore?.category_id || editingStore?.category))?.sub_categories?.map((sc: string) => (
                                    <option key={sc} value={sc}>{sc} (Legacy)</option>
                                 ))}
                                 {propSubCategories.filter(sc => sc.category_id === (editingStore?.category_id || editingStore?.category)).map(sc => (
                                    <option key={sc.id} value={sc.name}>{sc.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Temps Livraison (min)</label>
                              <input name="delivery_time_min" type="number" defaultValue={editingStore?.delivery_time_min || 25} className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all text-sm" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Zone de Livraison</label>
                              <select
                                 name="zone_id"
                                 defaultValue={editingStore?.zone_id || ''}
                                 className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all appearance-none cursor-pointer text-sm"
                              >
                                 <option value="">Sélectionner une zone</option>
                                 {deliveryZones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>{zone.name} ({zone.radius_km} km)</option>
                                 ))}
                               </select>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                               <Phone size={11} className="text-orange-500" />
                               Numéro de Téléphone
                            </label>
                            <input
                               name="phone"
                               type="tel"
                               defaultValue={editingStore?.phone || ''}
                               placeholder="Ex: 0600000000"
                               className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all text-sm"
                            />
                         </div>
                         <div className="grid grid-cols-3 gap-3 bg-slate-100 p-5 rounded-lg border border-slate-200">
                           <div className="flex flex-col items-center gap-2">
                              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Principale</span>
                              <div className="bauble_box">
                                 <input className="bauble_input" id="is_featured_switch" name="is_featured" type="checkbox" defaultChecked={editingStore?.is_featured} />
                                 <label className="bauble_label" htmlFor="is_featured_switch">Toggle</label>
                              </div>
                           </div>
                           <div className="flex flex-col items-center gap-2">
                              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Nouveau</span>
                              <div className="bauble_box">
                                 <input className="bauble_input" id="is_new_switch" name="is_new" type="checkbox" defaultChecked={editingStore?.is_new} />
                                 <label className="bauble_label" htmlFor="is_new_switch">Toggle</label>
                              </div>
                           </div>
                           <div className="flex flex-col items-center gap-2">
                              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Catalogue</span>
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
                              {/* 💰 Budget Label */}
                              <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-amber-200 mt-1">
                                 <div className="flex flex-col min-w-[140px]">
                                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">💰 Libellé du Budget</span>
                                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">Titre affiché au-dessus du champ Budget (app)</span>
                                 </div>
                                 <input
                                    name="user_label_budget_label"
                                    type="text"
                                    placeholder="Ex: Votre Budget"
                                    defaultValue={storeUserLabels['budget_label'] ?? ''}
                                    onBlur={e => setStoreUserLabels(prev => ({ ...prev, budget_label: (e.target as HTMLInputElement).value }))}
                                    className="flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-400"
                                 />
                              </div>
                           </div>
                        )}
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Description de la Marque</label>
                           <textarea name="description" defaultValue={editingStore?.description} rows={3} className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all resize-none text-sm" placeholder="Une brève description..." />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Localisation (URL Google Maps)</label>
                              {editingStore?.latitude && editingStore?.longitude && (
                                 <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">✓ Coordonnées actuelles</span>
                              )}
                           </div>
                           <div className="flex gap-2">
                              <input
                                 name="maps_url"
                                 value={mapsUrlInput}
                                 onChange={(e) => setMapsUrlInput(e.target.value)}
                                 className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-300 outline-none rounded-lg p-3 font-bold transition-all text-sm"
                                 placeholder="Coller URL Google Maps"
                              />
                              <button
                                 type="button"
                                 onClick={() => extractCoordinatesFromUrl(mapsUrlInput)}
                                 className="bg-slate-900 text-white px-5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-colors"
                              >
                                 Extraire
                              </button>
                           </div>

                           {extractionError && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
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
                              <div className={`border-2 rounded-lg p-4 flex items-start gap-3 ${editingStore?.latitude !== extractedCoordinates.lat || editingStore?.longitude !== extractedCoordinates.lng ? 'bg-blue-50 border-blue-300' : 'bg-emerald-50 border-emerald-300'}`}>
                                 <div className={`p-2 rounded-lg text-white flex-shrink-0 ${editingStore?.latitude !== extractedCoordinates.lat || editingStore?.longitude !== extractedCoordinates.lng ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                    <MapPin size={16} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${editingStore?.latitude !== extractedCoordinates.lat || editingStore?.longitude !== extractedCoordinates.lng ? 'text-blue-600' : 'text-emerald-600'}`}>
                                       {editingStore?.latitude !== extractedCoordinates.lat || editingStore?.longitude !== extractedCoordinates.lng ? '📍 Nouvelles Coordonnées' : '✓ Coordonnées Actuelles'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                       <div className="bg-white rounded-lg p-2 border border-slate-200">
                                          <span className="text-[8px] text-slate-500 font-bold uppercase">Latitude</span>
                                          <p className="text-sm font-black text-slate-800 mt-0.5">{extractedCoordinates.lat.toFixed(6)}</p>
                                       </div>
                                       <div className="bg-white rounded-lg p-2 border border-slate-200">
                                          <span className="text-[8px] text-slate-500 font-bold uppercase">Longitude</span>
                                          <p className="text-sm font-black text-slate-800 mt-0.5">{extractedCoordinates.lng.toFixed(6)}</p>
                                       </div>
                                    </div>
                                    {editingStore?.latitude !== extractedCoordinates.lat || editingStore?.longitude !== extractedCoordinates.lng ? (
                                       <div className="mt-3 p-2 bg-amber-100 border border-amber-200 rounded-lg">
                                          <p className="text-[8px] font-black text-amber-800 uppercase tracking-widest">⚠️ Important : Cliquez "Enregistrer la Marque" ci-dessous pour sauvegarder ces coordonnées</p>
                                       </div>
                                    ) : null}
                                 </div>
                              </div>
                           )}

                           {!extractedCoordinates && editingStore?.latitude && editingStore?.longitude && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3">
                                 <div className="p-2 bg-slate-400 text-white rounded-lg flex-shrink-0">
                                    <MapPin size={16} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Coordonnées Existantes</p>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                       <div className="bg-white rounded-lg p-2 border border-slate-200">
                                          <span className="text-[8px] text-slate-500 font-bold uppercase">Latitude</span>
                                          <p className="text-sm font-black text-slate-800 mt-0.5">{editingStore.latitude.toFixed(6)}</p>
                                       </div>
                                       <div className="bg-white rounded-lg p-2 border border-slate-200">
                                          <span className="text-[8px] text-slate-500 font-bold uppercase">Longitude</span>
                                          <p className="text-sm font-black text-slate-800 mt-0.5">{editingStore.longitude.toFixed(6)}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                        {/* --- STORE SUB-CATEGORIES MANAGEMENT --- */}
                        {editingStore && (
                           <div className="border-t pt-6 space-y-3">
                              <div className="flex items-center justify-between">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Onglets du Magasin (Sous-catégories)</p>
                                 <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {storeSubCategories.filter(sc => sc.store_id === editingStore.id).length} onglet(s)
                                 </span>
                              </div>

                              {/* Existing sub-categories list */}
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                 {storeSubCategories
                                    .filter(sc => sc.store_id === editingStore.id)
                                    .map(sc => (
                                       <div key={sc.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                          <span className="text-sm font-bold text-slate-800">{sc.name}</span>
                                          <button
                                             type="button"
                                             onClick={() => handleDeleteStoreSubCategory(sc.id)}
                                             className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                    ))}
                                 {storeSubCategories.filter(sc => sc.store_id === editingStore.id).length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-2">Aucun onglet défini pour ce magasin</p>
                                 )}
                              </div>

                              {/* Add new sub-category input */}
                              <div className="flex gap-2">
                                 <input
                                    type="text"
                                    value={newStoreSubCatName}
                                    onChange={e => setNewStoreSubCatName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateStoreSubCategory(); } }}
                                    placeholder="Ex: Pâtes, Pizza, Sushis..."
                                    className="flex-1 bg-slate-50 border-2 border-transparent focus:border-orange-400 outline-none rounded-xl px-3 py-2.5 text-sm font-bold transition-all"
                                 />
                                 <button
                                    type="button"
                                    onClick={handleCreateStoreSubCategory}
                                    disabled={isAddingStoreSubCat || !newStoreSubCatName.trim()}
                                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex-shrink-0"
                                 >
                                    {isAddingStoreSubCat ? '...' : '+ Ajouter'}
                                 </button>
                              </div>
                           </div>
                        )}
                        <button type="submit" disabled={isSavingStore} className={`w-full py-4 rounded-lg font-black uppercase text-xs tracking-widest shadow-md ${isSavingStore ? 'bg-slate-600 cursor-wait opacity-75 text-slate-300' : 'bg-slate-900 text-white hover:bg-orange-600'} transition-colors`}>
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
               <div key={`user_${selectedUser.id}`} className="fixed inset-0 z-[100] flex items-center justify-end">
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedUser(null)}></div>

                  <div className="relative w-full max-w-xl h-full bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-300">
                     {/* Header with Background Pattern */}
                     <div className="relative h-48 bg-slate-900 overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50"></div>

                        <div className="absolute top-6 left-8 right-6 flex justify-between items-start">
                           <div className="flex items-center gap-4">
                              <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-2xl">
                                 {selectedUser.fullName[0]}
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black text-white tracking-tight leading-none">{selectedUser.fullName}</h3>
                                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5 line-clamp-1">
                                    <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                                    {selectedUser.id}
                                 </p>
                              </div>
                           </div>
                           <button onClick={() => setSelectedUser(null)} className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl transition-all">
                              <X size={20} />
                           </button>
                        </div>

                        <div className="absolute bottom-6 left-8 flex gap-3">
                           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedUser.isAdmin ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/20 backdrop-blur-md text-white border border-white/10'}`}>
                              {selectedUser.isAdmin ? 'Admin' : 'Client'}
                           </span>
                           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedUser.isBlocked ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                              {selectedUser.isBlocked ? 'Bloqué' : 'Actif'}
                           </span>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group hover:border-orange-200 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                 <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-all">
                                    <Package size={18} />
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Livrées</span>
                              </div>
                              <p className="text-3xl font-black text-slate-800 tabular-nums">
                                 {propOrders.filter(o => orderBelongsToUserProfile(o, selectedUser) && o.status === 'delivered').length}
                              </p>
                           </div>
                           <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group hover:border-blue-200 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <DollarSign size={18} />
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total DH</span>
                              </div>
                              <p className="text-3xl font-black text-slate-800 tabular-nums">
                                 {propOrders.filter(o => orderBelongsToUserProfile(o, selectedUser) && o.status === 'delivered').reduce((sum, o) => sum + orderMonetaryTotal(o), 0)}
                              </p>
                           </div>
                        </div>

                        {/* Order Pipeline Breakdown */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                              Pipeline Commandes
                           </h4>
                           <div className="grid grid-cols-3 gap-2">
                              {[
                                 {
                                    label: 'Attente',
                                    count: propOrders.filter(o => orderBelongsToUserProfile(o, selectedUser) && (o.status === 'pending' || o.status === 'verification')).length,
                                    color: 'amber',
                                 },
                                 {
                                    label: 'Cours',
                                    count: propOrders.filter(o =>
                                       orderBelongsToUserProfile(o, selectedUser) &&
                                       ['accepted', 'preparing', 'treatment', 'progression', 'delivering'].includes(o.status)
                                    ).length,
                                    color: 'blue',
                                 },
                                 {
                                    label: 'Refusées',
                                    count: propOrders.filter(o => orderBelongsToUserProfile(o, selectedUser) && (o.status === 'refused' || o.status === 'unavailable')).length,
                                    color: 'red',
                                 },
                              ].map((stat, i) => (
                                 <div key={i} className={`bg-${stat.color}-50/50 border border-${stat.color}-100 p-4 rounded-xl text-center`}>
                                    <p className={`text-[9px] font-black text-${stat.color}-600 uppercase tracking-widest mb-1`}>{stat.label}</p>
                                    <p className={`text-xl font-black text-${stat.color}-700`}>{stat.count}</p>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Information Grid */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                              Informations Contact
                           </h4>
                           <div className="grid grid-cols-1 gap-3">
                              {[
                                 { icon: <Phone size={14} />, label: 'Téléphone', value: selectedUser.phone },
                                 { icon: <Mail size={14} />, label: 'Email professionnel', value: selectedUser.email },
                                 { icon: <Globe size={14} />, label: 'Langue interface', value: selectedUser.language?.toUpperCase() || 'FR' }
                              ].map((info, i) => (
                                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="flex items-center gap-3">
                                       <div className="text-slate-400">{info.icon}</div>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{info.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{info.value || 'N/A'}</span>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Real-time Location */}
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                              Localisation Actuelle
                           </h4>
                           <div className="bg-slate-900 rounded-[2rem] p-6 overflow-hidden relative group">
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}></div>
                              <div className="relative z-10 flex items-center justify-between">
                                 <div>
                                    <p className="text-white font-black text-lg">Dernières Coordonnées</p>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Mise à jour via app mobile</p>
                                 </div>
                                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                    <MapPin size={24} />
                                 </div>
                              </div>

                              <div className="mt-6 relative z-10">
                                 {selectedUser.lastLat && selectedUser.lastLng ? (
                                    <a
                                       href={`https://www.google.com/maps/search/?api=1&query=${selectedUser.lastLat},${selectedUser.lastLng}`}
                                       target="_blank"
                                       className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-white/5"
                                    >
                                       Ouvrir dans Google Maps <ExternalLink size={16} />
                                    </a>
                                 ) : (
                                    <div className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 text-center">
                                       <p className="text-white/40 font-bold text-xs">Position indisponible</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Actions Footer */}
                     <div className="p-8 border-t bg-slate-50 flex flex-col gap-3">
                        <button
                           onClick={() => handleToggleUserBlock(selectedUser.phone, !!selectedUser.isBlocked)}
                           className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] transition-all hover:-translate-y-1 shadow-xl ${selectedUser.isBlocked
                              ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                              : 'bg-red-600 text-white shadow-red-600/20 hover:bg-red-700'
                              }`}
                        >
                           {selectedUser.isBlocked ? "Débloquer l'accès" : "Révoquer l'accès"}
                        </button>
                        <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                           ID: {selectedUser.id}
                        </p>
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

         {/* ╔══════════════════════════════════════════════════════╗ */}
         {/* ║  MODAL — CONFIRMER SUPPRESSION CATÉGORIE            ║ */}
         {/* ╚══════════════════════════════════════════════════════╝ */}
         {showDeleteCategoryModal && deleteCategoryTarget && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
               <div
                  className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                  onClick={() => { if (!deleteCategoryLoading) { setShowDeleteCategoryModal(false); setDeleteCategoryTarget(null); } }}
               />
               <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  {/* Header rouge */}
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-white">
                     <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                     </div>
                     <h3 className="text-2xl font-black uppercase tracking-tight">Supprimer la catégorie</h3>
                     <p className="text-red-100 text-sm font-semibold mt-1">Cette action est irréversible</p>
                  </div>

                  {/* Corps */}
                  <div className="p-8 space-y-5">
                     <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-2">
                        <p className="text-sm font-black text-slate-800">
                           Vous allez supprimer : <span className="text-red-600">"{deleteCategoryTarget.name_fr}"</span>
                        </p>
                        <ul className="text-xs text-slate-500 space-y-1 mt-2">
                           <li className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                              Toutes les sous-catégories liées seront supprimées
                           </li>
                           <li className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                              Les produits liés seront détachés de ces sous-catégories
                           </li>
                        </ul>
                     </div>

                     <div className="flex gap-3">
                        <button
                           type="button"
                           onClick={() => { setShowDeleteCategoryModal(false); setDeleteCategoryTarget(null); }}
                           disabled={deleteCategoryLoading}
                           className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                           Annuler
                        </button>
                        <button
                           type="button"
                           onClick={confirmDeleteCategory}
                           disabled={deleteCategoryLoading}
                           className="flex-1 py-3.5 rounded-2xl bg-red-600 text-white font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                           {deleteCategoryLoading ? (
                              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Suppression...</>
                           ) : (
                              <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>Oui, supprimer</>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* ╔══════════════════════════════════════════════════════╗ */}
         {/* ║  MODAL — SUPPRESSION SOUS-CATÉGORIE + RÉAFFECTATION ║ */}
         {/* ╚══════════════════════════════════════════════════════╝ */}
         {showDeleteSubCatModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
               <div
                  className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                  onClick={() => { if (!deleteSubCatLoading) { setShowDeleteSubCatModal(false); setDeleteSubCatTarget(null); setDeleteSubCatError(null); } }}
               />
               <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  {/* Header */}
                  <div className={`p-8 text-white ${deleteSubCatLinkedCount > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                     <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                        {deleteSubCatLinkedCount > 0 ? (
                           <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                           </svg>
                        ) : (
                           <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                           </svg>
                        )}
                     </div>
                     <h3 className="text-2xl font-black uppercase tracking-tight">
                        {deleteSubCatLinkedCount > 0 ? 'Réaffecter & Supprimer' : 'Supprimer la sous-catégorie'}
                     </h3>
                     {deleteSubCatTarget && (
                        <p className="text-white/80 text-sm font-semibold mt-1">"{deleteSubCatTarget.name}"</p>
                     )}
                  </div>

                  {/* Corps */}
                  <div className="p-8 space-y-5">
                     {deleteSubCatError && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-bold flex items-center gap-3">
                           <svg className="flex-shrink-0" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                           </svg>
                           {deleteSubCatError}
                        </div>
                     )}

                     {deleteSubCatLinkedCount > 0 ? (
                        <div className="space-y-4">
                           <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                              <p className="text-sm font-black text-slate-800">
                                 <span className="text-amber-600">{deleteSubCatLinkedCount} produit{deleteSubCatLinkedCount > 1 ? 's' : ''}</span> utilise{deleteSubCatLinkedCount === 1 ? '' : 'nt'} cette sous-catégorie.
                              </p>
                              <p className="text-xs text-slate-500 mt-1">Choisissez où réaffecter ces produits :</p>
                           </div>

                           {deleteSubCatChoices.length > 0 ? (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sous-catégorie de remplacement</label>
                                 <select
                                    value={deleteSubCatReplacement}
                                    onChange={e => setDeleteSubCatReplacement(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 outline-none rounded-2xl py-3.5 px-5 font-bold text-sm transition-all"
                                 >
                                    <option value="">— Détacher les produits (aucune catégorie) —</option>
                                    {deleteSubCatChoices.map(c => (
                                       <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                 </select>
                                 {!deleteSubCatReplacement && (
                                    <p className="text-[10px] text-amber-600 font-bold px-1">⚠ Les produits seront détachés sans sous-catégorie</p>
                                 )}
                              </div>
                           ) : (
                              <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-500 font-bold text-center">
                                 Aucune autre sous-catégorie disponible — les produits seront détachés.
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                           <p className="text-sm font-bold text-slate-600">
                              Aucun produit lié. Cette sous-catégorie sera supprimée définitivement.
                           </p>
                        </div>
                     )}

                     <div className="flex gap-3 pt-1">
                        <button
                           type="button"
                           onClick={() => { setShowDeleteSubCatModal(false); setDeleteSubCatTarget(null); setDeleteSubCatError(null); }}
                           disabled={deleteSubCatLoading}
                           className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                           Annuler
                        </button>
                        <button
                           type="button"
                           onClick={confirmDeleteSubCategory}
                           disabled={deleteSubCatLoading}
                           className={`flex-1 py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 ${deleteSubCatLinkedCount > 0 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                           {deleteSubCatLoading ? (
                              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Traitement...</>
                           ) : (
                              deleteSubCatLinkedCount > 0 ? 'Réaffecter & Supprimer' : 'Supprimer'
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* ╔══════════════════════════════════════════════════════╗ */}
         {/* ║  MODAL — SUPPRESSION STORE SOUS-CATÉGORIE           ║ */}
         {/* ╚══════════════════════════════════════════════════════╝ */}
         {showDeleteStoreSubCatModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
               <div
                  className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                  onClick={() => { setShowDeleteStoreSubCatModal(false); setDeleteStoreSubCatId(null); }}
               />
               <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="bg-gradient-to-br from-rose-500 to-red-600 p-8 text-white">
                     <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                     </div>
                     <h3 className="text-xl font-black uppercase">Supprimer l'onglet</h3>
                     {deleteStoreSubCatName && <p className="text-white/80 text-sm font-semibold mt-1">"{deleteStoreSubCatName}"</p>}
                  </div>
                  <div className="p-8 space-y-5">
                     <p className="text-sm text-slate-600 font-bold">
                        Les produits liés à cet onglet seront dissociés mais pas supprimés.
                     </p>
                     <div className="flex gap-3">
                        <button
                           type="button"
                           onClick={() => { setShowDeleteStoreSubCatModal(false); setDeleteStoreSubCatId(null); }}
                           className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                        >
                           Annuler
                        </button>
                        <button
                           type="button"
                           onClick={confirmDeleteStoreSubCategory}
                           className="flex-1 py-3.5 rounded-2xl bg-red-600 text-white font-black text-sm uppercase tracking-wider hover:bg-red-700 transition-all active:scale-95"
                        >
                           Supprimer
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

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
      </div>
   );
};

// --- COMPONENTS ---
const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number; isCollapsed?: boolean }> = ({ active, onClick, icon, label, badge, isCollapsed }) => (
   <button
      onClick={onClick}
      title={isCollapsed ? label : ''}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-xl transition-all duration-200 group relative ${active
         ? 'bg-slate-800 text-white'
         : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
         }`}
   >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
         <span className={`${active ? 'text-orange-500' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
         {!isCollapsed && <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-white' : ''}`}>{label}</span>}
      </div>
      {!isCollapsed && badge !== undefined && badge > 0 && (
         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300`}>
            {badge}
         </span>
      )}
      {isCollapsed && badge !== undefined && badge > 0 && (
         <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 border border-slate-900"></div>
      )}
      {active && (
         <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-orange-500 rounded-r shadow-[0_0_8px_rgba(249,115,22,0.4)]`}></div>
      )}
   </button>
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
                 <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 font-bold text-slate-500 flex items-center gap-4">
                    <ShieldCheck className="text-slate-400" size={18} />
                    <code className="text-slate-500">Masqué pour sécurité</code>
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

const AdminDashboard: React.FC<AdminDashboardProps> = props => (
   <HashRouter>
      <AdminDashboardInner {...props} />
   </HashRouter>
);

export default AdminDashboard;


