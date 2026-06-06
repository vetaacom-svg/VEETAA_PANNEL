/**
 * Segments d’URL (HashRouter → ex. #/orders) pour l’admin.
 * Une seule source de vérité tab ↔ chemin.
 */
export type AdminTab =
  | 'OVERVIEW'
  | 'ORDERS'
  | 'PRODUCTS'
  | 'DRIVERS'
  | 'PARTNERS'
  | 'USERS'
  | 'FINANCE'
  | 'STATISTICS'
  | 'HISTORY'
  | 'CATEGORIES'
  | 'PROMO'
  | 'PARTNERS_MGMT'
  | 'CONFIG'
  | 'MAPS'
  | 'SUPPORT_TICKETS'
  | 'ADMINS'
  | 'CONTROLL'
  | 'BROADCAST_MAIL';

const SEGMENT_FOR_TAB: Record<AdminTab, string> = {
  OVERVIEW: 'overview',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  DRIVERS: 'drivers',
  PARTNERS: 'partners',
  USERS: 'users',
  FINANCE: 'finance',
  STATISTICS: 'statistics',
  HISTORY: 'history',
  CATEGORIES: 'categories',
  PROMO: 'promo',
  PARTNERS_MGMT: 'partners-mgmt',
  CONFIG: 'config',
  MAPS: 'maps',
  SUPPORT_TICKETS: 'support',
  ADMINS: 'admins',
  CONTROLL: 'controll',
  BROADCAST_MAIL: 'announce-mail',
};

/** Page title (main content header) — English UI */
export const ADMIN_TAB_TITLE_EN: Record<AdminTab, string> = {
  OVERVIEW: 'Overview',
  ORDERS: 'Orders',
  PRODUCTS: 'Products',
  DRIVERS: 'Drivers',
  PARTNERS: 'Stores',
  USERS: 'Customers',
  FINANCE: 'Finance',
  STATISTICS: 'Analytics',
  HISTORY: 'Order history',
  CATEGORIES: 'Categories',
  PROMO: 'Promo codes',
  PARTNERS_MGMT: 'Partner accounts',
  CONFIG: 'Settings',
  MAPS: 'Live map',
  SUPPORT_TICKETS: 'Support',
  ADMINS: 'Admins',
  CONTROLL: 'La Controll',
  BROADCAST_MAIL: 'Annonce e-mail',
};

const TAB_FROM_SEGMENT: Record<string, AdminTab> = (
  Object.entries(SEGMENT_FOR_TAB) as [AdminTab, string][]
).reduce((acc, [tab, seg]) => {
  acc[seg] = tab;
  return acc;
}, {} as Record<string, AdminTab>);

export function pathSegment(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)[0] || '';
  } catch {
    return '';
  }
}

export function tabFromRouterPath(pathname: string): AdminTab {
  const seg = pathSegment(pathname);
  return TAB_FROM_SEGMENT[seg] ?? 'OVERVIEW';
}

export function pathForTab(tab: AdminTab): string {
  return `/${SEGMENT_FOR_TAB[tab]}`;
}

export function isKnownAdminSegment(seg: string): boolean {
  return seg !== '' && seg in TAB_FROM_SEGMENT;
}
