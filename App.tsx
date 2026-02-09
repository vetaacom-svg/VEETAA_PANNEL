
import React, { useState, useEffect, useMemo } from 'react';
import { View, CategoryID, Store, CartItem, Order, Product, UserProfile, OrderStatus, Language, Driver, Announcement, RIB, SupportInfo } from './types';
import { CATEGORIES, MOCK_STORES, TRANSLATIONS } from './constants';
import { supabase } from './lib/supabase';
import Welcome from './views/Welcome';
import Home from './views/Home';
import CategoryDetail from './views/CategoryDetail';
import Checkout from './views/Checkout';
import Confirmation from './views/Confirmation';
import Login from './views/Login';
import Signup from './views/Signup';
import OtpVerification from './views/OtpVerification';
import PermissionsRequest from './views/PermissionsRequest';
import Favorites from './views/Favorites';
import Settings from './views/Settings';
import Tracking from './views/Tracking';
import History from './views/History';
import Help from './views/Help';
import ProductOrderView from './views/ProductOrderView';
import AdminDashboard from './views/AdminDashboard';
import StoreDetail from './views/StoreDetail';
import AdminLogin from './views/AdminLogin';
import { ShoppingCart, User, ArrowLeft, Heart, MapPin, ChevronDown, ChevronUp, Phone, Bell, ShieldCheck } from 'lucide-react';

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
      }

      const savedFavs = localStorage.getItem('veetaa_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      await fetchData();
      setLoading(false);
    };
    initApp();

    // Abonnement Temps Réel aux commandes
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    // Abonnement Temps Réel aux autres tables (pour l'admin)
    const dataSubscription = supabase
      .channel('public:data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(dataSubscription);
    };
  }, [user?.isAdmin]);

  const fetchData = async () => {
    console.log("REFRESHING ALL DATA...");
    const [catsRes, storesRes, annRes, driversRes, usersRes, settingsRes, productsRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('stores').select('*'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('products').select('*')
    ]);

    if (catsRes.error) console.error("Error fetching categories:", catsRes.error);
    if (storesRes.error) console.error("Error fetching stores:", storesRes.error);
    if (annRes.error) console.error("Error fetching announcements:", annRes.error);
    if (driversRes.error) console.error("Error fetching drivers:", driversRes.error);
    if (usersRes.error) console.error("Error fetching users:", usersRes.error);
    if (productsRes.error) console.error("Error fetching products:", productsRes.error);

    setCategories(catsRes.data || []);
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
    if (usersRes.data) setUsers(usersRes.data.map(u => ({ ...u, fullName: u.full_name, lastLat: u.last_lat, lastLng: u.last_lng, isBlocked: u.is_blocked })));

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
        isDeleted: s.is_deleted || false,
        is_active: s.is_active,
        is_open: s.is_open,
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
    await fetchOrders();
  };

  const showNotification = (title: string, body: string) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchOrders = async () => {
    const { data, error, count } = await supabase.from('orders').select('*, driver_rating', { count: 'exact' }).order('created_at', { ascending: false });
    if (error) console.error("FETCH ORDERS ERROR:", error);
    console.log(`FETCHED ORDERS: ${data?.length} (Total in DB: ${count})`);

    if (data && !error) {
      const mappedOrders: Order[] = data.map(o => ({
        id: o.id.toString(),
        customerName: o.customer_name,
        phone: o.phone,
        location: { lat: o.delivery_lat, lng: o.delivery_lng },
        items: o.items || [],
        textOrder: o.text_order_notes,
        prescriptionImage: o.prescription_base64,
        paymentReceiptImage: o.payment_receipt_base64,
        prescription_base64: o.prescription_base64,
        payment_receipt_base64: o.payment_receipt_base64,
        total: o.total_products,
        status: o.status,
        paymentMethod: o.payment_method,
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

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
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
  };

  const handleArchiveOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ is_archived: true }).eq('id', parseInt(orderId));
    if (error) {
      console.error("Archive Error:", error);
      showNotification("Erreur", "Impossible d'archiver la commande. Avez-vous ajouté la colonne 'is_archived' ?");
      return;
    }
    console.log("Archive success for:", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isArchived: true } : o));
    showNotification("Archivée", `Commande #${orderId} a été déplacée vers l'historique.`);
  };

  const handleRestoreOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ is_archived: false }).eq('id', parseInt(orderId));
    if (error) {
      console.error("Restore Error:", error);
      showNotification("Erreur", "Impossible de restaurer la commande.");
      return;
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isArchived: false } : o));
    showNotification("Restaurée", `Commande #${orderId} a été restaurée.`);
  };

  const handlePermanentDeleteOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', parseInt(orderId));
    if (error) {
      console.error("Delete Error:", error);
      showNotification("Erreur", "Impossible de supprimer la commande.");
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    showNotification("Supprimée Définitivement", `Commande #${orderId} a été supprimée.`);
  };

  const handleBanUser = async (phone: string) => {
    await supabase.from('profiles').update({ is_blocked: true }).eq('phone', phone);
    setUsers(prev => prev.map(u => u.phone === phone ? { ...u, isBlocked: true } : u));
    showNotification("Utilisateur Banni", `L'utilisateur avec le numéro ${phone} a été banni.`);
  };


  const handleAssignDriver = async (orderId: string, driverId: string) => {
    await supabase.from('orders').update({ assigned_driver_id: driverId }).eq('id', parseInt(orderId));
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedDriverId: driverId } : o));
    showNotification("Livreur Assigné", `Livreur ID ${driverId} s'occupe de la commande.`);
  };

  const handleUpdateSettings = async (key: string, value: string) => {
    const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      showNotification("Erreur", "Impossible d'enregistrer les réglages.");
      console.error(error);
    } else {
      if (key === 'support_number') setSupportNumber(value);
      showNotification("Réglages Enregistrés", "Les paramètres système ont été mis à jour.");
    }
  };

  const handleCreateAnnouncement = async (ann: Partial<Announcement>) => {
    const { data, error } = await supabase.from('announcements').insert([ann]).select();
    if (error) {
      showNotification("Erreur", "Impossible de créer l'annonce.");
    } else if (data) {
      setAnnouncements([data[0], ...announcements]);
      showNotification("Annonce Créée", "La nouvelle bannière est en ligne.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showNotification("Erreur", "Impossible de supprimer l'annonce.");
    } else {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotification("Annonce Supprimée", "La bannière a été retirée.");
    }
  };


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
    return <AdminLogin onLoginSuccess={() => setIsAdminLogged(true)} />;
  }

  return (
    <AdminDashboard
      orders={orders}
      users={users}
      drivers={drivers}
      stores={stores}
      announcements={announcements}
      categories={categories}
      supportNumber={supportNumber}
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
  );
}
