# Plan d'Améliorations, de Corrections et Nouvelles Fonctionnalités (VEETAA Pannel)

Ce document liste les tâches à réaliser dans le panneau d'administration de **Veetaa Delivery**, incluant les améliorations d'interface (UI/UX), les corrections de bugs potentiels et la spécification de la fonctionnalité de **Sous-sous-catégories** (représentées par la table `store_sub_categories`).

---

## 1. Différenciation des Applications

Il est crucial de bien distinguer les deux applications du projet :
*   **VEETAA PANEL** : Le panneau d'administration (le projet actuel sur lequel nous travaillons). Il s'agit d'un site web de gestion isolé utilisé uniquement par les administrateurs et les partenaires.
*   **VEETAA PUBLIC (veeta.com / veeta.ma)** : L'application web publique à destination des clients finaux pour passer commande (voir les services comme Restaurant, Market, Express, Pharmacie, etc. et naviguer à travers les catégories).

---

## 2. Fonctionnalité : Gestion des store_sub_categories

Dans la base de données, la table `public.store_sub_categories` existe déjà et correspond à ce que nous appelons les sous-sous-catégories (ou les catégories spécifiques au sein d'un store, qui s'affichent sous forme de filtres/onglets comme "Tout", "Pâtes", "Pizza", "Salade" sur la page d'un magasin dans le site public).

### 2.1 Schéma SQL Réel de la Table `store_sub_categories`
```sql
create table public.store_sub_categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  category_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint store_sub_categories_pkey primary key (id),
  constraint store_sub_categories_category_id_fkey foreign KEY (category_id) references categories (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists uq_store_sub_categories_cat_name_norm on public.store_sub_categories using btree (
  lower(TRIM(both from category_id)),
  lower(TRIM(both from name))
) TABLESPACE pg_default;

create index IF not exists idx_store_sub_categories_category_id on public.store_sub_categories using btree (category_id) TABLESPACE pg_default;
```

### 2.2 Fonctionnement Attendu & Workflow
1.  **Chaque magasin a sa propre sous-catégorie de magasin (`store_sub_categories`)** : 
    *   La table `stores` possède une colonne `store_sub_category_id uuid` qui référence `store_sub_categories(id)`.
    *   Nous devons ajouter dans la gestion des stores (le formulaire de création/modification de marque dans l'administration) une option pour sélectionner ou gérer ces catégories de magasin (`store_sub_categories`).
2.  **Liaison avec les produits** :
    *   Dans le formulaire d'édition des produits, l'administrateur doit pouvoir lier un produit à la catégorie de store adéquate (`store_sub_category_id`).
    *   Cela permettra d'afficher les bons onglets de filtres sur l'application publique (comme dans l'exemple de Little Mamma avec les onglets "Pâtes", "Pizza", "Salade").

---

## 3. Améliorations de l'Application

*   **Optimisation du Chargement global et de la Pagination** :
    *   Optimiser davantage `fetchAllProductsParallel` en limitant le volume de données chargées pour les listes simples.
*   **Refactoring de `AdminDashboard.tsx`** :
    *   Le fichier `AdminDashboard.tsx` est extrêmement volumineux (~676 KB). Il est recommandé d'externaliser progressivement certains sous-panneaux (comme l'éditeur de produits ou de magasins) dans des fichiers dédiés pour faciliter la maintenance.
*   **Interface Utilisateur (Design Premium)** :
    *   Harmoniser l'ensemble des modaux et des boutons pour correspondre au style Premium du fichier `premium-design-system.css`.

---

## 4. Corrections à Prévoir

*   **Extraction de Coordonnées** :
    *   S'assurer que la détection automatique des coordonnées GPS via regex supporte tous les types d'URLs courtes Google Maps (`maps.app.goo.gl/...`), en plus des formats standards de coordonnées.
*   **Gestion des Valeurs Nulles dans Supabase** :
    *   Valider que les champs `latitude` et `longitude` sont typés correctement lors de la création d'un store et ne provoquent pas de plantage de la carte si la valeur insérée est vide ou nulle.

