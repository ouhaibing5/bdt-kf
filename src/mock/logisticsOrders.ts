export interface TrackRow {
  time: string
  location: string
  status: string
  desc: string
}

export interface OrderLogRow {
  time: string
  operator: string
  action: string
  detail: string
}

export interface LogisticsOrder {
  alsNo: string
  courier: string
  /** 尾程追踪单号 */
  trackingNo: string
  /** 转运单号 */
  transferNo: string
  status: string
  trackUrl: string
  /** 尾程物流联系方式 */
  logisticsContact: string
  tracks: TrackRow[]
  logs: OrderLogRow[]
  /** 尾程面单预览图 */
  labelImage: string
  /** 签收凭证 POD 预览图 */
  podImage: string
}

function svgDataUrl(title: string, subtitle: string, accent: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <rect width="480" height="640" fill="#f8fafc"/>
  <rect x="24" y="24" width="432" height="592" rx="12" fill="#fff" stroke="${accent}" stroke-width="2"/>
  <rect x="24" y="24" width="432" height="72" rx="12" fill="${accent}"/>
  <text x="240" y="68" text-anchor="middle" fill="#fff" font-size="22" font-family="Arial,sans-serif" font-weight="700">${title}</text>
  <rect x="56" y="130" width="368" height="80" fill="#111827"/>
  <g fill="#fff">
    ${Array.from({ length: 18 }, (_, i) => {
      const w = 6 + ((i * 7) % 14)
      return `<rect x="${70 + i * 20}" y="150" width="${w}" height="40" rx="1"/>`
    }).join('')}
  </g>
  <text x="240" y="250" text-anchor="middle" fill="#111827" font-size="16" font-family="Arial,sans-serif">${subtitle}</text>
  <text x="56" y="300" fill="#6b7280" font-size="13" font-family="Arial,sans-serif">Ship From: Shenzhen CN</text>
  <text x="56" y="330" fill="#6b7280" font-size="13" font-family="Arial,sans-serif">Ship To: Los Angeles US</text>
  <text x="56" y="380" fill="#111827" font-size="14" font-family="Arial,sans-serif">Service: EXPRESS</text>
  <text x="56" y="410" fill="#111827" font-size="14" font-family="Arial,sans-serif">Weight: 2.40 KG</text>
  <rect x="56" y="460" width="368" height="110" rx="8" fill="#eff6ff" stroke="#93c5fd"/>
  <text x="240" y="520" text-anchor="middle" fill="#1d4ed8" font-size="15" font-family="Arial,sans-serif">PREVIEW ONLY · DEMO</text>
</svg>`.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function buildOrder(
  alsNo: string,
  courier: string,
  trackingNo: string,
  transferNo: string,
  status: string,
): LogisticsOrder {
  return {
    alsNo,
    courier,
    trackingNo,
    transferNo,
    status,
    trackUrl: `https://www.17track.net/zh-cn#nums=${trackingNo}`,
    logisticsContact: `${courier} 客服 1-800-742-5877 / 轨迹页留言催派`,
    tracks: [
      {
        time: '2026-10-28 16:42:11',
        location: 'Los Angeles, CA',
        status: status,
        desc: `【${courier}】快件派送中，请保持电话畅通`,
      },
      {
        time: '2026-10-27 09:18:03',
        location: 'Los Angeles Hub',
        status: '已提取尾程',
        desc: `尾程单号 ${trackingNo} 已交邮，转运单号 ${transferNo}`,
      },
      {
        time: '2026-10-25 21:05:44',
        location: 'US Customs',
        status: '进口清关完成',
        desc: '进口清关完成，等待尾程提取',
      },
      {
        time: '2026-10-23 08:30:12',
        location: 'LAX Airport',
        status: '抵达目的国',
        desc: '航班抵达目的国机场，等待清关',
      },
      {
        time: '2026-10-20 14:12:56',
        location: 'Shenzhen CN',
        status: '已出库',
        desc: `订单 ${alsNo} 已出库发运`,
      },
    ],
    logs: [
      {
        time: '2026-10-28 16:45:02',
        operator: '系统',
        action: '轨迹同步',
        detail: `同步尾程状态：${status}`,
      },
      {
        time: '2026-10-27 09:20:18',
        operator: '仓配-小周',
        action: '交邮尾程',
        detail: `生成尾程单号 ${trackingNo}，转运单号 ${transferNo}`,
      },
      {
        time: '2026-10-25 21:10:00',
        operator: '清关专员',
        action: '清关放行',
        detail: '进口清关资料齐全，已放行',
      },
      {
        time: '2026-10-20 14:15:33',
        operator: '仓配-阿明',
        action: '出库复核',
        detail: '重量复核通过，生成面单',
      },
      {
        time: '2026-10-19 11:02:41',
        operator: '客服-林依依',
        action: '创建订单',
        detail: `客户下单 ${alsNo}`,
      },
    ],
    labelImage: svgDataUrl('LAST-MILE LABEL', `${alsNo} · ${trackingNo}`, '#2563eb'),
    podImage: svgDataUrl('POD / 签收凭证', `${alsNo} · Signed`, '#0f766e'),
  }
}

const ORDER_MAP: Record<string, LogisticsOrder> = {
  ALS02010204573: buildOrder(
    'ALS02010204573',
    'UPS',
    '1Z999AA10123456784',
    'TRF-SZ-884210',
    '尾程派送中',
  ),
  ALS02010204572: buildOrder(
    'ALS02010204572',
    'USPS',
    '9400111899223344556677',
    'TRF-SZ-884198',
    '运输中',
  ),
  ALS02012985866: buildOrder(
    'ALS02012985866',
    'FedEx',
    '778899001122',
    'TRF-GZ-772901',
    '清关中',
  ),
  ALS02011890321: buildOrder(
    'ALS02011890321',
    'YunExpress',
    'YT2490123456789',
    'TRF-SZ-661002',
    '已提取尾程',
  ),
  ALS02010977654: buildOrder(
    'ALS02010977654',
    'UPS',
    '1Z888BB20987654321',
    'TRF-SZ-559811',
    '进口清关中',
  ),
  ALS02011543210: buildOrder(
    'ALS02011543210',
    'DHL',
    'JD0146000123456789',
    'TRF-SZ-441220',
    '派送中',
  ),
  ALS02012008876: buildOrder(
    'ALS02012008876',
    'USPS',
    '9274890312345678901234',
    'TRF-SZ-330144',
    '待交邮',
  ),
  ALS02010334455: buildOrder(
    'ALS02010334455',
    'FedEx',
    '881122334455',
    'TRF-SZ-220988',
    '派送中',
  ),
}

export function normalizeAlsNo(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}

export function queryLogisticsOrder(alsNo: string): LogisticsOrder | null {
  const key = normalizeAlsNo(alsNo)
  if (!key) return null
  if (ORDER_MAP[key]) return structuredClone(ORDER_MAP[key])

  // 未命中演示库时，按 ALS 号动态生成，便于任意输入也能演示
  if (/^ALS\d{8,}$/i.test(key)) {
    const suffix = key.slice(-6)
    return buildOrder(
      key,
      'UPS',
      `1ZDEMO${suffix}${suffix.slice(0, 4)}`,
      `TRF-DEMO-${suffix}`,
      '运输中',
    )
  }
  return null
}

export function extractAlsFromText(text?: string | null) {
  if (!text) return ''
  const match = text.toUpperCase().match(/ALS\d{8,}/)
  return match?.[0] ?? ''
}
