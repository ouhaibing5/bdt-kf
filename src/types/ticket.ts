/** 工单 / 任务状态（对齐超级工单 caseStatus / taskStatus） */
export type CaseStatus = '处理中' | '已完成' | '待分配' | string
export type TaskStatus = '处理中' | '已结束' | '待分配' | string

export type TicketReplyChannel = 'phone' | 'email'

export interface TicketReply {
  id: string
  channel: TicketReplyChannel
  content: string
  agentName: string
  /** YYYY/MM/DD HH:mm:ss，对齐工单时间格式 */
  createdAt: string
  /** 电话沟通时的联系号码 */
  phoneNo?: string
}

export interface TicketItem {
  id: string
  caseId: string
  /** 任务状态 */
  taskStatus: TaskStatus
  /** 工单状态 */
  caseStatus: CaseStatus
  /** 任务优先级（接口 priority） */
  priority: string
  /** 工单优先级 */
  casePriority: string
  channelType: string
  groupName: string
  memberName: string
  memberId: string
  cmsMemberType: string
  servicerName: string
  servicerShowName: string
  servicerRealName: string
  templateName: string
  sopCateName: string
  taskTypeName: string
  caseGmtCreate: string
  caseGmtModified: string
  assignTime: string
  endTime: string
  /** 邮件主题等扩展 */
  emailTitle: string
  fromEmail: string
  /** 从邮件解析的物流订单号，如 ALS0... */
  orderNo: string
  /** 旗帜颜色：1 默认 / 2 红等 */
  flagColor: number
  tags: string[]
  totalUrgeTimes: number
  questionInfo: string
  bizId: string
  /** 客服回复记录（电话/邮件） */
  replies?: TicketReply[]
}
