import type { LogisticsOrder } from '@/mock/logisticsOrders'

export type ReportSource = '轨迹' | '日志' | '邮件' | '赔付' | '工单'

export interface ReportEvent {
  /** YYYY-MM-DD HH:mm:ss，可字符串排序 */
  time: string
  source: ReportSource
  title: string
  detail: string
  actor?: string
  /** 未回复收件等需重点关注项 */
  highlight?: boolean
}

export interface ReportMetric {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'warn' | 'danger'
}

export interface EvidenceCheck {
  label: string
  ok: boolean
  detail: string
}

export interface ServiceReport {
  alsNo: string
  generatedAt: string
  order: LogisticsOrder
  customerName: string
  events: ReportEvent[]
  metrics: ReportMetric[]
  issues: string[]
  analysis: string[]
  evidenceChecks: EvidenceCheck[]
  conclusion: string
  risks: string[]
}

/** 历史留存的服务报告（localStorage 持久化） */
export interface SavedReport {
  id: string
  alsNo: string
  customerName: string
  generatedAt: string
  updatedAt: string
  /** 是否经过人工编辑 */
  edited: boolean
  report: ServiceReport
}