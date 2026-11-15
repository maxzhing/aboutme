import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadImported } from './lib/officialStore';

// official questions imported earlier are registered before the first render, so saved sessions resolve
void loadImported().finally(() => createRoot(document.getElementById('root')!).render(<App />));
