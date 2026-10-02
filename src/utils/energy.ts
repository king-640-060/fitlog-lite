export type EnergyUnit = 'kJ' | 'kcal'
export const KJ_PER_KCAL = 4.184
export function energyToKcal(value: number, unit: EnergyUnit): number {
  if (!Number.isFinite(value) || value < 0 || !['kJ', 'kcal'].includes(unit)) throw new Error('能量格式不正确')
  return unit === 'kJ' ? value / KJ_PER_KCAL : value
}
export function kcalToKj(value: number): number { return energyToKcal(value, 'kcal') * KJ_PER_KCAL }
export function kjToKcal(value: number): number { return energyToKcal(value, 'kJ') }
/** Canonical state changes only on numeric edits, never on display-unit changes. */
export class EnergyEditor {
  private canonical: number | null
  unit: EnergyUnit
  constructor(value: number | null, unit: EnergyUnit = 'kcal', canonical?: number | null) {
    this.canonical = canonical === undefined ? value === null ? null : energyToKcal(value, unit) : canonical
    this.unit = unit
  }
  get kcal(): number | null { return this.canonical }
  get value(): number | null { return this.canonical === null ? null : this.unit === 'kcal' ? this.canonical : kcalToKj(this.canonical) }
  edit(value: string): void { this.canonical = value.trim() ? energyToKcal(Number(value), this.unit) : null }
  switchUnit(unit: EnergyUnit): void { this.unit = unit }
}
