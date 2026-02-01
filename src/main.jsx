import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MessageProvider } from './context/MessageContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MessageProvider>
        <AppSettingsProvider>
          <App />
        </AppSettingsProvider>
      </MessageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
