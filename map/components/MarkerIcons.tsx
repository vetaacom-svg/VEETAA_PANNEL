
import L from 'leaflet';

// Utilisation de filtres CSS pour changer les couleurs des icônes standards
export const StoreIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

// Livreur Noir (Libre)
export const DriverIdleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  className: 'filter-black'
});

// Livreur Rouge (En livraison)
export const DriverBusyIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  className: 'filter-red'
});

// Utilisateur Noir (Inactif)
export const UserIdleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  className: 'filter-black'
});

// Utilisateur Vert (Commande en cours)
export const UserActiveIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  className: 'filter-green'
});
