/**
 * src/main.tsx
 *
 * DER MOTOR-START
 * Hier wird React gestartet und in das HTML-Element "root" injiziert.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Tailwind Importe
import './services/i18n'; // WICHTIG: i18n muss VOR der App initialisiert werden

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);