import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline functionality and background notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('LotoSniper ServiceWorker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.warn('Falha ao registrar ServiceWorker:', error);
      });
  });

  // Handle messages dispatched by ServiceWorker (e.g. notification click)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'go_to_jogos') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
