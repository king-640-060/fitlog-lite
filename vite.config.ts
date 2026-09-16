import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repository ? `/${repository}/` : '/'

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'FitLog Lite',
        short_name: 'FitLog',
        description: '本地优先的个人健身日志',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#2563eb',
        background_color: '#f6f8fb',
        icons: [
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
