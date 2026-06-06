import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { View, CategoryID, Store, CartItem, Order, Product, UserProfile, OrderStatus, Language, Driver, Announcement, RIB, SupportInfo, SubCategory, StoreSubCategory, PromoCode, PartnerAccount, PartnerStoreAccess } from './types';
import { CATEGORIES, MOCK_STORES, TRANSLATIONS } from './constants';
import { supabase } from './lib/supabase';
import { ShoppingCart, User, ArrowLeft, Heart, MapPin, ChevronDown, ChevronUp, Phone, Bell, BellRing, ShieldCheck, Loader2 } from 'lucide-react';

const PRODUCT_SELECT =
  'id, store_id, name, price, image_url, description, price_editable, product_images, user_visible_fields, user_field_labels, store_sub_category_id, created_at';
const PRODUCT_PAGE = 1000;
/** Plusieurs plages produits en parallèle (réduit le temps total vs une boucle séquentielle) */
const PRODUCT_PARALLEL = 4;

async function fetchAllProductsParallel(): Promise<any[]> {
  const allProducts: any[] = [];
  let baseOffset = 0;

  for (; ;) {
    const offsets = Array.from({ length: PRODUCT_PARALLEL }, (_, i) => baseOffset + i * PRODUCT_PAGE);
    const results = await Promise.all(
      offsets.map((start) =>
        supabase.from('products').select(PRODUCT_SELECT).range(start, start + PRODUCT_PAGE - 1)
      )
    );

    let batchHasAny = false;
    let batchError = false;
    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i];
      if (error) {
        if (import.meta.env.DEV) console.error(`Products chunk @${offsets[i]}:`, error);
        batchError = true;
        break;
      }
      const ch = data || [];
      if (ch.length) {
        batchHasAny = true;
        allProducts.push(...ch);
      }
    }
    if (batchError) break;
    if (!batchHasAny) break;

    const lastData = results[results.length - 1].data || [];
    if (lastData.length < PRODUCT_PAGE) break;

    baseOffset += PRODUCT_PARALLEL * PRODUCT_PAGE;
  }
  return allProducts;
}

function groupProductsByStoreId(products: any[]): Map<string, any[]> {
  const m = new Map<string, any[]>();
  for (const p of products) {
    const k = String(p.store_id);
    let a = m.get(k);
    if (!a) {
      a = [];
      m.set(k, a);
    }
    a.push(p);
  }
  return m;
}

type NormalizeImg = (val: any, bucket?: 'categories' | 'stores' | 'products') => string | undefined;

function mapStoresWithProductGroups(storesData: any[], byStore: Map<string, any[]>, normalizeImageUrl: NormalizeImg): Store[] {
  return storesData.map((s: any) => {
    const sid = String(s.id);
    const resolvedImage = normalizeImageUrl(s.image_url, 'stores') || normalizeImageUrl(s.image, 'stores');
    const rawList = byStore.get(sid) || [];
    return {
      id: s.id,
      name: s.name,
      category: s.category_id as CategoryID,
      category_id: s.category_id,
      type: s.type,
      image: resolvedImage,
      image_url: resolvedImage,
      description: s.description,
      menuImage: s.menu_image_url,
      is_deleted: s.is_deleted || false,
      is_active: s.is_active,
      is_open: s.is_open,
      is_featured: s.is_featured,
      is_new: s.is_new,
      has_products: s.has_products,
      delivery_time_min: s.delivery_time_min,
      delivery_fee: s.delivery_fee,
      maps_url: s.maps_url,
      rating: s.rating,
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      user_visible_fields: s.user_visible_fields,
      user_field_labels: s.user_field_labels || {},
      sub_category: s.sub_category,
      zone_id: s.zone_id,
      products: rawList.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: normalizeImageUrl(p.image_url, 'products'),
        description: p.description,
        storeName: s.name,
        store_id: p.store_id,
        price_editable: p.price_editable,
        product_images: (p.product_images || p.images || []).map((img: string) => normalizeImageUrl(img, 'products')),
        user_visible_fields: p.user_visible_fields,
        user_field_labels: p.user_field_labels || {},
        sub_category: p.sub_category,
        store_sub_category_id: p.store_sub_category_id,
        created_at: p.created_at
      }))
    };
  });
}

// Lazy loading des vues pour optimiser les performances
const AdminDashboard = React.lazy(() => import('./views/AdminDashboard'));
const SupportPage = React.lazy(() => import('./views/SupportPage'));
const AdminLogin = React.lazy(() => import('./views/AdminLogin'));
const StyleShowcase = React.lazy(() => import('./views/StyleShowcase'));

/**
 * Realtime envoie souvent une ligne `new` partielle (sans colonnes lourdes).
 * Ne pas écraser facture / ordonnance / reçu / historique si la clé est absente du payload brut.
 */
function mergeOrderUpdatePreservingMissing(prev: Order, merged: Order, rawRow: Record<string, unknown>): Order {
  const out = { ...merged };
  if (!('store_invoice_base64' in rawRow)) out.store_invoice_base64 = prev.store_invoice_base64;
  if (!('prescription_base64' in rawRow)) {
    out.prescription_base64 = prev.prescription_base64;
    out.prescriptionImage = prev.prescriptionImage;
  }
  if (!('payment_receipt_base64' in rawRow)) {
    out.payment_receipt_base64 = prev.payment_receipt_base64;
    out.paymentReceiptImage = prev.paymentReceiptImage;
  }
  if (!('status_history' in rawRow)) out.statusHistory = prev.statusHistory;
  return out;
}

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white">
    <svg className="pl" width="128px" height="128px" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <circle className="pl__ring1" cx="64" cy="64" r="60" fill="none" stroke="hsl(3,90%,55%)" strokeWidth="8" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="377 377" strokeDashoffset="-376.4"></circle>
      <circle className="pl__ring2" cx="64" cy="64" r="52.5" fill="none" stroke="hsl(13,90%,55%)" strokeWidth="7" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="329.9 329.9" strokeDashoffset="-329.3"></circle>
      <circle className="pl__ring3" cx="64" cy="64" r="46" fill="none" stroke="hsl(23,90%,55%)" strokeWidth="6" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="289 289" strokeDashoffset="-288.6"></circle>
      <circle className="pl__ring4" cx="64" cy="64" r="40.5" fill="none" stroke="hsl(33,90%,55%)" strokeWidth="5" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="254.5 254.5" strokeDashoffset="-254"></circle>
      <circle className="pl__ring5" cx="64" cy="64" r="36" fill="none" stroke="hsl(43,90%,55%)" strokeWidth="4" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="226.2 226.2" strokeDashoffset="-225.8"></circle>
      <circle className="pl__ring6" cx="64" cy="64" r="32.5" fill="none" stroke="hsl(53,90%,55%)" strokeWidth="3" transform="rotate(-90,64,64)" strokeLinecap="round" strokeDasharray="204.2 204.2" strokeDashoffset="-203.9"></circle>
    </svg>
    <p className="mt-8 text-slate-800 font-black uppercase tracking-[0.2em] text-[10px]">Chargement en cours...</p>
  </div>
);

export default function App() {
  const [view, setView] = useState<View>('ADMIN_PANEL');
  const [user, setUser] = useState<UserProfile | null>({ id: 'admin-123', fullName: 'Admin', phone: '0000', isAdmin: true });
  const [language, setLanguage] = useState<Language>('fr');
  const [isAdminLogged, setIsAdminLogged] = useState(false);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'sub_admin' | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<any | null>(null);

  // Support des routes via URL params pour accès direct
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'style-test') {
      setView('STYLE_TEST' as View);
    }
  }, []);

  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [storeSubCategories, setStoreSubCategories] = useState<StoreSubCategory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoadError, setAnnouncementsLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState<PartnerAccount[]>([]);
  const [partnerStoreAccess, setPartnerStoreAccess] = useState<PartnerStoreAccess[]>([]);
  const [supportNumber, setSupportNumber] = useState('+212 600 000 000');
  const [ribs, setRibs] = useState<RIB[]>([]);
  const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '+212 600 000 000', email: 'support@veetaa.ma' });
  const [deliveryZone, setDeliveryZone] = useState<'kenitra' | 'all_morocco'>('kenitra');
  // delivery fee settings (admin-configurable)
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(3);
  const [deliveryBaseFee, setDeliveryBaseFee] = useState<number>(0);
  const [deliveryIncludedKm, setDeliveryIncludedKm] = useState<number>(0);
  const [deliveryFixedFee, setDeliveryFixedFee] = useState<number>(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [pageVisibility, setPageVisibility] = useState<any>({});

  /** Compteurs vue d'ensemble : requêtes `count` rapides (comme les commandes), puis affinés après fetchData */
  const [dashboardOverviewStats, setDashboardOverviewStats] = useState({
    clients: 0,
    drivers: 0,
    products: 0,
  });

  const refreshDashboardOverviewStats = useCallback(async () => {
    const [pr, dr, prod] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
    ]);
    setDashboardOverviewStats(prev => ({
      clients: pr.error ? prev.clients : (pr.count ?? 0),
      drivers: dr.error ? prev.drivers : (dr.count ?? 0),
      products: prod.error ? prev.products : (prod.count ?? 0),
    }));
  }, []);

  /** Annonces seules : rapide, sans attendre profiles / produits (évite liste vide longtemps dans Paramètres). */
  const refreshAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const msg = error.message || 'Impossible de charger les annonces';
      setAnnouncementsLoadError(msg);
      console.error('Error fetching announcements:', error);
      return;
    }
    setAnnouncementsLoadError(null);
    const rows = (data ?? []).map((row: any) => ({
      id: String(row.id),
      title: row.title ?? '',
      content: row.content ?? '',
      images: Array.isArray(row.images) ? row.images : [],
      active: row.active !== false && row.active !== null,
      created_at: row.created_at ?? new Date().toISOString(),
    })) as Announcement[];
    setAnnouncements(rows);
  }, []);

  // Logic de normalisation améliorée pour supporter les chemins storage, les URLs et le Base64 brut
  const normalizeImageUrl = useCallback((val: any, bucket: 'categories' | 'stores' | 'products' = 'stores') => {
    if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
    if (val.startsWith('http') || val.startsWith('data:')) return val;
    if (val.length > 100 && !val.includes(' ') && !val.includes('/')) {
      return `data:image/png;base64,${val}`;
    }
    const variants: string[] = [val];
    if (!val.startsWith(`${bucket}/`)) variants.push(`${bucket}/${val}`);
    if (!val.startsWith('public/')) variants.push(`public/${val}`);
    const parts = val.split('/');
    if (parts.length > 1) variants.push(parts[parts.length - 1]);

    for (const v of variants) {
      try {
        const { data } = supabase.storage.from(bucket).getPublicUrl(v);
        // On accepte si c'est une URL publique valide
        if (data?.publicUrl && data.publicUrl.includes(`/public/${bucket}/`)) return data.publicUrl;
      } catch (e) { /* console.debug(`Failed to get public URL for ${v} in bucket ${bucket}:`, e); */ }
    }
    return undefined;
  }, []);

  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(() => {
    if (typeof Notification === 'undefined') return true;
    return Notification.permission === 'granted';
  });

  const requestPermissions = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPermissionsGranted(true);
        // Play a silent sound to "unlock" audio context
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.volume = 0;
        audio.play().catch(() => { });
      }
    } else {
      setPermissionsGranted(true);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      const savedUser = localStorage.getItem('veetaa_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.language) setLanguage(parsedUser.language);
      }

      const adminToken = localStorage.getItem('veetaa_admin_token');
      if (adminToken) {
        try {
          const adminData = JSON.parse(adminToken);
          setIsAdminLogged(true);
          setAdminRole(adminData.role || 'super_admin');
          setAdminPermissions(adminData.permissions || {});
        } catch (err) {
          console.error('Failed to parse admin token:', err);
          localStorage.removeItem('veetaa_admin_token');
        }
      }

      // Chargement initial sera fait par fetchData() et fetchOrders() appelés plus bas
      setLoading(false);
    };
    initApp();

    // Realtime subscription aux commandes — mettre à jour localement un seul enregistrement
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        try {
          const rec = (payload as any).new || (payload as any).record;
          if (!rec) return;
          const idStr = String(rec.id);
          // Realtime n'envoie souvent pas la colonne `items` (replica identity) : ne pas écraser les lignes déjà chargées (order_items / fetchOrderDetails).
          const rawItems = rec.items;
          let itemsFromPayload: any[] | undefined = undefined;
          if (rawItems !== undefined && rawItems !== null && rawItems !== '') {
            let p = rawItems;
            if (typeof p === 'string' && p.trim() !== '') {
              try {
                p = JSON.parse(p);
                if (typeof p === 'string') p = JSON.parse(p);
              } catch (e) {
                console.warn('Failed to parse items from UPDATE record', e);
                p = [];
              }
            }
            itemsFromPayload = Array.isArray(p) ? p : [];
          }

          const mapped = {
            id: idStr,
            userId: rec.user_id,
            customerName: rec.customer_name,
            phone: rec.phone,
            location: { lat: rec.delivery_lat, lng: rec.delivery_lng },
            textOrder: rec.text_order_notes,
            delivery_fee: rec.delivery_fee ?? 0,
            total: rec.total_products ?? 0,
            total_products: rec.total_products ?? 0,
            total_final: rec.total_final ?? 0,
            status: rec.status,
            paymentMethod: rec.payment_method,
            timestamp: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
            category: rec.category_name,
            storeName: rec.store_name,
            assignedDriverId: rec.assigned_driver_id,
            statusHistory: rec.status_history || [],
            isArchived: Boolean(rec.is_archived),
            storeRating: rec.store_rating ? Number(rec.store_rating) : undefined,
            driverRating: rec.driver_rating ? Number(rec.driver_rating) : undefined,
            prescription_base64: rec.prescription_base64 || undefined,
            payment_receipt_base64: rec.payment_receipt_base64 || undefined,
            store_invoice_base64: rec.store_invoice_base64 || undefined,
            deliveryNote: rec.delivery_note || undefined,
            prescriptionImage: rec.prescription_base64 || undefined,
            paymentReceiptImage: rec.payment_receipt_base64 || undefined,
            store_id: rec.store_id
          } as any;

          setOrders(prev => {
            const exists = prev.some(o => o.id === idStr);
            if (!exists) {
              const insertItems = itemsFromPayload !== undefined ? itemsFromPayload : [];
              return [{ ...mapped, items: insertItems }, ...prev];
            }
            return prev.map(o => {
              if (o.id !== idStr) return o;
              const nextItems = itemsFromPayload !== undefined ? itemsFromPayload : (o.items ?? []);
              const merged = { ...o, ...mapped, items: nextItems } as Order;
              return mergeOrderUpdatePreservingMissing(o, merged, rec as Record<string, unknown>);
            });
          });
        } catch (err) {
          console.warn('Realtime order UPDATE handler error', err);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        try {
          const rec = (payload as any).new || (payload as any).record;
          if (!rec) return;
          const idStr = String(rec.id);
          // Extraire et parser les items si c'est une chaîne
          let parsedItems = rec.items || [];
          if (typeof parsedItems === 'string' && parsedItems.trim() !== '') {
            try {
              parsedItems = JSON.parse(parsedItems);
              if (!Array.isArray(parsedItems)) parsedItems = [];
            } catch (e) {
              console.warn('Failed to parse items from INSERT record', e);
              parsedItems = [];
            }
          }

          const mapped = {
            id: idStr,
            userId: rec.user_id,
            customerName: rec.customer_name,
            phone: rec.phone,
            location: { lat: rec.delivery_lat, lng: rec.delivery_lng },
            items: parsedItems,
            textOrder: rec.text_order_notes,
            delivery_fee: rec.delivery_fee ?? 0,
            total: rec.total_products ?? 0,
            total_products: rec.total_products ?? 0,
            total_final: rec.total_final ?? 0,
            status: rec.status,
            paymentMethod: rec.payment_method,
            timestamp: rec.created_at ? new Date(rec.created_at).getTime() : Date.now(),
            category: rec.category_name,
            storeName: rec.store_name,
            assignedDriverId: rec.assigned_driver_id,
            statusHistory: rec.status_history || [],
            isArchived: Boolean(rec.is_archived),
            storeRating: rec.store_rating ? Number(rec.store_rating) : undefined,
            driverRating: rec.driver_rating ? Number(rec.driver_rating) : undefined,
            prescription_base64: rec.prescription_base64 || undefined,
            payment_receipt_base64: rec.payment_receipt_base64 || undefined,
            store_invoice_base64: rec.store_invoice_base64 || undefined,
            deliveryNote: rec.delivery_note || undefined,
            prescriptionImage: rec.prescription_base64 || undefined,
            paymentReceiptImage: rec.payment_receipt_base64 || undefined,
            store_id: rec.store_id
          } as any;
          setOrders(prev => [mapped, ...prev]);

          // Notification sonore et visuelle
          try {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.debug("Audio play blocked by browser policy"));
          } catch (e) { }

          showNotification("Nouvelle Commande !", `Commande #${idStr} de ${rec.customer_name || 'Client'}`);
        } catch (err) {
          console.warn('Realtime order INSERT handler error', err);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        // Quand un item est ajouté ou modifié, on recharge les détails de la commande concernée
        const item = (payload.new || payload.old) as any;
        if (item && item.order_id) {
          console.log(`🔄 Refreshing items for order ${item.order_id} due to order_items change`);
          fetchOrderDetails(String(item.order_id));
        }
      })
      .subscribe();

    // Debounce pour éviter les mises à jour trop fréquentes
    let refreshTimeout: NodeJS.Timeout;
    let invoiceRefreshTimeout: NodeJS.Timeout | null = null;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log("Realtime: Refreshing global data due to changes");
        fetchData();
      }, 5000);
    };

    // Abonnement Temps Réel aux autres tables (pour l'admin)
    const dataSubscription = supabase
      .channel('public:data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const s = payload.new as any;
          setStores(prev => {
            const sid = String(s.id);
            const exists = prev.find(st => String(st.id) === sid);
            const resolvedImg = normalizeImageUrl(s.image_url || s.image, 'stores');
            const mapped = {
              ...s,
              id: s.id,
              category: s.category_id,
              image: resolvedImg,
              image_url: resolvedImg,
              products: prev.find(st => String(st.id) === sid)?.products || []
            };
            if (exists) {
              return prev.map(st => String(st.id) === sid ? mapped : st);
            }
            return [mapped, ...prev];
          });
        } else if (payload.eventType === 'DELETE') {
          setStores(prev => prev.filter(st => String(st.id) !== String((payload.old as any).id)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const p = payload.new as any;
          setStores(prev => prev.map(s => {
            if (String(s.id) !== String(p.store_id)) return s;
            const exists = s.products?.some(pr => pr.id === p.id);
            const resolvedImg = normalizeImageUrl(p.image_url, 'products');
            const mapped = {
              id: p.id, name: p.name, price: p.price,
              image: resolvedImg,
              image_url: resolvedImg,
              description: p.description, store_id: p.store_id,
              price_editable: p.price_editable,
              product_images: (p.product_images || p.images || []).map((img: string) => normalizeImageUrl(img, 'products'))
            };
            const newProducts = exists
              ? s.products.map(pr => pr.id === p.id ? { ...pr, ...mapped } : pr)
              : [...(s.products || []), mapped];
            return { ...s, products: newProducts };
          }));
        } else if (payload.eventType === 'DELETE') {
          setStores(prev => prev.map(s => ({
            ...s,
            products: s.products?.filter(pr => pr.id !== payload.old.id) || [] // Fix: use !== instead of ===
          })));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const d = payload.new as any;
          const mapped = {
            ...d,
            fullName: d.full_name, idCardNumber: d.id_card_number, profilePhoto: d.profile_photo,
            lastLat: d.last_lat, lastLng: d.last_lng,
            createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
          };
          setDrivers(prev => {
            const exists = prev.some(dr => dr.id === d.id);
            if (exists) return prev.map(dr => dr.id === d.id ? { ...dr, ...mapped } : dr);
            return [...prev, mapped];
          });
        } else if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(dr => dr.id === payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const u = payload.new as any;
          const mapped = {
            id: u.id, fullName: u.full_name, phone: u.phone, email: u.email,
            language: u.language, isAdmin: u.is_admin, isBlocked: u.is_blocked,
            lastLat: u.last_lat, lastLng: u.last_lng
          };
          setUsers(prev => {
            const exists = prev.some(user => user.id === u.id);
            if (exists) return prev.map(user => user.id === u.id ? { ...user, ...mapped } : user);
            return [...prev, mapped];
          });
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(user => user.id === payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_sub_categories' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const s = payload.new as any;
          setStoreSubCategories(prev => {
            const exists = prev.some(sub => sub.id === s.id);
            if (exists) return prev.map(sub => sub.id === s.id ? s : sub);
            return [...prev, s];
          });
        } else if (payload.eventType === 'DELETE') {
          setStoreSubCategories(prev => prev.filter(sub => sub.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, debouncedRefresh)
      .subscribe();

    // Polling fallback: reduced frequency to save bandwidth (Realtime is primary)
    const polling = setInterval(() => {
      try {
        const adminToken = localStorage.getItem('veetaa_admin_token');
        if (adminToken) {
          fetchOrders(false);
        }
      } catch (e) {
        console.warn('Polling orders failed', e);
      }
    }, 20000); // 60 seconds instead of 15s

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (invoiceRefreshTimeout) clearTimeout(invoiceRefreshTimeout);
      clearInterval(polling);
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(dataSubscription);
    };
  }, [user?.isAdmin]);

  useEffect(() => {
    if (isAdminLogged) {
      console.log("Admin logged in - fetching orders + overview counts immediately");
      fetchOrders(false);
      void refreshDashboardOverviewStats();
      void refreshAnnouncements();
    }
  }, [isAdminLogged, refreshDashboardOverviewStats, refreshAnnouncements]);

  const fetchData = useCallback(async () => {
    if (import.meta.env.DEV) console.log('REFRESHING DATA...');
    // 1) Requêtes légères en premier → clients / livreurs / catégories s'affichent tout de suite
    // 2) Puis pagination produits (souvent lente) → magasins + compteur produits
    // Annonces en parallèle dès le début (ne pas attendre profiles/stores)
    void refreshAnnouncements();

    const queries = [
      supabase.from('categories').select('id, name_fr, name_ar, display_order, image_url'),
      // select('*') évite une erreur PostgREST si une colonne listée n'existe pas encore en base
      supabase.from('stores').select('*'),
      supabase.from('sub_categories').select('*').order('name'),
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_store_access').select('*'),
      supabase.from('store_sub_categories').select('*').order('name')
    ];

    const [, results] = await Promise.all([
      refreshDashboardOverviewStats(),
      Promise.all(queries),
    ]);
    const [catsRes, storesRes, subCatsRes, driversRes, usersRes, settingsRes, promoRes, partnersRes, storeAccessRes, storeSubCatsRes] = results;

    if (catsRes.error) console.error("Error fetching categories:", catsRes.error);
    if (storesRes.error) {
      console.error("Error fetching stores (catalogue / marques vides tant que corrigé) :", storesRes.error);
    }
    if (subCatsRes?.error) console.error("Error fetching sub-categories:", subCatsRes.error);
    if (storeSubCatsRes?.error) console.error("Error fetching store sub-categories:", storeSubCatsRes.error);
    if (driversRes?.error) console.error("Error fetching drivers:", driversRes.error);
    if (usersRes?.error) console.error("Error fetching users:", usersRes.error);
    if (settingsRes?.error) console.error("Error fetching settings:", settingsRes.error);
    if (partnersRes?.error) console.error("Error fetching partners:", partnersRes.error);
    if (storeAccessRes?.error) console.error("Error fetching store access:", storeAccessRes.error);

    // Normalisation des images des catégories (Storage public URLs)
    const normalizedCategories = (catsRes.data || []).map((cat: any) => {
      const normalize = (val: any) => {
        if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
        if (val.startsWith('http') || val.startsWith('data:')) return val;
        try {
          const { data } = supabase.storage.from('categories').getPublicUrl(val);
          return data?.publicUrl;
        } catch (e) { return undefined; }
      };
      return { ...cat, image_url: normalize(cat.image_url) };
    });

    setCategories(normalizedCategories);
    setSubCategories(subCatsRes?.data || []);
    setStoreSubCategories(storeSubCatsRes?.data || []);
    if (partnersRes?.data) setPartnerAccounts(partnersRes.data);
    if (storeAccessRes?.data) setPartnerStoreAccess(storeAccessRes.data);

    // TOUJOURS traiter les données admin pour la rapidité
    if (driversRes.data) {
      setDrivers(driversRes.data.map((d: any) => ({
        ...d,
        fullName: d.full_name,
        idCardNumber: d.id_card_number,
        profilePhoto: d.profile_photo,
        lastLat: d.last_lat,
        lastLng: d.last_lng,
        createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
      })));
    }
    if (usersRes.data) {
      setUsers(usersRes.data.map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        phone: u.phone,
        email: u.email,
        language: u.language,
        isAdmin: u.is_admin,
        isBlocked: u.is_blocked,
        lastLat: u.last_lat,
        lastLng: u.last_lng
      })));
    }
    if (settingsRes.data) {
      const support = settingsRes.data.find((s: any) => s.key === 'support_number' || s.key === 'support_phone');
      if (support) setSupportNumber(support.value);

      const deliveryZoneSetting = settingsRes.data.find((s: any) => s.key === 'delivery_zone');
      if (deliveryZoneSetting) {
        setDeliveryZone(deliveryZoneSetting.value as 'kenitra' | 'all_morocco');
      }

      const feePerKmSetting = settingsRes.data.find((s: any) => s.key === 'delivery_fee_per_km');
      if (feePerKmSetting) {
        setDeliveryFeePerKm(Number(feePerKmSetting.value) || 3);
      }

      const baseFeeSetting = settingsRes.data.find((s: any) => s.key === 'delivery_base_fee');
      if (baseFeeSetting) {
        setDeliveryBaseFee(Number(baseFeeSetting.value) || 0);
      }

      const includedKmSetting = settingsRes.data.find((s: any) => s.key === 'delivery_included_km');
      if (includedKmSetting) {
        setDeliveryIncludedKm(Number(includedKmSetting.value) || 0);
      }

      const fixedFeeSetting = settingsRes.data.find((s: any) => s.key === 'delivery_fixed_fee');
      if (fixedFeeSetting) {
        setDeliveryFixedFee(Number(fixedFeeSetting.value) || 0);
      }

      const activePresetSetting = settingsRes.data.find((s: any) => s.key === 'delivery_active_preset_id');
      if (activePresetSetting) {
        setActivePresetId(activePresetSetting.value);
      }

      const pageVisibilitySetting = settingsRes.data.find((s: any) => s.key === 'page_visibility');
      if (pageVisibilitySetting && pageVisibilitySetting.value) {
        try {
          const visibility = JSON.parse(pageVisibilitySetting.value);
          setPageVisibility(visibility);
        } catch (e) {
          console.warn('Failed to parse page_visibility setting', e);
        }
      }
    }

    if (promoRes?.data) {
      setPromoCodes(promoRes.data);
    }

    // Magasins tout de suite (liste Marques / navigation), puis produits en arrière-plan
    const emptyByStore = new Map<string, any[]>();
    if (storesRes.data && !storesRes.error) {
      setStores(mapStoresWithProductGroups(storesRes.data, emptyByStore, normalizeImageUrl));
    }

    const [allProducts, ribsRes, supportRes] = await Promise.all([
      fetchAllProductsParallel(),
      supabase.from('ribs').select('*').order('id', { ascending: true }),
      supabase.from('support_info').select('*').limit(1)
    ]);

    if (import.meta.env.DEV) {
      console.log(`✅ Produits chargés: ${allProducts.length} (requêtes parallèles ×${PRODUCT_PARALLEL})`);
    }

    if (storesRes.data && !storesRes.error) {
      const byStore = groupProductsByStoreId(allProducts);
      setStores(mapStoresWithProductGroups(storesRes.data, byStore, normalizeImageUrl));
    }

    const nonDeletedStoreIds = new Set(
      (storesRes.data || []).filter((s: any) => !s.is_deleted).map((s: any) => String(s.id))
    );
    const productCountVisible = allProducts.filter((p: any) => nonDeletedStoreIds.has(String(p.store_id))).length;
    setDashboardOverviewStats(prev => ({
      clients: usersRes.error ? prev.clients : (usersRes.data?.length ?? 0),
      drivers: driversRes.error ? prev.drivers : (driversRes.data?.length ?? 0),
      products: storesRes.error ? prev.products : productCountVisible,
    }));

    if (ribsRes.data) setRibs(ribsRes.data);
    const supportInfoData = supportRes.data;
    if (supportInfoData && supportInfoData.length > 0) {
      setSupportInfo(supportInfoData[0]);
      setSupportNumber(supportInfoData[0].phone);
    }
  }, [refreshDashboardOverviewStats, normalizeImageUrl, refreshAnnouncements]);

  // Charger les données au montage initial
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const showNotification = (title: string, body: string) => {
    // play alert sound for every notification
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => { /* audio blocked by browser */ });
    } catch (err) {
      console.warn('Notification sound error', err);
    }

    // request desktop permission if available
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true });
    }

    setNotification({ title, body });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchOrders = async (includeLargeData: boolean = false) => {
    try {
      const selectFields = includeLargeData
        ? `id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng,
           items, total_products, delivery_fee, total_final, payment_method, category_name, store_name,
           assigned_driver_id, status_history, is_archived, store_rating, driver_rating,
           store_invoice_base64, prescription_base64, payment_receipt_base64, text_order_notes, delivery_note`
        : `id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng,
           total_products, delivery_fee, total_final, payment_method, category_name, store_name,
           assigned_driver_id, is_archived, store_rating, driver_rating`;

      const { data, error } = await supabase
        .from('orders')
        .select(selectFields)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("FETCH ORDERS ERROR:", error);
        return;
      }

      console.log(`📥 FETCHED ORDERS: ${data?.length} (${includeLargeData ? 'with' : 'without'} base64 data)`);

      if (data && !error) {
        // ✅ Charger les items depuis order_items pour CHAQUE commande
        const orderIds = data.map(o => o.id);
        const { data: allOrderItems } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        // Grouper les items par order_id
        const itemsByOrderId = new Map();
        (allOrderItems || []).forEach((item: any) => {
          if (!itemsByOrderId.has(item.order_id)) {
            itemsByOrderId.set(item.order_id, []);
          }

          // Prendre la première image du array
          const firstImage = Array.isArray(item.images_base64) && item.images_base64.length > 0
            ? item.images_base64[0]
            : undefined;

          itemsByOrderId.get(item.order_id).push({
            productName: item.product_name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            storeName: item.store_name,
            storeId: item.store_id != null ? String(item.store_id) : undefined,
            note: item.note,
            image_base64: firstImage,
            product: {
              id: item.product_id || '',
              name: item.product_name,
              price: Number(item.price),
              image: firstImage || ''
            }
          });
        });

        const mappedOrders: Order[] = data.map(o => {
          // Parse items depuis orders.items (fallback) ou depuis order_items
          let parsedItems = itemsByOrderId.get(o.id) || [];

          // Fallback: si pas d'items depuis order_items, essayer orders.items
          if (parsedItems.length === 0 && o.items) {
            try {
              parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
              if (!Array.isArray(parsedItems)) parsedItems = [];
            } catch (e) {
              console.warn(`⚠️ Failed to parse items for order ${o.id}`);
              parsedItems = [];
            }
          }

          return {
            id: o.id.toString(),
            userId: o.user_id,
            customerName: o.customer_name,
            phone: o.phone,
            location: { lat: o.delivery_lat, lng: o.delivery_lng },
            items: parsedItems,
            textOrder: o.text_order_notes || '',
            total: o.total_products ?? 0,
            total_products: o.total_products ?? 0,
            delivery_fee: o.delivery_fee ?? 0,
            total_final: o.total_final ?? 0,
            status: o.status,
            paymentMethod: o.payment_method,
            timestamp: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
            category: o.category_name || 'Autre',
            storeName: o.store_name,
            storeId: o.store_id,
            assignedDriverId: o.assigned_driver_id,
            statusHistory: o.status_history || [],
            isArchived: Boolean(o.is_archived),
            storeRating: o.store_rating ? Number(o.store_rating) : undefined,
            driverRating: o.driver_rating ? Number(o.driver_rating) : undefined,
            prescription_base64: o.prescription_base64 || undefined,
            payment_receipt_base64: o.payment_receipt_base64 || undefined,
            store_invoice_base64: o.store_invoice_base64 || undefined,
            deliveryNote: o.delivery_note || undefined,
            prescriptionImage: o.prescription_base64 || undefined,
            paymentReceiptImage: o.payment_receipt_base64 || undefined
          };
        });

        console.log(`✅ ORDERS MAPPED with items:`, mappedOrders.map(o => ({
          id: o.id,
          items: o.items.length
        })));

        setOrders(prev => {
          const prevById = new Map(prev.map(o => [o.id, o]));
          return mappedOrders.map(mo => {
            const old = prevById.get(mo.id);
            let out: Order = { ...mo };
            if (old && Array.isArray(mo.items) && mo.items.length === 0 && (old.items?.length ?? 0) > 0) {
              out = { ...out, items: old.items };
            }
            // Select léger (fetchOrders false) : ne pas effacer pièces jointes / historique déjà en mémoire
            if (!includeLargeData && old) {
              if (mo.store_invoice_base64 === undefined && old.store_invoice_base64) {
                out.store_invoice_base64 = old.store_invoice_base64;
              }
              if (mo.prescription_base64 === undefined && old.prescription_base64) {
                out.prescription_base64 = old.prescription_base64;
              }
              if (mo.payment_receipt_base64 === undefined && old.payment_receipt_base64) {
                out.payment_receipt_base64 = old.payment_receipt_base64;
              }
              if (mo.textOrder === '' && old.textOrder) {
                out.textOrder = old.textOrder;
              }
              if (mo.deliveryNote === undefined && old.deliveryNote) {
                out.deliveryNote = old.deliveryNote;
              }
              if ((!mo.statusHistory || mo.statusHistory.length === 0) && old.statusHistory && old.statusHistory.length > 0) {
                out.statusHistory = old.statusHistory;
              }
              if (mo.storeId === undefined && old.storeId) {
                out.storeId = old.storeId;
              }
            }
            return out;
          });
        });
      }
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      // Charger les infos de la commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('items, text_order_notes, delivery_note, status_history, prescription_base64, payment_receipt_base64, store_invoice_base64')
        .eq('id', parseInt(orderId))
        .single();

      if (orderError || !orderData) {
        console.error('❌ Error fetching order:', orderError);
        return;
      }

      // ✅ CHARGER LES ITEMS DEPUIS LA TABLE order_items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', parseInt(orderId));

      if (itemsError) {
        console.warn('⚠️ Warning loading order_items:', itemsError);
      }

      console.log('✅ ORDER DETAILS LOADED:', {
        orderId,
        fromOrdersTable: Boolean(orderData),
        fromOrderItemsTable: orderItems?.length || 0,
        itemsFound: orderItems?.map(i => i.product_name) || []
      });

      // Traiter les items pour les convertir au format CartItem (Table order_items)
      let processedItems = (orderItems || []).map((item: any) => {
        const firstImage = Array.isArray(item.images_base64) && item.images_base64.length > 0
          ? item.images_base64[0]
          : undefined;

        return {
          productName: item.product_name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          storeName: item.store_name,
          storeId: item.store_id != null ? String(item.store_id) : undefined,
          note: item.note,
          image_base64: firstImage,
          product: {
            id: item.product_id || '',
            name: item.product_name,
            price: Number(item.price),
            image: firstImage || ''
          }
        };
      });

      // 🛡️ MEGA-FALLBACK: Si pas d'items depuis order_items, essayer le JSON de orders.items
      if (processedItems.length === 0 && orderData.items) {
        console.log(`🔍 [RESCUE] Checking JSON column for order ${orderId}`);
        try {
          let rawData = orderData.items;

          // Double JSON parse if it's a string that still looks like JSON after first parse
          if (typeof rawData === 'string') {
            try {
              rawData = JSON.parse(rawData);
              if (typeof rawData === 'string') rawData = JSON.parse(rawData);
            } catch (e) {
              console.error('Failed to parse items string:', e);
            }
          }

          if (Array.isArray(rawData)) {
            processedItems = rawData.map((it: any) => {
              // Normalisation du format : certains items ont it.product.name, d'autres it.productName
              const p = it.product || {};
              const sid = it.store_id ?? it.storeId ?? (p as { store_id?: string }).store_id;
              return {
                productName: it.productName || p.name || 'Produit',
                price: Number(it.price || p.price || 0),
                quantity: Number(it.quantity || 1),
                storeName: it.storeName || it.store?.name || 'Vendeur',
                storeId: sid != null && sid !== '' ? String(sid) : undefined,
                note: it.note || '',
                image_base64: it.image_base64 || p.image || p.images?.[0],
                product: {
                  id: p.id || it.productId || '',
                  name: it.productName || p.name || 'Produit',
                  price: Number(it.price || p.price || 0),
                  image: it.image_base64 || p.image || p.images?.[0] || ''
                }
              };
            });
            console.log(`✅ [RESCUE] Successfully recovered ${processedItems.length} items from JSON fallback`);
          }
        } catch (e) {
          console.warn(`⚠️ [RESCUE] Fatal error parsing items for order ${orderId}`, e);
        }
      } else if (processedItems.length > 0) {
        console.log(`✅ [SUCCESS] Using ${processedItems.length} items from order_items table`);
      } else {
        console.warn(`❌ [FAILURE] No items found in any source for order ${orderId}`);
      }

      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        items: processedItems,
        textOrder: orderData.text_order_notes || '',
        deliveryNote: orderData.delivery_note,
        statusHistory: orderData.status_history || [],
        store_invoice_base64: orderData.store_invoice_base64,
        prescription_base64: orderData.prescription_base64,
        payment_receipt_base64: orderData.payment_receipt_base64
      } : o));
    } catch (err) {
      console.error('❌ fetchOrderDetails error:', err);
    }
  };

  const saveOrder = async (order: Order) => {
    const dbOrder = {
      customer_name: order.customerName,
      phone: order.phone,
      status: order.status,
      total_products: order.total,
      delivery_fee: order.delivery_fee ?? 0,
      total_final: order.total_final || (order.total + (order.delivery_fee ?? 0)),
      payment_method: order.paymentMethod,
      payment_receipt_base64: order.paymentReceiptImage,
      prescription_base64: order.prescriptionImage,
      text_order_notes: order.textOrder,
      delivery_lat: order.location?.lat,
      delivery_lng: order.location?.lng,
      category_name: order.category,
      store_name: order.storeName,
      items: order.items,
      status_history: [{ status: 'pending', timestamp: Date.now() }]
    };

    const { data, error } = await supabase.from('orders').insert([dbOrder]).select();

    if (error) {
      showNotification("Erreur", "La commande n'a pas pu être enregistrée.");
    } else if (data) {
      const finalOrder = { ...order, id: data[0].id.toString() };
      setOrders([finalOrder, ...orders]);
      showNotification('Commande', 'Commande enregistrée.');
    }
  };

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const { data: res } = await supabase.from('orders').select('status_history').eq('id', parseInt(orderId));
      const dbOrder = res?.[0];
      const history = Array.isArray(dbOrder?.status_history) ? dbOrder.status_history : [];
      const newHistory = [...history, { status, timestamp: Date.now() }];

      const { error } = await supabase.from('orders').update({ status, status_history: newHistory }).eq('id', parseInt(orderId));
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, statusHistory: newHistory } : o));
      showNotification("Statut Mis à jour", `Commande #${orderId} est maintenant: ${status}`);

    } catch (err) {
      console.error("Erreur statut:", err);
    }
  }, []);

  const handleArchiveOrder = useCallback(async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ is_archived: true }).eq('id', parseInt(orderId));
    if (error) {
      console.error("Archive Error:", error);
      showNotification("Erreur", "Impossible d'archiver la commande. Avez-vous ajouté la colonne 'is_archived' ?");
      return;
    }
    console.log("Archive success for:", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isArchived: true } : o));
    showNotification("Archivée", `Commande #${orderId} a été déplacée vers l'historique.`);

  }, []);

  const handleRestoreOrder = useCallback(async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ is_archived: false }).eq('id', parseInt(orderId));
    if (error) {
      console.error("Restore Error:", error);
      showNotification("Erreur", "Impossible de restaurer la commande.");
      return;
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isArchived: false } : o));
    showNotification("Restaurée", `Commande #${orderId} a été restaurée.`);

  }, []);

  const handlePermanentDeleteOrder = useCallback(async (orderId: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', parseInt(orderId));
    if (error) {
      console.error("Delete Error:", error);
      showNotification("Erreur", "Impossible de supprimer la commande.");
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    showNotification("Supprimée Définitivement", `Commande #${orderId} a été supprimée.`);

  }, []);

  const handleBanUser = useCallback(async (phone: string) => {
    await supabase.from('profiles').update({ is_blocked: true }).eq('phone', phone);
    setUsers(prev => prev.map(u => u.phone === phone ? { ...u, isBlocked: true } : u));
    showNotification("Utilisateur Banni", `L'utilisateur avec le numéro ${phone} a été banni.`);

  }, []);


  const handleAssignDriver = useCallback(async (orderId: string, driverId: string) => {
    await supabase.from('orders').update({ assigned_driver_id: driverId }).eq('id', parseInt(orderId));
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedDriverId: driverId } : o));
    showNotification("Livreur Assigné", `Livreur ID ${driverId} s'occupe de la commande.`);

  }, []);

  const parseSettingNumber = (raw: string) => {
    const n = parseFloat(String(raw).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const handleUpdateSettings = useCallback(async (key: string, value: string, options?: { silent?: boolean }): Promise<boolean> => {
    try {
      console.log(`[Settings] Saving ${key} = ${value}`);

      const { data: existing, error: selectError } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (selectError) {
        console.error(`[Settings] Select error for ${key}:`, selectError);
        showNotification('Erreur', `Lecture paramètre ${key}: ${selectError.message}`);
        return false;
      }

      let error;

      if (existing) {
        const { error: updateError } = await supabase
          .from('settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        error = updateError;
        console.log(`[Settings] Updated existing row for key: ${key}`);
      } else {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ key, value, updated_at: new Date().toISOString() });
        error = insertError;
        console.log(`[Settings] Inserted new row for key: ${key}`);
      }

      if (error) {
        console.error(`[Settings] Error for ${key}:`, error);
        showNotification('Erreur', `Impossible d'enregistrer ${key}: ${error.message}`);
        return false;
      }

      if (key === 'support_number') setSupportNumber(value);
      if (key === 'delivery_fee_per_km') {
        const n = parseSettingNumber(value);
        if (!Number.isNaN(n)) {
          setDeliveryFeePerKm(n);
          console.log(`[Settings] Local state updated: delivery_fee_per_km = ${n}`);
        }
      }
      if (key === 'delivery_base_fee') {
        const n = parseSettingNumber(value);
        if (!Number.isNaN(n)) {
          setDeliveryBaseFee(n);
          console.log(`[Settings] Local state updated: delivery_base_fee = ${n}`);
        }
      }
      if (key === 'delivery_included_km') {
        const n = parseSettingNumber(value);
        if (!Number.isNaN(n)) {
          setDeliveryIncludedKm(n);
          console.log(`[Settings] Local state updated: delivery_included_km = ${n}`);
        }
      }
      if (key === 'delivery_fixed_fee') {
        const n = parseSettingNumber(value);
        if (!Number.isNaN(n)) {
          setDeliveryFixedFee(n);
          console.log(`[Settings] Local state updated: delivery_fixed_fee = ${n}`);
        }
      }
      if (key === 'delivery_active_preset_id') {
        setActivePresetId(value);
        console.log(`[Settings] Local state updated: delivery_active_preset_id = ${value}`);
      }
      if (key === 'delivery_zone') {
        if (value === 'kenitra' || value === 'all_morocco') {
          setDeliveryZone(value);
          console.log(`[Settings] Local state updated: delivery_zone = ${value}`);
        }
      }
      if (!options?.silent) {
        showNotification('✓ Enregistré', `${key} = ${value}`);
        console.log(`[Settings] Successfully saved ${key}`);
      }
      return true;
    } catch (err) {
      console.error(`[Settings] Exception for ${key}:`, err);
      showNotification('Erreur', 'Erreur lors de la sauvegarde des paramètres');
      return false;
    }
  }, []);

  const handleCreateAnnouncement = useCallback(async (ann: Partial<Announcement>) => {
    const { data, error } = await supabase.from('announcements').insert([ann]).select();
    if (error) {
      showNotification("Erreur", "Impossible de créer l'annonce.");
    } else if (data) {
      setAnnouncements(prev => [data[0], ...prev]);
      showNotification("Annonce Créée", "La nouvelle bannière est en ligne.");

    }
  }, []);

  const handleDeleteAnnouncement = useCallback(async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showNotification("Erreur", "Impossible de supprimer l'annonce.");
    } else {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotification("Annonce Supprimée", "La bannière a été retirée.");

    }
  }, []);


  const handleLogout = () => {
    setUser(null);
    setIsAdminLogged(false);
    localStorage.removeItem('veetaa_user');
    localStorage.removeItem('veetaa_admin_token');
    setView('ADMIN_PANEL');
  };

  if (view === 'ADMIN_PANEL' && !isAdminLogged) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminLogin onLoginSuccess={(adminData) => {
          setIsAdminLogged(true);
          setAdminRole(adminData.role || 'super_admin');
          setAdminPermissions(adminData.permissions || {});
        }} />
      </Suspense>
    );
  }

  if (view === 'SUPPORT') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SupportPage
          onBack={() => setView('ADMIN_PANEL')}
          driverId={user?.id || ''}
          driverName={user?.fullName}
          driverPhone={user?.phone}
        />
      </Suspense>
    );
  }

  // Route de test du style premium showcase
  if (view === 'STYLE_TEST') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <StyleShowcase />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {!permissionsGranted && isAdminLogged && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
              <BellRing size={40} className="animate-bounce" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Activer les Alertes ?</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Autorisez les notifications pour être alerté instantanément (son et bureau) dès l'arrivée d'une nouvelle commande, même si vous travaillez sur un autre onglet.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={requestPermissions}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all hover:bg-orange-600"
              >
                Autoriser les Notifications
              </button>
              <button
                onClick={() => setPermissionsGranted(true)}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[11000] w-full max-w-sm px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 backdrop-blur-sm opacity-95">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-900/20">
              <Bell className="text-white animate-bounce" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[10px] uppercase tracking-[0.2em] text-orange-500 mb-0.5">{notification.title}</p>
              <p className="font-bold text-sm truncate text-slate-100">{notification.body}</p>
            </div>
          </div>
        </div>
      )}

      <AdminDashboard
        orders={orders}
        users={users}
        drivers={drivers}
        stores={stores}
        announcements={announcements}
        announcementsLoadError={announcementsLoadError}
        promoCodes={promoCodes}
        partnerAccounts={partnerAccounts}
        setPartnerAccounts={setPartnerAccounts}
        partnerStoreAccess={partnerStoreAccess}
        categories={categories}
        subCategories={subCategories}
        storeSubCategories={storeSubCategories}
        setStoreSubCategories={setStoreSubCategories}
        supportNumber={supportNumber}
        deliveryZone={deliveryZone}
        onUpdateStatus={handleUpdateOrderStatus}
        onAssignDriver={handleAssignDriver}
        onArchiveOrder={handleArchiveOrder}
        onRestoreOrder={handleRestoreOrder}
        onDeletePermanently={handlePermanentDeleteOrder}
        onBanUser={handleBanUser}
        onUpdateSettings={handleUpdateSettings}
        onFetchOrderDetails={fetchOrderDetails}
        deliveryFeePerKm={deliveryFeePerKm}
        onCreateAnnouncement={handleCreateAnnouncement}
        onDeleteAnnouncement={handleDeleteAnnouncement}
        onLogout={handleLogout}
        onBack={fetchData}
        onRefreshAnnouncements={refreshAnnouncements}
        setStores={setStores}
        pageVisibility={pageVisibility}
        deliveryBaseFee={deliveryBaseFee}
        deliveryIncludedKm={deliveryIncludedKm}
        deliveryFixedFee={deliveryFixedFee}
        activePresetId={activePresetId}
        adminRole={adminRole}
        adminPermissions={adminPermissions}
        dashboardOverviewStats={dashboardOverviewStats}
      />
    </Suspense>
  );
}
