
export type Language = 'fr' | 'ar' | 'en';

export type View = 'WELCOME' | 'HOME' | 'CATEGORY_DETAIL' | 'CHECKOUT' | 'CONFIRMATION' | 'LOGIN' | 'SIGNUP' | 'OTP_VERIFICATION' | 'PERMISSIONS' | 'FAVORITES' | 'SETTINGS' | 'TRACKING' | 'HISTORY' | 'HELP' | 'PRODUCT_ORDER' | 'ADMIN_PANEL' | 'STORE_DETAIL' | 'ADMIN_LOGIN' | 'SUPPORT';

export enum CategoryID {
  FOOD = 'food',
  PHARMACIE = 'pharmacie',
  BOULANGERIE = 'boulangerie',
  PRESSING = 'pressing',
  LEGUMES = 'legumes',
  MARKET = 'market',
  EXPRESS = 'express'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string; // Image principale
  images?: string[]; // Images additionnelles (legacy)
  product_images?: string[]; // Images additionnelles (DB column)
  storeName?: string;
  category?: CategoryID;
  options?: string[];
  description?: string;
  price_editable?: boolean;
}

export interface Store {
  id: string;
  name: string;
  category: CategoryID | string;
  category_id?: string;
  type: 'products' | 'menu-image' | 'text-only' | 'prescription';
  image: string;
  image_url?: string;
  description?: string;
  mapsUrl?: string; // App field
  maps_url?: string; // DB field
  products?: Product[];
  menuImage?: string;
  is_open?: boolean;
  is_active?: boolean;
  rating?: number;
  delivery_time_min?: number;
  delivery_fee?: number;
  is_deleted?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  has_products?: boolean;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  sub_category?: string;
}

export interface Category {
  id: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  icon_name?: string;
  color_class?: string;
  display_order?: number;
  image_url?: string;
  sub_categories?: string[]; // Legacy - kept for compatibility
}

export interface SubCategory {
  id: string;
  name: string;
  category_id: string;
  created_at?: string;
}

export interface DriverDocument {
  id: string;
  type: 'cin_recto' | 'cin_verso' | 'license' | 'other';
  label: string;
  url: string;
}

export interface Driver {
  documents?: DriverDocument[];
  id: string;
  fullName: string;
  full_name?: string;
  phone: string;
  idCardNumber: string;
  id_card_number?: string;
  profilePhoto: string;
  profile_photo?: string;
  description: string;
  warns: number;
  deliveryCount: number;
  delivery_count?: number;
  createdAt: number;
  created_at?: string;
  status: 'available' | 'busy' | 'offline';
  lastLat?: number;
  lastLng?: number;
  last_lat?: number;
  last_lng?: number;
}

export interface CartItem {
  product?: Product;
  productName?: string;
  storeName?: string;
  price?: number;
  quantity: number;
  note?: string;
  image_base64?: string;
}

export type OrderStatus =
  | 'pending'
  | 'verification'
  | 'accepted'
  | 'preparing'
  | 'treatment'
  | 'progression'
  | 'delivering'
  | 'delivered'
  | 'refused'
  | 'unavailable';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  location: { lat: number; lng: number } | null;
  items: CartItem[];
  textOrder?: string;
  deliveryNote?: string;
  userId?: string;
  prescriptionImage?: string;
  paymentReceiptImage?: string;
  prescription_base64?: string;
  payment_receipt_base64?: string;
  total: number;
  total_products?: number;
  total_final?: number;
  status: OrderStatus;
  paymentMethod: 'cash' | 'transfer';
  payment_method?: 'cash' | 'transfer';
  rib?: string;
  timestamp: number;
  storeRating?: number;
  driverRating?: number;
  category: string;
  storeName?: string;
  assignedDriverId?: string;
  statusHistory?: { status: OrderStatus; timestamp: number }[];
  isArchived?: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  language?: Language;
  isAdmin?: boolean;
  isBlocked?: boolean;
  lastLat?: number;
  lastLng?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  images?: string[];
  active: boolean;
  created_at: string;
}

export interface RIB {
  id: number;
  rib: string;
  label: string;
  full_name: string;
}

export interface SupportInfo {
  id?: number;
  phone: string;
  email: string;
}


export interface SupportTicket {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  admin_reply?: string;
  responded_at?: string;
  subject?: string;
  priority?: 'low' | 'medium' | 'high';
}
export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'admin' | 'driver';
  message: string;
  created_at: string;
}
