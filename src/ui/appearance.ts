import { appearanceEvent, readAppearance, saveAppearance, type AppearanceMode } from '../services/appearanceConfig'
import type { ManagedSurfaceContext } from './managementWorkspace'
export function showAppearance(surface: ManagedSurfaceContext): void {
  surface.open('外观', `<div class="appearance-options"><p class="report-note">外观仅保存在此设备，切换会保留当前草稿。</p>${([['system','跟随系统','自动响应设备浅色／深色模式'],['light','始终浅色','固定使用浅色外观'],['dark','始终深色','固定使用深色外观']] as const).map(([value,label,copy])=>`<label class="appearance-option"><input type="radio" name="appearance" value="${value}" ${readAppearance()===value?'checked':''}><span><strong>${label}</strong><small>${copy}</small></span></label>`).join('')}<p class="report-note" role="status" data-appearance-status></p></div>`)
  const inputs = [...surface.dialog.querySelectorAll<HTMLInputElement>('[name=appearance]')], status=surface.dialog.querySelector<HTMLElement>('[data-appearance-status]')!
  const sync=()=>{const mode=readAppearance();for(const input of inputs)input.checked=input.value===mode}
  document.addEventListener(appearanceEvent,sync)
  surface.onDispose(()=>document.removeEventListener(appearanceEvent,sync))
  surface.onResume(sync)
  inputs.forEach(input=>input.addEventListener('change',()=>{try{saveAppearance(input.value as AppearanceMode);status.textContent='外观已保存'}catch{sync();status.textContent='无法保存外观，请重试'}}))
}
