import type {
  CompensationOrderBase,
  CompensationRecord,
} from '@/types/compensation'

/** 按「下单日期」取汇率（演示：按日近似 USD→CNY） */
const RATE_BY_DAY: Record<string, number> = {
  '2026-10-09': 7.12,
  '2026-10-10': 7.13,
  '2026-10-11': 7.11,
  '2026-10-12': 7.14,
  '2026-10-13': 7.15,
  '2026-10-15': 7.1,
  '2026-10-18': 7.16,
  '2026-10-20': 7.12,
  '2026-10-25': 7.18,
  '2026-10-27': 7.17,
  '2026-10-28': 7.19,
}

export function getExchangeRateByOrderDate(orderTime: string): number {
  const day = orderTime.slice(0, 10)
  if (RATE_BY_DAY[day]) return RATE_BY_DAY[day]
  // 未命中演示表：用稳定伪随机，便于任意日期演示
  const seed = day.replace(/-/g, '')
  const n = Number(seed.slice(-4)) || 1000
  return Number((7.05 + (n % 20) / 100).toFixed(4))
}

export function roundCny(n: number) {
  return Math.round(n * 100) / 100
}

/** 赔付金额：申报货值 * 下单日汇率 + 运费（CNY，保留 2 位） */
export function calcCompensationAmounts(params: {
  declaredValue: number
  exchangeRate: number
  freightCny: number
}) {
  const goodsAmountCny = roundCny(params.declaredValue * params.exchangeRate)
  const freightAmountCny = roundCny(params.freightCny)
  const totalAmountCny = roundCny(goodsAmountCny + freightAmountCny)
  return { goodsAmountCny, freightAmountCny, totalAmountCny }
}

const ORDER_BASE: Record<string, CompensationOrderBase> = {
  ALS02010204573: {
    alsNo: 'ALS02010204573',
    orderTime: '2026-10-09 10:12:00',
    trackingNo: '1Z999AA10123456784',
    transferNo: 'TRF-SZ-884210',
    courier: 'UPS',
    currency: 'USD',
    declaredValue: 186.5,
    freightCny: 89.0,
    customerName: '禹逸飞',
  },
  ALS02010204572: {
    alsNo: 'ALS02010204572',
    orderTime: '2026-10-10 14:20:00',
    trackingNo: '9400111899223344556677',
    transferNo: 'TRF-SZ-884198',
    courier: 'USPS',
    currency: 'USD',
    declaredValue: 92.0,
    freightCny: 65.5,
    customerName: '赵敏',
  },
  ALS02012985866: {
    alsNo: 'ALS02012985866',
    orderTime: '2026-10-12 09:05:00',
    trackingNo: '778899001122',
    transferNo: 'TRF-GZ-772901',
    courier: 'FedEx',
    currency: 'USD',
    declaredValue: 240.0,
    freightCny: 128.0,
    customerName: '陈建国',
  },
  ALS02011890321: {
    alsNo: 'ALS02011890321',
    orderTime: '2026-10-15 16:40:00',
    trackingNo: 'YT2490123456789',
    transferNo: 'TRF-SZ-661002',
    courier: 'YunExpress',
    currency: 'USD',
    declaredValue: 55.8,
    freightCny: 42.0,
    customerName: '韩雪',
  },
  ALS02011543210: {
    alsNo: 'ALS02011543210',
    orderTime: '2026-10-18 11:22:00',
    trackingNo: 'JD0146000123456789',
    transferNo: 'TRF-SZ-441220',
    courier: 'DHL',
    currency: 'USD',
    declaredValue: 310.25,
    freightCny: 156.8,
    customerName: '刘洋',
  },
}

export function queryCompensationOrderBase(
  alsNo: string,
): CompensationOrderBase | null {
  const key = alsNo.trim().toUpperCase()
  if (!key) return null
  if (ORDER_BASE[key]) return structuredClone(ORDER_BASE[key])
  if (/^ALS\d{8,}$/i.test(key)) {
    const suffix = key.slice(-4)
    const day = `2026-10-${String(10 + (Number(suffix) % 18)).padStart(2, '0')}`
    return {
      alsNo: key,
      orderTime: `${day} 10:00:00`,
      trackingNo: `1ZDEMO${suffix}${suffix}`,
      transferNo: `TRF-DEMO-${suffix}`,
      courier: 'UPS',
      currency: 'USD',
      declaredValue: roundCny(80 + (Number(suffix) % 200)),
      freightCny: roundCny(40 + (Number(suffix) % 80)),
    }
  }
  return null
}

function amountsFor(base: CompensationOrderBase) {
  const exchangeRate = getExchangeRateByOrderDate(base.orderTime)
  return {
    exchangeRate,
    ...calcCompensationAmounts({
      declaredValue: base.declaredValue,
      exchangeRate,
      freightCny: base.freightCny,
    }),
  }
}

const o1 = ORDER_BASE.ALS02010204573
const a1 = amountsFor(o1)
const o2 = ORDER_BASE.ALS02012985866
const a2 = amountsFor(o2)
const o3 = ORDER_BASE.ALS02011543210
const a3 = amountsFor(o3)

export const mockCompensations: CompensationRecord[] = [
  {
    id: 'cp1',
    orderTime: o1.orderTime,
    registerTime: '2026-10-28 15:20:11',
    alsNo: o1.alsNo,
    trackingNo: o1.trackingNo,
    transferNo: o1.transferNo,
    responsibleParty: '尾程承运商',
    compensationType: '尾程丢件',
    reason: '尾程扫描后失联，渠道确认无法找回',
    declaredValue: o1.declaredValue,
    currency: o1.currency,
    exchangeRate: a1.exchangeRate,
    goodsAmountCny: a1.goodsAmountCny,
    freightAmountCny: a1.freightAmountCny,
    totalAmountCny: a1.totalAmountCny,
    ticketNo: 'PF20261028001',
    createdBy: '林依依',
    customerName: o1.customerName,
    sessionId: 's2',
  },
  {
    id: 'cp2',
    orderTime: o2.orderTime,
    registerTime: '2026-10-27 11:08:44',
    alsNo: o2.alsNo,
    trackingNo: o2.trackingNo,
    transferNo: o2.transferNo,
    responsibleParty: '清关行',
    compensationType: '海关查验超时',
    reason: '查验超期导致客户投诉索赔',
    declaredValue: o2.declaredValue,
    currency: o2.currency,
    exchangeRate: a2.exchangeRate,
    goodsAmountCny: a2.goodsAmountCny,
    freightAmountCny: a2.freightAmountCny,
    totalAmountCny: a2.totalAmountCny,
    ticketNo: 'PF20261027008',
    createdBy: '林依依',
    customerName: o2.customerName,
  },
  {
    id: 'cp3',
    orderTime: o3.orderTime,
    registerTime: '2026-10-26 09:33:02',
    alsNo: o3.alsNo,
    trackingNo: o3.trackingNo,
    transferNo: o3.transferNo,
    responsibleParty: '尾程承运商',
    compensationType: '运输破损',
    reason: '外箱严重破损，内件部分损坏',
    declaredValue: o3.declaredValue,
    currency: o3.currency,
    exchangeRate: a3.exchangeRate,
    goodsAmountCny: a3.goodsAmountCny,
    freightAmountCny: a3.freightAmountCny,
    totalAmountCny: a3.totalAmountCny,
    ticketNo: 'PF20261026015',
    createdBy: '林依依',
    customerName: o3.customerName,
  },
]
