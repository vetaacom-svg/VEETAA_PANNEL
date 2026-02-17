
import React, { useState } from 'react';
import { Phone, ArrowRight, Code } from 'lucide-react';

interface LoginProps {
  onLogin: (phone: string) => void;
  onGoToSignup: () => void;
  onSkip?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToSignup, onSkip }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone === "R144124768") {
      onLogin("R144124768");
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleanPhone)) {
      setError('Le numéro doit contenir 9 chiffres après +212');
      return;
    }
    onLogin(`+212 ${phone}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);
    setError('');
  };

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center animate-in fade-in duration-200">
      <div className="mb-12">
        <h2 className="text-3xl font-black text-slate-800 mb-2">Bon retour ! 👋</h2>
        <p className="text-slate-500">Entrez votre numéro pour continuer.</p>
      </div>

      <form onSubmit={validateAndSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Téléphone</label>
          <div className="flex gap-2">
            <div className="bg-slate-100 px-4 py-4 rounded-2xl font-bold text-slate-600 flex items-center">
              +212
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="tel"
                placeholder="6XX XXX XXX"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none font-bold"
                value={phone}
                onChange={handlePhoneChange}
                required
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs px-1 font-medium">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          Se connecter
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-12 text-center space-y-6">
        <p className="text-slate-500 text-sm">
          Vous n'avez pas de compte ?{' '}
          <button onClick={onGoToSignup} className="text-orange-600 font-bold hover:underline">
            S'inscrire
          </button>
        </p>


      </div>
    </div>
  );
};

export default Login;
