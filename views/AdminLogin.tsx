import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, User, Key, ArrowRight, Loader2, Eye, EyeOff, Lock } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (adminData: any) => void;
}

type AdminRole = 'super_admin' | 'sub_admin';
type AdminLoginRpcV2Row = {
  ok: boolean;
  reason: string | null;
  id: string | null;
  username: string | null;
  role: AdminRole | null;
  permissions: Record<string, boolean> | null;
  lock_seconds: number | null;
  session_token: string | null;
};

const USERNAME_MAX = 120;
const SECRET_MAX = 128;
const CLIENT_RATE_WINDOW_MS = 10 * 60 * 1000;
const CLIENT_RATE_MAX_ATTEMPTS = 10;
const CLIENT_RATE_LOCK_MS = 60 * 1000;
const RATE_STORAGE_KEY = 'veetaa_admin_login_attempts_v2';
const FINGERPRINT_STORAGE_KEY = 'veetaa_admin_fp_v1';

type AttemptRecord = { t: number[] };

function sanitize(value: string, maxLen: number): string {
  let s = value.replace(/\0/g, '').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function loadAttempts(): number[] {
  try {
    const raw = sessionStorage.getItem(RATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AttemptRecord;
    const now = Date.now();
    return (parsed.t || []).filter((x) => now - x < CLIENT_RATE_WINDOW_MS);
  } catch {
    return [];
  }
}

function saveAttempts(timestamps: number[]) {
  try {
    sessionStorage.setItem(RATE_STORAGE_KEY, JSON.stringify({ t: timestamps }));
  } catch {
    // ignore
  }
}

function getClientFingerprint(): string {
  try {
    const cached = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (cached && cached.length >= 16) return cached;
    const base = `${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone || 'na'}|${screen.width}x${screen.height}|${Date.now()}`;
    const fp = btoa(unescape(encodeURIComponent(base))).replace(/=+$/g, '').slice(0, 96);
    localStorage.setItem(FINGERPRINT_STORAGE_KEY, fp);
    return fp;
  } catch {
    return `fp_${Date.now()}`;
  }
}

function isRpcMissingError(err: any): boolean {
  const code = String(err?.code || '');
  const message = String(err?.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || message.includes('could not find the function') || message.includes('admin_login_v2');
}

function errorFromReason(reason: string | null, lockSeconds?: number | null): string {
  switch (reason) {
    case 'disabled':
      return 'Ce compte administrateur est desactive.';
    case 'locked':
      return `Trop de tentatives. Reessayez dans ${Math.max(1, Math.ceil((lockSeconds || 0) / 60))} min.`;
    case 'invalid_input':
      return 'Identifiant ou code secret invalide.';
    case 'invalid_credentials':
    default:
      return 'Identifiants incorrects. Verifiez votre identifiant et votre code secret.';
  }
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [localLockUntil, setLocalLockUntil] = useState(0);

  const localLocked = useMemo(() => Date.now() < localLockUntil, [localLockUntil, loading]);

  useEffect(() => {
    if (localLockUntil <= Date.now()) return;
    const ms = localLockUntil - Date.now() + 50;
    const id = window.setTimeout(() => {
      setLocalLockUntil(0);
      setError((prev) => (prev?.includes('Trop de tentatives') ? null : prev));
    }, ms);
    return () => window.clearTimeout(id);
  }, [localLockUntil]);

  const registerLocalFailedAttempt = useCallback(() => {
    const now = Date.now();
    const prev = loadAttempts();
    const next = [...prev, now];
    saveAttempts(next);
    if (next.length >= CLIENT_RATE_MAX_ATTEMPTS) {
      setLocalLockUntil(now + CLIENT_RATE_LOCK_MS);
      saveAttempts([]);
      setError('Trop de tentatives locales. Reessayez dans 1 minute.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localLocked || loading) return;

    setError(null);
    const u = sanitize(username, USERNAME_MAX);
    const s = sanitize(secret, SECRET_MAX);
    setUsername(u);
    setSecret(s);

    if (u.length < 2 || s.length < 4) {
      setError('Saisissez un identifiant et un code secret valides.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_login_v2', {
        p_username: u,
        p_secret: s,
        p_client_fingerprint: getClientFingerprint(),
      });

      if (rpcError) {
        if (import.meta.env.DEV) console.error('RPC admin_login_v2 error:', rpcError);
        if (isRpcMissingError(rpcError)) {
          setError('Migration SQL login v2 non appliquee. Executez le script SQL v2 puis reessayez.');
        } else {
          setError('Erreur interne lors de la connexion.');
        }
        registerLocalFailedAttempt();
        return;
      }

      const row = Array.isArray(data) ? (data[0] as AdminLoginRpcV2Row | undefined) : undefined;
      if (!row?.ok || !row.id || !row.username || !row.role) {
        setError(errorFromReason(row?.reason ?? null, row?.lock_seconds));
        registerLocalFailedAttempt();
        return;
      }

      const fallbackPermissions = row.role === 'super_admin'
        ? {
          viewOrders: true,
          manageAdmins: true,
          manageLogs: true,
          viewReports: true,
          manageSettings: true,
          editStores: true,
          editProducts: true,
          manageUsers: true,
          manageDrivers: true,
        }
        : {
          viewOrders: false,
          manageAdmins: false,
          manageLogs: false,
          viewReports: false,
          manageSettings: false,
          editStores: false,
          editProducts: false,
          manageUsers: false,
          manageDrivers: false,
        };

      const adminPayload = {
        id: row.id,
        username: row.username,
        role: row.role,
        permissions: row.permissions || fallbackPermissions,
        session_token: row.session_token || undefined,
        issued_at: new Date().toISOString(),
      };

      localStorage.setItem('veetaa_admin_token', JSON.stringify(adminPayload));
      saveAttempts([]);
      setSecret('');
      onLoginSuccess(adminPayload);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Login error:', err);
      setError('Une erreur est survenue. Reessayez plus tard.');
      registerLocalFailedAttempt();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 font-sans selection:bg-orange-500/30 bg-gradient-to-br from-[#020617] via-[#0b1227] to-[#111a38] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-[-15%] left-[-10%] h-96 w-96 rounded-full bg-orange-500/15 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-blue-500/15 blur-3xl animate-pulse-slow" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        <div className="bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl rounded-[1.75rem] p-10 sm:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-full border border-orange-400/40 bg-orange-500/15 w-16 h-16 mx-auto mb-4 shadow-lg shadow-orange-500/25">
              <ShieldCheck size={28} className="text-orange-400" aria-hidden />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">
              Control <span className="text-orange-400">Center</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 uppercase tracking-wider">
              Connexion securisee v2 (super admin / sub admin)
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            {error && (
              <div
                role="alert"
                className="bg-red-500/15 border border-red-400/50 text-red-100 px-4 py-3 rounded-xl text-sm font-medium text-center animate-shake"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Identifiant
              </label>
              <div
                className={`flex h-14 items-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-sm transition-all focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/20 ${loading || localLocked ? 'opacity-60' : ''}`}
              >
                <div className="ml-3 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden>
                  <User size={16} />
                </div>
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={USERNAME_MAX}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\0/g, ''))}
                  placeholder="Nom ou identifiant admin"
                  disabled={loading || localLocked}
                  aria-invalid={Boolean(error)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-3 text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-secret" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Code secret
              </label>
              <div
                className={`group flex h-14 items-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-sm transition-all focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/20 ${loading || localLocked ? 'opacity-60' : ''}`}
              >
                <div className="ml-3 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden>
                  <Key size={16} />
                </div>
                <input
                  id="admin-secret"
                  name="password"
                  type={showSecret ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={SECRET_MAX}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value.replace(/\0/g, ''))}
                  placeholder="Votre code secret"
                  disabled={loading || localLocked}
                  aria-invalid={Boolean(error)}
                  spellCheck={false}
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-2 text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  disabled={loading || localLocked}
                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none"
                  aria-label={showSecret ? 'Masquer le code secret' : 'Afficher le code secret'}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {localLocked && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-3 py-2 text-amber-100 text-xs font-semibold">
                <Lock size={14} />
                Protection locale active: reessayez dans quelques instants.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || localLocked}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 font-black uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-orange-500/35 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} aria-hidden />
              ) : (
                <>
                  Connexion <ArrowRight size={18} aria-hidden />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-[10px] text-slate-600 uppercase tracking-wider">
            Systeme de gestion interne © {new Date().getFullYear()} Veetaa
          </p>
        </div>
      </div>

      <style>{`
            @keyframes shake {
               0%, 100% { transform: translateX(0); }
               25% { transform: translateX(-4px); }
               75% { transform: translateX(4px); }
            }
            .animate-shake { animation: shake 0.18s ease-in-out 0s 2; }
            @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.05); } }
            .animate-pulse-slow { animation: pulse-slow 10s ease-in-out infinite; }
         `}</style>
    </div>
  );
};

export default AdminLogin;
