export interface SheetViewport { height: number; offsetTop: number; bottomOffset: number; keyboardOverlap: number }
export interface SheetViewportState { stableHeight: number; layoutWidth: number; keyboardOpen: boolean; viewport: SheetViewport }
export interface SheetViewportInput { height: number; offsetTop: number; layoutHeight: number; layoutWidth: number; editing: boolean; layoutResize?: boolean; scale?: number }
const closedViewport = (height: number): SheetViewport => ({ height: Math.max(120, height), offsetTop: 0, bottomOffset: 0, keyboardOverlap: 0 })
/** Toolbar movement is not keyboard evidence. Focus + substantial occlusion opens; geometry closes. */
export function computeSheetViewportState(previous: SheetViewportState | undefined, input: SheetViewportInput): SheetViewportState {
  const resized = !previous || Math.abs(previous.layoutWidth - input.layoutWidth) > 1 || input.layoutResize
  const stableHeight = resized ? Math.max(120, input.layoutHeight) : previous.stableHeight
  const occlusion = Math.max(0, stableHeight - input.height - Math.max(0, input.offsetTop))
  // Keep keyboard mode during blur/keyboard dismissal animation, until geometry is actually clear.
  const wasOpen = previous?.keyboardOpen ?? false
  const keyboardOpen = (input.scale ?? 1) <= 1.05 && (wasOpen ? occlusion > 80 : input.editing && occlusion >= 140)
  const viewport = keyboardOpen ? { height: Math.max(120, input.height), offsetTop: Math.max(0, input.offsetTop), bottomOffset: occlusion, keyboardOverlap: occlusion } : closedViewport(stableHeight)
  return { stableHeight, layoutWidth: input.layoutWidth, keyboardOpen, viewport }
}
/** Stateless compatibility helper for callers/tests; the controller retains hysteresis state. */
export function sheetViewport(height: number, offsetTop: number, layoutHeight: number, editing: boolean): SheetViewport {
  return computeSheetViewportState(undefined, { height, offsetTop, layoutHeight, layoutWidth: 0, editing }).viewport
}
