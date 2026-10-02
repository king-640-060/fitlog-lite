import { setSheetVariant } from './sheetController'
import { AiOrchestrator, AI_CHAT_ONLY_MESSAGE } from '../ai/orchestrator'
import { AI_LIMITS } from '../ai/security'
import { showAiSettings, AI_PRIVACY_TEXT, type AiSettingsUi } from './aiSettings'
import { aiProposalPreviewLines, aiProposalStatusLabels, aiSuggestionPrompts, aiUsageText, shouldSendAiShortcut } from './aiUiHelpers'
import { icon } from './icons'
import { SpeechRecognitionService, SPEECH_UNSUPPORTED, VOICE_PRIVACY_KEY, VOICE_PRIVACY_TEXT } from '../services/speechRecognitionService'

export interface AiAssistantUi extends AiSettingsUi { beforeOpen?: () => Promise<void>; openFoodLibrary?: () => void; openFoodVision?: () => void }
export interface AiAssistantLaunchOptions { voice?: boolean; initialText?: string; autoSend?: boolean }
export interface AiAssistantHandle { dialog: HTMLDialogElement; applyLaunch: (options: AiAssistantLaunchOptions) => void }
const drafts = new WeakMap<AiOrchestrator, string>()
export function showAiAssistant(engine: AiOrchestrator, ui: AiAssistantUi, options: AiAssistantLaunchOptions = {}): AiAssistantHandle {
  const dialog = ui.openModal('AI 助手', '<div class="ai-assistant"></div>', true)
  dialog.classList.add('ai-assistant-sheet'); setSheetVariant(dialog, 'assistant')
  const host = dialog.querySelector<HTMLElement>('.ai-assistant')!
  const head = dialog.querySelector<HTMLElement>('.modal-head')!
  head.querySelector('h2')!.insertAdjacentHTML('afterend', `<div class="ai-header-actions"><button class="icon-btn quiet" id="ai-assistant-settings" aria-label="AI 设置">${icon('settings', 19)}</button><button class="icon-btn quiet" id="ai-clear-chat" aria-label="清空对话">${icon('trash', 17)}</button></div>`)
  host.innerHTML = `<div class="ai-current-profile"></div><div class="ai-capability-notice" hidden><strong>FitLog 数据读取尚未验证</strong><span>当前只能普通聊天</span><button class="text-btn" id="ai-notice-settings">打开设置</button></div><div class="ai-conversation" role="log" aria-label="AI 对话" aria-live="off" aria-atomic="false"></div><div class="ai-session-usage"></div><span class="sr-only ai-completion-status" role="status" aria-live="polite" aria-atomic="true"></span><section class="ai-voice-panel" hidden><p class="ai-note ai-voice-disclosure" hidden></p><div class="ai-voice-row"><span class="ai-voice-status" role="status" aria-live="polite"></span><button class="text-btn" id="ai-voice-start" type="button" hidden>开始说话</button></div></section><form class="ai-composer">${ui.openFoodVision ? `<button class="secondary ai-camera" id="ai-food-camera" type="button" aria-label="拍包装录入">${icon('camera', 18)}</button>` : ''}<button class="secondary ai-mic" id="ai-mic" type="button" aria-label="语音输入" aria-pressed="false">${icon('mic', 18)}</button><label class="sr-only" for="ai-message-input">向 AI 助手提问</label><textarea id="ai-message-input" rows="1" maxlength="${AI_LIMITS.userChars}" placeholder="提问，或描述记录" enterkeyhint="enter"></textarea><span class="ai-send-slot"><button class="primary" type="submit" id="ai-send">发送</button><button class="secondary" type="button" id="ai-stop" hidden>停止</button></span></form><p class="ai-footer-note">AI 建议需要确认后才会写入。</p>`
  const log = host.querySelector<HTMLElement>('.ai-conversation')!, textarea = host.querySelector<HTMLTextAreaElement>('textarea')!, composer = host.querySelector<HTMLFormElement>('form')!
  const sendButton = host.querySelector<HTMLButtonElement>('#ai-send')!, stopButton = host.querySelector<HTMLButtonElement>('#ai-stop')!
  const usage = host.querySelector<HTMLElement>('.ai-session-usage')!
  const openSettings = () => { dialog.close(); showAiSettings({ ...ui, changed: () => { engine.settingsChanged(); ui.changed?.() } }, engine.profiles) }
  let composing = false, closed = false, pendingAutoText: string | undefined
  const speech = new SpeechRecognitionService()
  const mic = host.querySelector<HTMLButtonElement>('#ai-mic')!, voicePanel = host.querySelector<HTMLElement>('.ai-voice-panel')!, voiceStatus = host.querySelector<HTMLElement>('.ai-voice-status')!, disclosure = host.querySelector<HTMLElement>('.ai-voice-disclosure')!, voiceStart = host.querySelector<HTMLButtonElement>('#ai-voice-start')!
  const voiceAcknowledged = () => localStorage.getItem(VOICE_PRIVACY_KEY) === '1'
  const showVoice = (message: string, action?: string, privacy = false) => {
    voicePanel.hidden = false; voiceStatus.textContent = message; voiceStart.hidden = !action
    if (action) voiceStart.textContent = action
    disclosure.hidden = !privacy; disclosure.textContent = privacy ? VOICE_PRIVACY_TEXT : ''
    voicePanel.classList.toggle('is-listening', speech.active)
  }
  const grow = () => { textarea.style.height = 'auto'; textarea.style.height = `${Math.min(120, Math.max(44, textarea.scrollHeight))}px` }
  textarea.value = drafts.get(engine) || ''
  const submitText = (text: string): boolean => {
    if (closed || composing || !text.trim()) return false
    if (speech.active) speech.abort()
    if (engine.busy) { showVoice('上一条请求还在处理中。'); return false }
    if (!engine.profiles.active || !engine.profiles.privacyAcknowledged) { draw(); return false }
    if (text.length > AI_LIMITS.userChars) { showVoice(`文字最多 ${AI_LIMITS.userChars} 个字符，请编辑后发送。`); return false }
    pendingAutoText = undefined; textarea.value = ''; drafts.delete(engine); grow(); void engine.send(text); return true
  }
  textarea.addEventListener('input', () => { pendingAutoText = undefined; drafts.set(engine, textarea.value); grow(); draw() })
  textarea.addEventListener('compositionstart', () => { composing = true; draw() })
  textarea.addEventListener('compositionend', () => { composing = false; draw() })
  textarea.addEventListener('keydown', event => { if (shouldSendAiShortcut(event, composing)) { event.preventDefault(); composer.requestSubmit() } })
  composer.addEventListener('submit', event => {
    event.preventDefault(); if (composing) return
    speech.abort(); submitText(textarea.value)
  })
  const startVoice = (automatic = false) => {
    if (closed || engine.busy || composing || document.visibilityState !== 'visible') return
    if (speech.state === 'unsupported') { showVoice(SPEECH_UNSUPPORTED); return }
    if (!engine.profiles.active || !engine.profiles.privacyAcknowledged) { showVoice('连接 AI 服务并确认数据隐私说明后，可以开始语音。', '开始说话'); draw(); return }
    if (!voiceAcknowledged()) { showVoice('开始前，请了解语音如何处理。', automatic ? '开始语音' : '我知道了', true); return }
    // Never focus an editable field: voice mode must not open the software keyboard.
    if (document.activeElement === textarea) textarea.blur()
    pendingAutoText = undefined
    speech.start({
      onState: state => {
        if (closed) return
        mic.setAttribute('aria-pressed', String(speech.active)); mic.setAttribute('aria-label', speech.active ? '停止语音输入' : '语音输入')
        if (state === 'starting' || state === 'listening') showVoice('正在听…')
        if (state === 'stopping') showVoice('正在结束语音…')
        voicePanel.classList.toggle('is-listening', speech.active)
      },
      onInterim: text => { if (!closed) showVoice(text ? `正在听… ${text}` : '正在听…') },
      onFinal: text => {
        if (closed) return
        textarea.value = [textarea.value.trim(), text].filter(Boolean).join('\n'); drafts.set(engine, textarea.value); grow()
        showVoice('语音已转为文字。'); submitText(textarea.value); draw()
      },
      onError: (message, code) => { if (!closed) { showVoice(automatic && ['not-allowed', 'service-not-allowed'].includes(code) ? '准备好后开始说话' : message, speech.state === 'unsupported' ? undefined : '开始说话'); draw() } },
    })
  }
  mic.addEventListener('click', () => { if (speech.active) speech.stop(); else startVoice() })
  voiceStart.addEventListener('click', () => { if (disclosure.hidden === false) localStorage.setItem(VOICE_PRIVACY_KEY, '1'); startVoice() })
  const abortVoice = () => { if (speech.active) { speech.abort(); showVoice('语音输入已取消。', '开始说话') } }
  const visibility = () => { if (document.visibilityState !== 'visible') abortVoice() }
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', abortVoice)
  stopButton.addEventListener('click', () => engine.stop())
  host.querySelector('#ai-food-camera')?.addEventListener('click', () => { dialog.close(); ui.openFoodVision?.() })
  head.querySelector('#ai-assistant-settings')?.addEventListener('click', openSettings)
  head.querySelector('#ai-clear-chat')?.addEventListener('click', () => { speech.abort(); pendingAutoText = undefined; textarea.value = ''; drafts.delete(engine); grow(); engine.clear() })
  host.querySelector('#ai-notice-settings')?.addEventListener('click', openSettings)
  const nodeMap = new Map<string, HTMLElement>()
  let paintFrame = 0, wasBusy = engine.busy
  const draw = () => {
    if (!dialog.isConnected) return
    const active = engine.profiles.active
    const providerLabel = active?.preset === 'zhipu' ? '智谱' : active?.name.startsWith('自定义 · ') ? '自定义服务' : active?.name
    host.querySelector<HTMLElement>('.ai-current-profile')!.textContent = active ? `${providerLabel} · ${active.model}` : '尚未连接 AI 服务'
    host.querySelector<HTMLElement>('.ai-capability-notice')!.hidden = !active || active.toolCapability === 'supported'
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 72
    const oldScroll = log.scrollTop
    if (!engine.items.length) {
      nodeMap.clear(); log.replaceChildren()
      const welcome = document.createElement('section'); welcome.className = 'ai-welcome'
      const heading = document.createElement('h3'); heading.textContent = engine.profiles.active ? '从一条记录或一个问题开始' : '连接你自己的 AI 服务'
      const note = document.createElement('p'); note.className = 'ai-note'; note.textContent = engine.profiles.active ? engine.profiles.active.toolCapability === 'supported' ? '读取真实记录，计算交给 FitLog。写入前会给你预览。' : '可以先聊聊饮食、训练或计划。验证数据能力后，可按权限读取记录。' : '配置完成后，可以聊聊饮食、训练和计划。'
      welcome.append(heading, note)
      if (!engine.profiles.active) { const setup = document.createElement('button'); setup.className = 'secondary'; setup.textContent = '配置 AI'; setup.addEventListener('click', openSettings); welcome.append(setup) }
      else if (!engine.profiles.privacyAcknowledged) {
        const privacy = document.createElement('p'); privacy.className = 'ai-note'; privacy.textContent = AI_PRIVACY_TEXT
        const ack = document.createElement('button'); ack.textContent = '我知道了'; ack.addEventListener('click', () => { engine.profiles.acknowledgePrivacy(); const pending = pendingAutoText; pendingAutoText = undefined; if (pending && textarea.value === pending) submitText(pending); draw() }); welcome.append(privacy, ack)
      } else {
        const suggestions = document.createElement('div'); suggestions.className = 'ai-suggestions'
        for (const prompt of aiSuggestionPrompts) { const button = document.createElement('button'); button.type = 'button'; button.textContent = prompt; button.addEventListener('click', () => { textarea.value = prompt; grow(); draw(); textarea.focus({ preventScroll: true }) }); suggestions.append(button) }
        welcome.append(suggestions)
        if (ui.openFoodLibrary) { const library = document.createElement('button'); library.className = 'text-btn'; library.textContent = '管理食物库'; library.addEventListener('click', () => { dialog.close(); ui.openFoodLibrary!() }); welcome.append(library) }
      }
      log.append(welcome)
    } else {
      log.querySelector('.ai-welcome')?.remove()
      const visibleItems = engine.items.filter(item => !(item.kind === 'notice' && item.content === AI_CHAT_ONLY_MESSAGE))
      const ids = new Set(visibleItems.map(item => item.id))
      for (const [id, node] of nodeMap) if (!ids.has(id)) { node.remove(); nodeMap.delete(id) }
      for (const item of visibleItems) {
        let node = nodeMap.get(item.id)
        if (!node) { node = document.createElement('article'); node.setAttribute('aria-live', 'off'); node.setAttribute('aria-atomic', 'false'); nodeMap.set(item.id, node); log.append(node) }
        const className = `ai-message ai-${item.kind}`; if (node.className !== className) node.className = className
        if (item.kind === 'proposal') {
          const proposal = engine.proposals.get(item.proposalId!)
          if (!proposal) continue
          if (node.dataset.status === proposal.status) { node.querySelectorAll<HTMLButtonElement>('.ai-proposal-actions .primary').forEach(button => { button.disabled = engine.busy || proposal.status !== 'pending' }); continue }
          node.dataset.status = proposal.status; node.dataset.proposalId = proposal.id; node.replaceChildren()
          const head = document.createElement('div'); head.className = 'ai-proposal-head'
          const title = document.createElement('strong'); title.textContent = proposal.title
          const status = document.createElement('small'); status.textContent = aiProposalStatusLabels[proposal.status]; head.append(title, status); node.append(head)
          for (const line of aiProposalPreviewLines(proposal)) { const text = document.createElement('p'); text.textContent = line; node.append(text) }
          if (proposal.message) { const note = document.createElement('p'); note.className = 'ai-note'; note.textContent = proposal.message; node.append(note) }
          if (proposal.status === 'pending' || proposal.status === 'processing') {
            const actions = document.createElement('div'); actions.className = 'ai-proposal-actions'
            const confirm = document.createElement('button'); confirm.type = 'button'; confirm.className = 'primary'; confirm.textContent = '确认写入'; confirm.disabled = proposal.status === 'processing' || engine.busy
            confirm.addEventListener('click', () => { confirm.disabled = true; void engine.proposals.confirm(proposal.id) })
            const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消'; cancel.disabled = proposal.status === 'processing'
            cancel.addEventListener('click', () => engine.proposals.cancel(proposal.id)); actions.append(confirm, cancel); node.append(actions)
          }
        } else {
          let content = node.querySelector('p')
          if (!content) { content = document.createElement('p'); node.append(content) }
          if (content.textContent !== item.content) content.textContent = item.content
          if (item.kind === 'error' && !node.querySelector('.ai-error-title')) {
            const title = document.createElement('strong'); title.className = 'ai-error-title'; title.textContent = '请求未完成'; node.prepend(title)
            if (/配置|模型|接口|API Key/.test(item.content)) { const settings = document.createElement('button'); settings.className = 'text-btn'; settings.textContent = '检查设置'; settings.addEventListener('click', openSettings); node.append(settings) }
          }
          if (item.usage && aiUsageText(item.usage) && !node.querySelector('small')) { const tokens = document.createElement('small'); tokens.className = 'ai-note'; tokens.textContent = aiUsageText(item.usage); node.append(tokens) }
        }
        // A proposal can finish generating while the request remains active.
        if (item.kind === 'proposal') node.querySelectorAll<HTMLButtonElement>('.ai-proposal-actions .primary').forEach(button => { button.disabled = engine.busy || node!.dataset.status !== 'pending' })
      }
    }
    if (wasBusy && !engine.busy) host.querySelector<HTMLElement>('.ai-completion-status')!.textContent = engine.items.at(-1)?.kind === 'error' ? '请求未完成。' : 'AI 回复已完成。'
    if (!wasBusy && engine.busy) host.querySelector<HTMLElement>('.ai-completion-status')!.textContent = ''
    wasBusy = engine.busy
    usage.textContent = aiUsageText(engine.usage) ? `本次对话累计 ${aiUsageText(engine.usage)}` : ''
    const camera = host.querySelector<HTMLButtonElement>('#ai-food-camera'); if (camera) camera.disabled = engine.busy
    mic.disabled = engine.busy || composing; voiceStart.disabled = engine.busy || composing
    sendButton.hidden = engine.busy; stopButton.hidden = !engine.busy
    sendButton.disabled = engine.busy || !textarea.value.trim() || !engine.profiles.active || !engine.profiles.privacyAcknowledged
    if (nearBottom) log.scrollTop = log.scrollHeight; else log.scrollTop = oldScroll
  }
  const scheduleDraw = () => {
    if (closed) return
    if (wasBusy !== engine.busy || !engine.busy || !engine.items.length) { cancelAnimationFrame(paintFrame); paintFrame = 0; draw(); return }
    if (!paintFrame) paintFrame = requestAnimationFrame(() => { paintFrame = 0; draw() })
  }
  engine.onChange = scheduleDraw; draw()
  dialog.addEventListener('close', () => {
    closed = true; pendingAutoText = undefined; drafts.set(engine, textarea.value); speech.dispose()
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', abortVoice)
    cancelAnimationFrame(paintFrame); engine.stop(); if (engine.onChange === scheduleDraw) engine.onChange = undefined
  }, { once: true })
  dialog.querySelector('[data-close]')!.innerHTML = icon('x')
  const applyLaunch = (launch: AiAssistantLaunchOptions) => {
    if (closed) return
    if (launch.initialText?.trim()) {
      const text = launch.initialText.trim()
      if (text.length > AI_LIMITS.userChars) return
      textarea.value = [textarea.value.trim(), text].filter(Boolean).join('\n'); drafts.set(engine, textarea.value); grow()
      pendingAutoText = undefined
      if (launch.autoSend) {
        if (engine.busy) showVoice('上一条请求还在处理中。')
        else if (!engine.profiles.privacyAcknowledged && engine.profiles.active) pendingAutoText = textarea.value
        else submitText(textarea.value)
      }
    }
    if (launch.voice) {
      if (engine.busy) showVoice('上一条请求还在处理中。')
      else if (speech.active) showVoice('正在听…')
      else if (speech.state === 'unsupported') showVoice(SPEECH_UNSUPPORTED)
      else if (!voiceAcknowledged()) showVoice('开始前，请了解语音如何处理。', '开始语音', true)
      else if (navigator.userActivation?.isActive) startVoice(true)
      else showVoice('准备好后开始说话', '开始说话')
    }
    draw()
  }
  grow(); applyLaunch(options)
  return { dialog, applyLaunch }
}
