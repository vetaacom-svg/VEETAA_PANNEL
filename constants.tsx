
import React from 'react';
import { ShoppingBag, Croissant, Shirt, Leaf, Store as StoreIcon, Zap } from 'lucide-react';
import { CategoryID, Store, Language } from './types';

// Composant SVG personnalisé pour le logo de la pharmacie (Coupe d'Hygie)
const PharmacyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C10.9 2 10 2.9 10 4C10 4.63 10.3 5.19 10.76 5.57C9.33 6.64 8 8.16 8 10C8 13 11 14.5 11 17V19H7V21H17V19H13V17C13 14.5 16 13 16 10C16 8.16 14.67 6.64 13.24 5.57C13.7 5.19 14 4.63 14 4C14 2.9 13.1 2 12 2ZM12 4C12.55 4 13 4.45 13 5C13 5.55 12.55 6 12 6C11.45 6 11 5.55 11 5C11 4.45 11.45 4 12 4ZM4 9V11C4 11 4 15 12 15C20 15 20 11 20 11V9H4Z" />
    <path d="M12 1C10.34 1 9 2.34 9 4C9 4.7 9.24 5.35 9.64 5.86C8.03 7.04 7 8.9 7 11C7 11.55 7.45 12 8 12C8.55 12 9 11.55 9 11C9 9.34 10.34 8 12 8C13.66 8 15 9.34 15 11C15 12.66 13.66 14 12 14C11.45 14 11 14.45 11 15V17H7V19H17V17H13V15C13 14.73 13.04 14.47 13.11 14.22C15.4 13.43 17 11.4 17 9C17 6.79 15.21 5 13 5C12.72 5 12.45 5.03 12.19 5.09C12.68 4.79 13 4.25 13 3.63C13 2.73 12.27 2 11.37 2C10.47 2 9.74 2.73 9.74 3.63C9.74 4.25 10.06 4.79 10.55 5.09C8.44 5.58 6.84 7.42 6.84 9.63C6.84 9.91 6.86 10.18 6.91 10.45C4.21 10.45 2 11.58 2 13V15H22V13C22 11.58 19.79 10.45 17.09 10.45C17.14 10.18 17.16 9.91 17.16 9.63C17.16 7.42 15.56 5.58 13.45 5.09C13.94 4.79 14.26 4.25 14.26 3.63C14.26 2.73 13.53 2 12.63 2C11.73 2 11 2.73 11 3.63C11 4.25 11.32 4.79 11.81 5.09C11.55 5.03 11.28 5 11 5C8.79 5 7 6.79 7 9C7 11.4 8.6 13.43 10.89 14.22C10.96 14.47 11 14.73 11 15V17H7V19H17V17H13V15C13 15.55 13.45 16 14 16C14.55 16 15 15.55 15 15C15 13.34 13.66 12 12 12C10.34 12 9 13.34 9 15C9 15.55 8.55 16 8 16C7.45 16 7 15.55 7 15C7 12.79 8.79 11 11 11C13.21 11 15 12.79 15 15C15 15.55 15.45 16 16 16C16.55 16 17 15.55 17 15V13H21V11C21 11 21 7 13 7C5 7 5 11 5 11V13H9" />
  </svg>
);

const HygieiaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M256 0c-44.2 0-80 35.8-80 80 0 16.6 5.1 32 13.8 44.8C117.7 143.7 64 203.6 64 275.6v20.4H0v32h512v-32h-64v-20.4c0-72-53.7-131.9-125.8-150.8 8.7-12.8 13.8-28.2 13.8-44.8 0-44.2-35.8-80-80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0 128c61.9 0 112 50.1 112 112v13.6c-41.5 6.3-84.6 10.4-112 10.4s-70.5-4.1-112-10.4V272c0-61.9 50.1-112 112-112zm0 168c34.8 0 83.2-5.4 128-13.3v7.3c0 88.4-71.6 160-160 160S96 452.4 96 364v-7.3c44.8 7.9 93.2 13.3 128 13.3zm-32 152v32h64v-32H224z"/>
  </svg>
);

export const TRANSLATIONS: Record<Language, any> = {
  fr: {
    welcome: "Tout ce que vous voulez, livré vite.",
    getStarted: "Commencer",
    home: "Accueil",
    favorites: "Favoris",
    orders: "Commandes",
    profile: "Profil",
    deliverTo: "Livrer à",
    searchPlaceholder: "Un burger, une baguette, un sirop...",
    services: "Nos Services",
    popular: "Populaires à proximité",
    viewAll: "Tout voir",
    settings: "Paramètres",
    language: "Langue",
    logout: "Déconnexion",
    help: "Aide & Support",
    notifications: "Notifications",
    payments: "Paiements",
    privacy: "Confidentialité",
    edit: "Modifier",
    orderAgain: "Commander à nouveau",
    totalOrders: "total",
    myOrders: "Mes Commandes",
    trackOrder: "Suivre ma livraison"
  },
  ar: {
    welcome: "كل ما تريده، يصلك بسرعة.",
    getStarted: "ابدأ الآن",
    home: "الرئيسية",
    favorites: "المفضلة",
    orders: "طلباتي",
    profile: "الحساب",
    deliverTo: "التوصيل إلى",
    searchPlaceholder: "برجر، خبز، دواء...",
    services: "خدماتنا",
    popular: "الأكثر شعبية بالقرب منك",
    viewAll: "عرض الكل",
    settings: "الإعدادات",
    language: "اللغة",
    logout: "تسجيل الخروج",
    help: "المساعدة والدعم",
    notifications: "التنبيهات",
    payments: "المدفوعات",
    privacy: "الخصوصية",
    edit: "تعديل",
    orderAgain: "إعادة الطلب",
    totalOrders: "المجموع",
    myOrders: "طلباتي السابقة",
    trackOrder: "تتبع طلبي"
  },
  en: {
    welcome: "Everything you want, delivered fast.",
    getStarted: "Get Started",
    home: "Home",
    favorites: "Favorites",
    orders: "Orders",
    profile: "Profile",
    deliverTo: "Deliver to",
    searchPlaceholder: "A burger, bread, medicine...",
    services: "Our Services",
    popular: "Popular nearby",
    viewAll: "View all",
    settings: "Settings",
    language: "Language",
    logout: "Logout",
    help: "Help & Support",
    notifications: "Notifications",
    payments: "Payments",
    privacy: "Privacy",
    edit: "Edit",
    orderAgain: "Order Again",
    totalOrders: "total",
    myOrders: "My Orders",
    trackOrder: "Track my order"
  }
};

export const CATEGORIES = [
  { id: CategoryID.FOOD, name: 'Food', icon: <ShoppingBag className="w-8 h-8" />, color: 'bg-orange-500' },
  { id: CategoryID.PHARMACIE, name: 'Pharmacie', icon: <HygieiaIcon className="w-8 h-8" />, color: 'bg-emerald-600' },
  { id: CategoryID.BOULANGERIE, name: 'Boulangerie', icon: <Croissant className="w-8 h-8" />, color: 'bg-amber-600' },
  { id: CategoryID.PRESSING, name: 'Pressing', icon: <Shirt className="w-8 h-8" />, color: 'bg-blue-500' },
  { id: CategoryID.LEGUMES, name: 'Légumes', icon: <Leaf className="w-8 h-8" />, color: 'bg-green-600' },
  { id: CategoryID.MARKET, name: 'Market', icon: <StoreIcon className="w-8 h-8" />, color: 'bg-purple-500' },
  { id: CategoryID.EXPRESS, name: 'Express', icon: <Zap className="w-8 h-8" />, color: 'bg-red-500' },
];

export const RIBS = [
  { bank: 'Banque Populaire', rib: '001 010 000123456789 01' },
  { bank: 'Attijariwafa Bank', rib: '007 123 000987654321 44' },
  { bank: 'BMCE Bank', rib: '011 456 000112233445 99' },
  { bank: 'CIH Bank', rib: '230 789 000556677889 22' },
];

export const MOCK_STORES: Store[] = [
  {
    id: 's1',
    name: 'Burger Master',
    category: CategoryID.FOOD,
    type: 'products',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&q=80&w=800',
    products: [
      { id: 'p1', name: 'Classic Burger', price: 45, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200' },
      { id: 'p2', name: 'Cheese Burger', price: 55, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=200' },
      { id: 'p3', name: 'Veggie Burger', price: 50, image: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&q=80&w=200' },
    ]
  },
  {
    id: 's2',
    name: 'Sushi Zen',
    category: CategoryID.FOOD,
    type: 'menu-image',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800',
    menuImage: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 's3',
    name: 'Pharmacie du Centre',
    category: CategoryID.PHARMACIE,
    type: 'prescription',
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 's4',
    name: 'Le Bon Pain',
    category: CategoryID.BOULANGERIE,
    type: 'text-only',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 's5',
    name: 'Marché Vert',
    category: CategoryID.LEGUMES,
    type: 'products',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    products: [
      { id: 'v1', name: 'Pommes (kg)', price: 12, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6bcd6?auto=format&fit=crop&q=80&w=200' },
      { id: 'v2', name: 'Bananes (kg)', price: 15, image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?auto=format&fit=crop&q=80&w=200' },
      { id: 'v3', name: 'Tomates (kg)', price: 8, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200' },
    ]
  },
];
