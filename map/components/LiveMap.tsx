
import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Store, Driver, User, Order } from '../types';
import { StoreIcon, DriverIdleIcon, DriverBusyIcon, UserIdleIcon, UserActiveIcon } from './MarkerIcons';
import { INITIAL_CENTER } from '../constants';

interface MapProps {
  stores: Store[];
  drivers: Driver[];
  users: User[];
  orders: Order[];
  selectedOrderId: string | null;
  onDeleteStore?: (storeId: string) => void;
}

const MapController: React.FC<{ targetPos: [number, number] | null }> = ({ targetPos }) => {
  const map = useMap();
  useEffect(() => {
    if (targetPos) map.flyTo(targetPos, 15, { duration: 1.5 });
  }, [targetPos, map]);
  return null;
};

const LiveMap: React.FC<MapProps> = ({ stores, drivers, users, orders, selectedOrderId, onDeleteStore }) => {
  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const activeUser = selectedOrder ? users.find(u => u.id === selectedOrder.userId) : null;
  const activeStore = selectedOrder ? stores.find(s => s.id === selectedOrder.storeId) : null;
  const activeDriver = selectedOrder?.assignedDriverId ? drivers.find(d => d.id === selectedOrder.assignedDriverId) : null;

  return (
    <div className="w-full h-full relative">
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="street-darkener">
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues="0.5 0.7 0.9 1.0" />
            <feFuncG type="discrete" tableValues="0.5 0.7 0.9 1.0" />
            <feFuncB type="discrete" tableValues="0.5 0.7 0.9 1.0" />
          </feComponentTransfer>
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 1 0" />
          <feComponentTransfer>
            {/* Target purely white/very bright areas (roads) and map them to grey */}
            <feFuncR type="gamma" exponent="1.5" amplitude="0.8" offset="0" />
            <feFuncG type="gamma" exponent="1.5" amplitude="0.8" offset="0" />
            <feFuncB type="gamma" exponent="1.5" amplitude="0.8" offset="0" />
          </feComponentTransfer>
        </filter>
      </svg>
      <style>{`
        .leaflet-tile {
          filter: url(#street-darkener) saturate(1.2) !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      <MapContainer center={INITIAL_CENTER} zoom={13} scrollWheelZoom={true} className="h-full w-full" attributionControl={false}>
        <MapController targetPos={activeStore && activeStore.lat && activeStore.lng ? [activeStore.lat, activeStore.lng] : null} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {console.debug('LiveMap stores (id → img):', stores.map(s => ({ id: s.id, img: (s as any).image_url || (s as any).image })))}{/* MAGASINS */}
        {stores.map(store => {
          if (!store.lat || !store.lng) return null;

          const img = (store as any).image_url || (store as any).image;
          const makeInitialsSvg = (name = '') => {
            const initials = (name.split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('') || 'S').toUpperCase();
            const colors = ['#f97316','#06b6d4','#ef4444','#10b981','#8b5cf6','#f43f5e','#f59e0b'];
            const hash = Array.from(initials).reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const bg = colors[hash % colors.length];
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>` +
              `<rect rx='20' width='100%' height='100%' fill='${bg}'/>` +
              `<text x='50%' y='54%' font-family='Inter, Arial, sans-serif' font-size='52' font-weight='700' fill='#fff' text-anchor='middle' dominant-baseline='middle'>${initials}</text>` +
              `</svg>`;
            return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
          };

          const fallback = makeInitialsSvg(store.name || 'Store');
          const src = img || fallback;
          const storeIcon = L.divIcon({
            className: 'veetaa-store-icon',
            html: `
              <div style="width:42px;height:42px;border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,0.9);box-shadow:0 6px 14px rgba(2,6,23,0.12)">
                <img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" style="width:100%;height:100%;object-fit:cover;display:block;" />
              </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 42],
            popupAnchor: [0, -38]
          });

          return (
            <Marker key={store.id} position={[store.lat, store.lng]} icon={storeIcon}>
              <Popup minWidth={280} maxWidth={320} className="leaflet-popup-large">
                <div className="p-3 min-w-[270px] space-y-3">
                  {/* Store image preview — TOUJOURS affichée (image ou fallback) */}
                  <div className="w-full h-28 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img
                      src={src}
                      alt={store.name}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { try { e.currentTarget.src = fallback; } catch {} }}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-red-600 text-lg">{store.name}</h3>
                    <p className="text-[9px] text-gray-500 font-mono">ID: {store.id}</p>
                  </div>

                  <div className="text-xs border-t pt-2 space-y-1">
                    <p><b>🏷️ Type:</b> {store.type}</p>
                    <p className="text-gray-600">📍 {store.address}</p>
                    <p className="text-[9px] text-gray-400 font-mono">Lat: {store.lat?.toFixed(8)}, Lng: {store.lng?.toFixed(8)}</p>
                  </div>
                  
                  {/* Bouton de suppression */}
                  {onDeleteStore && (
                    <button
                      onClick={() => {
                        if (window.confirm(
                          `⚠️ Êtes-vous sûr de vouloir SUPPRIMER "${store.name}" ?\nCette action est irréversible !`
                        )) {
                          onDeleteStore(store.id);
                        }
                      }}
                      className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-[12px] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      🗑️ SUPPRIMER CE MAGASIN
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* LIVREURS */}
        {drivers.map(driver => {
          const isBusy = driver.status === 'busy';
          return (
            <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={isBusy ? DriverBusyIcon : DriverIdleIcon}>
              <Popup autoPan={false}>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-bold text-gray-900 text-base">{driver.name}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">ID LIVREUR: {driver.id}</p>
                  <div className="mt-2 text-xs border-t pt-2">
                    <p><b>Statut:</b> {isBusy ? '🔴 En mission' : '🟢 Libre'}</p>
                    <p className="text-[10px] text-gray-500 mt-1">MAJ: {new Date(driver.lastUpdated).toLocaleTimeString()}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* UTILISATEURS */}
        {users.map(user => (
          <Marker key={user.id} position={[user.lat, user.lng]} icon={user.isOrdering ? UserActiveIcon : UserIdleIcon}>
            <Popup>
              <div className="p-2 min-w-[180px]">
                <h3 className="font-bold text-indigo-700 text-base">{user.name}</h3>
                <p className="text-[10px] text-gray-400 font-mono">ID CLIENT: {user.id}</p>
                <div className="mt-2 text-xs border-t pt-2">
                  {user.isOrdering ? (
                    <div className="bg-green-50 p-2 rounded border border-green-200 text-center">
                      <p className="text-[9px] font-bold text-green-600 uppercase">Commande active</p>
                      <p className="font-black text-green-900">N° {orders.find(o => o.userId === user.id)?.id}</p>
                    </div>
                  ) : <p className="text-gray-400 italic">Aucune commande</p>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* TRACÉS LOGISTIQUES */}
        {selectedOrder && activeUser && activeStore && activeStore.lat && activeStore.lng && (
          <>
            <Polyline positions={[[activeStore.lat, activeStore.lng], [activeUser.lat, activeUser.lng]]} color="#22c55e" dashArray="10, 10" weight={2} />
            {activeDriver && <Polyline positions={[[activeDriver.lat, activeDriver.lng], [activeStore.lat, activeStore.lng]]} color="#ef4444" weight={3} />}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
