/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// BASE lets the app live under a sub-path, e.g. https://<user>.github.io/<repo>/
const base = process.env.BASE ?? '/';

// Which version this is, shown in "À propos" so that it can be told apart from an older cached one.
const build = { sha: (process.env.GITHUB_SHA ?? 'dev').slice(0, 7), date: new Date().toISOString().slice(0, 10) };

export default defineConfig({
  base,
  define: { __BUILD__: JSON.stringify(build) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Sakina — Prière, Coran, Qibla',
        short_name: 'Sakina',
        description:
          'Horaires de prière, qibla, Coran, adhkar et tasbih. Gratuit, sans publicité, sans pistage, utilisable hors-ligne.',
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f2a24',
        theme_color: '#0f2a24',
        categories: ['lifestyle', 'education', 'books'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Horaires de prière', url: `${base}#/prieres` },
          { name: 'Coran', url: `${base}#/coran` },
          { name: 'Qibla', url: `${base}#/qibla` },
          { name: 'Tasbih', url: `${base}#/tasbih` },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Quran text and the city list are cached on first use (or all at once
        // from Settings → "Télécharger le Coran") rather than at install time.
        globIgnores: ['data/**'],
        importScripts: ['sw-notifications.js'],
        navigateFallback: 'index.html',
        // Audio from everyayah.com is left to the browser: serving cached opaque
        // responses to <audio> range requests breaks playback in some browsers.
        runtimeCaching: [
          {
            // Story narration: a file's name changes with its content, so a cached copy
            // never goes stale. The player fetches each file whole once to cache it;
            // <audio> range requests are then answered from that copy.
            urlPattern: ({ url }) => url.pathname.includes('/data/narration/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sakina-narration',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 150, purgeOnQuotaError: true },
            },
          },
          {
            // Painted pictures of the stories: each file is final, so a cached copy never goes stale.
            urlPattern: ({ url }) => url.pathname.includes('/data/paintings/') && url.pathname.endsWith('.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sakina-paintings',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 600, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            // Instant from cache, refreshed in the background if the data changed.
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'sakina-data', expiration: { maxEntries: 1000 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
