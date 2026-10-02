import { AiOrchestrator, AI_CHAT_ONLY_MESSAGE } from '../ai/orchestrator'
import { AI_LIMITS } from '../ai/security'
import { showAiSettings, AI_PRIVACY_TEXT, type AiSettingsUi } from './aiSettings'
import { aiProposalPreviewLines, aiProposalStatusLabels, aiSuggestionPrompts, aiUsageText, shouldSendAiShortcut } from './aiUiHelpers'
import { icon } from './icons'

export interface AiAssistantUi extends AiSettingsUi { beforeOpen?: () => Promise<void>; openFoodLibrary?: () => void; openFoodVision?: () => void }
export function showAiAssistant(engine: AiOrchestrator, ui: AiAssistantUi): void {
  const dialog = ui.openModal('AI 助手', '<div class="ai-assistant"></div>', true)
  dialog.classList.add('ai-assistant-sheet')
  const host = dialog.querySelector<HTMLElement>('.ai-assistant')!, active = engine.profiles.active
  host.innerHTML = `<div class="ai-assistant-toolbar"><div class="ai-current-profile"></div><button class="text-btn" id="ai-assistant-settings">设置</button><button class="text-btn" id="ai-clear-chat">清空</button></div><div class="ai-conversation" role="log" aria-label="AI 对话" aria-live="polite"></div><div class="ai-session-usage"></div><form class="ai-composer">${ui.openFoodVision ? `<button class="secondary ai-camera" id="ai-food-camera" type="button" aria-label="拍包装录入">${icon('camera', 18)}</button>` : ''}<label class="sr-only" for="ai-message-input">向 AI 助手提问</label><textarea id="ai-message-input" rows="1" maxlength="${AI_LIMITS.userChars}" placeholder="提问，或描述记录" enterkeyhint="enter"></textarea><button class="primary" type="submit" id="ai-send">发送</button><button class="secondary" type="button" id="ai-stop" hidden>停止</button></form><p class="ai-footer-note">AI 建议需要确认后才会写入。</p>`
  host.querySelector<HTMLElement>('.ai-current-profile')!.textContent = active ? `${active.name} · ${active.model}` : '尚未连接 AI 服务'
  const log = host.querySelector<HTMLElement>('.ai-conversation')!, textarea = host.querySelector<HTMLTextAreaElement>('textarea')!, composer = host.querySelector<HTMLFormElement>('form')!
  const sendButton = host.querySelector<HTMLButtonElement>('#ai-send')!, stopButton = host.querySelector<HTMLButtonElement>('#ai-stop')!
  const usage = host.querySelector<HTMLElement>('.ai-session-usage')!
  const openSettings = () => { dialog.close(); showAiSettings({ ...ui, changed: () => { engine.settingsChanged(); ui.changed?.() } }, engine.profiles) }
  const updateViewport = () => {
    const viewport = window.visualViewport
    dialog.style.setProperty('--ai-viewport-height', `${Math.max(120, (viewport?.height ?? window.innerHeight) - 12)}px`)
    dialog.style.bottom = `${Math.max(0, window.innerHeight - ((viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0)))}px`
  }
  window.visualViewport?.addEventListener('resize', updateViewport); window.visualViewport?.addEventListener('scroll', updateViewport); window.addEventListener('resize', updateViewport); updateViewport()
  let composing = false
  const grow = () => { textarea.style.height = 'auto'; textarea.style.height = `${Math.min(120, Math.max(44, textarea.scrollHeight))}px` }
  textarea.addEventListener('input', () => { grow(); sendButton.disabled = engine.busy || !textarea.value.trim() || !engine.profiles.active || !engine.profiles.privacyAcknowledged })
  textarea.addEventListener('compositionstart', () => { composing = true })
  textarea.addEventListener('compositionend', () => { composing = false })
  textarea.addEventListener('keydown', event => { if (shouldSendAiShortcut(event, composing)) { event.preventDefault(); composer.requestSubmit() } })
  composer.addEventListener('submit', event => {
    event.preventDefault(); if (engine.busy || composing || !textarea.value.trim()) return
    const text = textarea.value; textarea.value = ''; grow(); void engine.send(text)
  })
  stopButton.addEventListener('click', () => engine.stop())
  host.querySelector('#ai-food-camera')?.addEventListener('click', () => { dialog.close(); ui.openFoodVision?.() })
  host.querySelector('#ai-assistant-settings')?.addEventListener('click', openSettings)
  host.querySelector('#ai-clear-chat')?.addEventListener('click', () => engine.clear())
  const nodeMap = new Map<string, HTMLElement>()
  const draw = () => {
    if (!dialog.isConnected) return
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 72
    const oldScroll = log.scrollTop
    if (!engine.items.length) {
      nodeMap.clear(); log.replaceChildren()
      const welcome = document.createElement('section'); welcome.className = 'ai-welcome'
      const heading = document.createElement('h3'); heading.textContent = engine.profiles.active ? '从一条记录或一个问题开始' : '连接你自己的 AI 服务'
      const note = document.createElement('p'); note.className = 'ai-note'; note.textContent = engine.profiles.active ? '读取真实记录，计算交给 FitLog。写入前会给你预览。' : '配置完成后，可以聊聊饮食、训练和计划。'
      welcome.append(heading, note)
      if (!engine.profiles.active) { const setup = document.createElement('button'); setup.className = 'secondary'; setup.textContent = '配置 AI'; setup.addEventListener('click', openSettings); welcome.append(setup) }
      else if (!engine.profiles.privacyAcknowledged) {
        const privacy = document.createElement('p'); privacy.className = 'ai-note'; privacy.textContent = AI_PRIVACY_TEXT
        const ack = document.createElement('button'); ack.textContent = '我知道了'; ack.addEventListener('click', () => { engine.profiles.acknowledgePrivacy(); draw() }); welcome.append(privacy, ack)
      } else {
        if (engine.profiles.active.toolCapability !== 'supported') { const notice = document.createElement('p'); notice.className = 'ai-note'; notice.textContent = AI_CHAT_ONLY_MESSAGE; welcome.append(notice) }
        const suggestions = document.createElement('div'); suggestions.className = 'ai-suggestions'
        for (const prompt of aiSuggestionPrompts) { const button = document.createElement('button'); button.type = 'button'; button.textContent = prompt; button.addEventListener('click', () => { textarea.value = prompt; grow(); draw(); textarea.focus() }); suggestions.append(button) }
        welcome.append(suggestions)
        if (ui.openFoodLibrary) { const library = document.createElement('button'); library.className = 'text-btn'; library.textContent = '管理食物库'; library.addEventListener('click', () => { dialog.close(); ui.openFoodLibrary!() }); welcome.append(library) }
      }
      log.append(welcome)
    } else {
      log.querySelector('.ai-welcome')?.remove()
      const ids = new Set(engine.items.map(item => item.id))
      for (const [id, node] of nodeMap) if (!ids.has(id)) { node.remove(); nodeMap.delete(id) }
      for (const item of engine.items) {
        let node = nodeMap.get(item.id)
        if (!node) { node = document.createElement('article'); node.className = `ai-message ai-${item.kind}`; nodeMap.set(item.id, node); log.append(node) }
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
        } else if (node.dataset.content !== item.content) {
          node.dataset.content = item.content; node.replaceChildren()
          const content = document.createElement('p'); content.textContent = item.content; node.append(content)
          if (item.usage && aiUsageText(item.usage)) { const tokens = document.createElement('small'); tokens.className = 'ai-note'; tokens.textContent = aiUsageText(item.usage); node.append(tokens) }
        }
        // A proposal can finish generating while the request remains active.
        if (item.kind === 'proposal') node.querySelectorAll<HTMLButtonElement>('.ai-proposal-actions .primary').forEach(button => { button.disabled = engine.busy || node!.dataset.status !== 'pending' })
      }
    }
    usage.textContent = aiUsageText(engine.usage) ? `本次对话累计 ${aiUsageText(engine.usage)}` : ''
    const camera = host.querySelector<HTMLButtonElement>('#ai-food-camera'); if (camera) camera.disabled = engine.busy
    sendButton.hidden = engine.busy; stopButton.hidden = !engine.busy
    sendButton.disabled = engine.busy || !textarea.value.trim() || !engine.profiles.active || !engine.profiles.privacyAcknowledged
    if (nearBottom) log.scrollTop = log.scrollHeight; else log.scrollTop = oldScroll
  }
  engine.onChange = draw; draw()
  dialog.addEventListener('close', () => {
    engine.stop(); if (engine.onChange === draw) engine.onChange = undefined
    window.visualViewport?.removeEventListener('resize', updateViewport); window.visualViewport?.removeEventListener('scroll', updateViewport); window.removeEventListener('resize', updateViewport)
  }, { once: true })
  dialog.querySelector('[data-close]')!.innerHTML = icon('x')
}
