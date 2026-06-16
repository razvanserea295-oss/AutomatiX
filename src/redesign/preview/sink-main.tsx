import React from 'react';
import ReactDOM from 'react-dom/client';
import KitchenSink from './KitchenSink';
import '../index.css';
import '../theme.css';



document.documentElement.dataset.ui = 'new';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <KitchenSink />
  </React.StrictMode>,
);
