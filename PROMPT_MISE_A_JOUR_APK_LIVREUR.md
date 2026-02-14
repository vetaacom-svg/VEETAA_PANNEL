# 📱 MISE À JOUR APK LIVREUR - SPÉCIFICATIONS COMPLÈTES

## 🎯 OBJECTIF
Mettre à jour l'application livreur pour qu'elle reçoive **TOUTES** les informations de commande, incluant le support des **commandes multi-magasins** (un client peut commander de plusieurs magasins dans un seul panier).

---

## 📦 STRUCTURE COMPLÈTE D'UNE COMMANDE

### 🔑 **INFORMATIONS PRINCIPALES DE LA COMMANDE**

```typescript
interface Order {
  // === IDENTIFICATION ===
  id: string;                          // ID unique de la commande (UUID)
  timestamp: number;                   // Date/heure de création (timestamp)
  
  // === CLIENT ===
  customerName: string;                // Nom complet du client
  phone: string;                       // Numéro de téléphone du client
  userId?: string;                     // ID utilisateur (si client enregistré)
  
  // === LOCALISATION CLIENT ===
  location: {
    lat: number;                       // Latitude de livraison
    lng: number;                       // Longitude de livraison
  } | null;
  
  // === MAGASIN(S) ===
  storeName?: string;                  // Nom du magasin principal (OBSOLÈTE pour multi-magasin)
  category: string;                    // Catégorie principale
  
  // === ITEMS / PRODUITS (IMPORTANT: PEUT CONTENIR PLUSIEURS MAGASINS) ===
  items: CartItem[];                   // Liste des produits commandés
  
  // === NOTES ET INSTRUCTIONS ===
  textOrder?: string;                  // Note générale de la commande / Instructions spéciales
  deliveryNote?: string;               // Note de livraison (instructions pour le livreur)
  
  // === IMAGES / PREUVES ===
  prescriptionImage?: string;          // Image ordonnance (pour pharmacies)
  paymentReceiptImage?: string;        // Reçu de paiement
  prescription_base64?: string;        // Version Base64 de l'ordonnance
  payment_receipt_base64?: string;     // Version Base64 du reçu
  
  // === MONTANTS FINANCIERS ===
  total: number;                       // Total produits (DH)
  total_products?: number;             // Total produits alternatif
  total_final?: number;                // Total FINAL incluant livraison (DH)
  
  // === STATUT ET WORKFLOW ===
  status: OrderStatus;                 // Statut actuel de la commande
  statusHistory?: Array<{              // Historique des changements de statut
    status: OrderStatus;
    timestamp: number;
  }>;
  
  // === PAIEMENT ===
  paymentMethod: 'cash' | 'transfer';  // Mode de paiement
  payment_method?: 'cash' | 'transfer';// Variante du champ
  rib?: string;                        // RIB si paiement par virement
  
  // === LIVREUR ===
  assignedDriverId?: string;           // ID du livreur assigné
  driverRating?: number;               // Note donnée au livreur (1-5)
  storeRating?: number;                // Note donnée au magasin (1-5)
  
  // === ARCHIVAGE ===
  isArchived?: boolean;                // Commande archivée ou non
}
```

### 🛒 **STRUCTURE D'UN ITEM (PRODUIT) DANS LA COMMANDE**

```typescript
interface CartItem {
  // === PRODUIT ===
  product?: Product;                   // Objet produit complet (optionnel)
  productName?: string;                // Nom du produit
  
  // ⚠️ IMPORTANT: MAGASIN DE CE PRODUIT ⚠️
  storeName?: string;                  // NOM DU MAGASIN pour cet item spécifique
                                       // PEUT ÊTRE DIFFÉRENT pour chaque item!
  
  // === QUANTITÉ ET PRIX ===
  quantity: number;                    // Quantité commandée
  price?: number;                      // Prix unitaire (DH)
  
  // === INSTRUCTIONS SPÉCIFIQUES ===
  note?: string;                       // Note/consigne spécifique pour cet item
                                       // Ex: "Sans oignons", "Bien cuit", etc.
  
  // === IMAGE ===
  image_base64?: string;               // Image du produit en Base64
}
```

### 📊 **STATUTS POSSIBLES DE LA COMMANDE**

```typescript
type OrderStatus = 
  | 'pending'        // ⏳ En attente - Nouvelle commande
  | 'verification'   // 🔍 En vérification - Admin vérifie
  | 'accepted'       // ✅ Acceptée - Commande validée
  | 'preparing'      // 👨‍🍳 En préparation - Magasin prépare
  | 'treatment'      // 🔄 En traitement - Traitement en cours
  | 'progression'    // 📈 En progression - Commande avance
  | 'delivering'     // 🚚 En livraison - Livreur en route
  | 'delivered'      // ✅ Livrée - Commande terminée
  | 'refused'        // ❌ Refusée - Commande refusée
  | 'unavailable'    // ⚠️ Indisponible - Produit non disponible
```

---

## 🎨 **NOUVELLES FONCTIONNALITÉS REQUISES**

### 1️⃣ **DÉTECTION MULTI-MAGASINS**

L'APK livreur doit analyser `items[]` pour détecter si la commande provient de plusieurs magasins:

```typescript
// FONCTION À IMPLÉMENTER DANS L'APK LIVREUR
function detectMultipleStores(order: Order): {
  isMultiStore: boolean;
  storeNames: string[];
  itemsByStore: Map<string, CartItem[]>;
} {
  // Extraire tous les magasins uniques
  const uniqueStores = Array.from(
    new Set(order.items.map(item => item.storeName).filter(Boolean))
  );
  
  // Grouper les items par magasin
  const itemsByStore = new Map<string, CartItem[]>();
  order.items.forEach(item => {
    const store = item.storeName || 'Magasin Inconnu';
    if (!itemsByStore.has(store)) {
      itemsByStore.set(store, []);
    }
    itemsByStore.get(store)!.push(item);
  });
  
  return {
    isMultiStore: uniqueStores.length > 1,
    storeNames: uniqueStores,
    itemsByStore: itemsByStore
  };
}
```

### 2️⃣ **AFFICHAGE DANS L'INTERFACE LIVREUR**

#### **A. Badge Multi-Magasins**
Si `isMultiStore === true`, afficher un badge:
```
🏪 MULTI-MAGASINS (3 magasins)
```

#### **B. Liste des Magasins avec Localisation**
Pour chaque magasin dans la commande, afficher:
- ✅ Nom du magasin
- ✅ Adresse GPS (à récupérer de la table `stores`)
- ✅ Nombre d'items à récupérer
- ✅ Bouton "Ouvrir dans Google Maps"

```
📍 MAGASIN 1: Pizza House
   - 3 items à récupérer
   - 📍 34.261, -6.580
   - [Ouvrir Maps]

📍 MAGASIN 2: Pharmacie Al Amal  
   - 2 items à récupérer
   - 📍 34.252, -6.572
   - [Ouvrir Maps]

👤 CLIENT: Ahmed Mohamed
   - Livraison à: 34.265, -6.585
   - [Ouvrir Maps]
```

#### **C. Détail des Items par Magasin**

```
🏪 PIZZA HOUSE
━━━━━━━━━━━━━━━━━━━━━━
  1x Pizza Margherita (50 DH)
     📝 Note: Bien cuite
  
  2x Coca Cola (10 DH)
     📝 Note: -

🏪 PHARMACIE AL AMAL
━━━━━━━━━━━━━━━━━━━━━━
  1x Doliprane (15 DH)
     📝 Note: -
```

---

## 📋 **INFORMATIONS À AFFICHER DANS L'APK LIVREUR**

### **ÉCRAN PRINCIPAL - LISTE DES COMMANDES**

Pour chaque commande assignée au livreur:

```
┌─────────────────────────────────────┐
│ 🎯 COMMANDE #abc123                 │
│                                     │
│ 👤 CLIENT: Ahmed Mohamed            │
│ 📞 TÉLÉPHONE: +212 6XX XXX XXX     │
│                                     │
│ 🏪 MAGASIN(S):                      │
│    • Pizza House                    │
│    • Pharmacie Al Amal              │
│    [MULTI-MAGASINS]                 │
│                                     │
│ 💰 TOTAL: 125 DH                    │
│ 💳 PAIEMENT: Espèces               │
│                                     │
│ 📊 STATUT: En livraison             │
└─────────────────────────────────────┘
```

### **ÉCRAN DÉTAIL - VUE COMPLÈTE**

Quand le livreur clique sur une commande:

```
═══════════════════════════════════════
📦 COMMANDE #abc123
═══════════════════════════════════════

👤 INFORMATIONS CLIENT
───────────────────────────────────────
  Nom: Ahmed Mohamed
  Tél: +212 6XX XXX XXX
       [📋 COPIER] [📞 APPELER]
  
  📍 Adresse de livraison:
     Lat: 34.265 | Lng: -6.585
     [🗺️ OUVRIR DANS MAPS]

💰 INFORMATIONS FINANCIÈRES
───────────────────────────────────────
  Total Produits: 110 DH
  Frais Livraison: 15 DH
  ──────────────────────
  TOTAL À ENCAISSER: 125 DH
  
  Mode de paiement: 💵 ESPÈCES
  (Si virement: RIB affiché ici)

🏪 MAGASINS À VISITER (2)
───────────────────────────────────────

  1️⃣ PIZZA HOUSE
     📍 Lat: 34.261 | Lng: -6.580
     [🗺️ OUVRIR DANS MAPS]
     
     Articles à récupérer:
     • 1x Pizza Margherita (50 DH)
       📝 "Bien cuite"
     • 2x Coca Cola (10 DH chacun)
     
  2️⃣ PHARMACIE AL AMAL
     📍 Lat: 34.252 | Lng: -6.572
     [🗺️ OUVRIR DANS MAPS]
     
     Articles à récupérer:
     • 1x Doliprane (15 DH)
     • 1x Masques (25 DH)
     
     📷 ORDONNANCE DISPONIBLE
     [👁️ VOIR IMAGE]

📝 NOTES ET INSTRUCTIONS
───────────────────────────────────────
  Note générale:
  "Livraison avant 18h SVP"
  
  Note de livraison:
  "Sonner 2 fois, appartement 3"

📊 STATUT ACTUEL
───────────────────────────────────────
  🚚 EN LIVRAISON
  
  Historique:
  ✅ Pending → 14:00
  ✅ Accepted → 14:05
  ✅ Preparing → 14:10
  ✅ Delivering → 14:30 (ACTUEL)

🔧 ACTIONS
───────────────────────────────────────
  [✅ MARQUER COMME LIVRÉE]
  [❌ SIGNALER UN PROBLÈME]
  [📞 CONTACTER LE CLIENT]
  [🗺️ ITINÉRAIRE COMPLET]

═══════════════════════════════════════
```

---

## 🔗 **RÉCUPÉRATION DES DONNÉES MAGASINS**

L'APK livreur doit faire une requête à la table `stores` pour obtenir les coordonnées GPS de chaque magasin:

```sql
-- Pour chaque storeName dans items[]
SELECT 
  id,
  name,
  lat,
  lng,
  maps_url,
  phone,
  delivery_time_min
FROM stores
WHERE name IN ('Pizza House', 'Pharmacie Al Amal', ...);
```

**Colonnes importantes de la table `stores`:**
- `name` : Nom du magasin
- `lat` : Latitude
- `lng` : Longitude  
- `maps_url` : URL Google Maps du magasin
- `phone` : Téléphone du magasin (pour contact si besoin)

---

## 🚀 **WORKFLOW LIVREUR RECOMMANDÉ**

### **POUR COMMANDE MONO-MAGASIN:**
1. Recevoir notification de commande assignée
2. Voir détails complets (client, produits, localisation)
3. Se rendre au magasin
4. Récupérer les produits
5. Se rendre chez le client
6. Livrer et encaisser
7. Marquer comme "Livrée"

### **POUR COMMANDE MULTI-MAGASINS:**
1. Recevoir notification avec badge "MULTI-MAGASINS"
2. Voir liste des magasins à visiter
3. **OPTIMISATION AUTOMATIQUE DE L'ITINÉRAIRE** (recommandé)
4. Visiter magasin 1 → Récupérer items
5. Visiter magasin 2 → Récupérer items
6. (etc. pour tous les magasins)
7. Se rendre chez le client avec TOUS les produits
8. Livrer et encaisser le TOTAL
9. Marquer comme "Livrée"

---

## 🎨 **SUGGESTIONS D'AMÉLIORATION UX**

### **1. Carte Interactive**
- Afficher tous les points (magasins + client) sur une carte
- Tracer l'itinéraire optimal automatiquement
- Indiquer les distances et temps estimés

### **2. Checklist de Récupération**
```
☐ MAGASIN 1: Pizza House (3 items)
☐ MAGASIN 2: Pharmacie (2 items)
☐ LIVRAISON CLIENT
```

### **3. Mode Hors-ligne**
- Télécharger toutes les infos de commande
- Permettre consultation sans connexion
- Synchroniser les changements de statut plus tard

### **4. Notifications Push**
- Nouvelle commande assignée
- Changement de statut par l'admin
- Message du client/support

---

## 📱 **FORMAT JSON COMPLET POUR L'API**

Voici le JSON complet qu'un livreur doit recevoir via l'API:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1708012345000,
  
  "customer": {
    "name": "Ahmed Mohamed",
    "phone": "+212612345678",
    "userId": "user-123",
    "location": {
      "lat": 34.265,
      "lng": -6.585
    }
  },
  
  "stores": [
    {
      "name": "Pizza House",
      "lat": 34.261,
      "lng": -6.580,
      "mapsUrl": "https://www.google.com/maps?query=34.261,-6.580",
      "items": [
        {
          "productName": "Pizza Margherita",
          "quantity": 1,
          "price": 50,
          "note": "Bien cuite",
          "image_base64": "data:image/jpeg;base64,..."
        },
        {
          "productName": "Coca Cola",
          "quantity": 2,
          "price": 10,
          "note": null
        }
      ]
    },
    {
      "name": "Pharmacie Al Amal",
      "lat": 34.252,
      "lng": -6.572,
      "mapsUrl": "https://www.google.com/maps?query=34.252,-6.572",
      "items": [
        {
          "productName": "Doliprane",
          "quantity": 1,
          "price": 15,
          "note": null
        },
        {
          "productName": "Masques",
          "quantity": 1,
          "price": 25,
          "note": null
        }
      ]
    }
  ],
  
  "financial": {
    "totalProducts": 110,
    "deliveryFee": 15,
    "totalFinal": 125,
    "paymentMethod": "cash",
    "rib": null
  },
  
  "notes": {
    "general": "Livraison avant 18h SVP",
    "delivery": "Sonner 2 fois, appartement 3"
  },
  
  "media": {
    "prescription": "data:image/jpeg;base64,...",
    "paymentReceipt": null
  },
  
  "status": {
    "current": "delivering",
    "history": [
      { "status": "pending", "timestamp": 1708012345000 },
      { "status": "accepted", "timestamp": 1708012645000 },
      { "status": "preparing", "timestamp": 1708012945000 },
      { "status": "delivering", "timestamp": 1708014145000 }
    ]
  },
  
  "driver": {
    "assignedId": "driver-456",
    "rating": null
  },
  
  "metadata": {
    "isMultiStore": true,
    "storeCount": 2,
    "totalItems": 5,
    "category": "food"
  }
}
```

---

## ✅ **CHECKLIST DE MISE EN ŒUVRE**

### **Phase 1: Backend / API**
- [ ] Créer endpoint `/api/driver/orders/{orderId}/detailed`
- [ ] Implémenter logique de groupement par magasin
- [ ] Ajouter récupération des coordonnées GPS des magasins
- [ ] Tester avec commandes mono et multi-magasins

### **Phase 2: APK Livreur - Interface**
- [ ] Écran liste avec badge "MULTI-MAGASINS"
- [ ] Écran détail avec sections par magasin
- [ ] Carte interactive avec itinéraire
- [ ] Boutons d'action (Maps, Appel, Copier)

### **Phase 3: APK Livreur - Fonctionnalités**
- [ ] Détection automatique multi-magasins
- [ ] Calcul d'itinéraire optimal
- [ ] Checklist de récupération
- [ ] Mode hors-ligne
- [ ] Notifications push

### **Phase 4: Tests**
- [ ] Test commande 1 magasin
- [ ] Test commande 2 magasins
- [ ] Test commande 5+ magasins
- [ ] Test mode hors-ligne
- [ ] Test performance avec 50+ commandes

---

## 📞 **SUPPORT TECHNIQUE**

Pour toute question sur cette spécification, contacter l'équipe de développement backend Veetaa.

**Date de création:** 14/02/2026  
**Version:** 2.0  
**Auteur:** Système Admin Veetaa

---

## 🎯 **RÉSUMÉ EXÉCUTIF**

### **Changement majeur:**
- **AVANT:** Le livreur recevait seulement `order.storeName` (1 magasin)
- **MAINTENANT:** Le livreur doit analyser `order.items[].storeName` (plusieurs magasins possibles)

### **Impact:**
- ✅ Meilleure expérience client (commandes groupées)
- ✅ Optimisation des tournées livreurs
- ✅ Augmentation du panier moyen
- ⚠️ Complexité technique accrue

### **Priorité:**
🔴 **HAUTE** - Cette mise à jour est critique pour le bon fonctionnement du système multi-magasins.

---

**FIN DU DOCUMENT**
