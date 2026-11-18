export interface QuickReplyCategory {
  id: string
  name: string
  sort: number
}

export interface QuickReplyItem {
  id: string
  categoryId: string
  title: string
  content: string
  tags: string[]
  enabled: boolean
  /** 被填入/引用的累计次数 */
  useCount: number
  updatedAt: string
}

export interface QuickReplyFilter {
  keyword: string
  categoryId: string | 'all'
  tags: string[]
}
