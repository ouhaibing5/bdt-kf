/** 对齐「阿里赔付模版」赔付类型枚举 */
export const COMPENSATION_TYPES = [
  '尾程丢件',
  '轨迹断更',
  '运输破损',
  '重派失败',
  '签收未收到',
  '包裹被盗',
  '海关查验超时',
  '签收少件',
  '超OTD+20',
] as const

export type CompensationType = (typeof COMPENSATION_TYPES)[number]

export const RESPONSIBLE_PARTIES = [
  '尾程承运商',
  '头程渠道',
  '清关行',
  '仓库',
  '客户',
  '平台',
  '待定',
] as const

export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number]

export interface CompensationRecord {
  id: string
  /** 客户预报下单时间 YYYY-MM-DD HH:mm:ss */
  orderTime: string
  /** 登记时间 */
  registerTime: string
  /** 客户单号 ALS… */
  alsNo: string
  /** 追踪单号 */
  trackingNo: string
  /** 转单号 */
  transferNo: string
  responsibleParty: ResponsibleParty | string
  compensationType: CompensationType
  reason: string
  /** 申报货值（原币，通常 USD） */
  declaredValue: number
  /** 下单日汇率：原币 → CNY */
  exchangeRate: number
  /** 赔付货值金额（CNY）= 申报货值 * 汇率 */
  goodsAmountCny: number
  /** 赔付运费金额（CNY） */
  freightAmountCny: number
  /** 赔付总金额（CNY）= 货值 + 运费 */
  totalAmountCny: number
  /** 赔付工单号 */
  ticketNo: string
  /** 原币种 */
  currency: string
  createdBy: string
  sessionId?: string
  customerName?: string
}

/** 按 ALS 查询到的订单赔付基数（演示） */
export interface CompensationOrderBase {
  alsNo: string
  orderTime: string
  trackingNo: string
  transferNo: string
  courier: string
  currency: string
  declaredValue: number
  freightCny: number
  customerName?: string
}
