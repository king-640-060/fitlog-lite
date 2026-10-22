// Approved v0.4 route transition is asynchronous. Preserve domain assertions after the real route settles.
export async function waitForMainNavigation(page, tab) {
 await page.waitForFunction(tab => document.querySelector('.bottom-nav [aria-current="page"]')?.getAttribute('data-tab') === tab && !document.querySelector('.page-swipe-stage[data-swiping]') && !document.querySelector('.page-current')?.inert && document.querySelector('#view')?.children.length, tab)
}
