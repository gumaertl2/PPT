// 17.03.2026 17:45 - HOTFIX: Corrected App import syntax (removed curly braces) and initialized PWA Service Worker.
// 13.02.2026 - Papatours V40
// src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './services/i18n'

// Importiere die Service Worker Registrierung vom PWA Plugin
import { registerSW } from 'virtual:pwa-register'

// Service Worker starten und Update-Logik abfangen
const updateSW = registerSW({
  onNeedRefresh() {
    // Wenn du eine neue Version von Papatours baust und hochlädst, 
    // bekommt der Nutzer automatisch diese Info.
    if (confirm('Ein neues Update für Papatours ist verfügbar. Möchtest du jetzt aktualisieren?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('Papatours ist nun vollständig installiert und offline bereit!')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// --- END OF FILE 33 Zeilen ---