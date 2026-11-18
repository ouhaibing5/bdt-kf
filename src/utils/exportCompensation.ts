import type { CompensationRecord } from '@/types/compensation'

/** 对齐「阿里赔付模版.xlsx」表头 */
const HEADERS = [
  '客户预报下单时间',
  '登记时间',
  '客户单号',
  '追踪单号',
  '转单号',
  '责任方',
  '赔付类型',
  '赔付原因',
  '赔付货值金额（CNY）',
  '赔付运费金额（CNY）',
  '赔付总金额（CNY）',
  '汇率',
  '赔付工单号',
] as const

function escapeCsvCell(value: string | number) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toRow(r: CompensationRecord) {
  return [
    r.orderTime,
    r.registerTime,
    r.alsNo,
    r.trackingNo,
    r.transferNo,
    r.responsibleParty,
    r.compensationType,
    r.reason,
    r.goodsAmountCny.toFixed(2),
    r.freightAmountCny.toFixed(2),
    r.totalAmountCny.toFixed(2),
    r.exchangeRate,
    r.ticketNo,
  ]
    .map(escapeCsvCell)
    .join(',')
}

function stamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** 导出当前筛选结果为 CSV（Excel 可直接打开，含 BOM） */
export function exportCompensationsCsv(rows: CompensationRecord[]) {
  const lines = [HEADERS.join(','), ...rows.map(toRow)]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `阿里赔付_${stamp()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
