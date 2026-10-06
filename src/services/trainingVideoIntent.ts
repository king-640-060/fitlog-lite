// Conservative finite aliases, not a medical/exercise recommendation engine.
const aliases: [string, string[]][] = [
  ['杠铃俯身划船', ['杠铃划船', 'bent over barbell row']],
  ['绳索面拉', ['面拉', 'face pull']], ['高位下拉', ['lat pulldown']],
  ['深蹲', ['squat']], ['卧推', ['杠铃卧推', 'bench press']],
  ['硬拉', ['deadlift']], ['引体向上', ['pull up']], ['哑铃弯举', ['dumbbell curl']],
]
export function coreVideoQuery(value: string): string {
  return value.trim().replace(/杠铃俯身划传/g, '杠铃俯身划船')
    .replace(/(?:的)?(?:训练视频|教学视频|动作教学|正确动作|怎么做|示范|教学|视频)[。.!！?？]?$/u, '').trim()
}
export function videoQueryVariants(value: string): string[] {
  const core = coreVideoQuery(value)
  const entry = aliases.find(([name, names]) => name === core || names.includes(core))
  const variants = entry ? [`${core} 动作教学`, ...[entry[0], ...entry[1]].filter(name => name !== core).map(name => `${name} 教学`)] : [`${core} 动作教学`, `${core} 示范`]
  return [...new Set(variants)].slice(0, 3)
}
export function directTrainingVideoIntent(value: string): string | undefined {
  const match = /^(?:请)?(?:(?:帮我|给我)\s*)?(?:搜索|搜一下|搜|找一下|找|给我几个)\s*(.+?)(?:的)?(?:训练视频|教学视频|教学|视频)[。.!！?？]?$/u.exec(value.trim())
  if (!match) return undefined
  const core = coreVideoQuery(match[1]!)
  return aliases.some(([name, names]) => name === core || names.includes(core)) ? core : undefined
}
