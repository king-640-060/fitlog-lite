import { appearanceEvent, readAppearance, readVisualTheme, resolveAppearance, saveAppearance, saveVisualTheme, type AppearanceMode, type VisualTheme } from '../services/appearanceConfig'
import type { ManagedSurfaceContext } from './managementWorkspace'
export function showAppearance(surface: ManagedSurfaceContext): void {
  surface.open('外观', `<div class="appearance-options"><fieldset class="appearance-group"><legend>视觉主题</legend>${([['classic','Classic 经典主题','保留经典配色与明暗偏好'],['light-native','Light Native 浅色主题','固定浅色']] as const).map(([value,label,copy])=>`<label class="appearance-option"><input type="radio" name="visual-theme" value="${value}"><span><strong>${label}</strong><small>${copy}</small></span></label>`).join('')}</fieldset><fieldset class="appearance-group" data-classic-appearance><legend>经典主题明暗模式</legend>${([['system','跟随系统'],['light','始终浅色'],['dark','始终深色']] as const).map(([value,label])=>`<label class="appearance-option"><input type="radio" name="appearance" value="${value}"><span><strong>${label}</strong></span></label>`).join('')}</fieldset><p class="report-note">仅保存在此设备，切换保留当前草稿。</p><p class="report-note" role="status" data-appearance-status></p></div>`)
  const root=surface.dialog, inputs=[...root.querySelectorAll<HTMLInputElement>('[name=appearance]')], themes=[...root.querySelectorAll<HTMLInputElement>('[name=visual-theme]')], status=root.querySelector<HTMLElement>('[data-appearance-status]')!
  const sync=()=>{
    const mode=readAppearance(),visual=resolveAppearance(readVisualTheme(),mode,matchMedia('(prefers-color-scheme: dark)').matches).visual
    const group=root.querySelector<HTMLElement>('[data-classic-appearance]')!,modeFocused=group.contains(document.activeElement)
    for(const input of inputs)input.checked=input.value===mode
    for(const input of themes)input.checked=input.value===visual
    group.hidden=visual!=='classic'
    if(group.hidden&&modeFocused)themes.find(input=>input.checked)?.focus({preventScroll:true})
  }
  document.addEventListener(appearanceEvent,sync)
  surface.onDispose(()=>document.removeEventListener(appearanceEvent,sync))
  surface.onResume(sync)
  sync()
  inputs.forEach(input=>{
    const choose=()=>{try{
      // Acting on the Classic-only mode group explicitly chooses Classic, including an unchanged radio.
      if(readVisualTheme()!=='classic')saveVisualTheme('classic')
      if(readAppearance()!==input.value)saveAppearance(input.value as AppearanceMode)
      else sync()
      status.textContent='外观已保存'
    }catch{sync();status.textContent='无法保存外观，请重试'}}
    input.addEventListener('click',choose);input.addEventListener('change',choose)
  })
  themes.forEach(input=>{
    const choose=()=>{try{
      // A click on the checked compatibility radio must still persist the explicit theme.
      if(readVisualTheme()!==input.value)saveVisualTheme(input.value as VisualTheme)
      else sync()
      status.textContent='主题已保存'
    }catch{sync();status.textContent='无法保存主题，请重试'}}
    input.addEventListener('click',choose);input.addEventListener('change',choose)
  })
}
