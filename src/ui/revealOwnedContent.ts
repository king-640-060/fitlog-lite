/** Reveal an explicit action's content in its actual scrolling owner, never on observation. */
export function revealOwnedContent(element:HTMLElement,bottomBoundary?:HTMLElement):void {
  let owner:HTMLElement|undefined
  for(let parent=element.parentElement;parent&&parent!==document.body;parent=parent.parentElement){if(/auto|scroll/.test(getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight){owner=parent;break}}
  const view=window.visualViewport,top=owner?.getBoundingClientRect().top??view?.offsetTop??0
  const bottom=Math.min(owner?.getBoundingClientRect().bottom??(view?(view.offsetTop+view.height):innerHeight),bottomBoundary?.getBoundingClientRect().top??Infinity)-8
  const box=element.getBoundingClientRect(),delta=box.bottom>bottom?box.bottom-bottom:box.top<top?box.top-top:0
  if(delta){const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';if(owner)owner.scrollBy({top:delta,behavior});else window.scrollBy({top:delta,behavior})}
}
