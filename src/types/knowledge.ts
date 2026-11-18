export interface KnowledgeCategory {
  id: string
  name: string
  sort: number
}

export interface KnowledgeItem {
  id: string
  categoryId: string
  title: string
  /** 供客服阅读 / 大模型引用的正文 */
  content: string
  /** 展示标签 */
  tags: string[]
  /** 检索关键词（含同义词） */
  keywords: string[]
  enabled: boolean
  useCount: number
  updatedAt: string
}

export interface KnowledgeFilter {
  keyword: string
  categoryId: string | 'all'
  tags: string[]
}

export interface AiRetrieveHit {
  type: 'knowledge' | 'quickReply'
  id: string
  title: string
  content: string
  score: number
  tags: string[]
}

export interface AiReplyResult {
  reply: string
  hits: AiRetrieveHit[]
  intent: string
}
