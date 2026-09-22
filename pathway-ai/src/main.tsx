import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/utilities.css';
import './styles/components.css';
import './styles/landing.css';
import './styles/print.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

/**
 * Clean URLs when served over HTTP. A file:// document has no server to route
 * against, so the single-file build falls back to hash routing — otherwise
 * every link past the landing page would dead-end.
 */
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

createRoot(root).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
