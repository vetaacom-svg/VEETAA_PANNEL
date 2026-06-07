
import L from 'leaflet';

// Utilisation de filtres CSS pour changer les couleurs des icônes standards
export const StoreIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

// Utilisation de divIcon avec SVG personnalisés
export const DriverIdleIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-slate-900 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="18.5" cy="17.5" r="2.5"/>
        <circle cx="5.5" cy="17.5" r="2.5"/>
        <circle cx="15" cy="5" r="1" fill="white"/>
        <path d="M12 17.5V14l-3-3-4 3"/>
        <path d="m8 14 3-3 4-3 3.5 3"/>
        <path d="M5.5 17.5 9.5 11"/>
        <path d="M18.5 17.5 14 9"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white animate-pulse"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

export const DriverBusyIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-red-600 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="18.5" cy="17.5" r="2.5"/>
        <circle cx="5.5" cy="17.5" r="2.5"/>
        <circle cx="15" cy="5" r="1" fill="white"/>
        <path d="M12 17.5V14l-3-3-4 3"/>
        <path d="m8 14 3-3 4-3 3.5 3"/>
        <path d="M5.5 17.5 9.5 11"/>
        <path d="M18.5 17.5 14 9"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full border border-white animate-ping"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

export const UserIdleIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-slate-500 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

export const UserActiveIcon = L.divIcon({
  className: '',
  html: `
    <div class="relative w-9 h-9 rounded-full bg-emerald-600 border-[3px] border-white shadow-xl flex items-center justify-center transition-transform hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white animate-pulse"></span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

