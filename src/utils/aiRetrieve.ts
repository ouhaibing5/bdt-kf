import type { KnowledgeItem, AiReplyResult, AiRetrieveHit } from '@/types/knowledge'
import type { QuickReplyItem } from '@/types/quickReply'
import type { Session } from '@/types/chat'

const INTENT_RULES: { intent: string; words: string[] }[] = [
  {
    intent: '尾程单号查询',
    words: ['尾程', '面单', '尾程单号', '查询网址', '轨迹查询', '官网查询', '查询链接'],
  },
  {
    intent: '订单状态查询',
    words: ['状态', '目前', '进度', '到哪一步', 'als'],
  },
  { intent: '轨迹查询', words: ['轨迹', '物流', '到哪', '派送', '签收', '更新', '催', '多久', '时效'] },
  { intent: '清关报关', words: ['清关', '查验', '关税', 'vat', '税号', '补料', '扣关'] },
  { intent: '费用报价', words: ['费用', '运费', '多少钱', '计费', '体积', '附加费', '偏远', '报价'] },
  { intent: 'FBA头程', words: ['fba', '亚马逊', '仓库', '箱唛', '预约', '上架'] },
  { intent: '异常理赔', words: ['丢件', '破损', '损坏', '少件', '理赔', '丢失'] },
  { intent: '地址问题', words: ['地址', '改址', '退件', '重派', '邮编'] },
  { intent: '禁运政策', words: ['禁运', '电池', '违禁', '敏感', '带电'] },
  { intent: '产品咨询', words: ['专线', '国际快递', '空派', '海运', '线路', '产品'] },
]

const TRACK_URLS: Record<string, string> = {
  UPS: 'https://www.ups.com/track',
  USPS: 'https://tools.usps.com/go/TrackConfirmAction',
  FedEx: 'https://www.fedex.com/fedextrack/',
  YunExpress: 'https://www.yuntrack.com/',
  DHL: 'https://www.dhl.com/global-en/home/tracking.html',
}

export function extractAlsOrderNo(text: string) {
  const m = text.match(/ALS\d{8,}/i)
  return m ? m[0].toUpperCase() : ''
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function detectIntent(question: string) {
  const q = question.toLowerCase()
  let best = { intent: '综合咨询', score: 0 }
  for (const rule of INTENT_RULES) {
    let score = 0
    for (const w of rule.words) {
      if (q.includes(w.toLowerCase())) score += 1
    }
    if (score > best.score) best = { intent: rule.intent, score }
  }
  return best.intent
}

function scoreText(question: string, corpus: string, extraWords: string[] = []) {
  const q = question.toLowerCase()
  const tokens = new Set([...tokenize(question), ...extraWords.map((w) => w.toLowerCase())])
  let score = 0
  const hay = corpus.toLowerCase()

  for (const t of tokens) {
    if (t.length < 2) continue
    if (hay.includes(t)) score += t.length >= 4 ? 3 : 2
  }
  for (const w of extraWords) {
    if (q.includes(w.toLowerCase())) score += 4
  }
  return score
}

export function retrieveForAi(params: {
  question: string
  knowledge: KnowledgeItem[]
  quickReplies: QuickReplyItem[]
  topN?: number
}): { intent: string; hits: AiRetrieveHit[] } {
  const { question, knowledge, quickReplies, topN = 4 } = params
  const intent = detectIntent(question)
  const hits: AiRetrieveHit[] = []

  for (const item of knowledge.filter((k) => k.enabled)) {
    const score =
      scoreText(
        question,
        `${item.title} ${item.content} ${item.tags.join(' ')}`,
        item.keywords,
      ) + (item.tags.some((t) => question.includes(t)) ? 2 : 0)
    if (score > 0) {
      hits.push({
        type: 'knowledge',
        id: item.id,
        title: item.title,
        content: item.content,
        score,
        tags: item.tags,
      })
    }
  }

  for (const item of quickReplies.filter((q) => q.enabled)) {
    // 结束语 / 开场在非对应意图时降权
    let bias = 0
    if (item.tags.includes('结束') && intent !== '综合咨询') bias -= 3
    if (item.tags.includes('开场') && question.length > 8) bias -= 2
    if (item.tags.some((t) => question.includes(t))) bias += 3

    const score =
      scoreText(question, `${item.title} ${item.content} ${item.tags.join(' ')}`, item.tags) +
      bias
    if (score > 0) {
      hits.push({
        type: 'quickReply',
        id: item.id,
        title: item.title,
        content: item.content,
        score,
        tags: item.tags,
      })
    }
  }

  hits.sort((a, b) => b.score - a.score)
  return { intent, hits: hits.slice(0, topN) }
}

function fillVars(
  template: string,
  session: Session,
  extras?: { orderNo?: string; trackingNo?: string; courier?: string; trackUrl?: string },
) {
  return template
    .replace(/\{客户名\}/g, session.customerName)
    .replace(
      /\{订单号\}/g,
      extras?.orderNo || session.orderNo || '（请提供订单号）',
    )
    .replace(
      /\{运单号\}/g,
      extras?.trackingNo || session.trackingNo || '（暂无尾程单号）',
    )
    .replace(/\{快递公司\}/g, extras?.courier || session.courier || '承运渠道')
    .replace(
      /\{轨迹网址\}/g,
      extras?.trackUrl ||
        TRACK_URLS[extras?.courier || session.courier] ||
        'https://www.17track.net/',
    )
}

export function buildAiReply(params: {
  question: string
  session: Session
  knowledge: KnowledgeItem[]
  quickReplies: QuickReplyItem[]
}): AiReplyResult {
  const { intent, hits } = retrieveForAi({
    question: params.question,
    knowledge: params.knowledge,
    quickReplies: params.quickReplies,
    topN: 4,
  })

  const askedOrder = extractAlsOrderNo(params.question)
  const orderNo = askedOrder || params.session.orderNo
  const trackingNo = params.session.trackingNo
  const courier = params.session.courier
  const trackUrl = TRACK_URLS[courier] || 'https://www.17track.net/'
  const orderStatus = params.session.orders[0]?.status || '运输中'

  const kbHit = hits.find((h) => h.type === 'knowledge')
  const qrHit = hits.find((h) => h.type === 'quickReply')

  const greeting = `${params.session.customerName}您好，我是八达通智能客服助手。`
  let body = ''

  if (
    intent === '尾程单号查询' ||
    /尾程|面单|轨迹查询的网址|查询网址|查询链接/.test(params.question)
  ) {
    body = [
      `已为您查询订单 ${orderNo || '（未识别到 ALS 单号）'}：`,
      `1）尾程快递：${courier || '待交邮'}`,
      `2）尾程单号：${trackingNo || '暂未生成，交邮后会同步'}`,
      `3）轨迹查询网址：${trackUrl}`,
      params.question.includes('面单')
        ? '4）面单：系统可导出 PDF 面单，请确认收件信息无误后我再发送下载链接。'
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  } else if (
    intent === '订单状态查询' ||
    (/状态|目前|进度/.test(params.question) && /ALS/i.test(params.question))
  ) {
    body = `订单 ${orderNo} 当前状态：${orderStatus}。\n尾程单号：${trackingNo || '暂无'}（${courier || '渠道待定'}）\n轨迹查询：${trackUrl}`
  } else if (qrHit) {
    body = fillVars(qrHit.content, params.session, {
      orderNo,
      trackingNo,
      courier,
      trackUrl,
    })
  } else if (kbHit) {
    body = `关于「${intent}」，为您说明：${kbHit.content}`
  } else {
    body =
      '已收到您的问题。请提供 ALS 订单号，我可以帮您查询尾程单号、面单、订单状态或轨迹链接。'
  }

  if (qrHit && kbHit && intent !== '尾程单号查询' && intent !== '订单状态查询') {
    const brief = kbHit.content.slice(0, 72).replace(/\s+/g, '')
    body += `\n\n补充说明（知识库·${kbHit.title}）：${brief}${kbHit.content.length > 72 ? '…' : ''}`
  }

  const reply = `${greeting}\n${body}\n\n如需导出面单或转人工催查，请直接告诉我。`

  return { reply, hits, intent }
}
