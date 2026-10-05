import { describe, expect, it, vi } from 'vitest'
import { BILIBILI_KEY_V2, TrainingVideoSearchRouter, VideoSearchSettings, extractBilibiliVideoId, bilibiliEmbedUrl, validBilibiliId } from '../src/services/videoSearchService'
const memory = () => { const m = new Map<string, string>(); return { getItem: (key: string) => m.get(key) ?? null, setItem: (key: string, value: string) => void m.set(key, value), removeItem: (key: string) => void m.delete(key) } }
const result = (provider: 'bilibili' | 'youtube', id: string) => ({ provider, providerLabel: provider === 'bilibili' ? 'B站' : 'YouTube', id, title: id, channel: provider, thumbnailUrl: '', watchUrl: provider === 'bilibili' ? `https://www.bilibili.com/video/${id}` : `https://www.youtube.com/watch?v=${id}`, embedUrl: provider === 'bilibili' ? bilibiliEmbedUrl(id) : '' })
describe('training video providers', () => {
  it('accepts only canonical Bilibili video URLs and builds the official player URL', () => {
    expect(validBilibiliId('BV1B7411m7LV')).toBe(true)
    expect(extractBilibiliVideoId('https://www.bilibili.com/video/BV1B7411m7LV')).toBe('BV1B7411m7LV')
    expect(extractBilibiliVideoId('https://www.bilibili.com/video/BV1B7411m7LV/?from=search')).toBe('BV1B7411m7LV')
    expect(extractBilibiliVideoId('http://www.bilibili.com/video/BV1B7411m7LV')).toBeUndefined()
    expect(extractBilibiliVideoId('https://www.bilibili.com/read/cv1')).toBeUndefined()
    expect(extractBilibiliVideoId('https://evil.example/video/BV1B7411m7LV')).toBeUndefined()
    expect(bilibiliEmbedUrl('BV1B7411m7LV')).toContain('player.bilibili.com/player.html?')
  })
  it('migrates the YouTube V1 key without deleting it and requires the V2 acknowledgement', () => {
    const storage = memory(); storage.setItem('fitlog-video-search-key-v1', 'synthetic-video-key'); const settings = new VideoSearchSettings(storage)
    expect(settings.config.enabled.youtube).toBe(true); expect(settings.key).toBe('synthetic-video-key'); expect(settings.acknowledgedV2).toBe(false)
    settings.acknowledge(); expect(settings.acknowledgedV2).toBe(true); settings.saveBilibiliKey('synthetic-bilibili-key'); expect(storage.getItem(BILIBILI_KEY_V2)).toBe('synthetic-bilibili-key')
  })
  it('uses domestic first in AUTO and does not call YouTube after domestic success', async () => {
    const settings = new VideoSearchSettings(memory()); settings.acknowledge(); settings.setEnabled('bilibili', true); settings.setEnabled('youtube', true)
    const bilibili = { search: vi.fn().mockResolvedValue([result('bilibili', 'BV1B7411m7LV')]) }; const youtube = { search: vi.fn().mockResolvedValue([result('youtube', 'Abcdefghij1')]) }
    const router = new TrainingVideoSearchRouter(settings, { bilibili, youtube }); const outcome = await router.searchDetailed('face pull', 3)
    expect(outcome.videos[0]?.provider).toBe('bilibili'); expect(bilibili.search).toHaveBeenCalledOnce(); expect(youtube.search).not.toHaveBeenCalled()
  })
  it('keeps a separate key while invalidating connection status when its source changes', () => {
    const storage = memory(), settings = new VideoSearchSettings(storage)
    settings.saveBilibiliKey('synthetic-domestic-key'); settings.setStatus('success', 'bilibili'); settings.setStatus('success', 'youtube')
    settings.setCredentialSource('reuse-profile')
    expect(settings.config.bilibiliStatus).toBe('unconfigured'); expect(settings.bilibiliKey).toBe('synthetic-domestic-key'); expect(settings.config.youtubeStatus).toBe('success')
    settings.setCredentialSource('separate'); expect(settings.config.bilibiliStatus).toBe('configured')
    settings.setStatus('success', 'bilibili'); settings.setCredentialSource('separate'); expect(settings.config.bilibiliStatus).toBe('success')
  })
  it('falls back to YouTube on domestic failure and tolerates ALL partial failure', async () => {
    const settings = new VideoSearchSettings(memory()); settings.acknowledge(); settings.setEnabled('bilibili', true); settings.setEnabled('youtube', true)
    const bilibili = { search: vi.fn().mockRejectedValue(new Error('offline')) }; const youtube = { search: vi.fn().mockResolvedValue([result('youtube', 'Abcdefghij1')]) }; const router = new TrainingVideoSearchRouter(settings, { bilibili, youtube })
    expect((await router.searchDetailed('face pull', 3)).videos).toHaveLength(1); settings.setPolicy('all'); expect((await router.searchDetailed('face pull', 3)).notices).toContain('B站搜索暂时不可用')
  })
})
