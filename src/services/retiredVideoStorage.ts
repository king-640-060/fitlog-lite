/** Permanently retired device configuration. Never enumerate or clear other storage. */
export const RETIRED_VIDEO_KEYS = [
  'fitlog-video-search-config-v1',
  'fitlog-video-search-config-v2',
  'fitlog-video-search-key-v1',
  'fitlog-video-search-bilibili-key-v2',
  'fitlog-video-search-privacy-ack-v1',
  'fitlog-video-search-privacy-ack-v2',
] as const

export function retireLegacyVideoSearchStorage(storage?: Pick<Storage, 'removeItem'>): void {
  try {
    const target = storage ?? window.localStorage
    for (const key of RETIRED_VIDEO_KEYS) {
      try { target.removeItem(key) } catch { /* Restricted storage must not block ordinary startup. */ }
    }
  } catch { /* Accessing localStorage itself may be denied. */ }
}
