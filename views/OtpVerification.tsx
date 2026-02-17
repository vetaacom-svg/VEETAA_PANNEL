
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

interface OtpProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const OtpVerification: React.FC<OtpProps> = ({ phone, onVerified, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  useEffect(() => {
    if (otp.every(v => v !== '')) {
      handleVerify();
    }
  }, [otp]);

  const handleVerify = () => {
    setIsLoading(true);
    // Simuler un appel API
    setTimeout(() => {
      setIsLoading(false);
      onVerified();
    }, 1500);
  };

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center animate-in fade-in duration-200">
      <button onClick={onBack} className="absolute top-8 left-8 p-2 bg-slate-100 rounded-full">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="text-center mb-12 space-y-4">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">Vérification</h2>
        <p className="text-slate-500">
          Entrez le code envoyé au <span className="text-slate-900 font-bold">{phone}</span>
        </p>
      </div>

      <div className="flex justify-center gap-4 mb-8">
        {otp.map((digit, i) => (
          <input 
            key={i}
            id={`otp-${i}`}
            type="tel"
            maxLength={1}
            className="w-14 h-16 text-center text-2xl font-bold bg-slate-100 border-2 border-transparent rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all"
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
          />
        ))}
      </div>

      <div className="text-center">
        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Vous n'avez pas reçu de code ?{' '}
            <button className="text-orange-600 font-bold">Renvoyer</button>
          </p>
        )}
      </div>
    </div>
  );
};

export default OtpVerification;
