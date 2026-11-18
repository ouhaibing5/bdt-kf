import { queryLogisticsOrder, normalizeAlsNo } from '@/mock/logisticsOrders'
import type { EmailMessage } from '@/types/email'
import type { CompensationRecord } from '@/types/compensation'
import type { TicketItem } from '@/types/ticket'
import type {
  EvidenceCheck,
  ReportEvent,
  ReportMetric,
  ServiceReport,
} from '@/types/report'

const ISSUE_RULES: { issue: string; words: string[] }[] = [
  { issue: '丢件/丢失', words: ['丢件', '丢失', 'lost', '没收到', '未收到'] },
  { issue: '运输破损', words: ['破损', '损坏', 'damage'] },
  { issue: '清关异常', words: ['清关', '查验', '扣关', '关税', 'customs'] },
  { issue: '地址问题', words: ['地址', '改址', '邮编', 'address'] },
  { issue: '催件/时效', words: ['催', '加急', '多久', '还没', '太慢', 'urgent'] },
  { issue: '索赔/理赔', words: ['索赔', '理赔', '赔付', 'claim', 'compensation'] },
  { issue: '签收少件', words: ['少件', '短装', 'missing'] },
]

function parseTime(s: string) {
  return new Date(s.replace(/-/g, '/')).getTime()
}

function normalizeTime(s: string) {
  return s.replace(/\//g, '-')
}

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function detectIssues(corpus: string) {
  const text = corpus.toLowerCase()
  return ISSUE_RULES.filter((r) =>
    r.words.some((w) => text.includes(w.toLowerCase())),
  ).map((r) => r.issue)
}

/** 首封收件 → 线程内其后首封发件的响应时长（小时，取各线程最快值） */
function firstResponseHours(emails: EmailMessage[]) {
  let best = Infinity
  const threads = new Map<string, EmailMessage[]>()
  for (const m of emails) {
    const list = threads.get(m.threadId) || []
    list.push(m)
    threads.set(m.threadId, list)
  }
  for (const list of threads.values()) {
    const sorted = list.slice().sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    const firstIn = sorted.find((m) => m.direction === 'in')
    if (!firstIn) continue
    const firstOut = sorted.find(
      (m) => m.direction === 'out' && m.sentAt > firstIn.sentAt,
    )
    if (!firstOut) continue
    const hours =
      (parseTime(firstOut.sentAt) - parseTime(firstIn.sentAt)) / 3600000
    if (hours >= 0 && hours < best) best = hours
  }
  return best === Infinity ? null : best
}

export function generateServiceReport(params: {
  alsNo: string
  emails: EmailMessage[]
  compensations: CompensationRecord[]
  tickets: TicketItem[]
}): ServiceReport | null {
  const alsNo = normalizeAlsNo(params.alsNo)
  const order = queryLogisticsOrder(alsNo)
  if (!order) return null

  const { emails, compensations, tickets } = params
  const events: ReportEvent[] = []

  for (const t of order.tracks) {
    events.push({
      time: normalizeTime(t.time),
      source: '轨迹',
      title: `${t.status} · ${t.location}`,
      detail: t.desc,
      actor: order.courier,
    })
  }
  for (const l of order.logs) {
    events.push({
      time: normalizeTime(l.time),
      source: '日志',
      title: l.action,
      detail: l.detail,
      actor: l.operator,
    })
  }
  for (const m of emails) {
    events.push({
      time: m.sentAt,
      source: '邮件',
      title: `${m.direction === 'in' ? '收到客户邮件' : '客服回复邮件'} · ${m.subject}`,
      detail: m.body,
      actor:
        m.direction === 'in'
          ? `${m.customerName}（${m.customerEmail}）`
          : m.agentName || '客服',
      highlight: m.direction === 'in' && !m.replied,
    })
  }
  for (const c of compensations) {
    events.push({
      time: normalizeTime(c.registerTime),
      source: '赔付',
      title: `赔付登记 · ${c.compensationType}（${c.ticketNo}）`,
      detail: `${c.reason}\n责任方：${c.responsibleParty}；赔付总额 ¥${c.totalAmountCny.toFixed(2)}（货值 ¥${c.goodsAmountCny.toFixed(2)} + 运费 ¥${c.freightAmountCny.toFixed(2)}）`,
      actor: c.createdBy,
    })
  }
  for (const t of tickets) {
    events.push({
      time: normalizeTime(t.caseGmtCreate),
      source: '工单',
      title: `工单创建 · ${t.taskTypeName || t.templateName || t.caseId}`,
      detail: `${t.emailTitle || t.questionInfo}\n工单状态：${t.caseStatus}；任务状态：${t.taskStatus}`,
      actor: t.servicerRealName || t.servicerName,
    })
    for (const r of t.replies || []) {
      events.push({
        time: normalizeTime(r.createdAt),
        source: '工单',
        title: `工单回复 · ${r.channel === 'phone' ? '电话沟通' : '邮件回复'}（${t.caseId}）`,
        detail: r.phoneNo ? `${r.content}\n联系号码：${r.phoneNo}` : r.content,
        actor: r.agentName,
      })
    }
  }
  events.sort((a, b) => a.time.localeCompare(b.time))

  const inbound = emails.filter((m) => m.direction === 'in')
  const outbound = emails.filter((m) => m.direction === 'out')
  const unreplied = inbound.filter((m) => !m.replied)
  const replyRate = inbound.length
    ? Math.round(((inbound.length - unreplied.length) / inbound.length) * 100)
    : 100
  const respHours = firstResponseHours(emails)
  const compensationTotal = compensations.reduce(
    (s, c) => s + c.totalAmountCny,
    0,
  )
  const customerName =
    emails[0]?.customerName || compensations[0]?.customerName || '客户'

  const corpus = [
    ...emails.map((m) => `${m.subject} ${m.body}`),
    ...compensations.map((c) => `${c.compensationType} ${c.reason}`),
    ...tickets.map((t) => `${t.emailTitle} ${t.questionInfo} ${t.tags.join(' ')}`),
  ].join('\n')
  const issues = detectIssues(corpus)
  const hasClaim = issues.includes('索赔/理赔') || compensations.length > 0

  const metrics: ReportMetric[] = [
    { label: '服务动作总数', value: String(events.length), hint: '轨迹/日志/邮件/赔付/工单' },
    {
      label: '邮件往来',
      value: `${emails.length} 封`,
      hint: `收 ${inbound.length} / 发 ${outbound.length}`,
    },
    {
      label: '首次响应时长',
      value: respHours === null ? '—' : `${respHours.toFixed(1)} 小时`,
      hint: respHours === null ? '暂无可计算的回复' : '首封收件 → 首封回复',
      tone: respHours === null ? undefined : respHours <= 24 ? 'ok' : 'warn',
    },
    {
      label: '邮件回复率',
      value: `${replyRate}%`,
      hint: `${inbound.length - unreplied.length}/${inbound.length} 封已回复`,
      tone: replyRate === 100 ? 'ok' : replyRate >= 60 ? 'warn' : 'danger',
    },
    {
      label: '未回复邮件',
      value: String(unreplied.length),
      hint: unreplied.length ? '存在服务闭环缺口' : '全部闭环',
      tone: unreplied.length ? 'danger' : 'ok',
    },
    {
      label: '关联赔付',
      value: compensations.length
        ? `${compensations.length} 笔 / ¥${compensationTotal.toFixed(2)}`
        : '无',
      hint: compensations.length ? '含赔付工单留痕' : '未登记赔付',
    },
  ]

  const analysis: string[] = []
  const span =
    events.length > 1
      ? `${events[0].time} 至 ${events[events.length - 1].time}`
      : events[0]?.time || '—'
  analysis.push(
    `订单 ${alsNo} 由 ${order.courier} 承运（尾程单号 ${order.trackingNo}，转运单号 ${order.transferNo}），当前状态「${order.status}」。系统共聚合 ${events.length} 条服务动作，时间跨度 ${span}，覆盖物流轨迹 ${order.tracks.length} 条、内部操作日志 ${order.logs.length} 条、客户邮件 ${emails.length} 封、赔付登记 ${compensations.length} 笔、关联工单 ${tickets.length} 个。`,
  )
  analysis.push(
    issues.length
      ? `基于邮件主题/正文、工单描述与赔付原因的关键信息识别，本订单涉及以下问题类型：${issues.join('、')}。相关问题均有对应沟通或处理留痕，可在下方时间线中逐条核对。`
      : '未在邮件、工单与赔付记录中识别到明显异常诉求，订单服务过程以常规查询与状态同步为主。',
  )
  if (emails.length) {
    const respText =
      respHours === null
        ? '尚无可计算的客服回复'
        : `首次响应耗时 ${respHours.toFixed(1)} 小时${respHours <= 24 ? '，满足 24 小时响应要求' : '，超过 24 小时响应基准，建议在举证材料中补充说明'}`
    analysis.push(
      `客户共来信 ${inbound.length} 封，客服发出 ${outbound.length} 封，回复率 ${replyRate}%，${respText}。${
        unreplied.length
          ? `仍有 ${unreplied.length} 封收件未回复：${unreplied.map((m) => `「${m.subject}」（${m.sentAt}）`).join('、')}，建议先行回复闭环后再提交举证。`
          : '全部收件均已回复，沟通链路完整闭环。'
      }`,
    )
  } else {
    analysis.push('该订单暂无邮件往来记录，客户沟通举证依赖在线会话与工单留痕。')
  }
  if (compensations.length) {
    analysis.push(
      `已登记赔付 ${compensations.length} 笔，合计 ¥${compensationTotal.toFixed(2)}，赔付类型：${Array.from(new Set(compensations.map((c) => c.compensationType))).join('、')}；责任方认定：${Array.from(new Set(compensations.map((c) => c.responsibleParty))).join('、')}。赔付工单号可作为平台理赔流程的关联凭证。`,
    )
  }
  if (tickets.length) {
    const ticketReplies = tickets.flatMap((t) => t.replies || [])
    const phoneCount = ticketReplies.filter((r) => r.channel === 'phone').length
    analysis.push(
      `关联工单 ${tickets.length} 个（${tickets.map((t) => t.caseId).join('、')}），当前状态：${Array.from(new Set(tickets.map((t) => t.caseStatus))).join('、')}，处理人：${Array.from(new Set(tickets.map((t) => t.servicerRealName || t.servicerName))).join('、')}。${
        ticketReplies.length
          ? `工单回复留痕 ${ticketReplies.length} 条（电话沟通 ${phoneCount} / 邮件回复 ${ticketReplies.length - phoneCount}）。`
          : ''
      }`,
    )
  }

  const evidenceChecks: EvidenceCheck[] = [
    {
      label: '物流轨迹凭证',
      ok: order.tracks.length > 0,
      detail: `${order.tracks.length} 条轨迹，含出库/清关/尾程节点`,
    },
    {
      label: '内部操作日志',
      ok: order.logs.length > 0,
      detail: `${order.logs.length} 条日志，含操作人与时间`,
    },
    {
      label: '客户沟通凭证',
      ok: emails.length > 0 || tickets.length > 0,
      detail: `邮件 ${emails.length} 封 / 工单 ${tickets.length} 个`,
    },
    {
      label: '邮件回复闭环',
      ok: unreplied.length === 0,
      detail: unreplied.length
        ? `${unreplied.length} 封收件未回复`
        : '全部收件已回复',
    },
    {
      label: '赔付登记凭证',
      ok: compensations.length > 0 || !hasClaim,
      detail: compensations.length
        ? `${compensations.length} 笔，合计 ¥${compensationTotal.toFixed(2)}`
        : hasClaim
          ? '存在索赔诉求但未登记赔付'
          : '无索赔诉求，无需赔付登记',
    },
  ]

  const risks: string[] = []
  if (unreplied.length)
    risks.push(
      `${unreplied.length} 封客户邮件未回复，平台可能认定服务未闭环，建议回复后再举证。`,
    )
  if (hasClaim && !compensations.length)
    risks.push('客户已提出索赔诉求但系统未登记赔付，建议补充赔付登记留痕。')
  if (respHours !== null && respHours > 24)
    risks.push(`首次响应 ${respHours.toFixed(1)} 小时，超出 24 小时基准。`)
  if (!emails.length)
    risks.push('缺少邮件沟通凭证，举证材料完整性受限。')

  const conclusion = [
    `截至 ${nowStamp()}，订单 ${alsNo}（${order.courier} · ${order.trackingNo}）在八达通客服系统内共留存 ${events.length} 条可追溯服务动作，覆盖物流轨迹、内部操作日志、客户邮件往来${compensations.length ? '、赔付登记' : ''}${tickets.length ? '、工单处理' : ''}，时间跨度 ${span}。`,
    unreplied.length
      ? `其中 ${unreplied.length} 封客户收件尚未回复，服务闭环存在缺口，已在风险提示中标注。`
      : '客户诉求均有对应回复与处理记录，服务链路完整闭环。',
    '本报告由系统自动聚合各业务模块留痕生成，所有时间节点与操作人均来自系统原始记录，可作为向平台提交的举证材料；配套轨迹明细、邮件原文与赔付工单号见报告正文。',
  ].join('')

  return {
    alsNo,
    generatedAt: nowStamp(),
    order,
    customerName,
    events,
    metrics,
    issues,
    analysis,
    evidenceChecks,
    conclusion,
    risks,
  }
}

function stamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function exportServiceReportMarkdown(report: ServiceReport) {
  const lines: string[] = [
    `# 订单服务报告（平台举证） · ${report.alsNo}`,
    '',
    `- 生成时间：${report.generatedAt}`,
    `- 客户：${report.customerName}`,
    `- 承运渠道：${report.order.courier}`,
    `- 尾程单号：${report.order.trackingNo}`,
    `- 转运单号：${report.order.transferNo}`,
    `- 当前状态：${report.order.status}`,
    `- 轨迹查询：${report.order.trackUrl}`,
    '',
    '## 一、服务指标',
    '',
    '| 指标 | 数值 | 说明 |',
    '| --- | --- | --- |',
    ...report.metrics.map(
      (m) => `| ${m.label} | ${m.value} | ${m.hint || ''} |`,
    ),
    '',
    '## 二、AI 分析',
    '',
    ...(report.issues.length
      ? [`**识别问题类型：** ${report.issues.join('、')}`, '']
      : []),
    ...report.analysis.flatMap((p) => [p, '']),
    '## 三、举证完整性核查',
    '',
    ...report.evidenceChecks.map(
      (c) => `- [${c.ok ? 'x' : ' '}] ${c.label}：${c.detail}`,
    ),
    '',
    '## 四、举证结论',
    '',
    report.conclusion,
    '',
    ...(report.risks.length
      ? ['## 五、风险提示', '', ...report.risks.map((r) => `- ${r}`), '']
      : []),
    `## ${report.risks.length ? '六' : '五'}、完整服务时间线（${report.events.length} 条）`,
    '',
    '| 时间 | 来源 | 动作 | 操作方 | 详情 |',
    '| --- | --- | --- | --- | --- |',
    ...report.events.map(
      (e) =>
        `| ${e.time} | ${e.source}${e.highlight ? '（未回复）' : ''} | ${e.title} | ${e.actor || '—'} | ${e.detail.replace(/\n/g, '<br>')} |`,
    ),
    '',
    '---',
    '本报告由八达通智能客服系统自动生成（演示数据）。',
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/markdown;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `服务报告_${report.alsNo}_${stamp()}.md`
  a.click()
  URL.revokeObjectURL(url)
}