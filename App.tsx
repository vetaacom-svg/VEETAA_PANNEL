import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { View, CategoryID, Store, CartItem, Order, Product, UserProfile, OrderStatus, Language, Driver, Announcement, RIB, SupportInfo, SubCategory } from './types';
import { CATEGORIES, MOCK_STORES, TRANSLATIONS } from './constants';
import { supabase } from './lib/supabase';
import { ShoppingCart, User, ArrowLeft, Heart, MapPin, ChevronDown, ChevronUp, Phone, Bell, ShieldCheck, Loader2 } from 'lucide-react';

// Lazy loading des vues pour optimiser les performances
const Welcome = React.lazy(() => import('./views/Welcome'));
const Home = React.lazy(() => import('./views/Home'));
const CategoryDetail = React.lazy(() => import('./views/CategoryDetail'));
const Checkout = React.lazy(() => import('./views/Checkout'));
const Confirmation = React.lazy(() => import('./views/Confirmation'));
const Login = React.lazy(() => import('./views/Login'));
const Signup = React.lazy(() => import('./views/Signup'));
const OtpVerification = React.lazy(() => import('./views/OtpVerification'));
const PermissionsRequest = React.lazy(() => import('./views/PermissionsRequest'));
const Favorites = React.lazy(() => import('./views/Favorites'));
const Settings = React.lazy(() => import('./views/Settings'));
const Tracking = React.lazy(() => import('./views/Tracking'));
const History = React.lazy(() => import('./views/History'));
const Help = React.lazy(() => import('./views/Help'));
const ProductOrderView = React.lazy(() => import('./views/ProductOrderView'));
const AdminDashboard = React.lazy(() => import('./views/AdminDashboard'));
const StoreDetail = React.lazy(() => import('./views/StoreDetail'));
const SupportPage = React.lazy(() => import('./views/SupportPage'));
const AdminLogin = React.lazy(() => import('./views/AdminLogin'));

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
  const [isExplorerMode, setIsExplorerMode] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [isAdminLogged, setIsAdminLogged] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<CategoryID | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [textOrder, setTextOrder] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [supportNumber, setSupportNumber] = useState('+212 600 000 000');
  const [ribs, setRibs] = useState<RIB[]>([]);
  const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '+212 600 000 000', email: 'support@veetaa.ma' });
  const [deliveryZone, setDeliveryZone] = useState<'kenitra' | 'all_morocco'>('kenitra');
  // delivery fee per km (admin-configurable)
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState<number>(3);
  
  const [pageVisibility, setPageVisibility] = useState({
    hideFinance: false,
    hideStatistics: false,
    hideAnnouncements: false
  });

  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY < 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        setIsAdminLogged(true);
      }

      const savedFavs = localStorage.getItem('veetaa_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      // Chargement initial sera fait par fetchData() et fetchOrders() appelés plus bas
      setLoading(false);
    };
    initApp();

    // Realtime subscription aux commandes — mettre à jour localement un seul enregistrement
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        try {
          const rec = payload.new || payload.record;
          if (!rec) return;
          const idStr = String(rec.id);
          const mapped = {
            id: idStr,
            userId: rec.user_id,
            customerName: rec.customer_name,
            phone: rec.phone,
            location: { lat: rec.delivery_lat, lng: rec.delivery_lng },
            items: rec.items || [],
            textOrder: rec.text_order_notes,
            delivery_fee: rec.delivery_fee ?? 0,
            total: rec.total_products ?? (rec.total_final ? rec.total_final - (rec.delivery_fee ?? 0) : 0),
            total_products: rec.total_products,
            total_final: rec.total_final,
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
            paymentReceiptImage: rec.payment_receipt_base64 || undefined
          } as any;

          setOrders(prev => {
            const exists = prev.some(o => o.id === idStr);
            if (exists) return prev.map(o => o.id === idStr ? { ...o, ...mapped } : o);
            return [mapped, ...prev];
          });
        } catch (err) {
          console.warn('Realtime order UPDATE handler error', err);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        try {
          const rec = payload.new || payload.record;
          if (!rec) return;
          const idStr = String(rec.id);
          const mapped = {
            id: idStr,
            userId: rec.user_id,
            customerName: rec.customer_name,
            phone: rec.phone,
            location: { lat: rec.delivery_lat, lng: rec.delivery_lng },
            items: rec.items || [],
            textOrder: rec.text_order_notes,
            delivery_fee: rec.delivery_fee ?? 0,
            total: rec.total_products ?? (rec.total_final ? rec.total_final - (rec.delivery_fee ?? 0) : 0),
            total_products: rec.total_products,
            total_final: rec.total_final,
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
            paymentReceiptImage: rec.payment_receipt_base64 || undefined
          } as any;
          setOrders(prev => [mapped, ...prev]);
        } catch (err) {
          console.warn('Realtime order INSERT handler error', err);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_categories' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, debouncedRefresh)
      .subscribe();

    // Polling fallback: every 15s (reduced from 30s for faster updates)
    // This is a safety net if realtime subscription fails
    const polling = setInterval(() => {
      try {
        const adminToken = localStorage.getItem('veetaa_admin_token');
        if (adminToken) {
          // Only fetch without base64 to keep it fast
          fetchOrders(false);
        }
      } catch (e) {
        console.warn('Polling orders failed', e);
      }
    }, 15000);

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
      // Load orders immediately without waiting for 30s poll
      console.log("Admin logged in - fetching orders immediately");
      fetchOrders(false); // false = exclude base64 for speed
    }
  }, [isAdminLogged]);

  // Charger les données au montage initial
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log("REFRESHING DATA...");
    // Charge toujours: categories, stores, products, annonces, drivers, users
    // Les données admin doivent toujours être disponibles pour la rapidité
    const isAdminMode = localStorage.getItem('veetaa_admin_token');
    
    const queries = [
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('stores').select('*'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('sub_categories').select('*').order('name'),
      // TOUJOURS charger drivers et users pour l'admin (performance critique)
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('settings').select('*')
    ];

    const results = await Promise.all(queries);
    const [catsRes, storesRes, annRes, productsRes, subCatsRes, driversRes, usersRes, settingsRes] = results;

    if (catsRes.error) console.error("Error fetching categories:", catsRes.error);
    if (storesRes.error) console.error("Error fetching stores:", storesRes.error);
    if (annRes.error) console.error("Error fetching announcements:", annRes.error);
    if (productsRes.error) console.error("Error fetching products:", productsRes.error);
    if (subCatsRes?.error) console.error("Error fetching sub-categories:", subCatsRes.error);
    if (driversRes?.error) console.error("Error fetching drivers:", driversRes.error);
    if (usersRes?.error) console.error("Error fetching users:", usersRes.error);
    if (settingsRes?.error) console.error("Error fetching settings:", settingsRes.error);

    setCategories(catsRes.data || []);
    setSubCategories(subCatsRes?.data || []);

    // TOUJOURS traiter les données admin pour la rapidité
    if (driversRes.data) {
      console.log(`Loading ${driversRes.data.length} drivers`);
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
      console.log(`Loading ${usersRes.data.length} users`);
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

    if (storesRes.data && productsRes.data) {
      console.log(`FETCHED: ${storesRes.data.length} stores, ${productsRes.data.length} products`);
      const mappedStores: Store[] = storesRes.data.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category_id as CategoryID,
        type: s.type,
        image: s.image_url,
        description: s.description,
        menuImage: s.menu_image_url,
        is_deleted: s.is_deleted || false,
        is_active: s.is_active,
        is_open: s.is_open,
        is_featured: s.is_featured,
        has_products: s.has_products,
        delivery_time_min: s.delivery_time_min,
        delivery_fee: s.delivery_fee,
        maps_url: s.maps_url,
        latitude: s.latitude ? Number(s.latitude) : null,
        longitude: s.longitude ? Number(s.longitude) : null,
        user_visible_fields: s.user_visible_fields,
        user_field_labels: s.user_field_labels || {},
        products: productsRes.data
          .filter((p: any) => p.store_id === s.id)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image_url,
            description: p.description,
            storeName: s.name,
            store_id: p.store_id,
            price_editable: p.price_editable,
            product_images: p.product_images || p.images || [],
            user_visible_fields: p.user_visible_fields,
            user_field_labels: p.user_field_labels || {}
          })),
      }));
      setStores(mappedStores);
    }
    if (annRes.data) setAnnouncements(annRes.data);

    // Fetch RIBs in parallel (no longer conditional for better performance)
    const { data: ribsData } = await supabase.from('ribs').select('*').order('id', { ascending: true });
    if (ribsData) setRibs(ribsData);

    const { data: supportInfoData } = await supabase.from('support_info').select('*').limit(1);
    if (supportInfoData && supportInfoData.length > 0) {
      setSupportInfo(supportInfoData[0]);
      setSupportNumber(supportInfoData[0].phone);
    }
  };

  const showNotification = (title: string, body: string) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchOrders = async (includeLargeData: boolean = false) => {
    try {
      // OPTIMIZED: Two-stage loading for better performance
      // Stage 1: Load essential fields only (excludes large base64 by default)
      const selectFields = includeLargeData 
        ? `id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng,
           items, total_products, delivery_fee, total_final, payment_method, category_name, store_name,
           assigned_driver_id, status_history, is_archived, store_rating, driver_rating,
           store_invoice_base64, prescription_base64, payment_receipt_base64, text_order_notes, delivery_note`
        : `id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng,
           items, total_products, delivery_fee, total_final, payment_method, category_name, store_name,
           assigned_driver_id, status_history, is_archived, store_rating, driver_rating, text_order_notes, delivery_note`;

      const { data, error } = await supabase
        .from('orders')
        .select(selectFields)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error("FETCH ORDERS ERROR:", error);
        return;
      }

      console.log(`FETCHED ORDERS: ${data?.length} (${includeLargeData ? 'with' : 'without'} base64 data)`);

      if (data && !error) {
        const mappedOrders: Order[] = data.map(o => ({
          id: o.id.toString(),
          userId: o.user_id,
          customerName: o.customer_name,
          phone: o.phone,
          location: { lat: o.delivery_lat, lng: o.delivery_lng },
          items: o.items || [],
          textOrder: o.text_order_notes,
          total: o.total_products ?? (o.total_final ? o.total_final - (o.delivery_fee ?? 0) : 0),
          total_products: o.total_products,
          delivery_fee: o.delivery_fee ?? 0,
          total_final: o.total_final,
          status: o.status,
          paymentMethod: o.payment_method,
          timestamp: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
          category: o.category_name || 'Autre',
          storeName: o.store_name,
          assignedDriverId: o.assigned_driver_id,
          statusHistory: o.status_history || [],
          isArchived: Boolean(o.is_archived),
          storeRating: o.store_rating ? Number(o.store_rating) : undefined,
          driverRating: o.driver_rating ? Number(o.driver_rating) : undefined,
          prescription_base64: includeLargeData ? (o.prescription_base64 || undefined) : undefined,
          payment_receipt_base64: includeLargeData ? (o.payment_receipt_base64 || undefined) : undefined,
          store_invoice_base64: includeLargeData ? (o.store_invoice_base64 || undefined) : undefined,
          deliveryNote: o.delivery_note || undefined,
          prescriptionImage: includeLargeData ? (o.prescription_base64 || undefined) : undefined,
          paymentReceiptImage: includeLargeData ? (o.payment_receipt_base64 || undefined) : undefined
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  };

  const saveOrder = async (order: Order) => {
    const dbOrder = {
      customer_name: order.customerName,
      phone: order.phone,
      status: order.status,
      total_products: order.total,
      total_final: order.total + 15,
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
      setCurrentOrder(finalOrder);
      setView('CONFIRMATION');
      setCart([]);
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

  const handleUpdateSettings = useCallback(async (key: string, value: string, options?: { silent?: boolean }) => {
    const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      showNotification("Erreur", "Impossible d'enregistrer les réglages.");
      console.error(error);
    } else {
      if (key === 'support_number') setSupportNumber(value);
      if (key === 'delivery_fee_per_km') {
        const n = parseFloat(value as string);
        if (!isNaN(n)) setDeliveryFeePerKm(n);
      }
      if (!options?.silent) showNotification("Réglages Enregistrés", "Les paramètres système ont été mis à jour.");
      
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


  const handleSkipLogin = () => {
    const devUser: UserProfile = { id: 'dev-admin', fullName: 'Dev Admin', phone: '+212 600 000 000', language, isAdmin: true };
    setUser(devUser);
    localStorage.setItem('veetaa_user', JSON.stringify(devUser));
    setView('HOME');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdminLogged(false);
    localStorage.removeItem('veetaa_user');
    localStorage.removeItem('veetaa_admin_token');
    if (view !== 'ADMIN_PANEL') setView('LOGIN');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const localProducts = stores.filter(s => !s.is_deleted).flatMap(s => s.products || []);
      const existing = prev.find(i => i.product?.id === product.id);
      if (existing) {
        return prev.map(i => i.product?.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    showNotification("Ajouté", `${product.name} ajouté au panier.`);
  };

  if (view === 'ADMIN_PANEL' && !isAdminLogged) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AdminLogin onLoginSuccess={() => setIsAdminLogged(true)} />
      </Suspense>
    );
  }

  if (view === 'SUPPORT') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SupportPage
          onBack={() => setView('HOME')}
          driverId={user?.id || ''}
          driverName={user?.fullName}
          driverPhone={user?.phone}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AdminDashboard
        orders={orders}
        users={users}
        drivers={drivers}
        stores={stores}
        announcements={announcements}
        categories={categories}
        subCategories={subCategories}
        supportNumber={supportNumber}
        deliveryZone={deliveryZone}
        onUpdateStatus={handleUpdateOrderStatus}
        onAssignDriver={handleAssignDriver}
        onArchiveOrder={handleArchiveOrder}
        onRestoreOrder={handleRestoreOrder}
        onDeletePermanently={handlePermanentDeleteOrder}
        onBanUser={handleBanUser}
        onUpdateSettings={handleUpdateSettings}
        deliveryFeePerKm={deliveryFeePerKm}
        onCreateAnnouncement={handleCreateAnnouncement}
        onDeleteAnnouncement={handleDeleteAnnouncement}
        onLogout={handleLogout}
        onBack={fetchData}
        setStores={setStores}
        pageVisibility={pageVisibility}
      />
    </Suspense>
  );
}
