export const appBuild = __FITLOG_BUILD_SHA__
export const localBuild = __FITLOG_BUILD_DIRTY__

// Never expose URL credentials, quick-launch prompts or query parameters.
export function publicUrl(value: string): string {
  try { const url = new URL(value); return `${url.origin}${url.pathname}` } catch { return '不可用' }
}

export interface WorkerInfo { build: string; clients: number }
export function workerInfo(worker: ServiceWorker | null | undefined): Promise<WorkerInfo | undefined> {
  if (!worker) return Promise.resolve(undefined)
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const finish = (result?: WorkerInfo) => { window.clearTimeout(timeout); channel.port1.close(); resolve(result) }
    const timeout = window.setTimeout(() => finish(), 1200)
    channel.port1.onmessage = event => {
      const value = event.data
      finish(value && /^[a-f0-9]{40}$/.test(value.build) && Number.isInteger(value.clients) && value.clients >= 0
        ? { build: value.build, clients: value.clients } : undefined)
    }
    try { worker.postMessage({ type: 'FITLOG_SW_DIAGNOSTICS' }, [channel.port2]) } catch { finish() }
  })
}

export interface UpdateSafety {
  otherDialog: boolean; workout: boolean; timer: boolean; aiBusy: boolean; aiDraft: boolean; aiProposal: boolean
}
export function updateBlockReason(state: UpdateSafety): string | undefined {
  if (state.otherDialog) return '请先保存或关闭当前表单与图片预览。'
  if (state.workout || state.timer) return '请先完成或退出当前训练。'
  if (state.aiBusy) return '请等待 AI 请求结束。'
  if (state.aiDraft) return 'AI 助手仍有未发送草稿，请先处理草稿。'
  if (state.aiProposal) return 'AI 助手仍有待确认提案，请先确认或取消。'
}
