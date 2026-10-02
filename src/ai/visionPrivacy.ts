export const VISION_PRIVACY_KEY = 'fitlog-ai-vision-privacy-ack-v1'
export const VISION_PRIVACY_TEXT = '你选择的包装图片会发送给当前 AI 服务用于识别。FitLog 会先在本机处理图片并移除照片元数据；处理后的图片不会保存到业务数据库、备份或 GitHub 同步。'
export const VISION_PROVIDER_PRIVACY_TEXT = 'AI 服务商如何处理请求内容，取决于你所使用服务的规则。'
export function visionPrivacyAcknowledged(): boolean { try { return localStorage.getItem(VISION_PRIVACY_KEY) === 'true' } catch { return false } }
export function acknowledgeVisionPrivacy(): void { try { localStorage.setItem(VISION_PRIVACY_KEY, 'true') } catch { /* The current workflow may proceed after explicit acknowledgement. */ } }
