export interface ActiveHashtagQuery { query: string; start: number; end: number }

export function normalizeTaskTagName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase()
}

export function validateTaskTagName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('标签名称需为 1–24 字符')
  const name = value.trim()
  if (!name || name.length > 24) throw new Error('标签名称需为 1–24 字符')
  if (name.includes('#')) throw new Error('标签名称不用输入 #')
  if (/\s/u.test(name.normalize('NFKC'))) throw new Error('标签名称不能包含空格')
  return name
}

export function findActiveHashtagQuery(text: string, caret: number): ActiveHashtagQuery | undefined {
  if (caret < 0 || caret > text.length) return undefined
  const before = text.slice(0, caret)
  const match = /(^|\s)#([^\s#]*)$/u.exec(before)
  if (!match) return undefined
  const start = caret - match[2]!.length - 1
  let end = caret
  while (end < text.length && !/[\s#]/u.test(text[end]!)) end += 1
  return { query: match[2]!, start, end }
}

export function replaceActiveHashtagQuery(text: string, token: ActiveHashtagQuery): { text: string; caret: number } {
  const before = text.slice(0, token.start).trimEnd()
  const after = text.slice(token.end).trimStart()
  const separator = before && after ? ' ' : ''
  return { text: `${before}${separator}${after}`, caret: before.length + separator.length }
}
