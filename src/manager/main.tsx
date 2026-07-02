// Entry for the standalone manager portal served at /manager (manager.html).
// Self-contained: its own minimal dark theme (portal.css), broker auth, and the
// existing per-tenant commands. Independent of the heavy app SPA.

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../redesign/index.css';
import '../redesign/theme.css';
import '../redesign/polish-pass.css';
import './portal.css';
import ManagerApp from './ManagerApp';

document.documentElement.dataset.ui = 'new';
document.documentElement.dataset.theme = 'dark';

ReactDOM.createRoot(document.getElementById('manager-root') as HTMLElement).render(
  <React.StrictMode>
    <ManagerApp />
  </React.StrictMode>,
);
