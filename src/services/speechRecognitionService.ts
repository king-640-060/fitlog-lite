export type SpeechState = 'idle' | 'starting' | 'listening' | 'stopping' | 'unsupported' | 'error'
export interface SpeechResult { readonly isFinal: boolean; readonly length: number; readonly [index: number]: { transcript: string } }
export interface SpeechResultEvent { readonly resultIndex: number; readonly results: { readonly length: number; readonly [index: number]: SpeechResult } }
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  onstart: (() => void) | null; onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
export type RecognitionConstructor = new () => Recognition
export interface SpeechOptions {
  onState?: (state: SpeechState) => void
  onInterim?: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string, code: string) => void
}
export const SPEECH_UNSUPPORTED = '当前浏览器不支持网页语音识别，可以使用系统键盘听写。'
export function speechErrorMessage(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return '没有麦克风权限，请在系统设置中允许后重试。'
  if (code === 'audio-capture') return '当前无法使用麦克风，请检查设备或系统权限。'
  if (code === 'no-speech') return '没有听清，可以再说一次。'
  if (code === 'network') return '语音识别暂时不可用，请稍后重试或使用键盘输入。'
  if (code === 'aborted') return '语音输入已取消。'
  if (code === 'language-not-supported') return '当前语音服务不支持中文，可以使用系统键盘听写。'
  return '语音识别暂时不可用，可以重试或使用键盘输入。'
}
export function browserRecognition(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}
// One finite browser-owned session. Only end publishes final text; abort invalidates all callbacks first.
export class SpeechRecognitionService {
  state: SpeechState
  private recognition?: Recognition
  private options?: SpeechOptions
  private generation = 0
  private disposed = false
  private finalText = () => ''
  private readonly constructorType: RecognitionConstructor | undefined
  constructor(constructorType: RecognitionConstructor | undefined = browserRecognition()) { this.constructorType = constructorType; this.state = constructorType ? 'idle' : 'unsupported' }
  get active(): boolean { return ['starting', 'listening', 'stopping'].includes(this.state) }
  private setState(state: SpeechState): void { this.state = state; this.options?.onState?.(state) }
  private detach(): void {
    if (this.recognition) this.recognition.onstart = this.recognition.onresult = this.recognition.onerror = this.recognition.onend = null
    this.recognition = undefined
  }
  start(options: SpeechOptions): void {
    if (this.disposed || this.active) return
    this.options = options
    if (!this.constructorType) { this.setState('unsupported'); options.onError(SPEECH_UNSUPPORTED, 'unsupported'); return }
    const generation = ++this.generation, segments = new Map<number, string>()
    this.finalText = () => [...segments.entries()].sort(([a], [b]) => a - b).map(([, value]) => value).join('').trim()
    const current = () => !this.disposed && generation === this.generation
    const fail = (code: string) => {
      if (!current()) return
      const recognition = this.recognition
      ++this.generation; this.detach(); try { recognition?.abort() } catch { /* no retained stream */ }
      this.setState('error'); options.onError(speechErrorMessage(code), code)
    }
    try {
      const recognition = new this.constructorType(); this.recognition = recognition
      recognition.lang = 'zh-CN'; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1
      recognition.onstart = () => { if (current()) this.setState('listening') }
      recognition.onresult = event => {
        if (!current()) return
        const interim: string[] = []
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index], text = result[0]?.transcript || ''
          if (result.isFinal) segments.set(index, text); else { segments.delete(index); interim.push(text) }
        }
        options.onInterim?.([...segments.values(), ...interim].join('').trim())
      }
      recognition.onerror = event => fail(event.error)
      recognition.onend = () => {
        if (!current()) return
        ++this.generation; this.detach(); this.setState('idle')
        const text = [...segments.entries()].sort(([a], [b]) => a - b).map(([, value]) => value).join('').trim()
        if (text) options.onFinal(text); else options.onError(speechErrorMessage('no-speech'), 'no-speech')
      }
      this.setState('starting'); recognition.start()
    } catch (error) { fail(error instanceof Error && error.name === 'NotAllowedError' ? 'not-allowed' : 'unknown') }
  }
  stop(): void {
    if (!this.active || !this.recognition) return
    const text = this.finalText(), options = this.options
    this.abort()
    if (text) options?.onFinal(text); else options?.onError(speechErrorMessage('no-speech'), 'no-speech')
  }
  abort(): void {
    ++this.generation
    const recognition = this.recognition; this.detach()
    try { recognition?.abort() } catch { /* invalidated callbacks cannot publish */ }
    this.finalText = () => ''
    this.setState(this.constructorType ? 'idle' : 'unsupported')
  }
  dispose(): void { this.abort(); this.disposed = true; this.options = undefined }
}
