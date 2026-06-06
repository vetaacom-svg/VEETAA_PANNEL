-- =============================================================================
-- VEETAA - ADMIN PRESENCE (Admins en ligne)
-- =============================================================================
-- But :
--   - Permettre au panel d'afficher qui a ouvert le panel (en ligne)
--   - Utilisé par `views/AdminDashboard.tsx` via un "heartbeat" toutes les ~20s
--
-- Règle "en ligne" côté UI :
--   last_seen_at >= now() - interval '60 seconds'
--
-- ⚠️ RLS :
--   - RLS ACTIVÉ
--   - Policies permissives pour que le panel (clé `anon`) puisse upsert / select
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_presence (
  username text PRIMARY KEY,
  role text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_presence_last_seen_at_idx
  ON public.admin_presence(last_seen_at);

ALTER TABLE public.admin_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_anon_admin_presence_all ON public.admin_presence;
DROP POLICY IF EXISTS panel_auth_admin_presence_all ON public.admin_presence;

CREATE POLICY panel_anon_admin_presence_all
  ON public.admin_presence
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY panel_auth_admin_presence_all
  ON public.admin_presence
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

COMMIT;

