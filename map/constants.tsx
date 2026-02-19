
import { Store, Driver, User } from './types';

// Coordonnées GPS avec précision 6-7 décimales (~10cm) pour correspondance exacte avec Google Maps
export const INITIAL_CENTER: [number, number] = [33.573141, -7.589832]; // Casablanca, Maroc

export const MOCK_STORES: Store[] = [
  { id: 's1', name: 'McDonald\'s Maarif', lat: 33.582234, lng: -7.632541, type: 'restaurant', address: 'Boulvard Al Massira Al Khadra' },
  { id: 's2', name: 'Burger King Anfa', lat: 33.595148, lng: -7.643287, type: 'restaurant', address: 'Bd de la Corniche' },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Yassine', lat: 33.585032, lng: -7.610056, status: 'available', lastUpdated: Date.now() },
  { id: 'd2', name: 'Fatima', lat: 33.575089, lng: -7.630214, status: 'available', lastUpdated: Date.now() },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Khalid Alami', lat: 33.578043, lng: -7.620178, isOrdering: false },
  { id: 'u2', name: 'Siham Tazi', lat: 33.565124, lng: -7.640295, isOrdering: true },
];
