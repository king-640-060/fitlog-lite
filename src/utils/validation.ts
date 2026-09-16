export function finiteNumber(value: unknown, field: string, minimum: number, integer = false): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < minimum || (integer && !Number.isInteger(number))) {
    throw new Error(`${field}格式不正确`)
  }
  return number
}

export function optionalNumber(value: unknown, field: string, minimum: number, maximum?: number): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const number = finiteNumber(value, field, minimum)
  if (maximum !== undefined && number > maximum) throw new Error(`${field}不能大于${maximum}`)
  return number
}

export function requiredText(value: unknown, field: string): string {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`请填写${field}`)
  return text
}
