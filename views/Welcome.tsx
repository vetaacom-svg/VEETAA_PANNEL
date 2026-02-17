
import React from 'react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface WelcomeProps {
  onStart: () => void;
  language: Language;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart, language }) => {
  const t = (key: string) => TRANSLATIONS[language][key] || key;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-500 to-red-600 text-white overflow-hidden relative">
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 text-center space-y-8">
        <div className="w-40 h-40 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl mx-auto rotate-12 mb-8 animate-in zoom-in-50 duration-200">
           <span className="text-orange-600 text-8xl font-black font-brand -rotate-12 select-none">V</span>
        </div>
        <div className="space-y-2 animate-in slide-in-from-bottom-10 duration-200">
          <h1 className="text-6xl font-black font-brand tracking-tighter mb-2">Veetaa</h1>
          <p className="text-orange-100 font-semibold text-lg opacity-90 tracking-tight max-w-[280px] mx-auto leading-tight">
            {t('welcome')}
          </p>
        </div>

        <button 
          onClick={onStart}
          className="w-full max-w-xs py-5 px-8 bg-white text-orange-600 rounded-[2rem] font-black text-xl shadow-2xl shadow-orange-900/20 hover:bg-orange-50 transition-colors uppercase tracking-wider animate-in fade-in zoom-in duration-200"
        >
          {t('getStarted')}
        </button>
      </div>

      <div className="mt-16 flex gap-3 opacity-30 animate-bounce duration-[2000ms]">
        <div className="w-2 h-2 bg-white rounded-full" />
        <div className="w-6 h-2 bg-white rounded-full" />
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  );
};

export default Welcome;
