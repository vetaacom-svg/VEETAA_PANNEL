
import React, { useState } from 'react';
import { MapPin, PhoneCall, Contact, CheckCircle2, ChevronRight } from 'lucide-react';

interface PermissionsProps {
  onGranted: () => void;
}

const PermissionsRequest: React.FC<PermissionsProps> = ({ onGranted }) => {
  const [granted, setGranted] = useState({
    location: false,
    calls: false,
    contacts: false
  });

  const handleGrant = (type: keyof typeof granted) => {
    if (type === 'location' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {
        setGranted(prev => ({ ...prev, location: true }));
      }, () => {
        // Fallback for demo, we mark as true even if denied for UX flow
        setGranted(prev => ({ ...prev, location: true }));
      });
    } else {
      // Simulate Call & Contact permission request
      setGranted(prev => ({ ...prev, [type]: true }));
    }
  };

  const allGranted = granted.location && granted.calls && granted.contacts;

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center space-y-8 animate-in slide-in-from-bottom duration-200 relative">
      <button 
        onClick={onGranted}
        className="absolute top-8 right-8 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors flex items-center gap-1"
      >
        Passer <ChevronRight className="w-4 h-4" />
      </button>

      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-800 leading-tight">Autorisations requises 🔐</h2>
        <p className="text-slate-500">Pour une expérience optimale, nous avons besoin de quelques accès.</p>
      </div>

      <div className="space-y-4">
        {/* Location */}
        <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${granted.location ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${granted.location ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Localisation</p>
            <p className="text-[10px] text-slate-400 leading-tight">Pour trouver les livreurs proches.</p>
          </div>
          {!granted.location ? (
            <button onClick={() => handleGrant('location')} className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-xl">AUTORISER</button>
          ) : (
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
          )}
        </div>

        {/* Calls */}
        <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${granted.calls ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${granted.calls ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <PhoneCall className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Appels</p>
            <p className="text-[10px] text-slate-400 leading-tight">Pour contacter votre livreur.</p>
          </div>
          {!granted.calls ? (
            <button onClick={() => handleGrant('calls')} className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-xl">AUTORISER</button>
          ) : (
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
          )}
        </div>

        {/* Contacts */}
        <div className={`p-4 rounded-3xl border-2 flex items-center gap-4 transition-all ${granted.contacts ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${granted.contacts ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <Contact className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Contacts</p>
            <p className="text-[10px] text-slate-400 leading-tight">Pour partager l'app avec vos amis.</p>
          </div>
          {!granted.contacts ? (
            <button onClick={() => handleGrant('contacts')} className="bg-orange-600 text-white text-[10px] font-black px-4 py-2 rounded-xl">AUTORISER</button>
          ) : (
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <button 
          onClick={onGranted}
          disabled={!allGranted}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-lg ${allGranted ? 'bg-orange-600 text-white shadow-orange-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          Continuer vers l'app
        </button>
        
        <button 
          onClick={onGranted}
          className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
        >
          Ignorer pour le moment
        </button>
      </div>
    </div>
  );
};

export default PermissionsRequest;
