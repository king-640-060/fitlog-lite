import {waitForProgressNavigation} from './navigationSettlement.mjs'
// Use actual native summary clicks before inspecting the newly approved folded professional evidence.
export async function expandReportChapters(page){
 if(await page.locator('#view .progress-deck-root').count())await waitForProgressNavigation(page,{view:'reports'})
 await page.locator('.report-page').waitFor()
 await page.waitForFunction(()=>!document.querySelector('.report-page[aria-busy=true]'))
 const chapters=page.locator('[data-report-chapter]'),count=await chapters.count()
 for(let i=0;i<count;i++){const chapter=chapters.nth(i);if(!await chapter.evaluate(d=>d.open))await chapter.locator(':scope > summary').click()}
 return count
}
