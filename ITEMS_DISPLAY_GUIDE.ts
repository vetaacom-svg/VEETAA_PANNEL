import { supabase } from './lib/supabase';

export interface OrderItemDisplay {
  image_base64?: string;
  productName: string;
  price: number;
  quantity: number;
  storeName?: string;
  note?: string;
  product_id?: string;
  order_id?: number;
}

export const getOrderItems = async (orderId: string) => {
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', parseInt(orderId));

  return (orderItems || []).map((item: any) => ({
    productName: item.product_name,
    price: Number(item.price),
    quantity: Number(item.quantity),
    storeName: item.store_name,
    note: item.note,
    image_base64: Array.isArray(item.images_base64) 
      ? item.images_base64[0]
      : undefined
  }));
};

export const formatImageUrl = (base64?: string): string | undefined => {
  if (!base64) return undefined;
  if (base64.startsWith('data:')) return base64;
  return `data:image/jpeg;base64,${base64}`;
};

export const ITEM_DISPLAY_COLUMNS = {
  IMAGE: {
    label: 'Illustration & Désignation',
    data: 'item.image_base64',
    format: formatImageUrl
  },
  PRODUCT_NAME: {
    label: 'Nom Produit',
    data: 'item.productName',
    format: (val: any) => val || 'Produit sans nom'
  },
  STORE_NAME: {
    label: 'Établissement',
    data: 'item.storeName',
    format: (val: any) => val || 'Non spécifié'
  },
  QUANTITY: {
    label: 'Quantité',
    data: 'item.quantity',
    format: (val: any) => Number(val) || 0
  },
  PRICE: {
    label: 'Prix Unitaire',
    data: 'item.price',
    format: (val: any) => Number(val).toFixed(2) + ' DH'
  },
  TOTAL: {
    label: 'Total Ligne',
    data: '(item.quantity * item.price)',
    format: (item: any) => (Number(item.quantity) * Number(item.price)).toFixed(2) + ' DH'
  },
  NOTE: {
    label: 'Note Utilisateur',
    data: 'item.note',
    format: (val: any) => val || 'Aucune note'
  }
};

export const debugOrderItems = (items: OrderItemDisplay[]): void => {
  console.log('✅ ITEMS AFFICHAGE DEBUG:');
  items.forEach((item, index) => {
    console.log(`  Item ${index + 1}:`);
    console.log(`    - Nom: ${item.productName}`);
    console.log(`    - Quantité: ${item.quantity}`);
    console.log(`    - Prix: ${item.price} DH`);
    console.log(`    - Total: ${item.quantity * item.price} DH`);
    console.log(`    - Store: ${item.storeName || 'N/A'}`);
    console.log(`    - Note: ${item.note || 'N/A'}`);
    console.log(`    - Image: ${item.image_base64 ? '✓ Présente' : '✗ Absent'}`);
  });
};
