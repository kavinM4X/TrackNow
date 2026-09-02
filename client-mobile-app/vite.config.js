import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'src/mocks/codegenNativeComponent.js'),
      'react-native': path.resolve(__dirname, 'src/mocks/reactNativeOverrides.js')
    }
  },
  server: {
    port: 5178,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://tracknow-backend-api.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
