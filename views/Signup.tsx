
import React, { useState } from 'react';
import { User, Phone, ArrowRight, Code } from 'lucide-react';

interface SignupProps {
  onSignup: (name: string, phone: string) => void;
  onGoToLogin: () => void;
  onSkip?: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onGoToLogin, onSkip }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Veuillez entrer votre nom complet');
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length !== 9) {
      setError('Le numéro doit contenir 9 chiffres après +212');
      return;
    }
    onSignup(name, `+212 ${phone}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhone(value);
    setError('');
  };

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center animate-in slide-in-from-right duration-200">
      <div className="mb-12">
        <h2 className="text-3xl font-black text-slate-800 mb-2">Bienvenue ! ✨</h2>
        <p className="text-slate-500">Créez votre compte pour commencer.</p>
      </div>

      <form onSubmit={validateAndSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nom Complet</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Ex: Ahmed Benali"
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none font-bold"
              value={name}
              onChange={(e) => {setName(e.target.value); setError('');}}
              required
            />
          </div>
        </div>

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
          Créer mon compte
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-12 text-center space-y-6">
        <p className="text-slate-500 text-sm">
          Déjà un compte ?{' '}
          <button onClick={onGoToLogin} className="text-orange-600 font-bold hover:underline">
            Se connecter
          </button>
        </p>

        {onSkip && (
          <div className="pt-8 border-t border-slate-100">
             <button 
              onClick={onSkip}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
             >
               <Code className="w-3 h-3" />
               Skip Login (Dev Only)
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
