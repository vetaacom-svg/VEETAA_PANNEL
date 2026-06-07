
import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Store, Driver, UserProfile, Order } from '../../types';
import { StoreIcon, DriverIdleIcon, DriverBusyIcon, UserIdleIcon, UserActiveIcon } from './MarkerIcons';
import { INITIAL_CENTER } from '../constants';
import { calculateDistance, formatDistance } from '../utils/geoUtils';

interface MapProps {
  stores: Store[];
  drivers: Driver[];
  users: UserProfile[];
  orders: Order[];
  selectedOrderId: string | null;
  mapHeight?: number;
  onDeleteStore?: (storeId: string) => void;
  onAssignDriver?: (orderId: string, driverId: string) => void;
}

const MapController: React.FC<{ targetPos: [number, number] | null, mapHeight?: number }> = ({ targetPos, mapHeight }) => {
  const map = useMap();

  // Correction pour le problème de "zone grise" quand le conteneur change de taille
  useEffect(() => {
    map.invalidateSize();

    // On ajoute un petit délai pour attendre la fin de la transition CSS (0.5s)
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 600);

    return () => clearTimeout(timeout);
  }, [map, mapHeight]);

  useEffect(() => {
    if (targetPos) map.flyTo(targetPos, 15, { duration: 1.5 });
  }, [targetPos, map]);

  return null;
};

const getStoreCoordinates = (store: Store): [number, number] | null => {
  let lat = store.latitude != null ? Number(store.latitude) : NaN;
  let lng = store.longitude != null ? Number(store.longitude) : NaN;

  if (isNaN(lat) || isNaN(lng)) {
    const url = store.maps_url || store.mapsUrl;
    const latMatch = url?.match(/@(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
      url?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
      url?.match(/query=([-.\d]+),([-.\d]+)/) ||
      url?.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (latMatch) {
      lat = parseFloat(latMatch[1]);
      lng = parseFloat(latMatch[2]);
    }
  }

  return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
};

const LiveMap: React.FC<MapProps> = ({ stores, drivers, users, orders, selectedOrderId, mapHeight, onDeleteStore, onAssignDriver }) => {
  const selectedOrder = orders.find(o => String(o.id) === String(selectedOrderId));

  // Detection logic for store/user/driver linked to the selected order
  const activeUser = selectedOrder ? users.find(u => u.id === selectedOrder.userId) : null;
  const storeId = selectedOrder ? (selectedOrder as any).storeId || (selectedOrder as any).store_id : null;
  const activeStore = storeId ? stores.find(s => s.id === storeId) : null;
  const activeDriver = selectedOrder?.assignedDriverId ? drivers.find(d => d.id === selectedOrder.assignedDriverId) : null;

  return (
    <div className="w-full h-full relative">
      <style>{`
        .leaflet-control-attribution {
          display: none !important;
        }
        .leaflet-tile {
          filter: contrast(1.05) brightness(1.05) !important;
        }
        .leaflet-popup-content {
          font-size: 14px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .leaflet-popup-tip {
          background: white;
        }
      `}</style>
      <MapContainer center={INITIAL_CENTER} zoom={13} scrollWheelZoom={true} className="h-full w-full" attributionControl={false}>
        <MapController
          targetPos={activeStore ? getStoreCoordinates(activeStore) : null}
          mapHeight={mapHeight}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* MAGASINS (Général ou Focus) */}
        {stores.map(store => {
          const pos = getStoreCoordinates(store);
          if (!pos) return null;
          const [lat, lng] = pos;

          // On affiche TOUS les magasins, mais on peut les styliser différemment s'il y a un focus
          const isFocusedStore = selectedOrderId && store.id === storeId;
          const isOtherStoreFocused = selectedOrderId && storeId && store.id !== storeId;

          const img = (store as any).image_url || (store as any).image;
          const makeInitialsSvg = (name = '') => {
            const initials = (name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('') || 'S').toUpperCase();
            const colors = ['#f97316', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];
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
              <div style="
                width:60px;
                height:60px;
                border-radius:16px;
                overflow:hidden;
                border:4px solid ${isFocusedStore ? '#f97316' : 'rgba(255,255,255,0.9)'};
                box-shadow:0 8px 20px rgba(2,6,23,0.2);
                transition: all 0.3s ease;
                opacity: ${isOtherStoreFocused ? '0.4' : '1'};
                transform: ${isFocusedStore ? 'scale(1.3)' : 'scale(1)'};
                z-index: ${isFocusedStore ? '1000' : '1'};
              ">
                <img src="${src}" onerror="this.onerror=null;this.src='${fallback}'" style="width:100%;height:100%;object-fit:cover;display:block;" />
              </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -52]
          });

          return (
            <Marker key={store.id} position={[lat, lng]} icon={storeIcon}>
              <Popup minWidth={320} maxWidth={380} className="leaflet-popup-large">
                <div className="p-4 min-w-[310px] space-y-3">
                  <div className="w-full h-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img
                      src={src}
                      alt={store.name}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { try { e.currentTarget.src = fallback; } catch { } }}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-red-600 text-xl">{store.name}</h3>
                    <p className="text-[10px] text-gray-500 font-mono">ID: {store.id}</p>
                    {isFocusedStore && <p className="text-[11px] text-orange-600 font-black uppercase mt-1">🎯 Magasin Focus #${selectedOrderId}</p>}
                  </div>

                  <div className="text-sm border-t pt-2 space-y-2">
                    <p><b>🏷️ Type:</b> {store.type}</p>
                    <p className="text-[10px] text-gray-400 font-mono">📍 Lat: {lat.toFixed(8)}</p>
                    <p className="text-[10px] text-gray-400 font-mono">📍 Lng: {lng.toFixed(8)}</p>
                  </div>

                  {onDeleteStore && (
                    <button
                      onClick={() => {
                        if (window.confirm(`⚠️ SUPPRIMER "${store.name}" ?`)) {
                          onDeleteStore(store.id);
                        }
                      }}
                      className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-[13px] transition-colors"
                    >
                      🗑️ Supprimer Magasin
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* LIVREURS (Qui ont activé le radar / en ligne uniquement, ou assigné à la commande focus) */}
        {drivers
          .filter(d => d.is_online || (selectedOrderId && d.id === selectedOrder?.assignedDriverId))
          .map(driver => {
            const lat = driver.lastLat || driver.last_lat;
            const lng = driver.lastLng || driver.last_lng;

            if (!lat || !lng) return null;

            const assignedOrder = orders.find(o => o.assignedDriverId === driver.id && !['delivered', 'refused', 'unavailable'].includes(o.status));
            const isBusy = driver.status === 'busy' || !!assignedOrder;
            const isOffline = driver.status === 'offline';
            
            // Calculer distance vers la destination actuelle si commande sélectionnée
            let distanceToDestination = null;
            if (selectedOrderId && selectedOrder?.location) {
              distanceToDestination = calculateDistance(lat, lng, selectedOrder.location.lat, selectedOrder.location.lng);
            }

            return (
              <Marker key={driver.id} position={[lat, lng]} icon={isBusy ? DriverBusyIcon : DriverIdleIcon}>
                <Popup autoPan={false} minWidth={240} maxWidth={280}>
                  <div className="p-3 min-w-[230px]">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">{driver.fullName || driver.full_name}</h3>
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${isOffline ? 'bg-slate-100 text-slate-500' : (isBusy ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600')}`}>
                        {isOffline ? 'Hors ligne' : (isBusy ? 'En mission' : 'Libre')}
                      </div>
                    </div>

                    <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 font-mono">🆔 ID: {driver.id}</p>
                      <p className="text-[11px] text-slate-500 font-mono">📞 {driver.phone}</p>
                      {distanceToDestination !== null && (
                        <p className="text-[11px] font-bold text-blue-600 bg-blue-50 p-2 rounded">📍 Distance: {formatDistance(distanceToDestination)}</p>
                      )}

                      {assignedOrder && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">📦 Commande Active</p>
                          <p className="text-sm font-bold text-slate-700">N° {assignedOrder.id}</p>
                          <p className="text-[11px] text-orange-600 font-black mt-1 uppercase tracking-tighter">{assignedOrder.status}</p>
                        </div>
                      )}

                      {selectedOrderId && (driver.status === 'available' || driver.status === 'online') && (
                        <button
                          onClick={() => {
                            onAssignDriver?.(selectedOrderId, driver.id);
                          }}
                          className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                          ✓ Lier commande
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* UTILISATEURS / CLIENTS */}
        {selectedOrderId && selectedOrder && selectedOrder.location ? (
          // EN MODE FOCUS: On affiche le marqueur exact de livraison de la commande
          <Marker position={[selectedOrder.location.lat, selectedOrder.location.lng]} icon={UserActiveIcon}>
            <Popup minWidth={240} maxWidth={280}>
              <div className="p-3 min-w-[230px]">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">📍 LIEU DE LIVRAISON</p>
                <h3 className="font-bold text-indigo-700 text-lg">{selectedOrder.customerName}</h3>
                <p className="text-[11px] text-gray-400 font-mono">📦 Commande: #{selectedOrder.id}</p>
                <div className="mt-2.5 text-sm border-t pt-2.5">
                  <div className="bg-green-50 p-2.5 rounded border border-green-200 text-center">
                    <p className="text-[10px] font-bold text-green-600 uppercase">✓ Status: {selectedOrder.status}</p>
                    <p className="text-[10px] font-bold text-green-700 mt-1">💰 Total: {selectedOrder.total} DH</p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ) : (
          // EN MODE NORMAL: On affiche tous les profils utilisateurs avec position connue
          users.map(user => {
            const lat = user.lastLat;
            const lng = user.lastLng;
            if (!lat || !lng) return null;

            const activeUserOrder = orders.find(o => o.userId === user.id && !['delivered', 'refused', 'unavailable'].includes(o.status));

            return (
              <Marker key={user.id} position={[lat, lng]} icon={activeUserOrder ? UserActiveIcon : UserIdleIcon}>
                <Popup minWidth={240} maxWidth={280}>
                  <div className="p-3 min-w-[230px]">
                    <h3 className="font-bold text-indigo-700 text-lg">👤 {user.fullName || (user as any).fullName}</h3>
                    <p className="text-[11px] text-gray-400 font-mono">ID Client: {user.id}</p>
                    <p className="text-[11px] text-gray-500 font-mono">📞 {user.phone}</p>
                    <div className="mt-2.5 text-sm border-t pt-2.5">
                      {activeUserOrder ? (
                        <div className="bg-green-50 p-2.5 rounded border border-green-200 text-center">
                          <p className="text-[10px] font-bold text-green-600 uppercase">✓ Commande Active</p>
                          <p className="font-black text-green-900 text-base">N° {activeUserOrder.id}</p>
                        </div>
                      ) : <p className="text-gray-400 italic text-center text-[11px]">ℹ️ Aucune commande</p>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}

        {/* TRACÉS LOGISTIQUES */}
        {selectedOrder && activeStore && (
          (() => {
            const sPos = getStoreCoordinates(activeStore);
            const uLat = selectedOrder.location?.lat;
            const uLng = selectedOrder.location?.lng;

            if (!sPos || !uLat || !uLng) return null;
            const [sLat, sLng] = sPos;

            return (
              <>
                <Polyline positions={[[sLat, sLng], [uLat, uLng]]} color="#22c55e" dashArray="10, 10" weight={2} />
                {activeDriver && (
                  (() => {
                    const dLat = activeDriver.lastLat || activeDriver.last_lat;
                    const dLng = activeDriver.lastLng || activeDriver.last_lng;
                    if (dLat && dLng) {
                      return <Polyline positions={[[dLat, dLng], [sLat, sLng]]} color="#ef4444" weight={3} />;
                    }
                    return null;
                  })()
                )}
              </>
            );
          })()
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
