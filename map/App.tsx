
import React, { useState, useEffect } from 'react';
import LiveMap from './components/LiveMap';
import Sidebar from './components/Sidebar';
import { MOCK_DRIVERS, MOCK_USERS, INITIAL_CENTER, MOCK_ORDERS, MOCK_STORES } from './constants';
import { Store, Driver, UserProfile as User, Order, CategoryID } from '../types';
import { supabase } from '../lib/supabase';
import { applyStoreVisibilityFilters } from '../lib/storeVisibilityQuery';

const App: React.FC = () => {
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // CHARGER LES VRAIS STORES DEPUIS SUPABASE (OU FALLBACK MOCK)
  useEffect(() => {
    const fetchStores = async () => {
      console.log('🔍 Chargement des stores depuis Supabase...');
      const { data, error } = await applyStoreVisibilityFilters(
        supabase
          .from('stores')
          .select('id, name, latitude, longitude, category_id, image_url, image')
      );

      if (error) {
        console.error('❌ Erreur chargement stores:', error);
        console.log('✅ Utilisation des données MOCK à la place');
        setStores(MOCK_STORES);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ ${data.length} stores chargés depuis Supabase:`, data);
        const formattedStores: Store[] = data.map(store => {
          // Normalize image fields: allow full URLs, data URIs, or legacy filenames stored in DB
          const normalize = (val: any) => {
            if (!val) return undefined;
            if (typeof val !== 'string') return undefined;
            if (val.startsWith('http') || val.startsWith('data:')) return val;

            // Try several plausible storage path variants for legacy filenames
            const tryVariants = (s: string) => {
              const variants: string[] = [s];
              if (!s.startsWith('stores/')) variants.push(`stores/${s}`);
              if (!s.startsWith('public/')) variants.push(`public/${s}`);
              if (s.startsWith('/')) variants.push(s.replace(/^\/+/, ''));
              // remove any leading folder and try filename only
              const parts = s.split('/');
              if (parts.length > 1) variants.push(parts[parts.length - 1]);

              for (const v of variants) {
                try {
                  const res = supabase.storage.from('stores').getPublicUrl(v);
                  const url = (res && (res as any).data && (res as any).data.publicUrl) || undefined;
                  if (url && typeof url === 'string' && url.trim() !== '') return url;
                } catch (e) {
                  // ignore and try next variant
                }
              }
              return undefined;
            };

            return tryVariants(val);
          };

          const url = (store as any).maps_url || (store as any).mapsUrl;
          const latMatch = url?.match(/@(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
                           url?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
                           url?.match(/query=([-.\d]+),([-.\d]+)/) ||
                           url?.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/); // Format brut: "34.25, -6.57"

          const resolvedImageUrl = normalize(store.image_url) || normalize(store.image) || undefined;
          const resolvedImage = normalize(store.image) || normalize(store.image_url) || undefined;

          const finalLat = store.latitude !== null && store.latitude !== undefined ? Number(store.latitude) : null;
          const finalLng = store.longitude !== null && store.longitude !== undefined ? Number(store.longitude) : null;

          return {
            id: store.id,
            name: store.name,
            latitude: finalLat ?? 0,
            longitude: finalLng ?? 0,
            category: store.category_id || CategoryID.FOOD,
            category_id: store.category_id,
            type: 'products',
            address: 'Casablanca, Maroc',
            image_url: resolvedImageUrl,
            image: resolvedImage || ''
          } as Store;
        });
        setStores(formattedStores);
        console.log('📍 Stores formatés pour la carte:', formattedStores);
      } else {
        console.log('⚠️ Aucun store trouvé dans Supabase');
        console.log('✅ Utilisation des données MOCK à la place');
        setStores(MOCK_STORES);
      }
    };

    fetchStores();
  }, []);

  // SIMULATION DU MOUVEMENT TEMPS RÉEL (1s) - décalage très faible pour haute précision
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        lastLat: (d.lastLat || 0) + (Math.random() - 0.5) * 0.00001, // ~1.1m de variation maximale
        lastLng: (d.lastLng || 0) + (Math.random() - 0.5) * 0.00001, // ~1.1m de variation maximale
        last_lat: (d.last_lat || 0) + (Math.random() - 0.5) * 0.00001,
        last_lng: (d.last_lng || 0) + (Math.random() - 0.5) * 0.00001
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddEntity = async (type: 'user' | 'driver' | 'store', name: string, lat?: number, lng?: number) => {
    const id = `${type}_${Date.now()}`;
    const defaultLat = INITIAL_CENTER[0] + (Math.random() - 0.5) * 0.01;
    const defaultLng = INITIAL_CENTER[1] + (Math.random() - 0.5) * 0.01;

    if (type === 'user') {
      setUsers(prev => [...prev, { 
        id, 
        fullName: name, 
        lastLat: lat ?? defaultLat, 
        lastLng: lng ?? defaultLng,
        phone: '0600000000'
      } as User]);
    } else if (type === 'driver') {
      setDrivers(prev => [...prev, { 
        id, 
        fullName: name, 
        lastLat: lat ?? defaultLat, 
        lastLng: lng ?? defaultLng, 
        status: 'available',
        phone: '0600000000',
        createdAt: Date.now()
      } as Driver]);
    } else {
      // Nouveau magasin
      const newStore: Store = { 
        id, 
        name, 
        latitude: lat!,
        longitude: lng!,
        type: 'products', 
        category: CategoryID.FOOD,
        image: ''
      };
      
      // Ajouter à l'état local d'abord (pour affichage immédiat)
      setStores(prev => [...prev, newStore]);
      
      // Ensuite sauvegarder dans Supabase
      try {
        const { error } = await supabase
          .from('stores')
          .insert([{
            id: id,
            name: name,
            latitude: lat!,
            longitude: lng!,
            category_id: 'restaurant',
            is_active: true
          }]);
        
        if (error) {
          console.error('⚠️ Erreur insertion Supabase (local OK):', error);
        } else {
          console.log(`✅ Nouveau magasin "${name}" créé dans Supabase et affiché sur la carte`);
        }
      } catch (err) {
        console.error('⚠️ Erreur lors de la création:', err);
      }
    }
  };

  const handleUpdateStoreCoordinates = async (storeId: string, lat: number, lng: number) => {
    try {
      console.log(`🔄 Mise à jour dans Supabase - Store: ${storeId}`);
      console.log(`   Nouvelle Latitude: ${lat}, Nouvelle Longitude: ${lng}`);
      
      // 1️⃣ METTRE À JOUR LA BASE DE DONNÉES SUPABASE
      const { error } = await supabase
        .from('stores')
        .update({ 
          latitude: lat, 
          longitude: lng 
        })
        .eq('id', storeId);

      if (error) {
        console.error('❌ Erreur mise à jour Supabase:', error);
        alert(`❌ Erreur lors de la mise à jour : ${error.message}`);
        return;
      }

      // 2️⃣ METTRE À JOUR L'ÉTAT LOCAL
      setStores(prev => {
        const updated = prev.map(s => 
          s.id === storeId 
            ? { ...s, latitude: lat, longitude: lng }
            : s
        );
        console.log(`✅ Mise à jour COMPLÈTE du magasin ${storeId}:`);
        console.log(`   Ancien : supprimé ❌`);
        console.log(`   Nouveau : Lat: ${lat}, Lng: ${lng} ✅`);
        console.log(`   ✅ SAUVEGARDÉ DANS LA BASE DE DONNÉES`);
        return updated;
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      alert('❌ Erreur lors de la mise à jour des coordonnées');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir SUPPRIMER ce magasin ? Cette action est irréversible !')) {
      return;
    }
    
    const storeName = stores.find(s => s.id === storeId)?.name || storeId;
    
    try {
      // 1️⃣ SUPPRIMER DE SUPABASE
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) {
        console.error('❌ Erreur suppression Supabase:', error);
        alert(`❌ Erreur : ${error.message}`);
        return;
      }

      // 2️⃣ SUPPRIMER DE L'ÉTAT LOCAL
      setStores(prev => {
        const filtered = prev.filter(s => s.id !== storeId);
        console.log(`🗑️ Magasin "${storeName}" SUPPRIMÉ complètement ❌`);
        console.log(`   ✅ Database Supabase mise à jour`);
        console.log(`   Nombre de magasins restants: ${filtered.length}`);
        return filtered;
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleSimulateOrder = (userId: string) => {
    const store = stores[0];
    if (!store) return;
    const orderId = `ord_${Date.now()}`;
    const user = users.find(u => u.id === userId);
    if (!user?.lastLat || !user?.lastLng) {
      alert('❌ Utilisateur sans coordonnées GPS');
      return;
    }
    
    const newOrder: Order = {
      id: orderId, 
      userId, 
      storeId: store.id, 
      status: 'pending', 
      timestamp: Date.now(),
      customerName: user.fullName || 'Client',
      phone: user.phone || '',
      location: { lat: user.lastLat, lng: user.lastLng },
      items: [{ name: 'Commande simulation', qty: 1 }],
      total: Math.floor(Math.random() * 300) + 50,
      category: 'Simulated',
      assignedDriverId: null
    } as Order;
    
    setOrders(prev => [...prev, newOrder]);
    setSelectedOrderId(orderId);
    console.log(`✅ Commande simulée créée: ${orderId}`);
  };

  const handleAssignDriver = (orderId: string, driverId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId 
        ? { ...o, assignedDriverId: driverId, status: 'confirmed' }
        : o
    ));
    console.log(`✅ Livreur ${driverId} assigné à la commande ${orderId}`);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans antialiased text-slate-900">
      <Sidebar
        orders={orders} users={users} stores={stores} drivers={drivers}
        selectedOrderId={selectedOrderId} onSelectOrder={setSelectedOrderId}
        onAddEntity={handleAddEntity} onSimulateOrder={handleSimulateOrder}
        onUpdateStoreCoordinates={handleUpdateStoreCoordinates}
        onDeleteStore={handleDeleteStore}
      />
      <main className="flex-1 relative">
        <LiveMap stores={stores} drivers={drivers} users={users} orders={orders} selectedOrderId={selectedOrderId} onDeleteStore={handleDeleteStore} onAssignDriver={handleAssignDriver} />
        <div className="absolute top-6 left-6 z-[1000] flex gap-3">
          <div className="bg-white/95 px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> <span className="text-[10px] font-bold uppercase">{orders.length} Commandes</span></div>
            <div className="w-px h-3 bg-slate-200"></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-900 rounded-full"></span> <span className="text-[10px] font-bold uppercase">{drivers.length} Livreurs</span></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
