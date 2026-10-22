import { describe, expect, it } from 'vitest'
import { adjacentSwipe, shouldCommitSwipe, swipeAxis } from '../src/ui/horizontalNavigation'
import { shiftLocalDate } from '../src/utils/date'

describe('independent presentation gesture decisions', () => {
  it.each([[0,0,'pending'],[11,0,'pending'],[20,3,'horizontal'],[-20,3,'horizontal'],[20,19,'vertical'],[3,-20,'vertical'],[13,10,'pending']])('arbitrates dx=%s dy=%s', (x,y,axis) => {
    expect(swipeAxis(x as number,y as number)).toBe(axis)
  })
  it.each([[100,0,false],[110,0,true],[-110,0,true],[39,2,false],[40,.49,true],[-40,-.49,true],[40,-1,false],[40,.48,false],[20,5,false]])('resolves distance=%s velocity=%s without a spurious commit', (distance,velocity,result) => {
    expect(shouldCommitSwipe(distance as number,velocity as number,390)).toBe(result)
  })
  it.each([[0,100,0],[4,-100,4],[0,-900,1],[3,-900,4],[4,900,3],[2,-1,3],[2,1,1]])('clamps one adjacent route %s/%s', (index,dx,target) => {
    expect(adjacentSwipe(index,dx,5)).toBe(target)
  })
  it.each([['2026-12-31',1,'2027-01-01'],['2026-01-01',-1,'2025-12-31'],['2028-02-28',1,'2028-02-29'],['2026-03-08',1,'2026-03-09'],['2026-11-01',-1,'2026-10-31']])('retains local calendar dates %s', (date,delta,next) => {
    expect(shiftLocalDate(date as string,delta as number)).toBe(next)
  })
})
