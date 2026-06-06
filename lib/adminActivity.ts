import { supabase } from './supabase';

export type AdminLeaderboardRow = {
   username: string;
   label: string;
   role: 'super_admin' | 'sub_admin';
   count: number;
};

const ADMIN_ACTIVITY_DISABLED_KEY = 'veetaa_admin_activity_disabled_v1';
let adminActivityDisabled = false;

function readAdminActivityDisabled(): boolean {
   if (adminActivityDisabled) return true;
   if (typeof window === 'undefined') return false;
   try {
      adminActivityDisabled = localStorage.getItem(ADMIN_ACTIVITY_DISABLED_KEY) === '1';
   } catch {
      adminActivityDisabled = false;
   }
   return adminActivityDisabled;
}

function disableAdminActivity(): void {
   adminActivityDisabled = true;
   if (typeof window === 'undefined') return;
   try {
      localStorage.setItem(ADMIN_ACTIVITY_DISABLED_KEY, '1');
   } catch {
      /* ignore */
   }
}

function isMissingActivityTable(error: unknown): boolean {
   const e = error as { code?: string; message?: string; details?: string } | null;
   const code = String(e?.code || '').toUpperCase();
   const msg = `${String(e?.message || '')} ${String(e?.details || '')}`.toLowerCase();
   return code === 'PGRST205' || code === '42P01' || msg.includes('could not find the table') || msg.includes('admin_activity_events');
}

function parseAdminFromStorage(): { username: string; displayName: string; role: 'super_admin' | 'sub_admin' } | null {
   if (typeof window === 'undefined') return null;
   const raw = localStorage.getItem('veetaa_admin_token');
   if (!raw) return null;
   try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      const username = String(p.username ?? p.email ?? '').trim() || 'inconnu';
      const displayName = String(p.display_name ?? p.displayName ?? username).trim() || username;
      const role = p.role === 'super_admin' ? 'super_admin' : 'sub_admin';
      return { username, displayName, role };
   } catch {
      return null;
   }
}

/** Enregistre une action admin (nécessite la table `admin_activity_events` — voir docs). Sans table, l’appel échoue silencieusement côté UI. */
export function logAdminActivity(eventType: string): void {
   if (readAdminActivityDisabled()) return;
   const id = parseAdminFromStorage();
   if (!id) return;
   const et = eventType.slice(0, 120);
   void supabase.from('admin_activity_events').insert({
      admin_username: id.username,
      admin_display_name: id.displayName,
      admin_role: id.role,
      event_type: et,
   }).then(({ error }) => {
      if (error && isMissingActivityTable(error)) {
         disableAdminActivity();
      }
   });
}

/** Une fois par onglet session : connexion / présence. */
export function logAdminSessionOnce(): void {
   if (typeof window === 'undefined') return;
   try {
      const k = 'veetaa_admin_session_logged_v1';
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
      logAdminActivity('session');
   } catch {
      /* ignore */
   }
}

/** Agrège les événements sur la période ; top 7 par nombre d’événements. */
export async function fetchAdminLeaderboardTop7(fromIso: string, toIso: string): Promise<AdminLeaderboardRow[]> {
   if (readAdminActivityDisabled()) return [];
   const { data, error } = await supabase
      .from('admin_activity_events')
      .select('admin_username, admin_role, admin_display_name')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

   if (error) {
      if (isMissingActivityTable(error)) {
         disableAdminActivity();
         return [];
      }
      if (import.meta.env.DEV) console.warn('[admin_activity_events]', error.message);
      return [];
   }
   if (!data?.length) return [];

   const map = new Map<string, { count: number; role: 'super_admin' | 'sub_admin'; display: string }>();
   for (const row of data as { admin_username?: string; admin_role?: string; admin_display_name?: string }[]) {
      const u = String(row.admin_username || 'inconnu');
      const role = row.admin_role === 'super_admin' ? 'super_admin' : 'sub_admin';
      const display = String(row.admin_display_name || u);
      const cur = map.get(u) || { count: 0, role, display };
      cur.count += 1;
      cur.display = display;
      cur.role = role;
      map.set(u, cur);
   }

   return Array.from(map.entries())
      .map(([username, v]) => ({
         username,
         count: v.count,
         role: v.role,
         label: `${v.display} (${v.role === 'super_admin' ? 'Super admin' : 'Admin'})`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
}
