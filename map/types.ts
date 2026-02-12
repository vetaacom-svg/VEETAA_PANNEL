
export interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'grocery' | 'pharmacy';
  address: string;
}

export interface Driver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  lastUpdated: number;
}

export interface User {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isOrdering: boolean;
}

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  status: 'pending' | 'assigned' | 'delivered';
  assignedDriverId?: string;
  timestamp: number;
}

// Added estimatedTime to the interface to resolve type mismatch in dispatcher service
export interface AIRecommendation {
  suggestedDriverId: string;
  reasoning: string;
  estimatedTime: string;
}
