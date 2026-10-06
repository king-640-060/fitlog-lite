import { AiError } from '../ai/security'
export const VOICE_MAX_SECONDS = 30
export const VOICE_MAX_BYTES = 8 * 1024 * 1024
export function pcmWav(channels: Float32Array[], sampleRate: number): Blob {
  const frames = channels[0]?.length ?? 0
  if (!frames || channels.length > 8 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || 44 + frames * 2 > VOICE_MAX_BYTES || channels.some(channel => channel.length !== frames) || frames / sampleRate > VOICE_MAX_SECONDS + .1) throw new AiError('voice_size', '这段语音太长，请分成两段。')
  const buffer = new ArrayBuffer(44 + frames * 2), view = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++) { const sample = Math.max(-1, Math.min(1, channels.reduce((sum, channel) => sum + channel[i]!, 0) / channels.length)); view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true) }
  const blob = new Blob([buffer], { type: 'audio/wav' })
  if (blob.size > VOICE_MAX_BYTES) throw new AiError('voice_size', '这段语音太长，请分成两段。')
  return blob
}
/** Decode the browser's real recorder format, after tracks have ended; no audio playback. */
export async function voiceRecordingToWav(blob: Blob, signal: AbortSignal): Promise<Blob> {
  if (blob.size > VOICE_MAX_BYTES || !blob.size) throw new AiError('voice_size', '这段语音太长或为空，请重新录制。')
  const context = new AudioContext()
  const abort = () => { void context.close().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  try {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return pcmWav(Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)), decoded.sampleRate)
  } finally { signal.removeEventListener('abort', abort); if (context.state !== 'closed') await context.close() }
}
