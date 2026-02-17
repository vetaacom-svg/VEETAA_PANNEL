
import React, { useState, useEffect, useCallback } from 'react';
import { CartItem, Store, Order, CategoryID, UserProfile, RIB } from '../types';
import { MapPin, User, Banknote, Landmark, CheckCircle, Camera, X, AlertCircle, Navigation } from 'lucide-react';
import { supabase, dataUrlToBlob } from '../lib/supabase';

interface CheckoutProps {
  user: UserProfile | null;
  cart: CartItem[];
  textOrder: string;
  prescriptionImage: string | null;
  total: number;
  selectedStore: Store | null;
  selectedCategory: CategoryID;
  ribs: RIB[];
  onPlaceOrder: (order: Order) => void;
}

const Checkout: React.FC<CheckoutProps> = ({
  user, cart, total, textOrder, prescriptionImage, selectedStore, selectedCategory, ribs, onPlaceOrder
}) => {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'rib' | 'receipt'>('method');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedRib, setSelectedRib] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError("La géolocalisation n'est pas supportée.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocError("Permission refusée.");
      }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const handleConfirm = async () => {
    if (!user || !location) return;
    if (method === 'transfer' && !receiptImage) {
      alert("Veuillez uploader votre reçu bancaire.");
      return;
    }

    setIsUploading(true);
    const simpleId = Math.floor(10000 + Math.random() * 90000).toString();

    let remoteReceiptUrl = undefined;
    let remotePrescriptionUrl = undefined;

    try {
      // 1. Upload du reçu si nécessaire
      if (receiptImage) {
        const blob = await dataUrlToBlob(receiptImage);
        const fileName = `receipt_${simpleId}.png`;
        const { data } = await supabase.storage.from('receipts').upload(fileName, blob);
        if (data) {
          remoteReceiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
        }
      }

      // 2. Upload de l'ordonnance si présente
      if (prescriptionImage) {
        const blob = await dataUrlToBlob(prescriptionImage);
        const fileName = `presc_${simpleId}.png`;
        const { data } = await supabase.storage.from('prescriptions').upload(fileName, blob);
        if (data) {
          remotePrescriptionUrl = supabase.storage.from('prescriptions').getPublicUrl(fileName).data.publicUrl;
        }
      }

      const order: Order = {
        id: simpleId,
        customerName: user.fullName,
        phone: user.phone,
        location,
        items: cart,
        textOrder: textOrder || undefined,
        prescriptionImage: remotePrescriptionUrl,
        paymentReceiptImage: remoteReceiptUrl,
        total,
        status: 'pending',
        paymentMethod: method,
        rib: selectedRib || undefined,
        timestamp: Date.now(),
        category: selectedCategory,
        storeName: selectedStore?.name
      };

      onPlaceOrder(order);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi des images. Réessayez.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-40">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Finaliser</h2>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
          <User className="w-4 h-4 text-orange-600" />
          <p className="text-sm font-bold text-slate-700">{user?.fullName} • {user?.phone}</p>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Adresse</h3>
        <div className={`p-4 rounded-3xl border flex items-center gap-4 ${location ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50'}`}>
          <MapPin className={`w-6 h-6 ${location ? 'text-emerald-500' : 'text-red-500'}`} />
          <div className="flex-1">
            <p className="text-sm font-black">{location ? 'Position GPS capturée' : 'Position requise'}</p>
            <p className="text-[10px] opacity-70">{locError || "Précision nécessaire pour le livreur."}</p>
          </div>
          {!location && (
            <button onClick={requestLocation} disabled={isLocating} className="bg-red-600 text-white text-[9px] font-black px-3 py-2 rounded-xl">
              {isLocating ? "..." : <Navigation className="w-3 h-3" />}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Paiement</h3>
        {paymentStep === 'method' && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMethod('cash')} className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 ${method === 'cash' ? 'border-orange-500 bg-orange-50' : 'opacity-60'}`}>
              <Banknote className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-bold">Cash</span>
            </button>
            <button onClick={() => { setMethod('transfer'); setPaymentStep('rib'); }} className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-3 ${method === 'transfer' ? 'border-orange-500' : 'opacity-60'}`}>
              <Landmark className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-bold">Virement</span>
            </button>
          </div>
        )}

        {paymentStep === 'rib' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><p className="text-xs font-bold text-slate-400">BANQUE</p><button onClick={() => setPaymentStep('method')} className="text-orange-600 text-xs font-bold">Retour</button></div>
            {(ribs || []).map((item, idx) => (
              <button key={idx} onClick={() => { setSelectedRib(item.rib); setPaymentStep('receipt'); }} className="w-full p-4 rounded-2xl border-2 border-slate-100 text-left">
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-sm font-mono">{item.rib}</p>
              </button>
            ))}
          </div>
        )}

        {paymentStep === 'receipt' && (
          <div className="space-y-4">
            <div className="flex justify-between"><p className="text-xs font-bold uppercase">Preuve obligatoire</p><button onClick={() => setPaymentStep('rib')} className="text-orange-600 text-xs font-bold">Retour</button></div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-800 font-bold">L'upload du reçu est obligatoire pour le virement.</p>
            </div>
            <div className="p-8 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 bg-slate-50">
              {receiptImage ? (
                <div className="relative w-full h-40">
                  <img src={receiptImage} className="w-full h-full object-cover rounded-2xl" alt="Reçu" />
                  <button onClick={() => setReceiptImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-slate-400" />
                  <input type="file" accept="image/*" id="receipt" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setReceiptImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <label htmlFor="receipt" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase">Sélectionner Reçu</label>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="bg-slate-900 text-white p-6 rounded-[2.5rem] space-y-4 shadow-2xl">
        <div className="flex justify-between items-center"><span className="text-xl font-bold">Total</span><span className="text-3xl font-black text-orange-500">{total + 15} DH</span></div>
        <button
          onClick={handleConfirm}
          disabled={!location || (method === 'transfer' && !receiptImage) || isUploading}
          className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-lg disabled:opacity-30 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
        >
          {isUploading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : 'Confirmer'}
        </button>
      </section>
    </div>
  );
};

export default Checkout;
