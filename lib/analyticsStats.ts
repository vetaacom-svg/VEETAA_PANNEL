import type { Order, OrderStatus, Driver } from '../types';

export type AnalyticsPeriodPreset = '7d' | '30d' | 'month' | 'all' | 'custom';

export type AnalyticsSeriesPoint = { name: string; ventes: number; ca: number; key: string };

export type NameCount = { name: string; count: number };
export type NameValue = { name: string; value: number };

export function startOfDay(ts: number): number {
   const d = new Date(ts);
   d.setHours(0, 0, 0, 0);
   return d.getTime();
}

export function getAnalyticsTimeRange(
   preset: AnalyticsPeriodPreset,
   customFrom: string,
   customTo: string,
   nowMs: number = Date.now()
): { start: number; end: number } {
   const end = nowMs;
   let start = nowMs - 7 * 86400000;

   if (preset === '7d') start = nowMs - 7 * 86400000;
   else if (preset === '30d') start = nowMs - 30 * 86400000;
   else if (preset === 'month') {
      const d = new Date(nowMs);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
   } else if (preset === 'custom' && customFrom && customTo) {
      const a = new Date(customFrom + 'T00:00:00');
      const b = new Date(customTo + 'T23:59:59.999');
      return { start: a.getTime(), end: Math.min(b.getTime(), nowMs) };
   } else if (preset === 'all') {
      return { start: 0, end: nowMs };
   }

   return { start, end };
}

export function filterOrdersByTime(orders: Order[], start: number, end: number): Order[] {
   return orders.filter(o => o.timestamp >= start && o.timestamp <= end);
}

export function filterByStore(orders: Order[], store: string | 'all'): Order[] {
   if (store === 'all') return orders;
   return orders.filter(o => (o.storeName || 'Inconnu') === store);
}

function orderMonetaryTotal(o: Order): number {
   if (typeof o.total_final === 'number' && Number.isFinite(o.total_final)) return o.total_final;
   if (typeof o.total === 'number' && Number.isFinite(o.total)) return o.total;
   if (typeof o.total_products === 'number' && Number.isFinite(o.total_products)) return o.total_products;
   return 0;
}

function clientKey(o: Order): string {
   const phone = o.phone;
   if (phone && phone !== 'null' && phone !== 'undefined') return `p:${phone}`;
   return `n:${o.customerName || ''}`;
}

const ALL_STATUSES: OrderStatus[] = [
   'pending',
   'verification',
   'accepted',
   'preparing',
   'treatment',
   'progression',
   'delivering',
   'delivered',
   'refused',
   'unavailable',
];

export const ORDER_STATUS_LABEL_FR: Record<OrderStatus, string> = {
   pending: 'En attente',
   verification: 'Vérification',
   accepted: 'Acceptée',
   preparing: 'Préparation',
   treatment: 'Traitement',
   progression: 'Progression',
   delivering: 'Livraison',
   delivered: 'Livrée',
   refused: 'Refusée',
   unavailable: 'Indisponible',
};

export function computeAnalyticsDerived(
   ordersInRange: Order[],
   allOrders: Order[],
   drivers: Driver[],
   rangeStart: number,
   rangeEnd: number,
   preset: AnalyticsPeriodPreset
): {
   seriesPoints: AnalyticsSeriesPoint[];
   trendVentesPct: number | null;
   trendCaPct: number | null;
   topStoresCount: NameCount[];
   topStoresCa: NameValue[];
   successRateStats: NameValue[];
   statusBreakdown: NameValue[];
   loyalClients: NameCount[];
   avgDeliveryHours: number | null;
   topDrivers: NameCount[];
   topProducts: NameValue[];
   basketAvgDelivered: number;
   newClients: number;
   returningClients: number;
   repurchaseRatePct: number | null;
} {
   let seriesPoints: AnalyticsSeriesPoint[] = [];
   let trendVentesPct: number | null = null;
   let trendCaPct: number | null = null;

   if (preset === 'all') {
      for (let i = 11; i >= 0; i--) {
         const d = new Date(rangeEnd);
         d.setMonth(d.getMonth() - i);
         d.setDate(1);
         d.setHours(0, 0, 0, 0);
         const ms = d.getTime();
         const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
         const slice = ordersInRange.filter(o => o.timestamp >= ms && o.timestamp < next);
         const ventes = slice.length;
         const ca = slice.filter(o => o.status === 'delivered').reduce((s, o) => s + orderMonetaryTotal(o), 0);
         const name = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
         seriesPoints.push({ name, ventes, ca: Math.round(ca * 100) / 100, key: `m-${ms}` });
      }
   } else {
      const daySpan = Math.floor((startOfDay(rangeEnd) - startOfDay(rangeStart)) / 86400000) + 1;
      const useWeekly = preset === 'custom' && daySpan > 45;

      if (!useWeekly) {
         let t = startOfDay(rangeStart);
         const last = startOfDay(rangeEnd);
         while (t <= last) {
            const slice = ordersInRange.filter(o => startOfDay(o.timestamp) === t);
            const ventes = slice.length;
            const ca = slice.filter(o => o.status === 'delivered').reduce((s, o) => s + orderMonetaryTotal(o), 0);
            const name = new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            seriesPoints.push({ name, ventes, ca: Math.round(ca * 100) / 100, key: `d-${t}` });
            t += 86400000;
         }
      } else {
         let t = startOfDay(rangeStart);
         const endDay = startOfDay(rangeEnd);
         let weekIdx = 0;
         while (t <= endDay) {
            const next = Math.min(t + 7 * 86400000, endDay + 86400000);
            const slice = ordersInRange.filter(o => o.timestamp >= t && o.timestamp < next);
            const ventes = slice.length;
            const ca = slice.filter(o => o.status === 'delivered').reduce((s, o) => s + orderMonetaryTotal(o), 0);
            weekIdx += 1;
            seriesPoints.push({
               name: `Sem. ${weekIdx}`,
               ventes,
               ca: Math.round(ca * 100) / 100,
               key: `w-${t}`,
            });
            t = next;
         }
      }

      const windowMs = Math.max(86400000, rangeEnd - rangeStart);
      const prevEnd = rangeStart - 1;
      const prevStart = rangeStart - windowMs;
      const prevOrders = allOrders.filter(o => o.timestamp >= prevStart && o.timestamp <= prevEnd);
      const currV = ordersInRange.length;
      const currCa = ordersInRange.filter(o => o.status === 'delivered').reduce((s, o) => s + orderMonetaryTotal(o), 0);
      const prevV = prevOrders.length;
      const prevCa = prevOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + orderMonetaryTotal(o), 0);
      if (prevV > 0) trendVentesPct = Math.round(((currV - prevV) / prevV) * 1000) / 10;
      else trendVentesPct = currV > 0 ? 100 : null;
      if (prevCa > 0) trendCaPct = Math.round(((currCa - prevCa) / prevCa) * 1000) / 10;
      else trendCaPct = currCa > 0 ? 100 : null;
   }

   const storeCount = ordersInRange.reduce((acc, order) => {
      const storeName = order.storeName || 'Inconnu';
      acc[storeName] = (acc[storeName] || 0) + 1;
      return acc;
   }, {} as Record<string, number>);
   const topStoresCount = Object.entries(storeCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

   const storeCa = ordersInRange
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => {
         const n = o.storeName || 'Inconnu';
         acc[n] = (acc[n] || 0) + orderMonetaryTotal(o);
         return acc;
      }, {} as Record<string, number>);
   const topStoresCa = Object.entries(storeCa)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

   const deliveredN = ordersInRange.filter(o => o.status === 'delivered').length;
   const failedN = ordersInRange.filter(o => ['refused', 'unavailable'].includes(o.status)).length;
   const successRateStats: NameValue[] = [
      { name: 'Livrées', value: deliveredN },
      { name: 'Refus / indisp.', value: failedN },
   ];

   const statusBreakdown: NameValue[] = ALL_STATUSES.map(st => ({
      name: ORDER_STATUS_LABEL_FR[st],
      value: ordersInRange.filter(o => o.status === st).length,
   })).filter(x => x.value > 0);

   const loyalMap = ordersInRange.reduce((acc, order) => {
      const k = clientKey(order);
      if (!acc[k]) acc[k] = { name: order.customerName, count: 0 };
      acc[k].count += 1;
      return acc;
   }, {} as Record<string, { name: string; count: number }>);
   const loyalClients = Object.values(loyalMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

   const deliveredOrders = ordersInRange.filter(o => o.status === 'delivered');
   const durs: number[] = [];
   for (const o of deliveredOrders) {
      const hist = (o.statusHistory || []).map(h => ({
         status: h.status,
         ts: typeof h.timestamp === 'string' ? new Date(h.timestamp).getTime() : h.timestamp,
      }));
      const del = hist.filter(h => h.status === 'delivered').pop();
      const tEnd = del?.ts ?? o.timestamp;
      const tStart = o.timestamp;
      if (tEnd > tStart) durs.push((tEnd - tStart) / 3600000);
   }
   const avgDeliveryHours =
      durs.length > 0 ? Math.round((durs.reduce((a, b) => a + b, 0) / durs.length) * 10) / 10 : null;

   const byDriver = deliveredOrders.reduce((acc, o) => {
      const id = o.assignedDriverId;
      if (!id) return acc;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
   }, {} as Record<string, number>);
   const topDrivers = Object.entries(byDriver)
      .map(([id, count]) => {
         const dr = drivers.find(d => String(d.id) === String(id));
         const name = dr?.fullName || dr?.full_name || `Livreur ${String(id).slice(0, 6)}`;
         return { name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

   const productMap = new Map<string, number>();
   for (const o of deliveredOrders) {
      for (const it of o.items || []) {
         const nm = (it.productName || it.product?.name || 'Article').trim() || 'Article';
         productMap.set(nm, (productMap.get(nm) || 0) + (it.quantity || 1));
      }
   }
   const topProducts = Array.from(productMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

   const basketAvgDelivered =
      deliveredOrders.length > 0
         ? Math.round(
              (deliveredOrders.reduce((s, o) => s + orderMonetaryTotal(o), 0) / deliveredOrders.length) * 100
           ) / 100
         : 0;

   const firstTsByClient = new Map<string, number>();
   for (const o of allOrders) {
      const k = clientKey(o);
      const prev = firstTsByClient.get(k);
      if (prev === undefined || o.timestamp < prev) firstTsByClient.set(k, o.timestamp);
   }

   const clientsInPeriod = new Set(ordersInRange.map(clientKey));
   let newClients = 0;
   let returningClients = 0;
   for (const k of clientsInPeriod) {
      const first = firstTsByClient.get(k);
      if (first === undefined) continue;
      if (first >= rangeStart && first <= rangeEnd) newClients += 1;
      else if (first < rangeStart) returningClients += 1;
   }

   const ordersPerClientInPeriod = ordersInRange.reduce((acc, o) => {
      const k = clientKey(o);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
   }, {} as Record<string, number>);
   const uniqueClients = Object.keys(ordersPerClientInPeriod).length;
   const repeatClients = Object.values(ordersPerClientInPeriod).filter(c => c >= 2).length;
   const repurchaseRatePct =
      uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 1000) / 10 : null;

   return {
      seriesPoints,
      trendVentesPct,
      trendCaPct,
      topStoresCount,
      topStoresCa,
      successRateStats,
      statusBreakdown,
      loyalClients,
      avgDeliveryHours,
      topDrivers,
      topProducts,
      basketAvgDelivered,
      newClients,
      returningClients,
      repurchaseRatePct,
   };
}

export function uniqueStoreNamesInRange(orders: Order[]): string[] {
   const s = new Set<string>();
   for (const o of orders) s.add(o.storeName || 'Inconnu');
   return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr'));
}

export function analyticsPeriodLabel(
   preset: AnalyticsPeriodPreset,
   customFrom: string,
   customTo: string
): string {
   if (preset === '7d') return '7 derniers jours';
   if (preset === '30d') return '30 derniers jours';
   if (preset === 'month') return 'Mois en cours';
   if (preset === 'all') return 'Toutes périodes';
   if (preset === 'custom' && customFrom && customTo) return `Du ${customFrom} au ${customTo}`;
   return 'Période';
}

export type AnalyticsPanelData = ReturnType<typeof computeAnalyticsDerived> & {
   periodLabel: string;
   totalOrdersInRange: number;
};
