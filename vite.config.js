import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Charutos & Harmonização',
        short_name: 'Harmonia',
        description: 'Umidor, adega e harmonização de charutos com bebidas',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1c1410',
        theme_color: '#1c1410',
        lang: 'pt-BR',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
        // leitor de texto (~7 MB) fica fora do precache: é baixado na primeira foto e guardado para uso offline
        globIgnores: ['ocr/**'],
        runtimeCaching: [{
          urlPattern: /\/ocr\//,
          handler: 'CacheFirst',
          options: { cacheName: 'ocr', expiration: { maxEntries: 20 }, cacheableResponse: { statuses: [0, 200] } }
        }]
      }
    })
  ]
})
