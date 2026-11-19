import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadImported } from './lib/officialStore';

// official questions imported earlier are registered before the first render, so saved sessions resolve
void loadImported().finally(() => createRoot(document.getElementById('root')!).render(<App />));

// the hosted web build (sat/app.html) keeps working offline after the first visit; the single file needs no worker
if (document.documentElement.dataset.web === '1' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const register = () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ }); };
  // the app loads after the page has finished loading, so register now if that moment has passed
  if (document.readyState === 'complete') register(); else window.addEventListener('load', register);
}
