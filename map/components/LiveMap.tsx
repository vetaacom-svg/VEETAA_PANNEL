
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L, { LatLngBounds } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Store, Driver, UserProfile, Order } from '../../types';
import {
  StoreMarkerIcon, ClientMarkerIcon, DriverDeliveryIcon,
  DriverIdleIcon, DriverBusyIcon, UserIdleIcon, UserActiveIcon,
} from './MarkerIcons';
import { INITIAL_CENTER } from '../constants';
import { calculateDistance, formatDistance, haversineMeters } from '../utils/geoUtils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type LatLng = [number, number];

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

// Statuts où le livreur se dirige encore vers le magasin (phase "approche")
const APPROACHING_STATUSES = new Set([
  'pending', 'accepted', 'confirmed', 'preparing', 'treatment', 'verification',
]);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Coordonnées d'un Store
// ─────────────────────────────────────────────────────────────────────────────
const getStoreCoordinates = (store: Store): LatLng | null => {
  let lat = store.latitude != null ? Number(store.latitude) : NaN;
  let lng = store.longitude != null ? Number(store.longitude) : NaN;

  if (isNaN(lat) || isNaN(lng)) {
    const url = store.maps_url || store.mapsUrl;
    const latMatch =
      url?.match(/@(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
      url?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d+)/) ||
      url?.match(/query=([-.\\d]+),([-.\\d]+)/) ||
      url?.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (latMatch) {
      lat = parseFloat(latMatch[1]);
      lng = parseFloat(latMatch[2]);
    }
  }

  return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// OSRM — Récupérer l'itinéraire entre deux points via API publique gratuite
// ─────────────────────────────────────────────────────────────────────────────
const fetchOsrmRoute = async (from: LatLng, to: LatLng): Promise<LatLng[] | null> => {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!coords) return null;

    // GeoJSON: [lng, lat] → on inverse pour Leaflet [lat, lng]
    return (coords as [number, number][]).map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT — FitBounds intelligent (évite le zoom-out infini si points trop proches)
// ─────────────────────────────────────────────────────────────────────────────
const FitBounds: React.FC<{ points: LatLng[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
      return;
    }

    // Détection de la "boîte nulle" : tous les points à moins de 10 m
    const allClose = points.every(
      (p) => haversineMeters(p[0], p[1], points[0][0], points[0][1]) < 10
    );

    if (allClose) {
      map.setView(points[0], 16, { animate: true });
      return;
    }

    try {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 16 });
      }
    } catch {
      map.setView(points[0], 15, { animate: true });
    }
  }, [map, JSON.stringify(points)]);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT — MapController (invalidation taille + flyTo sur commande sélectionnée)
// ─────────────────────────────────────────────────────────────────────────────
const MapController: React.FC<{ targetPos: LatLng | null; mapHeight?: number }> = ({
  targetPos,
  mapHeight,
}) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timeout = setTimeout(() => map.invalidateSize(), 600);
    return () => clearTimeout(timeout);
  }, [map, mapHeight]);

  useEffect(() => {
    if (targetPos) map.flyTo(targetPos, 15, { duration: 1.5 });
  }, [targetPos, map]);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — LiveMap
// ─────────────────────────────────────────────────────────────────────────────
const LiveMap: React.FC<MapProps> = ({
  stores, drivers, users, orders, selectedOrderId, mapHeight, onDeleteStore, onAssignDriver,
}) => {
  // ── Itinéraires OSRM ──────────────────────────────────────────────────────
  const [activeRouteCoords, setActiveRouteCoords] = useState<LatLng[] | null>(null);
  const [remainingRouteCoords, setRemainingRouteCoords] = useState<LatLng[] | null>(null);

  // Ref pour throttling : dernière position du livreur lors du dernier appel OSRM
  const lastFetchedDriverPos = useRef<LatLng | null>(null);
  // Ref pour éviter les appels redondants si on n'a pas bougé
  const fetchingRef = useRef(false);

  // ── Résolution des entités actives ────────────────────────────────────────
  const selectedOrder = orders.find((o) => String(o.id) === String(selectedOrderId)) ?? null;
  const storeId = selectedOrder
    ? (selectedOrder as any).storeId || (selectedOrder as any).store_id
    : null;
  const activeStore = storeId ? stores.find((s) => s.id === storeId) ?? null : null;
  const activeDriver = selectedOrder?.assignedDriverId
    ? drivers.find((d) => d.id === selectedOrder.assignedDriverId) ?? null
    : null;

  // ── Coordonnées brutes des acteurs ────────────────────────────────────────
  const clientPos: LatLng | null =
    selectedOrder?.location
      ? [selectedOrder.location.lat, selectedOrder.location.lng]
      : null;

  const storePos: LatLng | null = activeStore ? getStoreCoordinates(activeStore) : null;

  const driverPos: LatLng | null =
    activeDriver
      ? (() => {
          const lat = activeDriver.lastLat ?? activeDriver.last_lat ?? activeDriver.latitude;
          const lng = activeDriver.lastLng ?? activeDriver.last_lng ?? activeDriver.longitude;
          return lat != null && lng != null && Number(lat) !== 0 && Number(lng) !== 0 && !isNaN(Number(lat)) && !isNaN(Number(lng))
            ? [Number(lat), Number(lng)]
            : null;
        })()
      : null;

  // ── Points pour FitBounds ─────────────────────────────────────────────────
  const fitPoints: LatLng[] = [
    ...(clientPos ? [clientPos] : []),
    ...(storePos ? [storePos] : []),
    ...(driverPos ? [driverPos] : []),
  ];

  // ── Logique OSRM (throttlée par Haversine) ────────────────────────────────
  const fetchRoutes = useCallback(async () => {
    if (!selectedOrder || !clientPos) {
      setActiveRouteCoords(null);
      setRemainingRouteCoords(null);
      return;
    }

    // Cas 1 : Pas de livreur → trajet de base Magasin → Client
    if (!driverPos) {
      if (storePos) {
        const route = await fetchOsrmRoute(storePos, clientPos);
        setActiveRouteCoords(route);
      }
      setRemainingRouteCoords(null);
      return;
    }

    // Si livreur présent → trajet direct Livreur → Client (Lieu de livraison)
    const route = await fetchOsrmRoute(driverPos, clientPos);
    setActiveRouteCoords(route);
    setRemainingRouteCoords(null);
  }, [selectedOrderId, selectedOrder?.status, driverPos?.[0], driverPos?.[1],
    storePos?.[0], storePos?.[1], clientPos?.[0], clientPos?.[1]]);

  // Effet principal : se déclenche sur changement de commande/status
  // et throttle les re-fetches si le livreur n'a pas bougé de plus de 30 m
  useEffect(() => {
    if (!selectedOrder) {
      setActiveRouteCoords(null);
      setRemainingRouteCoords(null);
      lastFetchedDriverPos.current = null;
      return;
    }

    // Throttle OSRM : skip si le livreur est à moins de 30 m du dernier fetch
    if (driverPos && lastFetchedDriverPos.current) {
      const moved = haversineMeters(
        driverPos[0], driverPos[1],
        lastFetchedDriverPos.current[0], lastFetchedDriverPos.current[1],
      );
      if (moved < 30 && fetchingRef.current === false) {
        // Livreur n'a pas assez bougé : on ne refetch pas
        return;
      }
    }

    fetchingRef.current = true;
    fetchRoutes().finally(() => {
      if (driverPos) lastFetchedDriverPos.current = driverPos;
      fetchingRef.current = false;
    });
  }, [fetchRoutes]);

  // Reset routes quand on change de commande sélectionnée
  useEffect(() => {
    setActiveRouteCoords(null);
    setRemainingRouteCoords(null);
    lastFetchedDriverPos.current = null;
  }, [selectedOrderId]);

  // ── Styles CSS globaux de la carte ────────────────────────────────────────
  const mapStyles = `
    .leaflet-control-attribution { display: none !important; }
    .leaflet-popup-content { font-size: 14px; }
    .leaflet-popup-content-wrapper {
      border-radius: 14px;
      box-shadow: 0 6px 28px rgba(0,0,0,0.18);
    }
    .leaflet-popup-tip { background: white; }

    /* Polyline animée (route active) */
    @keyframes dash-move {
      to { stroke-dashoffset: -80; }
    }
    .active-route-path {
      animation: dash-move 1.5s linear infinite;
    }
  `;

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative">
      <style>{mapStyles}</style>

      <MapContainer
        center={INITIAL_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
        attributionControl={false}
      >
        <MapController
          targetPos={storePos ?? clientPos}
          mapHeight={mapHeight}
        />

        {/* FitBounds intelligent autour des points actifs */}
        {fitPoints.length > 0 && <FitBounds points={fitPoints} />}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ── MAGASINS ── */}
        {stores.map((store) => {
          const pos = getStoreCoordinates(store);
          if (!pos) return null;
          const [lat, lng] = pos;

          const isFocusedStore = !!selectedOrderId && store.id === storeId;
          const isOtherStoreFocused = !!selectedOrderId && !!storeId && store.id !== storeId;

          const img = (store as any).image_url || (store as any).image;
          const makeInitialsSvg = (name = '') => {
            const initials = (
              name.split(' ').map((s: string) => s[0]).filter(Boolean).slice(0, 2).join('') || 'S'
            ).toUpperCase();
            const colors = ['#f97316', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];
            const hash = Array.from(initials).reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
            const bg = colors[hash % colors.length];
            return `data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>` +
              `<rect rx='20' width='100%' height='100%' fill='${bg}'/>` +
              `<text x='50%' y='54%' font-family='Inter, Arial, sans-serif' font-size='52' font-weight='700' fill='#fff' text-anchor='middle' dominant-baseline='middle'>${initials}</text>` +
              `</svg>`
            )}`;
          };

          const fallback = makeInitialsSvg(store.name || 'Store');
          const src = img || fallback;

          const storeIcon = L.divIcon({
            className: 'veetaa-store-icon',
            html: `
              <div style="
                width:60px; height:60px; border-radius:16px; overflow:hidden;
                border:4px solid ${isFocusedStore ? '#f97316' : 'rgba(255,255,255,0.9)'};
                box-shadow:0 8px 20px rgba(2,6,23,0.2);
                transition: all 0.3s ease;
                opacity: ${isOtherStoreFocused ? '0.4' : '1'};
                transform: ${isFocusedStore ? 'scale(1.3)' : 'scale(1)'};
                z-index: ${isFocusedStore ? '1000' : '1'};
              ">
                <img src="${src}" onerror="this.onerror=null;this.src='${fallback}'"
                  style="width:100%;height:100%;object-fit:cover;display:block;" />
              </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -52],
          });

          return (
            <Marker key={store.id} position={[lat, lng]} icon={storeIcon}>
              <Popup minWidth={320} maxWidth={380}>
                <div className="p-4 min-w-[310px] space-y-3">
                  <div className="w-full h-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <img src={src} alt={store.name} className="w-full h-full object-cover"
                      onError={(e: any) => { try { e.currentTarget.src = fallback; } catch { } }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-600 text-xl">{store.name}</h3>
                    <p className="text-[10px] text-gray-500 font-mono">ID: {store.id}</p>
                    {isFocusedStore && (
                      <p className="text-[11px] text-orange-600 font-black uppercase mt-1">
                        🎯 Magasin Focus #{selectedOrderId}
                      </p>
                    )}
                  </div>
                  <div className="text-sm border-t pt-2 space-y-2">
                    <p><b>🏷️ Type:</b> {store.type}</p>
                    <p className="text-[10px] text-gray-400 font-mono">📍 Lat: {lat.toFixed(8)}</p>
                    <p className="text-[10px] text-gray-400 font-mono">📍 Lng: {lng.toFixed(8)}</p>
                  </div>
                  {onDeleteStore && (
                    <button
                      onClick={() => {
                        if (window.confirm(`⚠️ SUPPRIMER "${store.name}" ?`)) onDeleteStore(store.id);
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

        {/* ── LIVREURS ── */}
        {drivers
          .filter((d) => d.is_online || (selectedOrderId && d.id === selectedOrder?.assignedDriverId))
          .map((driver) => {
            const lat = driver.lastLat ?? driver.last_lat ?? driver.latitude;
            const lng = driver.lastLng ?? driver.last_lng ?? driver.longitude;
            if (!lat || !lng) return null;

            const isActiveDriver = selectedOrder?.assignedDriverId === driver.id;
            const assignedOrder = orders.find(
              (o) => o.assignedDriverId === driver.id &&
                !['delivered', 'refused', 'unavailable'].includes(o.status)
            );
            const isBusy = driver.status === 'busy' || !!assignedOrder;
            const isOffline = driver.status === 'offline';

            let distanceToDestination: number | null = null;
            if (selectedOrderId && selectedOrder?.location) {
              distanceToDestination = calculateDistance(
                lat, lng, selectedOrder.location.lat, selectedOrder.location.lng
              );
            }

            // On utilise l'icône premium scooter pour le livreur actif, sinon les icônes legacy
            const icon = isActiveDriver
              ? DriverDeliveryIcon
              : isBusy
                ? DriverBusyIcon
                : DriverIdleIcon;

            return (
              <Marker key={driver.id} position={[lat, lng]} icon={icon}>
                <Popup autoPan={false} minWidth={240} maxWidth={280}>
                  <div className="p-3 min-w-[230px]">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                        {driver.fullName || driver.full_name}
                      </h3>
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                        isOffline ? 'bg-slate-100 text-slate-500'
                          : isBusy ? 'bg-orange-100 text-orange-600'
                            : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {isOffline ? 'Hors ligne' : isBusy ? 'En mission' : 'Libre'}
                      </div>
                    </div>
                    <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 font-mono">🆔 ID: {driver.id}</p>
                      <p className="text-[11px] text-slate-500 font-mono">📞 {driver.phone}</p>
                      {distanceToDestination !== null && (
                        <p className="text-[11px] font-bold text-blue-600 bg-blue-50 p-2 rounded">
                          📍 Distance: {formatDistance(distanceToDestination)}
                        </p>
                      )}
                      {isActiveDriver && selectedOrder && (
                        <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">
                            🛵 Livreur Assigné
                          </p>
                          <p className="text-sm font-bold text-blue-700">
                            {APPROACHING_STATUSES.has(selectedOrder.status)
                              ? '→ En route vers le magasin'
                              : '→ En livraison vers le client'}
                          </p>
                          <p className="text-[10px] text-blue-500 font-black mt-1 uppercase">
                            Statut : {selectedOrder.status}
                          </p>
                        </div>
                      )}
                      {assignedOrder && !isActiveDriver && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            📦 Commande Active
                          </p>
                          <p className="text-sm font-bold text-slate-700">N° {assignedOrder.id}</p>
                          <p className="text-[11px] text-orange-600 font-black mt-1 uppercase tracking-tighter">
                            {assignedOrder.status}
                          </p>
                        </div>
                      )}
                      {selectedOrderId && (driver.status === 'available' || driver.status === 'online') && (
                        <button
                          onClick={() => onAssignDriver?.(selectedOrderId, driver.id)}
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

        {/* ── CLIENT / LIEU DE LIVRAISON ── */}
        {selectedOrderId && selectedOrder?.location ? (
          <Marker
            position={[selectedOrder.location.lat, selectedOrder.location.lng]}
            icon={ClientMarkerIcon}
          >
            <Popup minWidth={240} maxWidth={280}>
              <div className="p-3 min-w-[230px]">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">
                  📍 LIEU DE LIVRAISON
                </p>
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
          users.map((user) => {
            const lat = user.lastLat;
            const lng = user.lastLng;
            if (!lat || !lng) return null;
            const activeUserOrder = orders.find(
              (o) => o.userId === user.id && !['delivered', 'refused', 'unavailable'].includes(o.status)
            );
            return (
              <Marker key={user.id} position={[lat, lng]} icon={activeUserOrder ? UserActiveIcon : UserIdleIcon}>
                <Popup minWidth={240} maxWidth={280}>
                  <div className="p-3 min-w-[230px]">
                    <h3 className="font-bold text-indigo-700 text-lg">👤 {user.fullName}</h3>
                    <p className="text-[11px] text-gray-400 font-mono">ID Client: {user.id}</p>
                    <p className="text-[11px] text-gray-500 font-mono">📞 {user.phone}</p>
                    <div className="mt-2.5 text-sm border-t pt-2.5">
                      {activeUserOrder ? (
                        <div className="bg-green-50 p-2.5 rounded border border-green-200 text-center">
                          <p className="text-[10px] font-bold text-green-600 uppercase">✓ Commande Active</p>
                          <p className="font-black text-green-900 text-base">N° {activeUserOrder.id}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-center text-[11px]">ℹ️ Aucune commande</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}

        {/* ── TRACÉ ACTIF (bleu épais, tirets animés) ── */}
        {activeRouteCoords && activeRouteCoords.length > 1 && (
          <>
            {/* Ombre portée du tracé */}
            <Polyline
              positions={activeRouteCoords}
              pathOptions={{
                color: 'rgba(37,99,235,0.25)',
                weight: 10,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Ligne bleue principale avec tirets */}
            <Polyline
              positions={activeRouteCoords}
              pathOptions={{
                color: '#3b82f6',
                weight: 5,
                dashArray: '12, 8',
                dashOffset: '0',
                lineCap: 'round',
                lineJoin: 'round',
                className: 'active-route-path',
              }}
            />
          </>
        )}

        {/* ── TRACÉ RESTANT (pointillés gris fins) ── */}
        {remainingRouteCoords && remainingRouteCoords.length > 1 && (
          <Polyline
            positions={remainingRouteCoords}
            pathOptions={{
              color: '#94a3b8',
              weight: 3,
              dashArray: '4, 6',
              lineCap: 'round',
              lineJoin: 'round',
              opacity: 0.75,
            }}
          />
        )}

        {/* ── FALLBACK (tracés directs si OSRM non encore chargé) ── */}
        {!activeRouteCoords && selectedOrder && storePos && clientPos && !driverPos && (
          <Polyline
            positions={[storePos, clientPos]}
            pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '6, 8', opacity: 0.5 }}
          />
        )}
        {!activeRouteCoords && selectedOrder && driverPos && storePos &&
          APPROACHING_STATUSES.has(selectedOrder.status) && (
            <Polyline
              positions={[driverPos, storePos]}
              pathOptions={{ color: '#cbd5e1', weight: 2, dashArray: '4, 6', opacity: 0.5 }}
            />
          )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
