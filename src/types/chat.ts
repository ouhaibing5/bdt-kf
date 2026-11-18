export type SessionStatus = 'active' | 'waiting' | 'transferred' | 'ended'
export type ReplyMode = 'public' | 'internal'
export type AgentStatus = 'online' | 'break' | 'away'
export type MessageType =
  | 'system'
  | 'customer'
  | 'agent'
  | 'logistics'
  | 'internal'
  | 'summary'

export interface LogisticsTrack {
  time: string
  desc: string
}

export interface LogisticsPayload {
  company: string
  trackingNo: string
  status: string
  tracks: LogisticsTrack[]
}

export interface SummaryPayload {
  category: string
  satisfaction: string
  endedAt: string
}

export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  time: string
  read?: boolean
  logistics?: LogisticsPayload
  summary?: SummaryPayload
  author?: string
}

export interface OrderInfo {
  id: string
  productName: string
  amount: number
  status: string
  createdAt: string
  trackingNo?: string
  courier?: string
}

export interface CustomerProfile {
  level: string
  registerDays: number
  orderCount: number
  totalAmount: number
  tags: string[]
  remark?: string
}

export interface Session {
  id: string
  customerName: string
  avatar: string
  channel: string
  vipLevel: string
  phone: string
  city: string
  device: string
  status: SessionStatus
  lastMessage: string
  lastTime: string
  /** 会话开始时间 YYYY-MM-DD HH:mm:ss，用于历史查询 */
  startedAt: string
  /** 会话结束时间，未结束可为空 */
  endedAt?: string
  agentName?: string
  tags: string[]
  unread: number
  sessionStatusText?: string
  /** 客户待回复计时起点（epoch ms），无待回复时为 null */
  waitingStartedAt?: number | null
  /** AI 接管中 */
  aiTakeover?: boolean
  /** 已发送过首次意图引导菜单 */
  intentMenuSent?: boolean
  /** 等待客户回复问题序号 1-5 */
  awaitingIntentChoice?: boolean
  /** 引导流程关联的 ALS 单号 */
  guidedAlsNo?: string
  orderNo: string
  trackingNo: string
  courier: string
  profile: CustomerProfile
  orders: OrderInfo[]
  messages: ChatMessage[]
}

/** 聊天工具栏 / 自动弹窗类型 */
export type OrderToolType =
  | 'lastMile'
  | 'pod'
  | 'track'
  | 'label'
  | 'logs'

export interface PendingOrderTool {
  type: OrderToolType
  alsNo: string
}

export interface SlaState {
  mode: 'first' | 'round'
  limitSec: number
  elapsedSec: number
  remainSec: number
  overtime: boolean
  level: 'ok' | 'warn' | 'danger'
}
