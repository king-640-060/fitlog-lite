/** System TTS only: no credentials, provider request, audio persistence or auto-listening. */
export class VoiceReply {
  private generation = 0
  private speaking = false
  private readonly onState: (speaking: boolean) => void
  constructor(onState: (speaking: boolean) => void) { this.onState = onState }
  get active(): boolean { return this.speaking }
  speak(text: string): void {
    this.cancel()
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return
    const plain = text.replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '').replace(/[*#`]/g, '').trim().slice(0, 1200)
    if (!plain) return
    const generation = this.generation, utterance = new SpeechSynthesisUtterance(plain)
    utterance.lang = 'zh-CN'
    const end = () => { if (generation === this.generation) { this.speaking = false; this.onState(false) } }
    utterance.onend = end; utterance.onerror = end
    this.speaking = true; this.onState(true)
    try { speechSynthesis.speak(utterance) } catch { end() }
  }
  cancel(): void { ++this.generation; globalThis.speechSynthesis?.cancel(); this.speaking = false; this.onState(false) }
}
