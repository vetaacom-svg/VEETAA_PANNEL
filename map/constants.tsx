
import { Store, Driver, UserProfile as User, Order, CategoryID } from '../types';

export const INITIAL_CENTER: [number, number] = [34.26101, -6.58022];

export const MOCK_STORES: Store[] = [
  { id: 's1', name: 'McDonald\'s Maarif', latitude: 33.582234, longitude: -7.582234, type: 'products', category: CategoryID.FOOD, image: '', address: 'Boulevard Al Massira, Casablanca' } as any,
  { id: 's2', name: 'Burger King Anfa', latitude: 33.595148, longitude: -7.643287, type: 'products', category: CategoryID.FOOD, image: '', address: 'Bd de la Corniche, Casablanca' } as any,
  { id: 's3', name: 'Pizza Hut Downtown', latitude: 33.573112, longitude: -7.599245, type: 'products', category: CategoryID.FOOD, image: '', address: 'Centre-ville, Casablanca' } as any,
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', fullName: 'Yassine Bennani', lastLat: 33.585032, lastLng: -7.610056, status: 'available', phone: '0600000001', id_card_number: 'AB123456', profile_photo: '', description: '', warns: 0, delivery_count: 0, created_at: new Date().toISOString() } as any,
  { id: 'd2', fullName: 'Fatima Mazouze', lastLat: 33.575089, lastLng: -7.630214, status: 'available', phone: '0600000002', id_card_number: 'AB654321', profile_photo: '', description: '', warns: 0, delivery_count: 0, created_at: new Date().toISOString() } as any,
  { id: 'd3', fullName: 'Ahmed Talbi', lastLat: 33.590456, lastLng: -7.615823, status: 'available', phone: '0600000003', id_card_number: 'CD789012', profile_photo: '', description: '', warns: 0, delivery_count: 0, created_at: new Date().toISOString() } as any,
];

export const MOCK_USERS: User[] = [
  { id: 'u1', fullName: 'Khalid Alami', lastLat: 33.578043, lastLng: -7.620178, phone: '0611111111' } as any,
  { id: 'u2', fullName: 'Siham Tazi', lastLat: 33.565124, lastLng: -7.640295, phone: '0622222222' } as any,
  { id: 'u3', fullName: 'Mohammed Amine', lastLat: 33.592387, lastLng: -7.608945, phone: '0633333333' } as any,
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ord1', userId: 'u1', storeId: 's1', status: 'pending', timestamp: Date.now(), customerName: 'Khalid Alami', phone: '0611111111', location: { lat: 33.578043, lng: -7.620178 }, items: [{name: 'Menu Burger', qty: 2}], total: 180, category: 'Food', assignedDriverId: null } as any,
  { id: 'ord2', userId: 'u2', storeId: 's2', status: 'pending', timestamp: Date.now() - 60000, customerName: 'Siham Tazi', phone: '0622222222', location: { lat: 33.565124, lng: -7.640295 }, items: [{name: 'Combo Poulet', qty: 1}], total: 95, category: 'Food', assignedDriverId: null } as any,
];
