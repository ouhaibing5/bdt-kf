import type { QuickReplyCategory, QuickReplyItem } from '@/types/quickReply'

export const mockCategories: QuickReplyCategory[] = [
  { id: 'cat_open', name: '标准开场', sort: 1 },
  { id: 'cat_track', name: '轨迹查询', sort: 2 },
  { id: 'cat_customs', name: '清关报关', sort: 3 },
  { id: 'cat_fee', name: '费用报价', sort: 4 },
  { id: 'cat_fba', name: 'FBA / 专线', sort: 5 },
  { id: 'cat_exception', name: '异常处理', sort: 6 },
  { id: 'cat_close', name: '结束语', sort: 7 },
]

/** 标签尽量精简，便于在线侧栏单行展示 */
export const mockQuickReplyTags = [
  '开场',
  '轨迹',
  '尾程',
  '面单',
  '清关',
  '费用',
  'FBA',
  '专线',
  '异常',
  '结束',
  'VIP',
]

export const mockQuickReplies: QuickReplyItem[] = [
  {
    id: 'qr1',
    categoryId: 'cat_open',
    title: '跨境客服欢迎语',
    content:
      '您好，{客户名}！我是八达通客服林依依，可协助您查询国际快递 / 专线 / FBA 运单进度及费用问题，请问需要什么帮助？',
    tags: ['开场'],
    enabled: true,
    useCount: 186,
    updatedAt: '2026-10-12 10:00:00',
  },
  {
    id: 'qr1b',
    categoryId: 'cat_open',
    title: '大客户欢迎语',
    content:
      '{客户名}您好，感谢长期合作。我是您的专属客服林依依，将优先处理您的头程与末端问题，请告知运单号或订单号。',
    tags: ['开场', 'VIP'],
    enabled: true,
    useCount: 72,
    updatedAt: '2026-10-12 10:05:00',
  },
  {
    id: 'qr2',
    categoryId: 'cat_track',
    title: '尾程单号+轨迹网址',
    content:
      '已查到订单 {订单号}：尾程快递 {快递公司}，尾程单号 {运单号}。轨迹查询网址：{轨迹网址}。如需面单 PDF 请告知，我帮您导出。',
    tags: ['轨迹', '尾程'],
    enabled: true,
    useCount: 241,
    updatedAt: '2026-10-12 11:00:00',
  },
  {
    id: 'qr2b',
    categoryId: 'cat_track',
    title: '面单导出说明',
    content:
      '订单 {订单号} 面单可导出。请核对收件人/地址无误后，我发送面单下载链接；同时尾程单号为 {运单号}（{快递公司}）。',
    tags: ['面单', '尾程'],
    enabled: true,
    useCount: 118,
    updatedAt: '2026-10-12 11:05:00',
  },
  {
    id: 'qr3',
    categoryId: 'cat_track',
    title: '订单状态反馈',
    content:
      '订单 {订单号} 已为您核实。尾程单号 {运单号}（{快递公司}），可打开 {轨迹网址} 查看最新节点。若状态长时间无更新，我可帮您催查渠道。',
    tags: ['轨迹'],
    enabled: true,
    useCount: 158,
    updatedAt: '2026-10-12 11:10:00',
  },
  {
    id: 'qr4',
    categoryId: 'cat_customs',
    title: '清关查验说明',
    content:
      '您的货物目前处于清关查验环节，属目的国海关例行抽检。请确认品名、HS Code、申报价值与实际一致，资料齐全后一般 1-3 个工作日可放行。订单号：{订单号}。',
    tags: ['清关'],
    enabled: true,
    useCount: 134,
    updatedAt: '2026-10-12 12:00:00',
  },
  {
    id: 'qr4b',
    categoryId: 'cat_customs',
    title: '补料 / 税单指引',
    content:
      '清关需补充资料：① 商业发票 ② 装箱单 ③ 收件人税号（VAT/EORI 等）。请尽快发我，以便渠道向海关递交，避免产生仓租或退运。',
    tags: ['清关', '异常'],
    enabled: true,
    useCount: 97,
    updatedAt: '2026-10-12 12:15:00',
  },
  {
    id: 'qr5',
    categoryId: 'cat_fee',
    title: '运费与附加费说明',
    content:
      '订单 {订单号} 费用含：运费 + 燃油附加费 + 偏远附加（如有）。最终以实际计费重（实重与体积重取大）为准，我可帮您导出费用明细。',
    tags: ['费用'],
    enabled: true,
    useCount: 119,
    updatedAt: '2026-10-12 13:00:00',
  },
  {
    id: 'qr5b',
    categoryId: 'cat_fee',
    title: '关税预估说明',
    content:
      '关税 / VAT 由目的国海关按申报信息核定，我司可协助预估但不作为最终税额。如需包税渠道，我可为您核对当前线路报价。',
    tags: ['费用', '清关'],
    enabled: true,
    useCount: 88,
    updatedAt: '2026-10-12 13:20:00',
  },
  {
    id: 'qr6',
    categoryId: 'cat_fba',
    title: 'FBA 预约与上架',
    content:
      '您的 FBA 货件已到仓，系统显示预约投递中。上架时效以亚马逊仓库处理为准，一般投递后 1-5 个工作日可看到收货，运单号：{运单号}。',
    tags: ['FBA'],
    enabled: true,
    useCount: 156,
    updatedAt: '2026-10-12 14:00:00',
  },
  {
    id: 'qr6b',
    categoryId: 'cat_fba',
    title: '专线时效说明',
    content:
      '该专线参考时效为门到门约 8-15 个工作日（不含清关异常）。实际受航班、查验、旺季影响，我会持续关注运单 {运单号} 节点。',
    tags: ['专线', '轨迹'],
    enabled: true,
    useCount: 143,
    updatedAt: '2026-10-12 14:20:00',
  },
  {
    id: 'qr7',
    categoryId: 'cat_exception',
    title: '破损 / 少件处理',
    content:
      '非常抱歉。请提供：外箱照片、内件清单、面单照片。核实后将按渠道理赔规则推进，订单号 {订单号}，我们会尽快给您方案。',
    tags: ['异常'],
    enabled: true,
    useCount: 76,
    updatedAt: '2026-10-12 15:00:00',
  },
  {
    id: 'qr7b',
    categoryId: 'cat_exception',
    title: '退件 / 重派说明',
    content:
      '包裹因地址不全 / 无人签收退回中转仓。请提供准确收件信息，我可协助申请重派或退回国内，费用规则以渠道报价为准。',
    tags: ['异常', '专线'],
    enabled: true,
    useCount: 64,
    updatedAt: '2026-10-12 15:15:00',
  },
  {
    id: 'qr8',
    categoryId: 'cat_close',
    title: '问题已解决结束语',
    content:
      '您的问题已处理完毕。后续如需查轨迹或核对费用，随时联系我。祝出货顺利、清关畅通！',
    tags: ['结束'],
    enabled: true,
    useCount: 171,
    updatedAt: '2026-10-12 16:00:00',
  },
  {
    id: 'qr8b',
    categoryId: 'cat_close',
    title: 'VIP 结束语',
    content:
      '{客户名}，本次已为您跟进完成。如有批量出货或新开线路需求，可随时找我锁定仓位与时效方案。',
    tags: ['结束', 'VIP'],
    enabled: true,
    useCount: 55,
    updatedAt: '2026-10-12 16:10:00',
  },
]
