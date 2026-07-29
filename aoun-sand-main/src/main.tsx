import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    const waitingServiceWorker = registration.waiting;
    if (waitingServiceWorker) {
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
      // Notification is handled in PWAInstallPrompt via 'controllerchange' or similar if implemented, 
      // but here we ensure reload logic or prompt.
      // Actually PWAInstallPrompt listens for updates, checking registration.
      alert('New update available! downloading...');
      window.location.reload();
    }
  },
  onSuccess: () => {
    // Service worker registered successfully (silent in production)
  }
});
