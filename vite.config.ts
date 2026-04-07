// 07.04.2026 17:15 - FEAT: Added third screenshot (mobile2.jpg) to PWA manifest.
// 07.04.2026 16:30 - FEAT: Added App Store required PWA manifest fields (id, orientation, categories, lang, dir, screenshots).
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
        id: '/papatours/',
        name: 'Papatours Reisebegleiter',
        short_name: 'Papatours',
        description: 'Dein intelligenter Reisebegleiter und Live-Tracker',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', 
        orientation: 'portrait-primary',
        categories: ['travel', 'productivity'],
        lang: 'de-DE',
        dir: 'ltr',
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
        ],
        screenshots: [
          {
            src: '/screenshots/mobile1.png',
            sizes: '1170x2532',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/screenshots/desktop1.png',
            sizes: '2560x1440',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/screenshots/mobile2.png',
            sizes: '1170x2532',
            type: 'image/png',
            form_factor: 'narrow'
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
// --- END OF FILE 84 Zeilen ---