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
        fetchOrders();
      }

      const adminToken = localStorage.getItem('veetaa_admin_token');
      if (adminToken) {
        setIsAdminLogged(true);
        fetchOrders();
      }

      const savedFavs = localStorage.getItem('veetaa_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      await fetchData();
      setLoading(false);
    };
    initApp();

    // Abonnement Temps Réel aux commandes
    // Abonnement Temps Réel aux commandes
    let invoiceRefreshTimeout: NodeJS.Timeout;
    const debouncedInvoiceRefresh = () => {
      if (invoiceRefreshTimeout) clearTimeout(invoiceRefreshTimeout);
      invoiceRefreshTimeout = setTimeout(() => {
        console.log("Realtime: Invoice updated, refreshing orders");
        fetchOrders();
      }, 500); // Délai court pour les factures
    };

    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        console.log("Order updated:", payload);
        debouncedInvoiceRefresh();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        console.log("New order created");
        fetchOrders();
      })
      .subscribe();

    // Debounce pour éviter les mises à jour trop fréquentes (ex: positions livreurs)
    let refreshTimeout: NodeJS.Timeout;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log("Realtime: Refreshing global data due to changes");
        fetchData();
      }, 2000);
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

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (invoiceRefreshTimeout) clearTimeout(invoiceRefreshTimeout);
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(dataSubscription);
    };
  }, [user?.isAdmin]);

  useEffect(() => {
    if (isAdminLogged) {
      fetchOrders();
    }
  }, [isAdminLogged]);

  const fetchData = async () => {
    console.log("REFRESHING ALL DATA...");
    const [catsRes, storesRes, annRes, driversRes, usersRes, settingsRes, productsRes, subCatsRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('stores').select('*'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('products').select('*'),
      supabase.from('sub_categories').select('*').order('name')
    ]);

    if (catsRes.error) console.error("Error fetching categories:", catsRes.error);
    if (storesRes.error) console.error("Error fetching stores:", storesRes.error);
    if (annRes.error) console.error("Error fetching announcements:", annRes.error);
    if (driversRes.error) console.error("Error fetching drivers:", driversRes.error);
    if (usersRes.error) console.error("Error fetching users:", usersRes.error);
    if (productsRes.error) console.error("Error fetching products:", productsRes.error);
    if (subCatsRes?.error) console.error("Error fetching sub-categories:", subCatsRes.error);

    setCategories(catsRes.data || []);
    setSubCategories(subCatsRes?.data || []);
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
        products: productsRes.data
          .filter((p: any) => p.store_id === s.id)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image_url,
            description: p.description,
            storeName: s.name
          })),
      }));
      setStores(mappedStores);
    }
    if (annRes.data) setAnnouncements(annRes.data);
    if (settingsRes.data) {
      const support = settingsRes.data.find((s: any) => s.key === 'support_number' || s.key === 'support_phone');
      if (support) setSupportNumber(support.value);

      const deliveryZoneSetting = settingsRes.data.find((s: any) => s.key === 'delivery_zone');
      if (deliveryZoneSetting) {
        setDeliveryZone(deliveryZoneSetting.value as 'kenitra' | 'all_morocco');
      }

      const hideFinance = settingsRes.data.find((s: any) => s.key === 'hide_finance')?.value === '1';
      const hideStatistics = settingsRes.data.find((s: any) => s.key === 'hide_statistics')?.value === '1';
      const hideAnnouncements = settingsRes.data.find((s: any) => s.key === 'hide_announcements')?.value === '1';

      setPageVisibility({
        hideFinance,
        hideStatistics,
        hideAnnouncements
      });
    }

    const { data: ribsData } = await supabase.from('ribs').select('*').order('id', { ascending: true });
    if (ribsData) setRibs(ribsData);

    const { data: supportInfoData } = await supabase.from('support_info').select('*').limit(1);
    if (supportInfoData && supportInfoData.length > 0) {
      setSupportInfo(supportInfoData[0]);
      setSupportNumber(supportInfoData[0].phone);
    }
    // await fetchOrders(); // Removed to prevent infinite loop and decouple updates
  };

  const showNotification = (title: string, body: string) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng, 
          items, total_products, delivery_fee, total_final, payment_method, category_name, store_name, 
          assigned_driver_id, status_history, is_archived, store_rating, driver_rating, 
          text_order_notes, delivery_note, store_invoice_base64, payment_receipt_base64, prescription_base64
        `)
        .order('created_at', { ascending: false })
        .limit(500); // Augmenté pour charger les anciennes commandes

      if (error) {
        console.error("FETCH ORDERS ERROR:", error);
        return;
      }

      console.log(`FETCHED ORDERS: ${data?.length}`);
      
      // Vérifie combien de commandes ont une facture
      const ordersWithInvoice = data?.filter(o => o.store_invoice_base64)?.length || 0;
      console.log(`Orders with invoices: ${ordersWithInvoice}/${data?.length}`);

      if (data && !error) {
        const mappedOrders: Order[] = data.map(o => ({
          id: o.id.toString(),
          userId: o.user_id,
          customerName: o.customer_name,
          phone: o.phone,
          location: { lat: o.delivery_lat, lng: o.delivery_lng },
          items: o.items || [],
          textOrder: o.text_order_notes,
          deliveryNote: o.delivery_note,
          prescriptionImage: o.prescription_base64,
          paymentReceiptImage: o.payment_receipt_base64,
          prescription_base64: o.prescription_base64,
          payment_receipt_base64: o.payment_receipt_base64,
          store_invoice_base64: o.store_invoice_base64,
          total: o.total_products || (o.total_final ? o.total_final - (o.delivery_fee || 15) : 0),
          total_products: o.total_products,
          delivery_fee: o.delivery_fee || 15,
          total_final: o.total_final,
          status: o.status,
          paymentMethod: o.payment_method,
          payment_method: o.payment_method,
          timestamp: new Date(o.created_at).getTime(),
          category: o.category_name || 'Autre',
          storeName: o.store_name,
          assignedDriverId: o.assigned_driver_id,
          statusHistory: o.status_history || [],
          isArchived: Boolean(o.is_archived),
          storeRating: o.store_rating ? Number(o.store_rating) : undefined,
          driverRating: o.driver_rating ? Number(o.driver_rating) : undefined
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

  const handleUpdateSettings = useCallback(async (key: string, value: string) => {
    const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      showNotification("Erreur", "Impossible d'enregistrer les réglages.");
      console.error(error);
    } else {
      if (key === 'support_number') setSupportNumber(value);
      showNotification("Réglages Enregistrés", "Les paramètres système ont été mis à jour.");
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
