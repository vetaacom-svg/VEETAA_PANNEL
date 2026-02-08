import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Phone, Mail, ChevronRight, HelpCircle } from 'lucide-react';
import { SupportInfo } from '../types';

interface HelpProps {
  onBack: () => void;
  supportInfo: SupportInfo;
}

const Help: React.FC<HelpProps> = ({ onBack, supportInfo }) => {
  const [chatMode, setChatMode] = useState(false);

  const faqs = [
    "Où est ma commande ?",
    "La commande est arrivée froide",
    "J'ai un problème de paiement",
    "Modifier mon adresse de livraison"
  ];

  if (chatMode) {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300">
        <header className="p-4 bg-white border-b flex items-center gap-3">
          <button onClick={() => setChatMode(false)} className="p-2 -ml-2"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h3 className="font-black text-slate-800">Support Veetaa</h3>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Agent en ligne
            </p>
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="bg-slate-200 text-slate-800 p-4 rounded-3xl rounded-tl-none max-w-[80%] text-sm font-medium">
            Bonjour ! Je suis Ahmed du support Veetaa. Comment puis-je vous aider aujourd'hui ?
          </div>
          <div className="bg-orange-600 text-white p-4 rounded-3xl rounded-tr-none max-w-[80%] ml-auto text-sm font-medium shadow-lg shadow-orange-100">
            Bonjour, ma commande est en retard de 5 minutes.
          </div>
          <div className="bg-slate-200 text-slate-800 p-4 rounded-3xl rounded-tl-none max-w-[80%] text-sm font-medium">
            Je vérifie tout de suite avec le livreur... Un instant s'il vous plaît.
          </div>
        </div>
        <div className="p-4 bg-white border-t flex gap-2">
          <input type="text" placeholder="Écrivez votre message..." className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button className="bg-orange-600 text-white p-3 rounded-2xl"><MessageSquare className="w-5 h-5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Aide & Support</h2>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] space-y-6 shadow-xl shadow-slate-200">
        <div className="space-y-2">
          <h3 className="text-xl font-black text-orange-500">Une urgence ?</h3>
          <p className="text-slate-400 text-sm font-medium">Nos agents sont disponibles 24/7 pour vous assister dans vos livraisons.</p>
        </div>
        <button
          onClick={() => setChatMode(true)}
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
        >
          <MessageSquare className="w-5 h-5" />
          Lancer le chat en direct
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Questions fréquentes</h4>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <button key={i} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 text-left hover:bg-slate-50 transition-colors">
              <span className="text-sm font-bold text-slate-700">{faq}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <a href={`tel:${supportInfo.phone}`} className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-2">
          <Phone className="w-6 h-6 text-orange-600" />
          <span className="text-xs font-bold text-slate-800">Appeler</span>
        </a>
        <a href={`mailto:${supportInfo.email}`} className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-2">
          <Mail className="w-6 h-6 text-orange-600" />
          <span className="text-xs font-bold text-slate-800">Email</span>
        </a>
      </div>
    </div>
  );
};

export default Help;
