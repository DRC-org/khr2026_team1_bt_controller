import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import basicSSL from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/khr2026_team1_bt_controller/',
  plugins: [
    react(),
    tailwindcss(),
    // localhost からのアクセスは HTTP で BLE も動作するため、dev のみ HTTPS を有効化
    ...(mode === 'development' ? [basicSSL()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
}));
