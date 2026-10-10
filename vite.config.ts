import { execFileSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repository ? `/${repository}/` : '/'
const build = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!/^[a-f0-9]{40}$/.test(build)) throw new Error('Missing Git build identity')
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim())
const workerIdentity = `sw-build-${build}.js`
const buildIdentity: Plugin = {
  name: 'fitlog-build-identity',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'fitlog-build', content: build }, injectTo: 'head' }],
  generateBundle(_options, bundle) {
    this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ build, local: dirty, base, assets: Object.keys(bundle).filter(name => /^assets\/.*\.(js|css)$/.test(name)) }) })
    this.emitFile({ type: 'asset', fileName: workerIdentity, source: `self.addEventListener('message', event => {
      if (event.data?.type !== 'FITLOG_SW_DIAGNOSTICS' || !event.ports?.[0]) return;
      event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
        event.ports[0].postMessage({build:${JSON.stringify(build)},clients:clients.filter(client => client.url.startsWith(self.registration.scope)).length});
      }));
    });` })
  },
}

export default defineConfig({
  base,
  define: { __FITLOG_BUILD_SHA__: JSON.stringify(build), __FITLOG_BUILD_DIRTY__: JSON.stringify(dirty) },
  plugins: [
    buildIdentity,
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'FitLog Lite',
        short_name: 'FitLog Lite',
        description: '本地优先的个人健身日志',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#f5f2eb',
        background_color: '#f5f2eb',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        importScripts: [workerIdentity],
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
