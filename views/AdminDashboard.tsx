
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Driver, Store, Product, CategoryID, Announcement, UserProfile, DriverDocument, RIB, SupportInfo } from '../types';
import {
   Package, Clock, CheckCircle2, Users, MapPin, Eye,
   LayoutDashboard, ShoppingBag, Truck, Store as StoreIcon,
   Settings, Bell, Search, Filter, Trash2, ShieldAlert,
   ChevronRight, ExternalLink, X, Check, MoreVertical,
   Plus, Smartphone, MessageCircle, Camera, Link as LinkIcon, Copy,
   Star, AlertTriangle, User, Calendar, CreditCard, Phone, Edit3, Image as ImageIcon,
   Save, Megaphone, Upload, Navigation, Trash, Info, UserCheck, UserMinus, ShieldCheck, RotateCw, LogOut, Share2, Clipboard, Scissors, Copy as CopyIcon, Quote, MessageSquare, Box,
   DollarSign, BarChart3, TrendingUp, PieChart as PieChartIcon, Receipt, AlertCircle, FileText, Download, ZoomIn, ZoomOut, Mail
} from 'lucide-react';
import { CATEGORIES, MOCK_STORES } from '../constants';
import { supabase, dataUrlToBlob } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
}

interface AdminUser extends UserProfile {
   id: string;
   createdAt: number;
   totalOrders: number;
   isBlocked?: boolean;
}

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({
   orders: propOrders, users, drivers, stores, announcements: propAnnouncements, categories: propCategories, supportNumber: propSupport,
   onUpdateStatus, onAssignDriver, onArchiveOrder, onRestoreOrder, onDeletePermanently,
   onBanUser, onLogout, onBack, setStores
}) => {
   const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PRODUCTS' | 'DRIVERS' | 'PARTNERS' | 'USERS' | 'FINANCE' | 'STATISTICS' | 'HISTORY' | 'ANNOUNCEMENTS' | 'CATEGORIES' | 'CONFIG'>('OVERVIEW');
   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
   const [viewingImage, setViewingImage] = useState<string | null>(null);
   useEffect(() => {
      if (selectedOrder) {
         setEditingOrderNotes(selectedOrder.textOrder || '');
      }
   }, [selectedOrder]);
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
   const [dateFilter, setDateFilter] = useState('');
   const [storeFilter, setStoreFilter] = useState('all');
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [dbAnnouncements, setDbAnnouncements] = useState<any[]>([]);
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

   const localProducts = stores.filter(s => !s.isDeleted).flatMap(s => s.products || []);
   const [supportNumber, setSupportNumber] = useState('+212 600 000 000');
   const [ribs, setRibs] = useState<RIB[]>([]);
   const [supportInfo, setSupportInfo] = useState<SupportInfo>({ phone: '', email: '' });
   const [showAddRIB, setShowAddRIB] = useState(false);
   const [editingRIB, setEditingRIB] = useState<RIB | null>(null);

   const fetchData = async () => {
      try {
         const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
         if (annData) setDbAnnouncements(annData);

         const { data: catData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
         if (catData) setDbCategories(catData);

         const { data: ribsData } = await supabase.from('ribs').select('*').order('id', { ascending: true });
         if (ribsData) setRibs(ribsData);

         const { data: supportInfoData } = await supabase.from('support_info').select('*').limit(1);
         if (supportInfoData && supportInfoData.length > 0) {
            setSupportInfo(supportInfoData[0]);
            setSupportNumber(supportInfoData[0].phone);
         }
      } catch (err) {
         console.error("Erreur fetchData:", err);
      }
   };

   useEffect(() => {
      fetchData();
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
   const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
   const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
   const [showAddCategory, setShowAddCategory] = useState(false);
   const [editingCategory, setEditingCategory] = useState<any | null>(null);
   const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
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
   const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

   // --- LOGO (pour les PDF) ---
   const logo = "LOGO.png"; // Sera géré par le chemin relatif ou base64

   // --- ACTIONS ---
   const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Copié : " + text);
   };

   const handleCreateAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const annData = {
         title: formData.get('title') as string,
         content: formData.get('content') as string,
         active: true
      };

      if (editingAnnouncement) {
         const { error } = await supabase.from('announcements').update(annData).eq('id', editingAnnouncement.id);
         if (error) alert("Erreur: " + error.message);
         else { setShowAddAnnouncement(false); setEditingAnnouncement(null); fetchData(); onBack(); }
      } else {
         const { error } = await supabase.from('announcements').insert([annData]);
         if (error) alert("Erreur: " + error.message);
         else { setShowAddAnnouncement(false); fetchData(); onBack(); }
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

      let productImageURL = editingProduct ? editingProduct.image_url : (formData.get('image_url') as string);

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

   const handleToggleAnnouncement = async (id: string, current: boolean) => {
      const { error } = await supabase.from('announcements').update({ active: !current }).eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
   };

   const handleDeleteAnnouncement = async (id: string) => {
      if (!confirm("Supprimer cette annonce ?")) return;
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else fetchData();
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

   const handleDeleteStore = async (id: string) => {
      if (!confirm("Supprimer ce partenaire ? (Il sera masqué de l'application mais conservé en base de données)")) return;
      const { error } = await supabase.from('stores').update({ is_deleted: true }).eq('id', id);
      if (error) alert("Erreur: " + error.message);
      else {
         onBack();
         await fetchData(); // Refresh to update list
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
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
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
         rib: formData.get('rib') as string
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
            is_open: true
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

   const prepareShareText = (order: Order) => {
      const itemsText = order.items.length > 0
         ? order.items.map(it => `- ${it.quantity}x ${it.product?.name} ${it.note ? `(Note: ${it.note})` : ''}`).join('\n')
         : 'Commande personnalisée (voir note générale)';

      const locationUrl = order.location
         ? `https://www.google.com/maps/search/?api=1&query=${order.location.lat},${order.location.lng}`
         : 'Non spécifiée';

      return `📋 COMMANDE #${order.id}
👤 Client: ${order.customerName}
📞 Tél: ${order.phone}
📍 Localisation: ${locationUrl}
🏪 Magasin: ${order.storeName || 'N/A'}

📍 NOTE GÉNÉRALE:
${order.textOrder && order.textOrder.length > 0 ? order.textOrder : 'Aucune'}

📦 DÉTAILS:
${itemsText}

💰 TOTAL À PAYER: ${order.total + 15} DH
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
            doc.text("📋 ORDONNANCE / PRESCRIPTION", 105, 20, { align: 'center' });
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
         case 'pending': return { label: 'En attente', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⏳' };
         case 'verification': return { label: 'En vérification', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟡' };
         case 'treatment': return { label: 'En traitement', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔵' };
         case 'delivering': return { label: 'En course', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: '🚴' };
         case 'progression': return { label: 'En progression', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🟠' };
         case 'unavailable': return { label: 'Indisponible', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⚠️' };
         case 'refused': return { label: 'Refusée', color: 'bg-red-100 text-red-700 border-red-200', icon: '❌' };
         case 'delivered': return { label: 'Livrée', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' };
         default: return { label: status, color: 'bg-slate-100 text-slate-600', icon: '📄' };
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
               <NavItem active={activeTab === 'FINANCE'} onClick={() => setActiveTab('FINANCE')} icon={<DollarSign size={20} />} label="Finance" />
               <NavItem active={activeTab === 'STATISTICS'} onClick={() => setActiveTab('STATISTICS')} icon={<BarChart3 size={20} />} label="Statistiques" />
               <NavItem active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<Clock size={20} />} label="Historique" badge={propOrders.filter(o => o.isArchived).length} />
               <NavItem active={activeTab === 'ANNOUNCEMENTS'} onClick={() => setActiveTab('ANNOUNCEMENTS')} icon={<Megaphone size={20} />} label="Annonces" />
               <NavItem active={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<Filter size={20} />} label="Catégories" />
               <NavItem active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={<Settings size={20} />} label="Configuration" />
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
                              {displayOrders.map(o => (
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
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border shadow-sm">
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
                           <h4 className="font-black text-xs uppercase tracking-widest mb-6">Top Produits</h4>
                           <div className="space-y-4">
                              {localProducts.slice(0, 5).map((p, i) => (
                                 <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black">24 Ventes</span>
                                 </div>
                              ))}
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
                              {users.map((u, i) => (
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
                                 <th className="px-8 py-5">Warnings</th>
                                 <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y">
                              {drivers.map(d => (
                                 <tr key={d.id} className="hover:bg-slate-50">
                                    <td className="px-8 py-5">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black">{d.full_name[0]}</div>
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
                        <button onClick={() => { setEditingStore(null); setShowAddPartner(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Plus size={16} /> Nouveau Partenaire
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stores.filter(s => !s.isDeleted).map(s => (
                           <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                              <div className="flex items-center gap-4">
                                 <img src={s.image_url || s.image || 'https://via.placeholder.com/100'} className="w-16 h-16 rounded-[1.25rem] object-cover" />
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
                                    <button onClick={() => { setEditingStore(s); setShowAddPartner(true); }} className="p-2 bg-slate-100 rounded-lg"><Edit3 size={16} /></button>
                                    <button onClick={() => handleDeleteStore(s.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
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
                     {localProducts.map((p, idx) => (
                        <div key={p.id || idx} className="bg-white rounded-[2.5rem] border p-4 group hover:shadow-xl transition-all relative overflow-hidden">
                           <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={() => { setEditingProduct(p); setShowAddProduct(true); }} className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 rounded-xl shadow-lg hover:text-orange-600"><Edit3 size={16} /></button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-lg hover:bg-red-50"><Trash2 size={16} /></button>
                           </div>
                           <img src={p.image} className="w-full h-40 object-cover rounded-[1.75rem] mb-4" />
                           <div className="p-2">
                              <h4 className="font-black text-slate-800 text-sm mb-1 truncate">{p.name}</h4>
                              <p className="text-[10px] text-slate-400 mb-2 truncate">{p.storeName || 'Marque inconnue'}</p>
                              <div className="flex justify-between items-center text-orange-600 font-black">{p.price} DH</div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {/* ANNONCES */}
               {activeTab === 'ANNOUNCEMENTS' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-6">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">Gestion des Annonces</h3>
                        <button onClick={() => { setEditingAnnouncement(null); setShowAddAnnouncement(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                           <Plus size={16} /> Nouvelle Annonce
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {dbAnnouncements.map(ann => (
                           <div key={ann.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4 relative overflow-hidden group">
                              <div className="flex justify-between items-start">
                                 <div className="flex-1 pr-4">
                                    <h4 className="font-black text-lg">{ann.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ann.content}</p>
                                 </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => handleToggleAnnouncement(ann.id, ann.active)} className={`p-2 rounded-xl transition-colors ${ann.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                       {ann.active ? <Check size={18} /> : <X size={18} />}
                                    </button>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t">
                                 <div className="flex gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Créée le {new Date(ann.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => { setEditingAnnouncement(ann); setShowAddAnnouncement(true); }} className="p-2 text-slate-400 hover:text-orange-600"><Edit3 size={16} /></button>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
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
                              {dbCategories.map(cat => (
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

                     <div className="p-8 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-center gap-6 text-orange-800">
                        <div className="p-4 bg-white rounded-3xl shadow-sm"><Info size={24} /></div>
                        <div className="space-y-1">
                           <p className="font-black uppercase text-[10px] tracking-widest">Information Importante</p>
                           <p className="text-xs font-bold leading-relaxed max-w-xl">Ces coordonnées sont affichées aux utilisateurs lors du processus de paiement et pour le support direct. Assurez-vous de leur exactitude.</p>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>

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
                           <div className="flex gap-4">
                              {selectedOrder.storeRating && (
                                 <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-[10px] font-black">{selectedOrder.storeRating}/5</span>
                                 </div>
                              )}
                              {selectedOrder.driverRating && (
                                 <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                    <Truck size={12} />
                                    <span className="text-[10px] font-black">{selectedOrder.driverRating}/5</span>
                                 </div>
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
                     <form onSubmit={handleCreateDriver} className="p-8 space-y-6">
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
                     <form onSubmit={handleCreateProduct} className="p-8 space-y-6">
                        <div className="flex justify-center mb-6">
                           <div className="relative group">
                              <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                 {productImagePreview || editingProduct?.image_url ? (
                                    <img src={productImagePreview || editingProduct?.image_url} className="w-full h-full object-cover" />
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
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                              <input name="name" defaultValue={editingProduct?.name} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix (DH)</label>
                              <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Magasin</label>
                           <select name="store_id" defaultValue={editingProduct?.store_id} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all">
                              {stores.filter(s => !s.isDeleted).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OU URL Image (Optionnel)</label>
                           <input name="image_url" defaultValue={editingProduct?.image_url} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
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
                     <form onSubmit={handleCreateStore} className="p-8 space-y-6">
                        <div className="flex justify-center mb-6">
                           <div className="relative group">
                              <div className="w-24 h-24 bg-slate-100 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                 {storeImagePreview || editingStore?.image_url ? (
                                    <img src={storeImagePreview || editingStore?.image_url} className="w-full h-full object-cover" />
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
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de la Marque</label>
                              <input name="name" defaultValue={editingStore?.name} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                              <select name="category_id" defaultValue={editingStore?.category_id} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all">
                                 {(propCategories.length > 0 ? propCategories : dbCategories).map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tps Livraison (min)</label>
                              <input name="delivery_time_min" type="number" defaultValue={editingStore?.delivery_time_min || 25} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frais Livraison (DH)</label>
                              <input name="delivery_fee" type="number" defaultValue={editingStore?.delivery_fee || 15} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OU URL Logo/Image (Optionnel)</label>
                           <input name="image_url" defaultValue={editingStore?.image_url} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Maps URL</label>
                           <input name="maps_url" defaultValue={editingStore?.maps_url} className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">Enregistrer la Marque</button>
                     </form>
                  </div>
               </div>
            )
         }

         {/* MODAL ANNOUNCEMENT */}
         {
            showAddAnnouncement && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddAnnouncement(false)}></div>
                  <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
                     <header className="p-8 border-b flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase">{editingAnnouncement ? 'Modifier' : 'Nouvelle'} Annonce</h3>
                        <button onClick={() => setShowAddAnnouncement(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                     </header>
                     <form onSubmit={handleCreateAnnouncement} className="p-8 space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</label>
                           <input name="title" defaultValue={editingAnnouncement?.title} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
                           <textarea name="content" defaultValue={editingAnnouncement?.content} rows={4} required className="w-full bg-slate-50 border-transparent focus:border-orange-500 border-2 outline-none rounded-2xl p-4 font-bold transition-all resize-none" />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest shadow-xl">Publier</button>
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
                     <form onSubmit={handleCreateCategory} className="p-8 space-y-6">
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
