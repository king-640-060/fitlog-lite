import { appBuild, localBuild, publicUrl, workerInfo, type WorkerInfo } from '../pwa/diagnostics'
import { PwaRuntime } from '../pwa/runtime'
import '../styles/pwa.css'

interface DiagnosticsUi {
  openModal: (title: string, body: string) => HTMLDialogElement
  esc: (value: unknown) => string
  confirm: () => Promise<boolean>
  blockReason: (dialog: HTMLDialogElement) => string | undefined
  drainWrites: () => Promise<void>
}
export function showPwaDiagnostics(runtime: PwaRuntime, ui: DiagnosticsUi): void {
  const dialog = ui.openModal('版本诊断', '<div class="pwa-diagnostics"><dl id="pwa-details"></dl><p id="pwa-status" role="status"></p><div class="pwa-actions"><button id="pwa-check">检查更新</button><button id="pwa-apply" class="primary" hidden>更新并重新打开</button></div><p class="settings-section-note">更新会重新打开应用。请先保存表单、处理 AI 草稿与待确认提案。无需清除数据或重新安装。</p></div>')
  const details = dialog.querySelector<HTMLElement>('#pwa-details')!
  const status = dialog.querySelector<HTMLElement>('#pwa-status')!
  const check = dialog.querySelector<HTMLButtonElement>('#pwa-check')!
  const apply = dialog.querySelector<HTMLButtonElement>('#pwa-apply')!
  let closed = false, busy = false, revision = 0, deployment: string | undefined
  const workerLabel = (worker: ServiceWorker | null | undefined, info?: WorkerInfo) => worker
    ? `${worker.state} · ${info?.build ?? '无版本应答（旧版或不支持）'}` : '无'
  const draw = async () => {
    const current = ++revision
    const registration = runtime.registration
    const controller = navigator.serviceWorker?.controller
    const [control, active, waiting, installing] = await Promise.all([
      workerInfo(controller), workerInfo(registration?.active), workerInfo(registration?.waiting), workerInfo(registration?.installing),
    ])
    if (closed || current !== revision) return
    const rows = [
      ['App build', appBuild], ['构建类型', localBuild ? '本地未提交构建' : '已提交构建'],
      ['App URL', publicUrl(location.href)], ['预期 scope', publicUrl(new URL(import.meta.env.BASE_URL, location.origin).href)],
      ['SW controller', controller ? 'yes' : 'no'], ['SW controller build / state', workerLabel(controller, control)],
      ['Registration', registration ? '已注册' : '未注册或不支持'], ['SW scope', registration ? publicUrl(registration.scope) : '无'],
      ['Active', workerLabel(registration?.active, active)], ['Waiting', workerLabel(registration?.waiting, waiting)],
      ['Installing', workerLabel(registration?.installing, installing)],
      ['网络发布 build', deployment ?? '尚未检查（与实际 App build 分开）'],
    ]
    details.innerHTML = rows.map(([label, value]) => `<div><dt>${ui.esc(label)}</dt><dd data-diagnostic="${ui.esc(label)}">${ui.esc(value)}</dd></div>`).join('')
    const available = Boolean(waiting || active && active.build !== appBuild)
    apply.hidden = !available
    if (!busy) status.textContent = available ? '新版本已准备好，确认后更新。' : !navigator.onLine ? '当前离线，已缓存的应用仍可使用。' : '当前没有已准备好的更新。'
  }
  const unsubscribe = runtime.subscribe(() => void draw())
  dialog.addEventListener('close', () => { closed = true; revision++; unsubscribe() }, { once: true })
  check.addEventListener('click', async () => {
    if (busy) return
    busy = true; check.disabled = true; status.textContent = '正在检查更新…'
    await runtime.check(true)
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}build-info.json`, { cache: 'no-store', signal: AbortSignal.timeout(5000), credentials: 'omit' })
      const value = await response.json()
      deployment = /^[a-f0-9]{40}$/.test(value.build) ? value.build : '不可用'
    } catch { deployment = '网络不可用' }
    busy = false; check.disabled = false; await draw()
  })
  apply.addEventListener('click', async () => {
    if (busy) return
    const safe = () => closed ? '诊断已关闭，请重新进入后更新。' : ui.blockReason(dialog)
    const reason = safe(); if (reason) { status.textContent = reason; return }
    busy = true; check.disabled = true; apply.disabled = true
    try {
      if (!(await ui.confirm())) { status.textContent = '已取消更新。'; return }
      status.textContent = '正在切换版本…'
      const error = await runtime.apply(safe, ui.drainWrites)
      if (error && !closed) status.textContent = error
    } finally { busy = false; check.disabled = false; apply.disabled = false }
  })
  void draw()
}
