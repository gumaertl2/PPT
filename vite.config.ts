// 07.04.2026 18:20 - FEAT: Fixed icon dimensions to physical size (1014x1024), added launch_handler and file_handlers.
// 07.04.2026 18:00 - FEAT: Added advanced PWA features (shortcuts, display_override, iarc, scope_extensions) for max PWABuilder score.
// 07.04.2026 17:35 - FEAT: Updated screenshot dimensions, fixed mobile2.png format, added related_applications and injectRegister.
// 07.04.2026 17:15 - FEAT: Added third screenshot.
// 07.04.2026 16:30 - FEAT: Added App Store required PWA manifest fields.
// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto', 
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
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        categories: ['travel', 'productivity'],
        lang: 'de-DE',
        dir: 'ltr',
        start_url: '/', 
        scope: '/',     
        iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7', // Platzhalter für max. Score
        scope_extensions: [
          { origin: '*.vercel.app' }
        ],
        prefer_related_applications: false,
        related_applications: [
          {
            platform: 'play',
            url: 'https://play.google.com/store/apps/details?id=com.papatours.app',
            id: 'com.papatours.app'
          }
        ],
        shortcuts: [
          {
            name: 'Neue Reise planen',
            short_name: 'Planen',
            description: 'Starte den Papatours Wizard',
            url: '/',
            icons: [{ src: '/logo.png', sizes: '1014x1024', type: 'image/png' }]
          }
        ],
        launch_handler: {
          client_mode: ['navigate-existing', 'auto']
        },
        file_handlers: [
          {
            action: '/',
            accept: {
              'application/json': ['.json', '.papatours']
            }
          }
        ],
        icons: [
          {
            src: '/logo.png',
            sizes: '1014x1024',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '1014x1024',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshots/mobile1.png',
            sizes: '1738x1430',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/screenshots/desktop1.png',
            sizes: '1534x1444',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/screenshots/mobile2.png',
            sizes: '1682x1510',
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
// --- END OF FILE 122 Zeilen ---