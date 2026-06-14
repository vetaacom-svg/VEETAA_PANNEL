
import L from 'leaflet';

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNE MAGASIN
// Carré arrondi gris foncé métallique avec badge blanc et ombre
// ─────────────────────────────────────────────────────────────────────────────
export const StoreMarkerIcon = L.divIcon({
  className: 'veetaa-store-marker',
  html: `
    <div style="
      width: 46px;
      height: 46px;
      background: linear-gradient(145deg, #374151 0%, #1f2937 60%, #111827 100%);
      border-radius: 14px;
      border: 3px solid rgba(255,255,255,0.95);
      box-shadow: 0 6px 20px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <div style="
        position: absolute;
        top: -7px;
        right: -7px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        border: 2px solid #1f2937;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width:6px;height:6px;background:#1f2937;border-radius:50%;"></div>
      </div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 46],
  popupAnchor: [0, -48],
});

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNE CLIENT
// Pin (repère de position) orange avec ombre portée
// ─────────────────────────────────────────────────────────────────────────────
export const ClientMarkerIcon = L.divIcon({
  className: 'veetaa-client-marker',
  html: `
    <div style="position: relative; width: 36px; height: 48px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
        <defs>
          <filter id="client-shadow" x="-30%" y="-10%" width="160%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(249,115,22,0.5)"/>
          </filter>
        </defs>
        <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.059 27.941 0 18 0z"
          fill="url(#client-grad)" filter="url(#client-shadow)" />
        <defs>
          <linearGradient id="client-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fb923c;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ea580c;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="8" fill="white" opacity="0.95"/>
        <circle cx="18" cy="18" r="4" fill="#f97316"/>
      </svg>
    </div>
  `,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -50],
});

// ─────────────────────────────────────────────────────────────────────────────
// ICÔNE LIVREUR (Driver)
// Cercle bleu avec dégradé, bordure blanche, ombre et effet pulsation CSS
// Contient un mini-SVG blanc de scooter avec boîte à l'arrière
// ─────────────────────────────────────────────────────────────────────────────
export const DriverDeliveryIcon = L.divIcon({
  className: 'veetaa-driver-marker',
  html: `
    <style>
      @keyframes veetaa-pulse-ring {
        0%   { transform: scale(0.85); opacity: 0.9; }
        50%  { transform: scale(1.25); opacity: 0.3; }
        100% { transform: scale(0.85); opacity: 0.9; }
      }
      @keyframes veetaa-pulse-dot {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.08); }
      }
      .veetaa-pulse-ring {
        animation: veetaa-pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .veetaa-pulse-dot {
        animation: veetaa-pulse-dot 1.8s ease-in-out infinite;
      }
    </style>
    <div style="position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center;">
      <!-- Anneau pulsant (halo) -->
      <div class="veetaa-pulse-ring" style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(59,130,246,0.35);
        border: 2.5px solid rgba(59,130,246,0.6);
      "></div>
      <!-- Corps du marqueur (cercle bleu dégradé) -->
      <div class="veetaa-pulse-dot" style="
        position: relative;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(145deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%);
        border: 3px solid white;
        box-shadow: 0 4px 18px rgba(37,99,235,0.6), 0 2px 6px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">
        <!-- Mini-SVG Scooter / Moto de livraison avec boîte -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="20" viewBox="0 0 48 40" fill="none">
          <!-- Corps du scooter -->
          <path d="M10 26c0 3.314 2.686 6 6 6s6-2.686 6-6-2.686-6-6-6-6 2.686-6 6z" fill="white" opacity="0.9"/>
          <path d="M26 26c0 3.314 2.686 6 6 6s6-2.686 6-6-2.686-6-6-6-6 2.686-6 6z" fill="white" opacity="0.9"/>
          <!-- Roues intérieures -->
          <circle cx="16" cy="26" r="3" fill="#3b82f6"/>
          <circle cx="32" cy="26" r="3" fill="#3b82f6"/>
          <!-- Carrosserie / cadre -->
          <path d="M16 26 L20 16 L28 14 L32 26" stroke="white" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
          <!-- Guidon / tête -->
          <path d="M28 14 L33 10 L36 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <!-- Boîte de livraison à l'arrière -->
          <rect x="7" y="16" width="11" height="9" rx="2" fill="white" opacity="0.95"/>
          <rect x="8.5" y="17.5" width="8" height="6" rx="1.5" fill="#3b82f6"/>
          <!-- Croix sur la boîte -->
          <path d="M12.5 19.5 v3 M11 21 h3" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  popupAnchor: [0, -30],
});

// ─────────────────────────────────────────────────────────────────────────────
// Exports de compatibilité (conservés pour ne pas casser les imports existants)
// ─────────────────────────────────────────────────────────────────────────────
export const StoreIcon = StoreMarkerIcon;

export const DriverIdleIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-slate-900 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/>
        <circle cx="15" cy="5" r="1" fill="white"/>
        <path d="M12 17.5V14l-3-3-4 3"/><path d="m8 14 3-3 4-3 3.5 3"/>
        <path d="M5.5 17.5 9.5 11"/><path d="M18.5 17.5 14 9"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white animate-pulse"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

export const DriverBusyIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-red-600 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/>
        <circle cx="15" cy="5" r="1" fill="white"/>
        <path d="M12 17.5V14l-3-3-4 3"/><path d="m8 14 3-3 4-3 3.5 3"/>
        <path d="M5.5 17.5 9.5 11"/><path d="M18.5 17.5 14 9"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full border border-white animate-ping"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

export const UserIdleIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-slate-500 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

export const UserActiveIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-emerald-600 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white animate-pulse"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});
