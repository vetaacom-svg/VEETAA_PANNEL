/**
 * GUIDE D'AFFICHAGE DES ITEMS DE COMMANDE
 * ========================================
 * 
 * Structure des données depuis la table order_items:
 */

interface OrderItemDisplay {
  // Image du produit/note utilisateur
  image_base64?: string;           // Premier élément du array images_base64
  
  // Informations du produit
  productName: string;             // Depuis: product_name
  price: number;                   // Depuis: price (prix unitaire)
  quantity: number;                // Depuis: quantity (nombre choisi)
  
  // Informations du magasin
  storeName?: string;              // Depuis: store_name
  
  // Note de l'utilisateur
  note?: string;                   // Depuis: note (texte utilisateur)
  
  // Données de référence (optionnelles)
  product_id?: string;             // UUID du produit
  order_id?: number;               // ID de la commande parent
}

/**
 * EXEMPLE DE DONNÉES DEPUIS SUPABASE
 */
const exampleOrderItem = {
  id: 'uuid-123',
  order_id: 364,
  store_id: 'uuid-store',
  store_name: 'Pharmacie de la paix',      // ← AFFICHER ICI
  product_id: 'uuid-product',
  product_name: 'Paracétamol 500mg',      // ← AFFICHER (Nom Produit)
  price: 50,                               // ← AFFICHER (Prix Unitaire)
  quantity: 2,                             // ← AFFICHER (Quantité)
  note: 'Avec ordonnance si possible',    // ← AFFICHER (Note Client)
  images_base64: [                         // ← PRENDRE LE PREMIER
    'iVBORw0KGgoAAAANSUhEUgAAAAEA...'    // Base64 image
  ]
};

/**
 * RÉCUPÉRATION DES ITEMS
 */
// Depuis fetchOrderDetails() ou fetchOrders()
const getOrderItems = async (orderId: string) => {
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', parseInt(orderId));

  // Parser les items
  return (orderItems || []).map((item) => ({
    productName: item.product_name,        // Accès direct
    price: Number(item.price),             // Convertir en nombre
    quantity: Number(item.quantity),       // Convertir en nombre
    storeName: item.store_name,            // Accès direct
    note: item.note,                       // Accès direct (optionnel)
    image_base64: Array.isArray(item.images_base64) 
      ? item.images_base64[0]              // PREMIER élément du array
      : undefined
  }));
};

/**
 * AFFICHAGE DES IMAGES
 */
const formatImageUrl = (base64?: string): string | undefined => {
  if (!base64) return undefined;
  
  // Si déjà formaté
  if (base64.startsWith('data:')) return base64;
  
  // Ajouter le préfixe
  return `data:image/jpeg;base64,${base64}`;
};

/**
 * TABLEAU D'AFFICHAGE - COLONNES
 */
const ITEM_DISPLAY_COLUMNS = {
  IMAGE: {
    label: 'Illustration & Désignation',
    data: 'item.image_base64',
    format: formatImageUrl
  },
  PRODUCT_NAME: {
    label: 'Nom Produit',
    data: 'item.productName',
    format: (val) => val || 'Produit sans nom'
  },
  STORE_NAME: {
    label: 'Établissement',
    data: 'item.storeName',
    format: (val) => val || 'Non spécifié'
  },
  QUANTITY: {
    label: 'Quantité',
    data: 'item.quantity',
    format: (val) => Number(val) || 0
  },
  PRICE: {
    label: 'Prix Unitaire',
    data: 'item.price',
    format: (val) => Number(val).toFixed(2) + ' DH'
  },
  TOTAL: {
    label: 'Total Ligne',
    data: '(item.quantity * item.price)',
    format: (item) => (Number(item.quantity) * Number(item.price)).toFixed(2) + ' DH'
  },
  NOTE: {
    label: 'Note Utilisateur',
    data: 'item.note',
    format: (val) => val || 'Aucune note'
  }
};

/**
 * FLOW DE RENDU
 * 
 * 1. fetchOrderDetails(orderId) est appelé
 * 2. Lance 2 requêtes Supabase:
 *    - orders: pour les infos de commande
 *    - order_items: pour les items
 * 3. Map chaque item vers CartItem
 * 4. setOrders() met à jour le state
 * 5. AdminDashboard re-render avec les nouveaux items
 * 6. La table affiche chaque item avec l'image, le nom, etc.
 */

/**
 * VALIDATION - DEBUGGING
 */
const debugOrderItems = (items: OrderItemDisplay[]): void => {
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

export {
  OrderItemDisplay,
  getOrderItems,
  formatImageUrl,
  ITEM_DISPLAY_COLUMNS,
  debugOrderItems
};
