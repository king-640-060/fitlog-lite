// Approved v0.4 route transition is asynchronous. Preserve domain assertions after the real route settles.
export async function waitForMainNavigation(page, tab) {
 await page.waitForFunction(tab => document.querySelector('.bottom-nav [aria-current="page"]')?.getAttribute('data-tab') === tab && !document.querySelector('.page-swipe-stage[data-swiping]') && !document.querySelector('.page-current')?.inert && document.querySelector('#view')?.children.length, tab)
}

// Geometry/input checks run after the owned finite Sheet/subview transition settles.
// Dedicated motion suites still sample the animation itself and enforce approved durations.
export async function waitForSurfaceSettlement(page, selector='dialog[open]') {
 await page.evaluate(async selector=>{
  await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)
  const root=document.querySelector(selector)
  if(root)await Promise.all(root.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))
  await new Promise(requestAnimationFrame)
 },selector)
}
