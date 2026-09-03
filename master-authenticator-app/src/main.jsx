import React from 'react';
import ReactDOM from 'react-dom/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from '../App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SafeAreaProvider style={{ width: '100%', height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <App />
    </SafeAreaProvider>
  </React.StrictMode>
);
