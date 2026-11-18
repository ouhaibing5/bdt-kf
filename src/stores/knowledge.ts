import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  mockKnowledgeCategories,
  mockKnowledgeItems,
  mockKnowledgeTags,
} from '@/mock/knowledge'
import type {
  KnowledgeCategory,
  KnowledgeFilter,
  KnowledgeItem,
} from '@/types/knowledge'

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  const categories = ref<KnowledgeCategory[]>(
    structuredClone(mockKnowledgeCategories),
  )
  const items = ref<KnowledgeItem[]>(structuredClone(mockKnowledgeItems))
  const tagPool = ref<string[]>([...mockKnowledgeTags])

  const sortedCategories = computed(() =>
    categories.value.slice().sort((a, b) => a.sort - b.sort),
  )

  const allTags = computed(() => {
    const set = new Set(tagPool.value)
    for (const item of items.value) {
      for (const t of item.tags) set.add(t)
    }
    return Array.from(set)
  })

  function categoryName(id: string) {
    return categories.value.find((c) => c.id === id)?.name || '未分类'
  }

  function filterItems(filter: KnowledgeFilter, onlyEnabled = false) {
    const kw = filter.keyword.trim().toLowerCase()
    return items.value
      .filter((item) => {
        if (onlyEnabled && !item.enabled) return false
        if (
          filter.categoryId !== 'all' &&
          item.categoryId !== filter.categoryId
        ) {
          return false
        }
        if (filter.tags.length) {
          const hit = filter.tags.every((t) => item.tags.includes(t))
          if (!hit) return false
        }
        if (!kw) return true
        const hay =
          `${item.title} ${item.content} ${item.tags.join(' ')} ${item.keywords.join(' ')} ${categoryName(item.categoryId)}`.toLowerCase()
        return hay.includes(kw)
      })
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  function saveCategory(payload: { id?: string; name: string }) {
    const name = payload.name.trim()
    if (!name) return null
    if (payload.id) {
      const row = categories.value.find((c) => c.id === payload.id)
      if (!row) return null
      row.name = name
      return row
    }
    const row: KnowledgeCategory = {
      id: uid('kbc'),
      name,
      sort: categories.value.length + 1,
    }
    categories.value.push(row)
    return row
  }

  function removeCategory(id: string) {
    if (items.value.some((i) => i.categoryId === id)) return false
    categories.value = categories.value.filter((c) => c.id !== id)
    return true
  }

  function saveItem(
    payload: Omit<KnowledgeItem, 'id' | 'updatedAt' | 'useCount'> & {
      id?: string
    },
  ) {
    const title = payload.title.trim()
    const content = payload.content.trim()
    if (!title || !content) return null

    const tags = Array.from(
      new Set(payload.tags.map((t) => t.trim()).filter(Boolean)),
    )
    const keywords = Array.from(
      new Set(payload.keywords.map((k) => k.trim()).filter(Boolean)),
    )
    for (const t of tags) {
      if (!tagPool.value.includes(t)) tagPool.value.push(t)
    }

    if (payload.id) {
      const row = items.value.find((i) => i.id === payload.id)
      if (!row) return null
      row.categoryId = payload.categoryId
      row.title = title
      row.content = content
      row.tags = tags
      row.keywords = keywords
      row.enabled = payload.enabled
      row.updatedAt = nowStamp()
      return row
    }

    const row: KnowledgeItem = {
      id: uid('kb'),
      categoryId: payload.categoryId,
      title,
      content,
      tags,
      keywords,
      enabled: payload.enabled,
      useCount: 0,
      updatedAt: nowStamp(),
    }
    items.value.unshift(row)
    return row
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function toggleItem(id: string) {
    const row = items.value.find((i) => i.id === id)
    if (!row) return
    row.enabled = !row.enabled
    row.updatedAt = nowStamp()
  }

  function recordUse(id: string) {
    const row = items.value.find((i) => i.id === id)
    if (!row) return
    row.useCount += 1
  }

  function enabledItems() {
    return items.value.filter((i) => i.enabled)
  }

  return {
    categories,
    items,
    tagPool,
    sortedCategories,
    allTags,
    categoryName,
    filterItems,
    saveCategory,
    removeCategory,
    saveItem,
    removeItem,
    toggleItem,
    recordUse,
    enabledItems,
  }
})
