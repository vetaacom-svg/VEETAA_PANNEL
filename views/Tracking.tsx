
import React from 'react';
import { Order, OrderStatus } from '../types';
import { MapPin, Phone, MessageSquare, ChevronLeft, Package, Clock, CheckCircle2, Navigation, Star, PhoneCall } from 'lucide-react';

interface TrackingProps {
  orders: Order[];
  onBack: () => void;
}

const Tracking: React.FC<TrackingProps> = ({ orders, onBack }) => {
  const activeOrder = orders[0]; 

  if (!activeOrder) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
           <Package className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-400">Aucune commande en cours</h2>
        <button onClick={onBack} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold">Retour à l'accueil</button>
      </div>
    );
  }

  const steps: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'pending', label: 'En attente de validation', icon: <Clock className="w-5 h-5" /> },
    { status: 'accepted', label: 'Commande acceptée', icon: <CheckCircle2 className="w-5 h-5" /> },
    { status: 'preparing', label: 'En préparation', icon: <Package className="w-5 h-5" /> },
    { status: 'delivering', label: 'En livraison', icon: <Navigation className="w-5 h-5" /> },
    { status: 'delivered', label: 'Livrée', icon: <MapPin className="w-5 h-5" /> },
  ];

  const getCurrentStepIndex = () => {
    const idx = steps.findIndex(s => s.status === activeOrder.status);
    return idx === -1 ? 0 : idx;
  };

  const currentIdx = getCurrentStepIndex();

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-200">
      <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-30">
         <button onClick={onBack} className="p-2 -ml-2"><ChevronLeft className="w-6 h-6" /></button>
         <h2 className="text-lg font-black tracking-tight">Suivi de la commande #{activeOrder.id}</h2>
         <div className="w-8" />
      </div>

      <div className="relative flex-1 bg-slate-200">
         <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-7.5898,33.5731,13,0/600x600?access_token=pk.eyJ1IjoiYmFycm9uIiwiYSI6ImNrcW8ybzFwYjBzM2kyd3A5bXo1bXk4bXoifQ.S1lS1S1S1S1S1S1S1S1S1S')] bg-cover bg-center">
            <div className="absolute inset-0 bg-orange-600/5 backdrop-blur-[1px]" />
            
            <div className={`absolute transition-all duration-[3000ms] ease-in-out`} style={{
              left: activeOrder.status === 'delivering' ? '60%' : '30%',
              top: activeOrder.status === 'delivering' ? '50%' : '30%'
            }}>
               <div className="relative">
                  <div className={`w-14 h-14 ${activeOrder.status === 'pending' ? 'bg-slate-400' : 'bg-orange-600'} rounded-2xl flex items-center justify-center text-white shadow-2xl ${activeOrder.status !== 'pending' ? 'animate-bounce' : ''}`}>
                     {activeOrder.status === 'pending' ? <Clock className="w-7 h-7" /> : <Navigation className="w-7 h-7 rotate-45" />}
                  </div>
               </div>
            </div>

            <div className="absolute left-[70%] top-[70%]">
               <div className="w-10 h-10 bg-slate-900 rounded-full border-4 border-white flex items-center justify-center text-white shadow-xl">
                  <MapPin className="w-5 h-5" />
               </div>
               <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg text-[10px] font-black whitespace-nowrap uppercase tracking-widest">DESTINATION</div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-t-[3.5rem] p-8 space-y-8 shadow-2xl -mt-14 z-20 overflow-y-auto max-h-[60%]">
         <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status de livraison</p>
               <h3 className={`text-2xl font-black tracking-tight ${activeOrder.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                 {steps[currentIdx].label}
               </h3>
            </div>
            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-[1.75rem] mb-2 ${activeOrder.status === 'pending' ? 'bg-slate-100' : 'bg-orange-50'}`}>
                 <Clock className={`w-8 h-8 ${activeOrder.status === 'pending' ? 'text-slate-400' : 'text-orange-600'}`} />
              </div>
              <span className={`text-[10px] font-bold ${activeOrder.status === 'pending' ? 'text-slate-400' : 'text-orange-600'}`}>
                {activeOrder.status.toUpperCase()}
              </span>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <a 
              href="tel:+212600000000" 
              className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-[2rem] gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
               <PhoneCall className="w-6 h-6 text-orange-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Support</span>
            </a>
            <button className="flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 border border-slate-100 rounded-[2rem] gap-2 active:scale-95 transition-all">
               <MessageSquare className="w-6 h-6 text-slate-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Message</span>
            </button>
         </div>

         <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Étapes de traitement</h4>
            {steps.map((step, i) => (
               <div key={i} className={`flex items-start gap-5 transition-all duration-500 ${i > currentIdx ? 'opacity-20 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                  <div className="flex flex-col items-center gap-1">
                     <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm ${i <= currentIdx ? (step.status === 'pending' ? 'bg-slate-400' : 'bg-orange-600') : 'bg-slate-100'}`}>
                        {step.icon}
                     </div>
                     {i < steps.length - 1 && (
                        <div className={`w-0.5 h-6 transition-colors duration-1000 ${i < currentIdx ? 'bg-orange-600' : 'bg-slate-100'}`} />
                     )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`font-black text-xs uppercase tracking-tight ${i === currentIdx ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    {i === currentIdx && <p className="text-[9px] text-orange-500 font-bold animate-pulse uppercase tracking-widest mt-0.5">Traitement en cours</p>}
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Tracking;
