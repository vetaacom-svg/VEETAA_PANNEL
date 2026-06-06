import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Package } from 'lucide-react';
import type { Order, Driver, UserProfile, Store } from '../../../types';

/** Heatmap Leaflet pour l’onglet Statistiques (plugin heatLayer optionnel sur L). */
const StatisticsMapComponent: React.FC<{
  orders: Order[];
  drivers: Driver[];
  users: UserProfile[];
  stores: Store[];
}> = ({ orders, drivers, users, stores }) => {
  const [map, setMap] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initTimeoutRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const diagnosticLayersRef = useRef<any>(null);

  const getOrderCoordinates = (order: Order): [number, number] | null => {
    if (order.location?.lat && order.location?.lng) return [order.location.lat, order.location.lng];

    const notes = [order.textOrder, order.deliveryNote].filter(Boolean) as string[];
    for (const text of notes) {
      const match =
        text.match(/google\.com\/maps\?(?:q|query)=([-.\d]+),([-.\d]+)/) ||
        text.match(/@([-.\d]+),([-.\d]+)/) ||
        text.match(/([-.\d]+)[,\s]+([-.\d]+)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (lat > 27 && lat < 36 && lng > -18 && lng < -1) return [lat, lng];
      }
    }

    if (order.userId) {
      const user = users.find(u => u.id === order.userId);
      const lat = user?.lastLat ?? (user as any)?.last_lat ?? (user as any)?.x;
      const lng = user?.lastLng ?? (user as any)?.last_lng ?? (user as any)?.y;
      if (lat && lng) return [lat + (Math.random() - 0.5) * 0.005, lng + (Math.random() - 0.5) * 0.005];
    }

    if (order.storeName) {
      const store = stores.find(s => s.name === order.storeName);
      if (store?.latitude != null && store?.longitude != null) {
        const la = Number(store.latitude);
        const lo = Number(store.longitude);
        if (!isNaN(la) && !isNaN(lo)) return [la + (Math.random() - 0.5) * 0.01, lo + (Math.random() - 0.5) * 0.01];
      }
    }

    return null;
  };

  const getStoreCoordinates = (store: Store): [number, number] | null => {
    if (store.latitude != null && store.longitude != null) {
      const la = Number(store.latitude);
      const lo = Number(store.longitude);
      if (!isNaN(la) && !isNaN(lo)) return [la, lo];
    }

    const lat =
      store.maps_url?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[1] ||
      store.mapsUrl?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[1];
    const lng =
      store.maps_url?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[2] ||
      store.mapsUrl?.match(/query=([-.\\d]+),([-.\\d]+)/)?.[2];

    return lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
  };

  useEffect(() => {
    if (!containerRef.current || map || typeof L === 'undefined') return;
    if ((containerRef.current as any)._leaflet_id) return;

    const mapInstance = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([34.261, -6.5802], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '',
    }).addTo(mapInstance);
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

    const heatData: [number, number, number][] = [];
    const markers: L.CircleMarker[] = [];

    orders.forEach(order => {
      const coords = getOrderCoordinates(order);
      if (coords) {
        heatData.push([coords[0], coords[1], 1.0]);
        markers.push(
          L.circleMarker(coords, {
            radius: 3,
            color: 'red',
            fillColor: '#ff0000',
            fillOpacity: 1,
            weight: 1,
          })
        );
      }
    });

    drivers.forEach(driver => {
      const lat = driver.lastLat ?? (driver as any).last_lat ?? (driver as any).latitude ?? (driver as any).x;
      const lng = driver.lastLng ?? (driver as any).last_lng ?? (driver as any).longitude ?? (driver as any).y;
      if (lat && lng) {
        heatData.push([lat, lng, 0.7]);
      }
    });

    stores.forEach(store => {
      const coords = getStoreCoordinates(store);
      if (coords) {
        heatData.push([coords[0], coords[1], 0.9]);
      }
    });

    if (markers.length > 0) diagnosticLayersRef.current = L.layerGroup(markers).addTo(map);

    if (typeof (L as any).heatLayer === 'function' && heatData.length > 0) {
      heatLayerRef.current = (L as any).heatLayer(heatData, {
        radius: 40,
        blur: 15,
        max: 1.0,
        gradient: { 0.4: 'lime', 0.6: 'yellow', 1.0: 'red' },
      }).addTo(map);
      map.setView([34.26, -6.58], 12);
    }
  }, [map, orders, drivers, users, stores]);

  return (
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden border">
      <style>{`
             .leaflet-control-attribution {
                display: none !important;
             }
         `}</style>
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

export default StatisticsMapComponent;
