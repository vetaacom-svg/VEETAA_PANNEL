
import L from 'leaflet';

// Utilisation de filtres CSS pour changer les couleurs des icônes standards
export const StoreIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// Livreur Noir (Libre)
export const DriverIdleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: 'filter-black'
});

// Livreur Rouge (En livraison)
export const DriverBusyIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: 'filter-red'
});

// Utilisateur Noir (Inactif)
export const UserIdleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  className: 'filter-black'
});

// Utilisateur Vert (Commande en cours)
export const UserActiveIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  className: 'filter-green'
});
