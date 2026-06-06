-- =============================================================================
-- VEETAA - PANEL RLS UNLOCK (sans désactiver RLS, sans modifier le code)
-- =============================================================================
-- Objectif:
--   - Garder RLS ACTIVÉ partout
--   - Mais ajouter des policies permissives pour que le panel admin fonctionne
--     avec la clé Supabase "anon" (front ne s'authentifie pas vraiment).
--
-- IMPORTANT (sécurité):
--   - Ce script rend le RLS très permissif pour les tables du panel.
--   - C'est une stratégie "fix maintenant / security fine plus tard".
--   - Le but est d'empêcher que les pages admin se bloquent.
--
-- Exclut volontairement les tables de sécurité login (ne pas les ouvrir):
--   - super_admins
--   - admin_accounts
--   - admin_login_security / admin_login_audit / admin_login_sessions
--
-- Usage:
--   1) Coller + Run dans Supabase SQL Editor
--   2) Si besoin: NOTIFY pgrst reload schema (inclu)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  r record;
  excluded boolean;
  pol_anon text;
  pol_auth text;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    excluded :=
      r.tablename IN (
        'super_admins',
        'admin_accounts',
        'admin_login_security',
        'admin_login_audit',
        'admin_login_sessions'
      );

    IF excluded THEN
      CONTINUE;
    END IF;

    -- Active RLS (si pas déjà activé)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

    -- Policies nommées (drop puis create) pour éviter les collisions
    pol_anon := format('panel_anon_all_%s', r.tablename);
    pol_auth := format('panel_auth_all_%s', r.tablename);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol_anon, r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol_auth, r.tablename);

    -- Lecture/écriture permissives pour que le panel (anon key) marche
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL TO anon
       USING (true)
       WITH CHECK (true);',
      pol_anon, r.tablename
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL TO authenticated
       USING (true)
       WITH CHECK (true);',
      pol_auth, r.tablename
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- =============================================================================
-- Debug optionnel:
--   Les politiques ajoutées pour une table donnée:
--   SELECT policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname='public' AND tablename='orders'
-- =============================================================================

