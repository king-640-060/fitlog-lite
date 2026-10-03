import { appBuild, workerInfo } from './diagnostics'

export class PwaRuntime {
  registration?: ServiceWorkerRegistration
  private listeners = new Set<() => void>()
  private lastCheck = 0
  private checking?: Promise<void>
  private applying = false
  private reloadIssued = false
  private ready: Promise<void>

  constructor() {
    this.ready = this.register()
    window.addEventListener('online', () => void this.check())
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void this.check() })
    navigator.serviceWorker?.addEventListener('controllerchange', () => this.emit())
  }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private emit(): void { for (const listener of this.listeners) listener() }
  private watch(registration: ServiceWorkerRegistration): void {
    if (this.registration === registration) return
    this.registration = registration
    const changed = () => {
      registration.installing?.addEventListener('statechange', () => this.emit())
      this.emit()
    }
    registration.addEventListener('updatefound', changed); changed()
  }
  private async register(): Promise<void> {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
    try {
      const scope = new URL(import.meta.env.BASE_URL, location.origin).href
      const existing = await navigator.serviceWorker.getRegistration(scope)
      if (existing?.scope === scope) this.watch(existing)
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL, updateViaCache: 'none',
      })
      this.watch(registration)
      this.lastCheck = Date.now()
    } catch { this.emit() } // Diagnostic UI reports absence; never expose transport errors.
  }
  async check(force = false): Promise<void> {
    await this.ready
    if (this.checking) return this.checking
    if (!this.registration || !navigator.onLine || (!force && Date.now() - this.lastCheck < 300_000)) return
    this.lastCheck = Date.now()
    this.checking = this.registration.update().then(() => undefined, () => undefined).finally(() => { this.checking = undefined; this.emit() })
    try { await this.checking } catch { /* Offline/transport errors are not provider diagnostics. */ }
  }
  async candidate(): Promise<{ worker: ServiceWorker; build: string; clients: number } | undefined> {
    await this.ready
    const worker = this.registration?.waiting ?? this.registration?.active
    const info = await workerInfo(worker)
    if (worker && info && (this.registration?.waiting || info.build !== appBuild)) return { worker, ...info }
  }
  // Called only after an explicit confirmation. Controller changes by themselves never reload.
  async apply(safe: () => string | undefined, drainWrites: () => Promise<void>): Promise<string | undefined> {
    if (this.applying || this.reloadIssued) return '更新正在进行。'
    this.applying = true
    try {
      let reason = safe(); if (reason) return reason
      await drainWrites()
      reason = safe(); if (reason) return reason
      const candidate = await this.candidate()
      if (!candidate) return '尚未准备好新版本，请稍后检查更新。'
      if (candidate.clients > 1) return '请先保存并关闭其他 FitLog 页面，再确认更新。'
      reason = safe(); if (reason) return reason
      if (candidate.worker.state === 'installed') candidate.worker.postMessage({ type: 'SKIP_WAITING' })
      const deadline = Date.now() + 15_000
      while (Date.now() < deadline) {
        const controller = navigator.serviceWorker.controller
        const info = await workerInfo(controller)
        if (controller?.state === 'activated' && info?.build === candidate.build) {
          reason = safe(); if (reason) return reason
          this.reloadIssued = true
          window.location.reload()
          return
        }
        await new Promise(resolve => window.setTimeout(resolve, 150))
      }
      return '更新尚未完成。请保留已保存的数据，稍后重新打开应用。'
    } catch { return '暂时无法切换版本，请稍后检查更新。' }
    finally { this.applying = false }
  }
}
