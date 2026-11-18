import type { LogisticsOrder } from '@/mock/logisticsOrders'
import type { TicketItem } from '@/types/ticket'

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

/** 报告中的工单举证条目：本单工单 / 同客户其他工单 */
export interface ReportTicket {
  ticket: TicketItem
  relation: '本单工单' | '客户其他工单'
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
  /** 客户工单举证（含同客户其他订单工单） */
  tickets: ReportTicket[]
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