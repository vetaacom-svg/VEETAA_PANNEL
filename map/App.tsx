
import React, { useState, useEffect } from 'react';
import LiveMap from './components/LiveMap';
import Sidebar from './components/Sidebar';
import { MOCK_DRIVERS, MOCK_USERS, INITIAL_CENTER } from './constants';
import { Store, Driver, User, Order } from './types';
import { supabase } from '../lib/supabase';

const App: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // CHARGER LES VRAIS STORES DEPUIS SUPABASE
  useEffect(() => {
    const fetchStores = async () => {
      console.log('🔍 Chargement des stores depuis Supabase...');
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, latitude, longitude, category_id, image_url, image')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erreur chargement stores:', error);
        return;
      }

      if (data) {
        console.log(`✅ ${data.length} stores chargés:`, data);
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

          const resolvedImageUrl = normalize(store.image_url) || normalize(store.image) || undefined;
          const resolvedImage = normalize(store.image) || normalize(store.image_url) || undefined;

          return {
            id: store.id,
            name: store.name,
            lat: store.latitude || null,
            lng: store.longitude || null,
            type: store.category_id || 'restaurant',
            address: 'Casablanca, Maroc',
            image_url: resolvedImageUrl,
            image: resolvedImage
          } as Store;
        });
        setStores(formattedStores);
        console.log('📍 Stores formatés pour la carte:', formattedStores);
      } else {
        console.log('⚠️ Aucun store trouvé');
      }
    };

    fetchStores();
  }, []);

  // SIMULATION DU MOUVEMENT TEMPS RÉEL (1s)
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        lat: d.lat + (Math.random() - 0.5) * 0.0001,
        lng: d.lng + (Math.random() - 0.5) * 0.0001,
        lastUpdated: Date.now()
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddEntity = (type: 'user' | 'driver' | 'store', name: string, lat?: number, lng?: number) => {
    const id = `${type}_${Date.now()}`;
    const defaultLat = INITIAL_CENTER[0] + (Math.random() - 0.5) * 0.03;
    const defaultLng = INITIAL_CENTER[1] + (Math.random() - 0.5) * 0.03;

    if (type === 'user') {
      setUsers(prev => [...prev, { id, name, lat: lat ?? defaultLat, lng: lng ?? defaultLng, isOrdering: false }]);
    } else if (type === 'driver') {
      setDrivers(prev => [...prev, { id, name, lat: lat ?? defaultLat, lng: lng ?? defaultLng, status: 'available', lastUpdated: Date.now() }]);
    } else {
      setStores(prev => [...prev, { id, name, lat: lat!, lng: lng!, type: 'restaurant', address: 'Casablanca, Maroc' }]);
    }
  };

  const handleSimulateOrder = (userId: string) => {
    const store = stores[0];
    const orderId = `CMD-${Math.floor(Math.random() * 9000) + 1000}`;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isOrdering: true } : u));
    setOrders(prev => [...prev, { id: orderId, userId, storeId: store.id, status: 'pending', timestamp: Date.now() }]);
    setSelectedOrderId(orderId);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans antialiased text-slate-900">
      <Sidebar
        orders={orders} users={users} stores={stores} drivers={drivers}
        selectedOrderId={selectedOrderId} onSelectOrder={setSelectedOrderId}
        onAddEntity={handleAddEntity} onSimulateOrder={handleSimulateOrder}
      />
      <main className="flex-1 relative">
        <LiveMap stores={stores} drivers={drivers} users={users} orders={orders} selectedOrderId={selectedOrderId} />
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
