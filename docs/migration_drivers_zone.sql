-- Migration: Ajouter la colonne zone_id dans la table drivers
-- Exécuter ce script dans Supabase > SQL Editor

-- 1. Ajouter la colonne zone_id à la table drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL;

-- 2. (Optionnel) Créer un index pour accélérer les jointures
CREATE INDEX IF NOT EXISTS idx_drivers_zone_id ON public.drivers(zone_id);

-- Vérification : afficher les livreurs avec leur zone
-- SELECT d.id, d.full_name, d.phone, dz.name AS zone_name
-- FROM drivers d
-- LEFT JOIN delivery_zones dz ON dz.id = d.zone_id;
