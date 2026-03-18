// 17.03.2026 17:30 - FEAT: Added vite-plugin-pwa for native app installation and offline caching capabilities.
// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Fragt den Nutzer bei einem Update, ob er die neue Version laden will
      includeAssets: ['logo.png'], // Stelle sicher, dass logo.png im /public Ordner liegt
      manifest: {
        name: 'Papatours Reisebegleiter',
        short_name: 'Papatours',
        description: 'Dein intelligenter Reisebegleiter und Live-Tracker',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Erlaubt die Installation als echte App ohne Browser-Leiste
        orientation: 'portrait',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Was alles offline verfügbar gemacht werden soll
        runtimeCaching: [
          {
            // Google Fonts offline verfügbar machen
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Jahr
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
// --- END OF FILE 50 Zeilen ---