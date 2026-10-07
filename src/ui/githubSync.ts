import type { ManagedSurfaceContext } from './managementWorkspace'
import { connectDefaultGitHubSync, githubSyncSetupHtml } from './githubSyncSetup'
import { GitHubSyncError } from '../services/githubSyncService'
import { GitHubManualSync, type SyncInspection } from '../services/githubManualSync'
import { exportBackup } from '../services/backupService'
interface SyncUI {
  surface?: ManagedSurfaceContext
 openModal: (title: string, html: string) => HTMLDialogElement; esc: (value: string) => string; toast: (message: string) => void; restored: () => Promise<void> }
let session: GitHubManualSync | undefined
let activeRequestSignal: AbortSignal | undefined, requestRunning = false
// Keep the existing app-memory password session; only the current UI job owns cancellation.
const service = () => session ??= new GitHubManualSync(localStorage, undefined, (input, init) => fetch(input, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), ...(activeRequestSignal ? [activeRequestSignal] : [])]) }))
export function githubSyncDetail(): string {
  try { const sync = service(); return sync.config ? sync.state.lastSyncedAt ? `上次同步：${new Date(sync.state.lastSyncedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '已连接 · 尚未同步' : '手动备份到私人 GitHub 仓库' } catch { return '手动备份到私人 GitHub 仓库' }
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => session?.lock())
export function showGitHubSync(ui: SyncUI): void {
  const requests = new AbortController()
  const sync = service(), esc = ui.esc, dialog = ui.openModal('GitHub 同步', '<div class="github-sync" id="github-sync-body"></div>'), root = dialog.querySelector<HTMLElement>('#github-sync-body')!
  let busy = false
  const connected = () => root.isConnected && dialog.open && !closed
  let closed = false
  if (ui.surface) ui.surface.onDispose(() => { closed = true; requests.abort() })
  else dialog.addEventListener('close', () => { closed = true; requests.abort() }, { once: true })
  const bind = (id: string, callback: () => unknown) => root.querySelector(`#${id}`)?.addEventListener('click', callback)
  const screen = (html: string) => { if (!connected()) return; if (ui.surface && root.childElementCount) { const title = /<h3>([^<]+)<\/h3>/.exec(html)?.[1]; if (title) ui.surface.subview(title, root) } root.innerHTML = `${html}<p class="sync-status" id="sync-message" role="status"></p>`; dialog.querySelector('.modal-body')!.scrollTop = 0 }
  const message = (text: string) => { if (!connected()) return; const node = root.querySelector('#sync-message'); if (node) node.textContent = text }
  const run = async (callback: () => Promise<void>) => {
    if (!connected() || busy) return
    if (requestRunning) { message('同步正在进行，请稍候'); return }
    const job = new AbortController()
    ui.surface?.onDispose(() => job.abort()); ui.surface?.onSuspend(() => job.abort())
    busy = true; requestRunning = true; activeRequestSignal = AbortSignal.any([requests.signal, job.signal])
    root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true }); message('正在处理，请稍候…')
    try { await callback() } catch (error) { if (job.signal.aborted || requests.signal.aborted) return; message(error instanceof Error ? error.message : '操作未完成，请重试。'); if (error instanceof GitHubSyncError && error.code === 'conflict' && connected()) { const retry = document.createElement('button'); retry.className = 'secondary full-btn'; retry.textContent = '重新检查同步状态'; retry.addEventListener('click', () => void begin(true)); root.append(retry) } }
    finally { busy = false; requestRunning = false; activeRequestSignal = undefined; if (connected()) root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false }) }
  }
  const passwordFields = (create: boolean) => `<label>数据密码<input type="password" name="password" autocomplete="${create ? 'new-password' : 'current-password'}" required ${create ? 'minlength="12"' : ''}></label>${create ? '<label>确认数据密码<input type="password" name="confirmation" autocomplete="new-password" minlength="12" required></label>' : ''}`
  const status = (note = '尚未检查本机与 GitHub 的变化') => {
    if (!connected()) return
    ui.surface?.returnTo('GitHub 同步')
    const config = sync.config!
    screen(`<p class="sync-note">FitLog 会先在这台设备加密完整备份，再上传到你的私人 GitHub 仓库。</p><dl class="sync-details"><div><dt>状态</dt><dd>已连接</dd></div><div><dt>仓库</dt><dd>${esc(config.owner)} / ${esc(config.repo)}</dd></div><div><dt>同步文件</dt><dd>fitlog/latest.enc.json</dd></div><div><dt>上次同步</dt><dd>${sync.state.lastSyncedAt ? esc(new Date(sync.state.lastSyncedAt!).toLocaleString('zh-CN')) : '尚未同步'}</dd></div><div><dt>本机状态</dt><dd>${esc(note)}</dd></div></dl><button class="primary full-btn" id="sync-now">立即同步</button><button class="secondary full-btn" id="sync-check">从 GitHub 检查/恢复</button><p class="sync-note">GitHub Token 只保存在这台设备。数据密码不会保存；换设备恢复时需要再次输入。</p><button class="text-btn" id="sync-disconnect">断开 GitHub</button>`)
    bind('sync-now', () => void begin(false)); bind('sync-check', () => void begin(true)); bind('sync-disconnect', () => {
      screen('<h3>断开此设备的连接？</h3><p class="sync-note">断开只会移除此设备的连接，不会删除 FitLog 数据或 GitHub 备份。</p><button class="danger-button full-btn" id="sync-confirm-disconnect">断开 GitHub</button><button class="secondary full-btn" id="sync-cancel">取消</button>')
      bind('sync-cancel', () => status()); bind('sync-confirm-disconnect', () => { sync.disconnect(); setup() })
    })
  }
  const exportLocal = async () => {
    const backup = await exportBackup(), url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })), link = document.createElement('a')
    link.href = url; link.download = `fitlog-before-github-restore-${Date.now()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); ui.toast('本机备份已导出')
  }
  const preview = (i: SyncInspection) => {
    const labels: Record<string, string> = { dietEvents: '特殊饮食', foods: '食物', foodLogs: '饮食记录', exercises: '动作', workouts: '力量训练', weights: '体重', workoutTemplates: '训练模板', dietTemplates: '饮食模板', nutritionTargets: '营养目标', pelvicFloorSessions: '凯格尔训练', cardioSessions: '有氧训练', habits: '习惯', habitCheckIns: '习惯打卡', tasks: '任务', taskTags: '标签', nutritionStrategyTemplates: '营养模板', nutritionStrategyVariants: '营养日方案', nutritionStrategyPhases: '营养阶段' }
    screen(`<h3>恢复 GitHub 数据到这台设备</h3><p class="sync-note">远程备份时间：${esc(new Date(i.remoteBackup!.exportedAt).toLocaleString('zh-CN'))}</p><div class="restore-counts">${Object.entries(i.remoteBackup!.data).map(([key, rows]) => `<p><span>${labels[key]}</span><strong>${rows.length}</strong></p>`).join('')}</div><p class="sync-note">恢复后，这台设备当前的 FitLog 数据会被 GitHub 备份替换。</p>${i.meaningfulLocalData ? '<button class="secondary full-btn" id="sync-export-local">先导出本机备份</button>' : ''}<button class="danger-button full-btn" id="sync-confirm-restore">确认恢复并替换本机数据</button><button class="secondary full-btn" id="sync-cancel">取消</button>`)
    bind('sync-export-local', () => void run(exportLocal)); bind('sync-cancel', () => status()); bind('sync-confirm-restore', () => void run(async () => { await sync.restore(i); dialog.close(); ui.toast('GitHub 数据已恢复'); await ui.restored() }))
  }
  const replaceRemote = (i: SyncInspection, password?: string) => {
    screen('<h3>用本机数据替换 GitHub 同步点？</h3><p class="sync-note">这会让 GitHub 最新同步文件改为当前设备的数据。GitHub commit 历史仍可能保留旧版本，但 FitLog 当前同步点会被替换。</p><button class="danger-button full-btn" id="sync-confirm-upload">确认保留本机并上传</button><button class="secondary full-btn" id="sync-cancel">取消</button>')
    bind('sync-cancel', () => status()); bind('sync-confirm-upload', () => void run(async () => { await sync.upload(i, password, true); status('已是最新'); ui.toast('加密备份已上传') }))
  }
  const handle = async (i: SyncInspection, password: string | undefined, checkOnly: boolean) => {
    if (!connected()) return
    if (i.action === 'adopt-baseline') { await sync.acceptSameData(i); status('已是最新'); return }
    if (i.action === 'current') { status('已是最新'); return }
    if (i.action === 'upload' && !checkOnly) { await sync.upload(i, password); status('已是最新'); ui.toast('加密备份已上传'); return }
    if (i.action === 'first-upload') {
      screen('<h3>创建第一份加密备份</h3><p class="sync-note">GitHub 尚无同步文件。将上传这台设备的完整数据。</p><button class="primary full-btn" id="sync-first-upload">加密并上传</button><button class="secondary full-btn" id="sync-cancel">取消</button>')
      bind('sync-first-upload', () => void run(async () => { await sync.upload(i, password); status('已是最新'); ui.toast('加密备份已上传') })); bind('sync-cancel', () => status()); return
    }
    if (i.action === 'remote-missing') {
      screen('<h3>GitHub 上的同步文件已不存在</h3><p class="sync-note">远程文件可能被删除。重新上传需要确认。</p><button class="secondary full-btn" id="sync-recreate">重新上传本机数据</button><button class="secondary full-btn" id="sync-cancel">取消</button>')
      bind('sync-recreate', () => replaceRemote(i, password)); bind('sync-cancel', () => status()); return
    }
    const fresh = i.action === 'unpaired-restore', conflict = i.action === 'conflict' || i.action === 'unpaired-conflict'
    const title = fresh ? '发现 GitHub 备份' : i.action === 'unpaired-conflict' ? '这台设备和 GitHub 都已有数据' : conflict ? '检测到数据冲突' : i.action === 'upload' ? '本机有新的修改' : 'GitHub 上有新数据'
    screen(`<h3>${title}</h3><p class="sync-note">${conflict ? '这台设备和 GitHub 的数据不同。第一版不自动合并，请选择要保留的完整数据。' : fresh ? '这台设备尚未配对，建议恢复已有备份。' : i.action === 'upload' ? '可以上传本机修改，也可以选择恢复远程备份。' : '其它设备可能已更新备份。恢复前会显示数据预览。'}</p><button class="primary full-btn" id="sync-use-remote">${fresh ? '恢复到这台设备' : '使用 GitHub 数据'}</button>${fresh ? '' : '<button class="secondary full-btn" id="sync-use-local">保留本机并上传</button>'}<button class="secondary full-btn" id="sync-cancel">取消</button>`)
    bind('sync-use-remote', () => preview(i)); bind('sync-use-local', () => replaceRemote(i, password)); bind('sync-cancel', () => status())
  }
  const prepare = async (checkOnly: boolean) => {
    if (!connected()) return
    const remote = await sync.checkRemote()
    if (!connected()) return
    if (sync.unlocked && remote) { await handle(await sync.inspect(), undefined, checkOnly); return }
    const create = !remote
    screen(`<h3>${create ? '创建第一份加密备份' : '发现已有 GitHub 备份'}</h3><p class="sync-note">${create ? '密码至少 12 个字符。' : ''}这是 FitLog 数据加密密码，不是 GitHub 密码。FitLog 不保存它；以后换设备恢复时仍需要这个密码。忘记后无法解密远程备份。</p><form class="form" id="sync-password-form">${passwordFields(create)}<button class="primary" type="submit">${create ? '继续' : '解锁并检查'}</button></form><button class="secondary full-btn" id="sync-cancel">取消</button>`)
    bind('sync-cancel', () => status()); root.querySelector<HTMLFormElement>('#sync-password-form')!.addEventListener('submit', event => {
      event.preventDefault(); if (busy) return
      const form = event.currentTarget as HTMLFormElement, password = (form.elements.namedItem('password') as HTMLInputElement).value, confirmation = (form.elements.namedItem('confirmation') as HTMLInputElement | null)?.value
      if (create && (password.length < 12 || password !== confirmation)) { message('密码至少 12 个字符，且两次输入必须一致'); return }
      void run(async () => { const inspection = await sync.inspect(password); await handle(inspection, password, checkOnly) })
    })
  }
  const begin = (checkOnly: boolean) => run(() => prepare(checkOnly))
  const setup = () => {
    if (!connected()) return
    ui.surface?.returnTo('GitHub 同步')
    screen(githubSyncSetupHtml())
    root.querySelector<HTMLFormElement>('#sync-connect-form')!.addEventListener('submit', event => {
      event.preventDefault()
      const form = new FormData(event.currentTarget as HTMLFormElement)
      void run(async () => {
        await connectDefaultGitHubSync(sync, String(form.get('token')))
        if (!connected()) return
        // Continue the explicit setup action in the same sheet, without nesting run().
        await prepare(false)
      })
    })
  }
  if (sync.config) status(); else setup()
}
