
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, User, Key, ArrowRight, Loader2 } from 'lucide-react';

interface AdminLoginProps {
    onLoginSuccess: (adminData: any) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [badgeId, setBadgeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('super_admins')
                .select('*')
                .eq('username', username)
                .eq('badge_id', badgeId)
                .single();

            if (fetchError || !data) {
                setError('Identifiants invalides ou accès refusé.');
            } else {
                // Success
                localStorage.setItem('veetaa_admin_token', JSON.stringify(data));
                onLoginSuccess(data);
            }
        } catch (err) {
            setError('Une erreur est survenue lors de la connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans selection:bg-orange-500/30">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                {/* Logo & Header */}
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex p-4 bg-orange-500/10 rounded-[2rem] border border-orange-500/20 shadow-xl shadow-orange-500/5 mb-2">
                        <ShieldCheck size={48} className="text-orange-500" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Control <span className="text-orange-500">Center</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em]">Accès Administrateur Sécurisé</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-10 shadow-2xl space-y-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Identifiant</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ex: Admin_01"
                                    required
                                    className="w-full bg-slate-800/50 border-2 border-transparent focus:border-orange-500/50 focus:bg-slate-800 outline-none rounded-[2rem] py-5 pl-14 pr-6 text-white font-bold transition-all placeholder:text-slate-600 shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Badge ID</label>
                            <div className="relative group">
                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    value={badgeId}
                                    onChange={(e) => setBadgeId(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-800/50 border-2 border-transparent focus:border-orange-500/50 focus:bg-slate-800 outline-none rounded-[2rem] py-5 pl-14 pr-6 text-white font-bold transition-all placeholder:text-slate-600 shadow-inner"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[2rem] py-5 font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 transition-all active:scale-95 mt-4"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Connexion <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Text */}
                <p className="text-center mt-10 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    Système de gestion interne &copy; {new Date().getFullYear()} Veetaa
                </p>
            </div>

            <style>{`
            @keyframes shake {
               0%, 100% { transform: translateX(0); }
               25% { transform: translateX(-5px); }
               75% { transform: translateX(5px); }
            }
            .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
         `}</style>
        </div>
    );
};

export default AdminLogin;
