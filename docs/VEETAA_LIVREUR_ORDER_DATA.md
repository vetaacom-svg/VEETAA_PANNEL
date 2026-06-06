# Données commande pour l’app **Livreur** (Veetaa)

> Document de **passage de relais** entre `VEETAA_PANNEL` et `VEETAA_LIVREUR`.  
> Même **projet Supabase**, mêmes tables. À copier ou ouvrir dans le workspace livreur pour que l’IA / l’équipe comprennent tout de suite le contrat de données.

---

## 1. Contexte

| Projet        | Rôle |
|---------------|------|
| VEETAA_PANNEL | Admin : liste commandes, assignation livreur, détails |
| VEETAA_LIVREUR | Livreur : voir **ses** commandes + **détail** (lignes, notes, preuves) |

Le panneau charge les commandes dans `App.tsx` (`fetchOrders`, `fetchOrderDetails`). Le livreur doit appliquer la **même logique** (requêtes + fallback) pour être aligné.

---

## 2. Identifiant livreur côté commande

- Colonne base : **`assigned_driver_id`** (table `orders`).
- Doit correspondre à l’**id** du livreur dans la table **`drivers`** (même UUID / même clé que vous utilisez au login livreur).

**Liste des courses du livreur (exemple)** :

```ts
const { data, error } = await supabase
  .from('orders')
  .select(/* voir §4 liste courte ou §5 détail */)
  .eq('assigned_driver_id', driverId)
  .eq('is_archived', false)
  .order('created_at', { ascending: false });
```

Adapter les filtres (ex. exclure `delivered` si vous ne voulez que les actives).

---

## 3. Deux sources pour les **lignes** d’une commande

Les produits ne sont **pas** uniquement dans `orders.items`. La source **prioritaire** est la table **`order_items`**.

### 3.1 Table `order_items` (prioritaire)

Une ligne = un produit (ou article) pour une commande.

| Colonne (DB)     | Usage livreur |
|------------------|---------------|
| `order_id`       | Clé vers `orders.id` (entier) |
| `store_name`     | Nom du magasin |
| `product_name`   | Nom produit |
| `price`          | Prix unitaire (number) |
| `quantity`       | Quantité |
| `note`           | Note client (optionnel) |
| `product_id`     | UUID produit si présent |
| `store_id`       | UUID magasin si présent |
| `images_base64`  | Tableau ; **afficher la 1re image** si besoin |

**Requête typique** :

```ts
const { data: orderItems } = await supabase
  .from('order_items')
  .select('*')
  .eq('order_id', orderIdAsInteger);
```

**Mapping recommandé** (identique au panneau) :

- `productName` ← `product_name`
- `price` ← `Number(price)`
- `quantity` ← `Number(quantity)`
- `storeName` ← `store_name`
- `note` ← `note`
- `image_base64` ← `Array.isArray(images_base64) ? images_base64[0] : undefined`

### 3.2 Colonne `orders.items` (fallback JSON)

Si `order_items` est **vide** pour cette commande, parser **`orders.items`** :

- Peut être **objet JSON** ou **chaîne** JSON (parfois doublement stringifiée).
- Tableau d’objets hétérogènes : parfois `product.name`, parfois `productName`, etc.

Le panneau normalise ainsi (à reproduire) :

- `productName` ← `it.productName || it.product?.name`
- `price` ← `Number(it.price || it.product?.price || 0)`
- `quantity` ← `Number(it.quantity || 1)`
- `storeName` ← `it.storeName || it.store?.name`
- `note` ← `it.note || ''`
- image ← `it.image_base64 || it.product?.image || it.product?.images?.[0]`

**Toujours** : d’abord `order_items`, puis fallback `orders.items`.

---

## 4. Liste des commandes (léger, comme le panneau sans gros champs)

Le panneau utilise par défaut un `select` **sans** les gros base64 ni `items` JSON pour aller vite :

```text
id, user_id, created_at, status, customer_name, phone, delivery_lat, delivery_lng,
total_products, delivery_fee, total_final, payment_method, category_name, store_name,
assigned_driver_id, is_archived, store_rating, driver_rating
```

Puis il charge **toutes** les lignes `order_items` pour les `id` concernés en **une** requête `.in('order_id', orderIds)` et regroupe en mémoire.

**Mapping champs `orders` → modèle app** (comme `App.tsx`) :

| Colonne DB           | Champ app / usage |
|----------------------|-------------------|
| `id`                 | `id` (string) |
| `user_id`            | `userId` |
| `customer_name`      | `customerName` |
| `phone`              | `phone` |
| `delivery_lat` / `delivery_lng` | `location: { lat, lng }` |
| `status`             | `status` (voir `OrderStatus` dans `types.ts`) |
| `payment_method`     | `paymentMethod` (`cash` \| `transfer`) |
| `total_products`     | `total` / `total_products` |
| `delivery_fee`       | `delivery_fee` |
| `total_final`        | `total_final` |
| `category_name`      | `category` |
| `store_name`         | `storeName` |
| `assigned_driver_id` | `assignedDriverId` |
| `is_archived`        | `isArchived` |
| `created_at`         | `timestamp` (ms : `new Date(created_at).getTime()`) |
| `store_rating` / `driver_rating` | optionnel |

---

## 5. Détail d’**une** commande (gros champs + historique)

Quand l’utilisateur ouvre la fiche commande, le panneau appelle une requête dédiée sur **`orders`** :

```text
items, text_order_notes, delivery_note, status_history,
prescription_base64, payment_receipt_base64, store_invoice_base64
```

Puis recharge **`order_items`** pour ce `order_id`, avec le **même fallback** `orders.items` si aucune ligne.

Champs utiles livreur :

- **`text_order_notes`** → texte libre / commande texte (app : `textOrder`)
- **`delivery_note`** → consignes livraison (`deliveryNote`)
- **`status_history`** → JSON historique des statuts
- **`prescription_base64`**, **`payment_receipt_base64`**, **`store_invoice_base64`** → images (préfixer `data:image/...;base64,` si besoin pour `<img src>`)

**Important** : `orders.id` est un **entier** en base ; utiliser `parseInt(orderId, 10)` dans `.eq('id', ...)`.

---

## 6. Types TypeScript (référence)

Le fichier **`types.ts`** à la racine du panneau définit `Order`, `OrderStatus`, `CartItem`.  
Pour le livreur, réutiliser les mêmes types (copie ou package partagé) évite les décalages.

Statuts possibles côté type (extrait) :  
`pending`, `verification`, `accepted`, `preparing`, `treatment`, `progression`, `delivering`, `delivered`, `refused`, `unavailable`.

---

## 7. Mise à jour statut / assignation (rappel)

- Assignation livreur (admin) : `orders.assigned_driver_id` mis à jour depuis le panneau.
- Changement de statut : `orders.status` + souvent `status_history` (voir logique panneau `handleUpdateOrderStatus`).

Le livreur doit avoir les **politiques RLS** Supabase qui autorisent **lecture** (et éventuellement **update** limité au statut) pour les lignes où `assigned_driver_id = auth.uid()` ou équivalent selon votre modèle d’auth (à valider dans le dashboard Supabase).

---

## 8. Variables d’environnement

Comme le panneau : **`VITE_SUPABASE_URL`** et **`VITE_SUPABASE_ANON_KEY`** (clé **anon**, jamais `service_role` dans l’app mobile / web livreur).

---

## 9. Fichiers de référence dans ce repo

- `App.tsx` : `fetchOrders`, `fetchOrderDetails`
- `types.ts` : `Order`, `CartItem`, `OrderStatus`
- `ITEMS_DISPLAY_GUIDE.ts` : exemples d’affichage des lignes

En ouvrant **VEETAA_LIVREUR**, indique à l’IA : *« Lire `docs/VEETAA_LIVREUR_ORDER_DATA.md` du repo panneau »* ou colle ce fichier dans le projet livreur sous le même chemin.
