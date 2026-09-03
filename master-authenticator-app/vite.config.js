import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const extensions = [
  '.web.mjs',
  '.mjs',
  '.web.js',
  '.js',
  '.web.jsx',
  '.jsx',
  '.web.ts',
  '.ts',
  '.web.tsx',
  '.tsx',
  '.json'
];

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    __DEV__: JSON.stringify(false),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  resolve: {
    extensions,
    alias: {
      'react-native': 'react-native-web',
      'expo-local-authentication': path.resolve(__dirname, 'src/utils/localAuthWeb.js')
    }
  },
  server: {
    port: 5177,
    host: true
  }
});
