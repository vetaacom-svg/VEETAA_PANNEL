-- =============================================================================
-- VEETAA - PANEL RLS UNLOCK ADMIN FULL (sans désactiver RLS)
-- =============================================================================
-- Objectif:
--   - Garder RLS ACTIVÉ partout
--   - Donner un "full access" au panel (clé Supabase anon) y compris:
--       * `public.super_admins`
--       * `public.admin_accounts`
--   - Ne PAS ouvrir les tables de sécurité du login, pour éviter de casser la logique v2:
--       * `admin_login_security`
--       * `admin_login_audit`
--       * `admin_login_sessions`
--
-- ⚠️ Sécurité:
--   Ce script rend les politiques RLS très permissives pour les tables du panel.
--   C'est fait pour assurer que le panel admin fonctionne et que la page admin
--   ne soit plus bloquée par RLS.
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

