import { AiError, safeAiError } from '../ai/security'
import { voiceRecordingToWav, VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from './voiceAudio'
import type { VoiceTranscriptionProvider } from './voiceTranscriptionService'
export type VoiceCaptureState = 'idle' | 'starting' | 'recording' | 'transcribing' | 'error'
export interface VoiceCaptureOptions { onState: (state: VoiceCaptureState, seconds: number) => void; onTranscript: (text: string) => void; onError: (message: string) => void }
export interface VoiceCaptureDependencies { getUserMedia?: () => Promise<MediaStream>; Recorder?: typeof MediaRecorder; encode?: (blob: Blob, signal: AbortSignal) => Promise<Blob>; maxSeconds?: number }
/** Sole owner of capture/request memory. No URL, storage, background restart or implicit retry. */
export class VoiceCaptureController {
  state: VoiceCaptureState = 'idle'
  private stream?: MediaStream
  private recorder?: MediaRecorder
  private chunks: Blob[] = []
  private request?: AbortController
  private generation = 0
  private disposed = false
  private options?: VoiceCaptureOptions
  private timer?: ReturnType<typeof setInterval>
  private flushTimer?: ReturnType<typeof setTimeout>
  private rejectFlush?: () => void
  private startedAt = 0
  private bytes = 0
  private readonly provider: VoiceTranscriptionProvider
  private readonly dependencies: VoiceCaptureDependencies
  constructor(provider: VoiceTranscriptionProvider, dependencies: VoiceCaptureDependencies = {}) { this.provider = provider; this.dependencies = dependencies }
  get active(): boolean { return this.state === 'starting' || this.state === 'recording' }
  get pending(): boolean { return this.active || this.state === 'transcribing' }
  private publish(state: VoiceCaptureState): void { this.state = state; this.options?.onState(state, Math.floor((Date.now() - this.startedAt) / 1000)) }
  private releaseMicrophone(keepFinalData = false): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = undefined; clearInterval(this.timer); this.timer = undefined
    if (!keepFinalData) { if (this.recorder) this.recorder.ondataavailable = this.recorder.onstop = this.recorder.onerror = null; this.recorder = undefined; this.chunks = []; this.bytes = 0; clearTimeout(this.flushTimer); this.flushTimer = undefined }
  }
  async start(options: VoiceCaptureOptions): Promise<void> {
    if (this.disposed || this.pending) return
    this.options = options; this.startedAt = Date.now(); const generation = ++this.generation
    const current = () => !this.disposed && generation === this.generation
    this.publish('starting')
    try {
      const Recorder = this.dependencies.Recorder ?? globalThis.MediaRecorder
      if (!Recorder || (!this.dependencies.getUserMedia && !navigator.mediaDevices?.getUserMedia)) throw new AiError('voice_capture', '当前浏览器不支持录音，可在语音设置选择浏览器语音输入兼容模式。')
      const stream = await (this.dependencies.getUserMedia?.() ?? navigator.mediaDevices.getUserMedia({ audio: true }))
      if (!current()) { for (const track of stream.getTracks()) track.stop(); return }
      this.stream = stream
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(type => Recorder.isTypeSupported(type))
      this.recorder = new Recorder(stream, mimeType ? { mimeType } : undefined)
      this.recorder.ondataavailable = event => { if (!current() || !event.data.size) return; this.bytes += event.data.size; if (this.bytes > VOICE_MAX_BYTES) { this.fail(new AiError('voice_size', '这段语音太长，请分成两段。')); return } this.chunks.push(event.data) }
      this.recorder.onerror = () => { if (current()) this.fail(new AiError('voice_recorder', '录音未完成，可以重试或直接输入。')) }
      this.recorder.onstop = () => { if (current() && this.state === 'recording') this.fail(new AiError('voice_recorder', '录音已中断，可以重试或直接输入。')) }
      this.recorder.start(250); this.startedAt = Date.now(); this.publish('recording')
      this.timer = setInterval(() => { if (!current()) return; if (Date.now() - this.startedAt >= Math.min(VOICE_MAX_SECONDS, this.dependencies.maxSeconds ?? VOICE_MAX_SECONDS) * 1000) void this.stopAndTranscribe(); else this.publish('recording') }, 250)
    } catch (error) { if (current()) this.fail(error instanceof Error && error.name === 'NotAllowedError' ? new AiError('voice_permission', '未获得麦克风权限，请在系统设置中允许后重试。') : error) }
  }
  async stopAndTranscribe(): Promise<void> {
    if (this.state === 'starting') { this.cancel(); return }
    if (this.state !== 'recording' || !this.recorder) return
    const generation = this.generation, recorder = this.recorder, controller = new AbortController(); this.request = controller
    const current = () => !this.disposed && generation === this.generation && !controller.signal.aborted
    this.publish('transcribing')
    try {
      const recording = await new Promise<Blob>((resolve, reject) => {
        this.rejectFlush = () => reject(new DOMException('Aborted', 'AbortError'))
        this.flushTimer = setTimeout(() => reject(new AiError('voice_recorder', '录音未完成，可以重试或直接输入。')), 2000)
        recorder.onstop = () => { const blob = new Blob(this.chunks, { type: recorder.mimeType }); this.releaseMicrophone(); this.rejectFlush = undefined; resolve(blob) }
        recorder.stop(); this.releaseMicrophone(true)
      })
      if (!current()) return
      const audio = await (this.dependencies.encode ?? voiceRecordingToWav)(recording, controller.signal)
      if (!current()) return
      const text = await this.provider.transcribe(audio, controller.signal)
      if (!current()) return
      this.request = undefined; this.publish('idle'); this.options?.onTranscript(text)
    } catch (error) { if (current()) this.fail(error) }
    finally { if (generation === this.generation) this.releaseMicrophone(); if (this.request === controller) this.request = undefined }
  }
  private fail(error: unknown): void { const options = this.options; this.cancel(); this.publish('error'); options?.onError(safeAiError(error instanceof AiError ? error : new AiError('voice_capture', '这段语音没有转写成功，可以重试或直接输入。'))) }
  cancel(): void {
    ++this.generation; this.request?.abort(); this.request = undefined
    const recorder = this.recorder; this.rejectFlush?.(); this.rejectFlush = undefined
    this.releaseMicrophone()
    try { if (recorder && recorder.state !== 'inactive') recorder.stop() } catch { /* tracks already ended */ }
    this.publish('idle')
  }
  dispose(): void { this.cancel(); this.disposed = true; this.options = undefined }
}
