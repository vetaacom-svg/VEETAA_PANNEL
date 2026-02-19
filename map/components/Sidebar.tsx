
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
  onUpdateStoreCoordinates: (storeId: string, lat: number, lng: number) => void;
  onDeleteStore: (storeId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ orders, users, stores, drivers, selectedOrderId, onSelectOrder, onAddEntity, onSimulateOrder, onUpdateStoreCoordinates, onDeleteStore }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'admin'>('orders');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');

  const handleAddStore = () => {
    if (!name || !lat || !lng) return alert("Nom et coordonnées X/Y requis");
    onAddEntity('store', name, parseFloat(lat), parseFloat(lng));
    setName(''); setLat(''); setLng('');
  };

  const handleUpdateStore = (storeId: string) => {
    // Validation stricte des coordonnées
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert("⚠️ Coordonnées invalides. Veuillez entrer des nombres valides.");
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("⚠️ Coordonnées hors limites. Latitude: -90 à 90, Longitude: -180 à 180");
      return;
    }

    // Mise à jour des coordonnées
    onUpdateStoreCoordinates(storeId, lat, lng);
    
    // Réinitialisation de l'éditeur
    setEditingStoreId(null);
    setEditLat('');
    setEditLng('');
    
    console.log(`✅ Magasin ${storeId} mis à jour avec succès: ${lat}, ${lng}`);
  };

  const startEditingStore = (store: Store) => {
    setEditingStoreId(store.id);
    setEditLat(store.lat?.toString() || '');
    setEditLng(store.lng?.toString() || '');
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
            {/* MISE À JOUR DES MAGASINS EXISTANTS */}
            {stores.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="text-sm font-bold text-blue-700 mb-3">📍 Mettre à jour Magasins ({stores.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {stores.map(store => (
                    <div key={store.id} className="bg-white p-3 rounded border border-blue-100 hover:bg-blue-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">{store.name}</p>
                          <span className="text-[8px] text-gray-500 font-mono">{store.id}</span>
                        </div>
                        <button 
                          onClick={() => onDeleteStore(store.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-[9px] font-bold transition-colors ml-2"
                          title="Supprimer ce magasin"
                        >
                          🗑️ SUPPR
                        </button>
                      </div>
                      {editingStoreId === store.id ? (
                        <div className="space-y-2 bg-orange-100 p-2 rounded border border-orange-300">
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              step="0.000001"
                              placeholder="Latitude" 
                              value={editLat} 
                              onChange={e => setEditLat(e.target.value)} 
                              className="flex-1 p-2 border border-orange-300 rounded text-xs bg-white"
                              autoFocus
                            />
                            <input 
                              type="number" 
                              step="0.000001"
                              placeholder="Longitude" 
                              value={editLng} 
                              onChange={e => setEditLng(e.target.value)} 
                              className="flex-1 p-2 border border-orange-300 rounded text-xs bg-white"
                            />
                          </div>
                          <p className="text-[9px] text-orange-600 font-bold">⚠️ Coordonnées en mode édition</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateStore(store.id)}
                              className="flex-1 bg-green-600 text-white py-1.5 rounded text-[10px] font-bold hover:bg-green-700 transition-colors"
                            >
                              ✓ SAUVER & REMPLACER
                            </button>
                            <button 
                              onClick={() => {
                                setEditingStoreId(null);
                                setEditLat('');
                                setEditLng('');
                              }}
                              className="flex-1 bg-gray-400 text-white py-1.5 rounded text-[10px] font-bold hover:bg-gray-500 transition-colors"
                            >
                              ✕ ANNULER
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 bg-green-50 p-2 rounded border border-green-200">
                          <span className="text-[8px] text-green-700 font-mono font-bold">📍 {store.lat?.toFixed(8)}, {store.lng?.toFixed(8)}</span>
                          <button 
                            onClick={() => startEditingStore(store)}
                            className="w-full bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-blue-700 transition-colors"
                          >
                            ✏️ ÉDITER COORDONNÉES
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
