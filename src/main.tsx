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
    if (
      event.data?.action === 'go_to_jogos' ||
      event.data?.type === 'NOTIFICATION_SAVED_GAMES_CLICKED' ||
      event.data?.type === 'NOTIFICATION_JACKPOT_CLICKED' ||
      event.data?.tab === 'jogos'
    ) {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
    } else if (
      event.data?.type === 'NOTIFICATION_TOP5_TREND_CLICKED' ||
      event.data?.tab === 'estatisticas'
    ) {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'estatisticas' }));
    } else if (event.data?.tab) {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: event.data.tab }));
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
