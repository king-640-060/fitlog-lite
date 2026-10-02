export type EnergyUnit = 'kJ' | 'kcal'
export const KJ_PER_KCAL = 4.184
export function energyToKcal(value: number, unit: EnergyUnit): number {
  if (!Number.isFinite(value) || value < 0 || !['kJ', 'kcal'].includes(unit)) throw new Error('能量格式不正确')
  return unit === 'kJ' ? value / KJ_PER_KCAL : value
}
export function kcalToKj(value: number): number { return energyToKcal(value, 'kcal') * KJ_PER_KCAL }
