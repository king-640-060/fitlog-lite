// Drive the approved search shortcut when an old gate needs a real management destination.
// No synthetic app event, hidden-button click or bypass of the native workspace lifecycle.
const labels = {'food-library':'食物库','exercise-library':'动作库','workout-templates':'训练模板','diet-templates':'饮食模板','nutrition-strategies':'营养模板','habits':'习惯','import':'导入数据','backup':'备份与恢复','github-sync':'GitHub 同步','appearance':'外观','ai-settings':'AI 设置','diagnostics':'版本诊断','about':'关于 FitLog Lite'}
export async function prepareManagementEntry(page, selector) {
  const match=selector.match(/#more-([\w-]+)/);if(!match)return
  if(await page.locator(selector).isVisible())return
  const search=page.locator('#management-search')
  // Old frozen builds still expose the original direct entry; preserve baseline execution.
  if(!await search.isVisible())return
  const label=labels[match[1]];if(!label)throw Error('Unknown management destination: '+selector)
  await search.fill(label)
  await page.locator(selector).waitFor({state:'visible'})
}
export async function openManagementEntry(page, selector, method='click') {
  await prepareManagementEntry(page,selector)
  await page.locator(selector)[method]()
}
