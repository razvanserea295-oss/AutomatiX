// Entry for the marketing/presentation site served at automatix.online.
// Separate Vite entry (landing.html) from the app SPA (index.html) — the server
// host-routes apex/www here and app.* to the SPA. Reuses the redesign token
// system + fonts; the marketing look is always the polished dark "Apple" theme.

import React from 'react';
import ReactDOM from 'react-dom/client';
import '../redesign/index.css';
import '../redesign/theme.css';
import '../redesign/polish-pass.css';
import './landing.css';
import LandingApp from './LandingApp';

document.documentElement.dataset.ui = 'new';
document.documentElement.dataset.theme = 'dark';

ReactDOM.createRoot(document.getElementById('landing-root') as HTMLElement).render(
  <React.StrictMode>
    <LandingApp />
  </React.StrictMode>,
);
