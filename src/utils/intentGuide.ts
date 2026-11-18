import { extractAlsFromText } from '@/mock/logisticsOrders'

export type IntentChoice = 1 | 2 | 3 | 4 | 5

export function buildIntentMenu(alsNo: string) {
  return [
    `您好，您提供的 ${alsNo} 单号，是想要查询以下什么问题呢，请回复对应问题序号`,
    '1.是否需要尾程单号',
    '2.是否需要尾程面单',
    '3.是否需要尾程物流联系方式',
    '4.咨询承运类，产品是否能承运、运费问题等',
    '5.其他-转人工客服',
  ].join('\n')
}

/** 解析客户回复的问题序号，如 "1" / "1." / "选1" */
export function parseIntentChoice(text: string): IntentChoice | null {
  const raw = text.trim()
  if (!raw) return null
  const m = raw.match(/^\s*(?:选|回复|我选|选一下)?\s*([1-5])(?:\s*[.。、)）]|$)(?:.*)?$/i)
  if (m) return Number(m[1]) as IntentChoice
  // 纯数字 1-5
  if (/^[1-5]$/.test(raw)) return Number(raw) as IntentChoice
  return null
}

export function resolveAlsForGuide(text: string, fallbackOrderNo?: string) {
  return (
    extractAlsFromText(text) ||
    extractAlsFromText(fallbackOrderNo) ||
    ''
  )
}
