import { describe, expect, it } from 'vitest'
import { decryptSyncText, encryptSyncText, validateEncryptedEnvelope, SYNC_KDF_ITERATIONS } from '../src/services/syncCryptoService'
const password = 'test-only-data-password-123'
describe('Native encrypted sync envelope', () => {
  it('round trips UTF-8 plaintext with fixed PBKDF2/AES-GCM parameters', async () => { const text = '中文完整备份 PRIVATE_TEST_FOOD_123 PRIVATE_TEST_TASK_456', e = await encryptSyncText(text, password); expect(await decryptSyncText(e, password)).toBe(text); expect(e.kdf.iterations).toBe(SYNC_KDF_ITERATIONS); expect(e.cipher.name).toBe('AES-GCM'); expect(JSON.stringify(e)).not.toContain('PRIVATE_TEST_'); expect(JSON.stringify(e)).not.toContain(password) })
  it('random salt and IV produce distinct encrypted files for identical data', async () => { const a = await encryptSyncText('same', password), b = await encryptSyncText('same', password); expect(a.kdf.salt).not.toBe(b.kdf.salt); expect(a.cipher.iv).not.toBe(b.cipher.iv); expect(a.ciphertext).not.toBe(b.ciphertext) })
  it('wrong password and authenticated ciphertext tampering fail safely', async () => { const e = await encryptSyncText('private', password); await expect(decryptSyncText(e, 'wrong-password')).rejects.toThrow('数据密码不正确'); e.ciphertext = (e.ciphertext[0] === 'A' ? 'B' : 'A') + e.ciphertext.slice(1); await expect(decryptSyncText(e, password)).rejects.toThrow() })
  it('rejects empty payload, malformed base64, future versions, unbounded KDF and extra metadata', async () => {
    await expect(encryptSyncText('', password)).rejects.toThrow()
    const e = await encryptSyncText('private', password)
    for (const bad of [null, {}, { ...e, formatVersion: 2 }, { ...e, ciphertext: '' }, { ...e, ciphertext: '!' }, { ...e, kdf: { ...e.kdf, iterations: 999999999 } }, { ...e, data: 'PRIVATE' }, { ...e, cipher: { ...e.cipher, iv: 'AAAA' } }]) expect(() => validateEncryptedEnvelope(bad)).toThrow()
  })
})
