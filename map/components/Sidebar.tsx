
import React, { useState } from 'react';
import { Order, User, Store, Driver } from '../types';

interface SidebarProps {
  orders: Order[];
  users: User[];
  stores: Store[];
  drivers: Driver[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onAddEntity: (type: 'user' | 'driver' | 'store', name: string, lat?: number, lng?: number) => void;
  onSimulateOrder: (userId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ orders, users, stores, drivers, selectedOrderId, onSelectOrder, onAddEntity, onSimulateOrder }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'admin'>('orders');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleAddStore = () => {
    if (!name || !lat || !lng) return alert("Nom et coordonnées X/Y requis");
    onAddEntity('store', name, parseFloat(lat), parseFloat(lng));
    setName(''); setLat(''); setLng('');
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-xl z-[1001]">
      <div className="p-6 bg-slate-900 text-white">
        <h1 className="text-xl font-bold tracking-tight">Admin Morocco Map</h1>
        <div className="mt-4 flex bg-slate-800 p-1 rounded-lg">
          <button onClick={() => setActiveTab('orders')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'orders' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Commandes</button>
          <button onClick={() => setActiveTab('admin')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Admin</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'orders' ? (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En direct</h2>
            {orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => onSelectOrder(order.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedOrderId === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono font-bold text-gray-400">#{order.id.slice(-4)}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <p className="font-bold text-sm text-slate-800 mt-1">{stores.find(s => s.id === order.storeId)?.name}</p>
                <p className="text-[11px] text-slate-500">Client: {users.find(u => u.id === order.userId)?.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Nouveau Magasin (X/Y)</h3>
              <input type="text" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded mb-2 text-sm" />
              <div className="flex gap-2 mb-3">
                <input type="number" placeholder="Lat (X)" value={lat} onChange={e => setLat(e.target.value)} className="flex-1 p-2 border rounded text-xs" />
                <input type="number" placeholder="Lng (Y)" value={lng} onChange={e => setLng(e.target.value)} className="flex-1 p-2 border rounded text-xs" />
              </div>
              <button onClick={handleAddStore} className="w-full bg-slate-900 text-white py-2 rounded text-xs font-bold hover:bg-slate-800 transition-colors">Enregistrer via coordonées</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Simuler GPS (Base de données)</h3>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => onAddEntity('driver', 'Livreur ' + (drivers.length+1))} className="bg-white border-2 border-slate-900 text-slate-900 py-2 rounded text-[10px] font-bold">Livreur GPS</button>
                 <button onClick={() => onAddEntity('user', 'Client ' + (users.length+1))} className="bg-white border-2 border-slate-900 text-slate-900 py-2 rounded text-[10px] font-bold">Client GPS</button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Lancer une commande</h3>
              {users.filter(u => !u.isOrdering).map(u => (
                <button key={u.id} onClick={() => onSimulateOrder(u.id)} className="w-full text-left p-2 mb-1 hover:bg-slate-50 rounded text-xs border border-transparent hover:border-slate-100 flex justify-between items-center">
                  <span>{u.name}</span>
                  <span className="text-blue-600 font-bold">Commander →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
