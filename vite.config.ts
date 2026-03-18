// 17.03.2026 18:00 - FIX: Added start_url and scope to PWA manifest to force Apple Safari into true standalone mode (hiding the URL bar).
// 17.03.2026 17:30 - FEAT: Added vite-plugin-pwa.
// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', 
      includeAssets: ['logo.png'], 
      manifest: {
        name: 'Papatours Reisebegleiter',
        short_name: 'Papatours',
        description: 'Dein intelligenter Reisebegleiter und Live-Tracker',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        start_url: '/', // WICHTIG: Zwingt Apple Safari in den echten App-Modus
        scope: '/',     // WICHTIG: Definiert das geschlossene "Revier" der App
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], 
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
// --- END OF FILE 52 Zeilen ---