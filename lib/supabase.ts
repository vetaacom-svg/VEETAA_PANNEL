import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** Faux positif si le .env contient encore les placeholders du dépôt — les appels API échoueront. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Ne pas throw au chargement : sans .env, une exception ici = écran blanc (React ne monte jamais).
const url =
  supabaseUrl ||
  'https://placeholder-not-configured.supabase.co';
const key =
  supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder';

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env (voir .env.example). L’interface peut s’afficher mais les données ne chargeront pas.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: { 'X-Client-Info': 'veetaa-delivery-web' },
  },
});

/**
 * Helper pour convertir un DataURL (base64) en Blob pour l'upload Supabase Storage
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
