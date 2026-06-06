# Analyse & Compréhension du Projet VEETAA Pannel

Ce document résume la structure, la stack technique, le modèle de données, les flux logiques et les points d'attention clés du panneau d'administration de **Veetaa Delivery**. Il a été conçu pour servir de guide de référence pour tout développement ultérieur afin d'éviter les régressions et de garantir la cohérence du système.

---

## 1. Stack Technique Globale

Le projet est une application web moderne de type SPA (Single Page Application) avec une architecture prête pour l'intégration mobile :

*   **Framework Principal** : React (v19) avec TypeScript.
*   **Outil de Build** : Vite (v8) pour un rechargement à chaud ultra-rapide et un bundling optimisé.
*   **Styling (CSS)** : Tailwind CSS (chargé via CDN avec configuration dynamique dans `index.html`) complété par un système de design personnalisé dans `styles/premium-design-system.css`.
*   **Backend & Base de données** : Supabase (BaaS) exploitant PostgreSQL, l'authentification (PKCE), les Realtime Subscriptions (Websockets) pour le suivi des commandes en temps réel, et le Storage Supabase pour les images.
*   **Cartographie** : Leaflet et React Leaflet (sans clé API propriétaire) pour le suivi live des livreurs, des magasins et des clients.
*   **Graphiques / KPI** : Recharts (v3) pour les tableaux de bord analytiques et financiers.
*   **Export PDF** : `jspdf` et `jspdf-autotable` pour générer les rapports.
*   **Wrapper Mobile** : Capacitor de Ionic (`capacitor.config.json` présent) pour compiler l'application en natif sur Android/iOS si nécessaire.

---

## 2. Architecture des Dossiers et Fichiers Clés

```text
VEETAA_PANNEL-main/
├── App.tsx                     # Point d'entrée React, gestion du routage de base, auth et abonnements temps réel
├── index.html                  # Fichier HTML principal avec scripts CDN (Tailwind, Leaflet, Leaflet Heat)
├── index.tsx                   # Fichier de montage de l'application React
├── types.ts                    # Tous les types et interfaces TypeScript du domaine (Order, Store, Driver, etc.)
├── constants.tsx               # Constantes globales, données mockées de repli et traductions (FR/AR)
├── capacitor.config.json       # Configuration pour le build mobile natif via Capacitor
│
├── lib/                        # Services et utilitaires partagés
│   ├── supabase.ts             # Configuration du client Supabase et helpers d'upload
│   ├── adminActivity.ts        # Journalisation des actions administrateurs
│   ├── analyticsStats.ts       # Calculs statistiques pour les panels financiers/analytiques
│   └── storeVisibilityQuery.ts # Requêtes spécifiques pour la visibilité des magasins
│
├── views/                      # Vues principales de l'application
│   ├── AdminLogin.tsx          # Page de connexion pour les administrateurs
│   ├── AdminDashboard.tsx      # Le tableau de bord principal (contient la mise en page générale)
│   ├── SupportPage.tsx         # Page d'assistance et de chat support
│   ├── StyleShowcase.tsx       # Page de test et démonstration du design system premium
│   └── admin/                  # Sous-composants et panneaux du Dashboard
│       ├── adminPaths.ts       # Définition des routes et onglets de l'admin (AdminTab)
│       ├── components/         # Composants réutilisables (Cartes KPI, Cartes géographiques, etc.)
│       └── panels/             # Différents panneaux (Overview, Finance, Statistiques, PromoCodes, etc.)
│
├── map/                        # Sous-projet ou widget cartographique autonome
│   ├── App.tsx                 # Application cartographique autonome
│   ├── MapWidget.tsx           # Widget d'affichage de carte
│   └── components/             # Composants spécifiques à la carte live
│
├── styles/
│   └── premium-design-system.css # Définitions CSS pour le design premium sombre/lumineux
│
└── docs/                       # Spécifications et scripts SQL de migration
    └── VEETAA_LIVREUR_ORDER_DATA.md # Contrat de données partagé avec l'application Livreur
```

---

## 3. Modèle de Données & Base de Données (Supabase)

L'application repose sur les tables de données PostgreSQL suivantes, gérées en temps réel :

1.  **`orders`** : Stocke les métadonnées de la commande. Les colonnes majeures incluent :
    *   `id` (entier, clé primaire).
    *   `status` (`pending`, `verification`, `accepted`, `preparing`, `treatment`, `progression`, `delivering`, `delivered`, `refused`, `unavailable`).
    *   `customer_name`, `phone`.
    *   `delivery_lat`, `delivery_lng` (coordonnées GPS du client).
    *   `total_products`, `delivery_fee`, `total_final`.
    *   `assigned_driver_id` (lié à la table `drivers`).
    *   `prescription_base64`, `payment_receipt_base64`, `store_invoice_base64` (images stockées au format base64).
2.  **`order_items`** : Table prioritaire pour les lignes de commande (produits individuels commandés).
3.  **`stores`** : Magasins partenaires. Contient `latitude`, `longitude`, `maps_url` et `store_sub_category_id` (clé étrangère vers `store_sub_categories`).
4.  **`products`** : Catalogue des articles vendus par les magasins.
5.  **`drivers`** : Profils des livreurs (coordonnées en direct : `last_lat`, `last_lng`).
6.  **`profiles`** : Profils utilisateurs (clients).
7.  **`announcements`** : Bannières de promotion diffusées dans l'application client.
8.  **`promo_codes`** : Codes promotionnels.
9.  **`partner_accounts`** et **`partner_store_access`** : Comptes d'accès pour les partenaires de magasins.
10. **`store_sub_categories`** : Catégories de magasins spécifiques (onglets/filtres internes par store sur le site public).
11. **`settings`** : Clés de configuration dynamiques (ex: tarifs de livraison, zone par défaut).

---

## 4. Logiques Métier Fondamentales

### 4.1 Récupération Réduite & Fallback des Lignes de Commande
Afin de préserver la bande passante, l'application utilise une stratégie en deux temps pour charger les commandes :
1.  **Liste générale** : La requête principale ne récupère pas les gros champs Base64 ni la colonne `items` (JSON). Elle récupère les commandes de manière légère.
2.  **Détails de commande** : Lorsqu'un utilisateur clique sur une commande, une requête spécifique charge les base64 (`prescription_base64`, `payment_receipt_base64`, `store_invoice_base64`) et les lignes de commande.
3.  **Fallback des items** :
    *   Le système cherche d'abord les produits dans la table **`order_items`** (recommandé et prioritaire).
    *   Si aucun élément n'est retourné, il parse la colonne **`orders.items`** qui contient un tableau JSON hétérogène (parfois doublement stringifié en base de données).

### 4.2 Résolution Robuste des Coordonnées Géographiques (Store & Client)
Pour assurer que les magasins et les clients s'affichent correctement sur les cartes Leaflet, le projet intègre des extracteurs de coordonnées capables de décoder trois types d'entrées :
1.  **Coordonnées numériques directes** : Utilisation de `latitude` et `longitude` si elles existent et sont valides.
2.  **URL Google Maps** : Extraction via regex depuis les formats d'URL `@lat,lng` ou `?q=lat,lng` entrés par l'administrateur dans le champ `maps_url`.
3.  **Chaîne de texte brute** : Détection des formats `"lat, lng"` entrés directement dans les champs textuels.

### 4.3 Synchronisation en Temps Réel (Realtime Supabase)
*   **UPDATE/INSERT sur `orders`** : Géré via Websocket. Lors d'un nouvel insert, l'application déclenche une alerte sonore et une notification système.
*   **UPDATE/INSERT sur `order_items`** : Déclenche le rechargement immédiat des lignes de la commande modifiée.
*   **Mise à jour de la carte** : Les positions des livreurs (`drivers`) et l'état des magasins (`stores`) sont mis à jour dynamiquement sans rechargement de page.

### 4.4 Rôles et Autorisations Admin
Le système gère deux niveaux d'accès :
*   `super_admin` : Accès total à toutes les fonctionnalités.
*   `sub_admin` : Accès limité selon un objet `permissions` configuré pour masquer certains onglets (ex: Finance ou Statistiques).

---

## 5. Points de Vigilance pour le Développement

*   **Gestion du Base64** : Les factures, reçus et ordonnances peuvent être volumineux. Ne jamais faire de `select('*')` sur la table `orders` dans les boucles de rendu ou les listes globales sous peine de saturer la mémoire et le réseau.
*   **Initialisation Supabase** : Si le fichier `.env` est absent ou mal configuré, le fichier `lib/supabase.ts` utilise des placeholders pour éviter un écran blanc au démarrage de React (laissant l'interface s'afficher avec des données vides ou un avertissement en console).
*   **Rendu Leaflet & Recharts** : Ces bibliothèques sont sensibles aux re-renders excessifs. Utiliser `React.memo` sur les cartes de produits/magasins (ex: `ProductCard`, `StoreCard`) et différer le montage des graphiques (`DeferRechartsMount.tsx`) si nécessaire.
*   **Fichiers temporaires ou de test** : Des fichiers comme `tmp_check_orders.ts` ou `test_storage.ts` sont présents à la racine ; ils servent de scripts utilitaires ou de bac à sable pour valider la structure de la base de données.
