export const SYNC_KDF_ITERATIONS = 310000
const MAX_TEXT_BYTES = 20 * 1024 * 1024
export interface EncryptedSyncEnvelopeV1 {
  format: 'fitlog-lite-encrypted-sync'
  formatVersion: 1
  encryptedAt: string
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string }
  cipher: { name: 'AES-GCM'; iv: string }
  ciphertext: string
}
export function bytesToBase64(bytes: Uint8Array): string {
  let text = ''; for (let offset = 0; offset < bytes.length; offset += 8192) text += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(text)
}
export function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  if (!text || text.length > MAX_TEXT_BYTES * 2 || text.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) throw new Error('加密备份格式不合法')
  const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0))
  if (bytesToBase64(bytes) !== text) throw new Error('加密备份格式不合法')
  return bytes
}
function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.sort().join(','))
}
export function validateEncryptedEnvelope(value: unknown): EncryptedSyncEnvelopeV1 {
  const invalid = () => { throw new Error('不支持或已损坏的加密备份格式') }
  if (!exactKeys(value, ['format', 'formatVersion', 'encryptedAt', 'kdf', 'cipher', 'ciphertext'])) return invalid()
  const { kdf, cipher } = value
  if (value.format !== 'fitlog-lite-encrypted-sync' || value.formatVersion !== 1 || typeof value.encryptedAt !== 'string' || !Number.isFinite(Date.parse(value.encryptedAt)) || !exactKeys(kdf, ['name', 'hash', 'iterations', 'salt']) || !exactKeys(cipher, ['name', 'iv'])) return invalid()
  if (kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' || kdf.iterations !== SYNC_KDF_ITERATIONS || cipher.name !== 'AES-GCM' || typeof kdf.salt !== 'string' || typeof cipher.iv !== 'string' || typeof value.ciphertext !== 'string') return invalid()
  if (base64ToBytes(kdf.salt).length !== 16 || base64ToBytes(cipher.iv).length !== 12 || base64ToBytes(value.ciphertext).length < 17) return invalid()
  return value as unknown as EncryptedSyncEnvelopeV1
}
async function key(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  if (!password) throw new Error('请输入数据密码')
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: SYNC_KDF_ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function encryptSyncText(plaintext: string, password: string): Promise<EncryptedSyncEnvelopeV1> {
  const bytes = new TextEncoder().encode(plaintext)
  if (!bytes.length || bytes.length > MAX_TEXT_BYTES) throw new Error('备份为空或超过 20 MiB 同步限制，请使用本机备份')
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, await key(password, salt), bytes)
  return { format: 'fitlog-lite-encrypted-sync', formatVersion: 1, encryptedAt: new Date().toISOString(), kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: SYNC_KDF_ITERATIONS, salt: bytesToBase64(salt) }, cipher: { name: 'AES-GCM', iv: bytesToBase64(iv) }, ciphertext: bytesToBase64(new Uint8Array(encrypted)) }
}
export async function decryptSyncText(value: unknown, password: string): Promise<string> {
  const envelope = validateEncryptedEnvelope(value)
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.cipher.iv), tagLength: 128 }, await key(password, base64ToBytes(envelope.kdf.salt)), base64ToBytes(envelope.ciphertext))
    if (decrypted.byteLength > MAX_TEXT_BYTES) throw new Error('too large')
    return new TextDecoder('utf-8', { fatal: true }).decode(decrypted)
  } catch { throw new Error('数据密码不正确，或远程备份已损坏。') }
}
