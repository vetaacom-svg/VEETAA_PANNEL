import React, { useState, useEffect } from 'react';
import LiveMap from './components/LiveMap';
import { MOCK_DRIVERS, MOCK_USERS, INITIAL_CENTER, MOCK_ORDERS, MOCK_STORES } from './constants';
import { Store, Driver, UserProfile as User, Order, CategoryID } from '../types';
import { supabase } from '../lib/supabase';
import { applyStoreVisibilityFilters } from '../lib/storeVisibilityQuery';

interface MapWidgetProps {
  height?: string;  // défaut: '400px'
  showCounter?: boolean;
  compact?: boolean;
}

const MapWidget: React.FC<MapWidgetProps> = ({ height = '400px', showCounter = true, compact = false }) => {
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // CHARGER LES VRAIS STORES (OU FALLBACK MOCK)
  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await applyStoreVisibilityFilters(
        supabase
          .from('stores')
          .select('id, name, latitude, longitude, category_id, image_url, image')
      );

      if (error || !data || data.length === 0) {
        setStores(MOCK_STORES);
        return;
      }

      const formattedStores: Store[] = data.map(store => {
        const normalize = (val: any) => {
          if (!val || typeof val !== 'string') return undefined;
          if (val.startsWith('http') || val.startsWith('data:')) return val;

          const tryVariants = (s: string) => {
            const variants: string[] = [s];
            if (!s.startsWith('stores/')) variants.push(`stores/${s}`);
            if (!s.startsWith('public/')) variants.push(`public/${s}`);
            if (s.startsWith('/')) variants.push(s.replace(/^\/+/, ''));
            const parts = s.split('/');
            if (parts.length > 1) variants.push(parts[parts.length - 1]);

            for (const v of variants) {
              try {
                const res = supabase.storage.from('stores').getPublicUrl(v);
                const url = (res && (res as any).data && (res as any).data.publicUrl) || undefined;
                if (url && typeof url === 'string' && url.trim() !== '') return url;
              } catch (e) {}
            }
            return undefined;
          };
          return tryVariants(val);
        };

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
          image_url: normalize(store.image_url) || normalize(store.image),
          image: normalize(store.image) || normalize(store.image_url) || ''
        } as Store;
      });
      setStores(formattedStores);
    };

    fetchStores();
  }, []);

  // SIMULATION MOUVEMENT TEMPS RÉEL
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        lastLat: (d.lastLat || 0) + (Math.random() - 0.5) * 0.00001,
        lastLng: (d.lastLng || 0) + (Math.random() - 0.5) * 0.00001,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignDriver = (orderId: string, driverId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId 
        ? { ...o, assignedDriverId: driverId, status: 'confirmed' }
        : o
    ));
  };

  return (
    <div style={{ 
      height, 
      width: '100%', 
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      backgroundColor: '#f5f5f5'
    }}>
      <LiveMap 
        stores={stores} 
        drivers={drivers} 
        users={users} 
        orders={orders} 
        selectedOrderId={selectedOrderId} 
        onAssignDriver={handleAssignDriver}
      />
      
      {showCounter && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          gap: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <span>📦 {orders.length} Commandes</span>
          <span>🚗 {drivers.length} Livreurs</span>
        </div>
      )}
    </div>
  );
};

export default MapWidget;
