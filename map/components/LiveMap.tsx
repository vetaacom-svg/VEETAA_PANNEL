
import React, { useEffect } from 'react';
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
}

const MapController: React.FC<{ targetPos: [number, number] | null }> = ({ targetPos }) => {
  const map = useMap();
  useEffect(() => {
    if (targetPos) map.flyTo(targetPos, 15, { duration: 1.5 });
  }, [targetPos, map]);
  return null;
};

const LiveMap: React.FC<MapProps> = ({ stores, drivers, users, orders, selectedOrderId }) => {
  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const activeUser = selectedOrder ? users.find(u => u.id === selectedOrder.userId) : null;
  const activeStore = selectedOrder ? stores.find(s => s.id === selectedOrder.storeId) : null;
  const activeDriver = selectedOrder?.assignedDriverId ? drivers.find(d => d.id === selectedOrder.assignedDriverId) : null;

  return (
    <div className="w-full h-full relative">
      <MapContainer center={INITIAL_CENTER} zoom={13} scrollWheelZoom={true} className="h-full w-full">
        <MapController targetPos={activeStore && activeStore.lat && activeStore.lng ? [activeStore.lat, activeStore.lng] : null} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* MAGASINS */}
        {stores.map(store => {
          if (!store.lat || !store.lng) return null;
          return (
            <Marker key={store.id} position={[store.lat, store.lng]} icon={StoreIcon}>
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-bold text-red-600 text-base">{store.name}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">ID: {store.id}</p>
                  <div className="mt-2 text-xs border-t pt-2 space-y-1">
                    <p><b>Type:</b> {store.type}</p>
                    <p className="text-gray-500 italic">{store.address}</p>
                  </div>
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
