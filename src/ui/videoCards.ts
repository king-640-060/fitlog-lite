import { bilibiliEmbedUrl, bilibiliWatchUrl, validBilibiliId, validVideoId, videoEmbedUrl, videoWatchUrl, type VideoSearchResult } from '../services/videoSearchService'
interface YouTubePlayer { destroy(): void }
interface YouTubeApi { Player: new (frame: HTMLIFrameElement, options: { events: { onReady: () => void; onError: () => void } }) => YouTubePlayer }
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void }
let apiPromise: Promise<YouTubeApi> | undefined
function playerApi(): Promise<YouTubeApi> {
  const win = window as YouTubeWindow
  if (win.YT?.Player) return Promise.resolve(win.YT)
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const prior = win.onYouTubeIframeAPIReady
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.referrerPolicy = 'strict-origin-when-cross-origin'
    const timer = setTimeout(() => { apiPromise = undefined; script.remove(); reject(new Error('Player unavailable')) }, 12000)
    win.onYouTubeIframeAPIReady = () => { prior?.(); clearTimeout(timer); if (win.YT?.Player) resolve(win.YT); else { apiPromise = undefined; reject(new Error('Player unavailable')) } }
    script.onerror = () => { clearTimeout(timer); apiPromise = undefined; script.remove(); reject(new Error('Player unavailable')) }
    document.head.append(script)
  })
  return apiPromise
}
function safeVideo(video: VideoSearchResult): { watch: string; embed: string } | undefined {
  if (video.provider === 'bilibili' && validBilibiliId(video.id)) return { watch: bilibiliWatchUrl(video.id), embed: bilibiliEmbedUrl(video.id) }
  if (video.provider === 'youtube' && validVideoId(video.id)) return { watch: videoWatchUrl(video.id), embed: videoEmbedUrl(video.id, location.origin) }
  return undefined
}
export function videoCardRenderer(dialog: HTMLDialogElement) {
  let active: { frame: HTMLIFrameElement; player?: YouTubePlayer; fallback: () => void; timer: ReturnType<typeof setTimeout> } | undefined
  const stop = () => { if (active) { clearTimeout(active.timer); active.player?.destroy(); active.frame.remove(); active.fallback(); active = undefined } }
  const render = (node: HTMLElement, videos: readonly VideoSearchResult[], label: string) => {
    node.replaceChildren(); const heading = document.createElement('h3'); heading.textContent = label; node.append(heading)
    for (const video of videos.slice(0, 5)) {
      const urls = safeVideo(video); if (!urls) continue
      const card = document.createElement('section'); card.className = 'video-card'
      const media = document.createElement('div'); media.className = 'video-media'
      if (video.thumbnailUrl) { const image = document.createElement('img'); image.src = video.thumbnailUrl; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; image.addEventListener('error', () => { image.hidden = true; media.classList.add('thumbnail-missing') }); media.append(image) } else media.classList.add('thumbnail-missing')
      const source = document.createElement('span'); source.className = 'video-source-badge'; source.textContent = video.providerLabel
      const title = document.createElement('strong'); title.className = 'video-title'; title.textContent = video.title
      const channel = document.createElement('p'); channel.className = 'ai-note'; channel.textContent = video.channel
      const status = document.createElement('p'); status.className = 'video-status'; status.setAttribute('role', 'status'); status.hidden = true
      const actions = document.createElement('div'); actions.className = 'video-actions'
      const play = document.createElement('button'); play.type = 'button'; play.className = 'secondary compact-action'; play.textContent = '播放'; play.setAttribute('aria-label', `播放 ${video.title}`)
      const external = document.createElement('a'); external.className = 'text-btn compact-action'; external.href = urls.watch; external.rel = 'noopener noreferrer'; external.target = '_blank'; external.textContent = `在 ${video.providerLabel} 打开`
      play.addEventListener('click', () => {
        stop(); media.classList.add('is-playing'); status.hidden = false; status.textContent = '正在加载播放器…'
        const frame = document.createElement('iframe'); frame.title = video.title; frame.src = urls.embed; frame.allow = video.provider === 'bilibili' ? 'fullscreen; picture-in-picture' : 'encrypted-media; fullscreen; picture-in-picture'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin'; media.append(frame)
        const fallback = () => { media.classList.remove('is-playing'); status.hidden = true }
        const failure = () => { if (active?.frame !== frame) return; stop(); status.hidden = false; status.textContent = `暂时无法在应用内播放，请在 ${video.providerLabel} 打开。` }
        const timer = setTimeout(failure, 15000); active = { frame, fallback, timer }
        if (video.provider === 'youtube') void playerApi().then(api => { if (active?.frame !== frame || !dialog.open) return; active.player = new api.Player(frame, { events: { onReady: () => { if (active?.frame === frame) { clearTimeout(timer); status.hidden = true } }, onError: failure } }) }).catch(failure)
        else frame.addEventListener('load', () => { if (active?.frame === frame) { clearTimeout(timer); status.hidden = true } }, { once: true })
      })
      actions.append(play, external); card.append(media, source, title, channel, status, actions); node.append(card)
    }
  }
  const cleanup = () => stop()
  dialog.addEventListener('close', cleanup, { once: true }); window.addEventListener('pagehide', cleanup, { once: true }); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stop() }, { once: true })
  return { render, stop }
}

