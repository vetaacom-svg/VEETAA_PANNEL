import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Recharts importe `react-is` : doit être installé et pré-bundlé pour éviter l’erreur de résolution Vite
      optimizeDeps: {
        include: ['react-is'],
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('jspdf')) return 'jspdf';
              if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
              if (id.includes('lucide-react')) return 'lucide';
              if (id.includes('html2canvas')) return 'html2canvas';
              return 'vendor';
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
