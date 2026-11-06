import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import * as d3 from 'd3';
import './index.css';

// Safeguard against d3-axis m.transition is not a function in tree-shaken bundles
if (d3 && d3.selection && d3.selection.prototype) {
  if (typeof (d3.selection.prototype as any).transition !== 'function') {
    (d3.selection.prototype as any).transition = function () {
      return this;
    };
  }
}

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

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="LotoSniper • Recuperação de Sistema">
    <App />
  </ErrorBoundary>
);
