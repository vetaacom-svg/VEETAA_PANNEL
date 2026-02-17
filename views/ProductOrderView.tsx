
import React, { useState } from 'react';
import { Product, CategoryID } from '../types';
import { Camera, FileText, Send, CheckCircle2, X } from 'lucide-react';

// Icône personnalisée Coupe d'Hygie pour la zone d'upload
const HygieiaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M256 0c-44.2 0-80 35.8-80 80 0 16.6 5.1 32 13.8 44.8C117.7 143.7 64 203.6 64 275.6v20.4H0v32h512v-32h-64v-20.4c0-72-53.7-131.9-125.8-150.8 8.7-12.8 13.8-28.2 13.8-44.8 0-44.2-35.8-80-80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0 128c61.9 0 112 50.1 112 112v13.6c-41.5 6.3-84.6 10.4-112 10.4s-70.5-4.1-112-10.4V272c0-61.9 50.1-112 112-112zm0 168c34.8 0 83.2-5.4 128-13.3v7.3c0 88.4-71.6 160-160 160S96 452.4 96 364v-7.3c44.8 7.9 93.2 13.3 128 13.3zm-32 152v32h64v-32H224z"/>
  </svg>
);

interface ProductOrderViewProps {
  product: Product;
  category: CategoryID;
  onConfirm: (product: Product, text: string, image: string | null) => void;
}

const ProductOrderView: React.FC<ProductOrderViewProps> = ({ product, category, onConfirm }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const isPharmacy = category === CategoryID.PHARMACIE;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-bottom-10 duration-200">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-48 h-48 rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-slate-50">
          <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{product.name}</h2>
          <p className="text-orange-600 font-black text-xl">{product.price} DH</p>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">{product.storeName}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <FileText className="w-3 h-3" />
            {isPharmacy ? "Détails de l'ordonnance / Médicaments" : "Instructions spéciales (Cuisson, Note, etc.)"}
          </label>
          <textarea 
            className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none min-h-[140px] font-bold text-sm leading-relaxed shadow-inner"
            placeholder={isPharmacy ? "Listez vos médicaments ici..." : "Ex: Pas d'oignons, bien cuit..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Camera className="w-3 h-3" />
            {isPharmacy ? "Uploader votre Ordonnance" : "Photo de référence (Reçu ou Article)"}
          </label>
          <div className={`p-8 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${image ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
            {image ? (
              <div className="relative w-full h-40">
                <img src={image} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPharmacy ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                   {isPharmacy ? <HygieiaIcon className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
                </div>
                <input type="file" accept="image/*" id="product-img" className="hidden" onChange={handleImageUpload} />
                <label htmlFor="product-img" className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">SÉLECTIONNER PHOTO</label>
              </>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={() => onConfirm(product, text, image)}
        className="w-full bg-orange-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-orange-200 flex items-center justify-center gap-3 hover:bg-orange-700 transition-colors uppercase tracking-tight"
      >
        Valider pour l'achat <Send className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ProductOrderView;
