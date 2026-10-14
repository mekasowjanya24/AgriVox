import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'AgriVox',
        short_name: 'AgriVox',
        description: 'Offline-First Voice-Driven Farm Finance & Market Platform for Farmers',
        theme_color: '#1e4d2f',
        background_color: '#fdfbf7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'agrivox-api-v2',
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [200],
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    if (!response || response.status !== 200) return null;
                    try {
                      const clone = response.clone();
                      const body = await clone.json();
                      if (body && body.data) {
                        if (Array.isArray(body.data.commodities) && body.data.commodities.length === 0) {
                          return null;
                        }
                      }
                      if (body && body.success === false) {
                        return null;
                      }
                    } catch (e) {
                      // Ignore JSON parse errors for non-JSON API responses (e.g. PDF)
                    }
                    return response;
                  },
                },
              ],
            },
          },
        ],
      },
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js'
  }
})
