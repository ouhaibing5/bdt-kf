import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  mockCategories,
  mockQuickReplies,
  mockQuickReplyTags,
} from '@/mock/quickReplies'
import type {
  QuickReplyCategory,
  QuickReplyFilter,
  QuickReplyItem,
} from '@/types/quickReply'

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const useQuickReplyStore = defineStore('quickReply', () => {
  const categories = ref<QuickReplyCategory[]>(structuredClone(mockCategories))
  const replies = ref<QuickReplyItem[]>(structuredClone(mockQuickReplies))
  const tagPool = ref<string[]>([...mockQuickReplyTags])

  const sortedCategories = computed(() =>
    categories.value.slice().sort((a, b) => a.sort - b.sort),
  )

  const allTags = computed(() => {
    const set = new Set(tagPool.value)
    for (const r of replies.value) {
      for (const t of r.tags) set.add(t)
    }
    return Array.from(set)
  })

  function categoryName(id: string) {
    return categories.value.find((c) => c.id === id)?.name || '未分类'
  }

  function filterReplies(filter: QuickReplyFilter, onlyEnabled = false) {
    const kw = filter.keyword.trim().toLowerCase()
    return replies.value
      .filter((r) => {
        if (onlyEnabled && !r.enabled) return false
        if (filter.categoryId !== 'all' && r.categoryId !== filter.categoryId) {
          return false
        }
        if (filter.tags.length) {
          const hit = filter.tags.every((t) => r.tags.includes(t))
          if (!hit) return false
        }
        if (!kw) return true
        const hay =
          `${r.title} ${r.content} ${r.tags.join(' ')} ${categoryName(r.categoryId)}`.toLowerCase()
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
    const row: QuickReplyCategory = {
      id: uid('cat'),
      name,
      sort: categories.value.length + 1,
    }
    categories.value.push(row)
    return row
  }

  function removeCategory(id: string) {
    const used = replies.value.some((r) => r.categoryId === id)
    if (used) return false
    categories.value = categories.value.filter((c) => c.id !== id)
    return true
  }

  function saveReply(
    payload: Omit<QuickReplyItem, 'id' | 'updatedAt' | 'useCount'> & {
      id?: string
    },
  ) {
    const title = payload.title.trim()
    const content = payload.content.trim()
    if (!title || !content) return null

    const tags = Array.from(
      new Set(payload.tags.map((t) => t.trim()).filter(Boolean)),
    )
    for (const t of tags) {
      if (!tagPool.value.includes(t)) tagPool.value.push(t)
    }

    if (payload.id) {
      const row = replies.value.find((r) => r.id === payload.id)
      if (!row) return null
      row.categoryId = payload.categoryId
      row.title = title
      row.content = content
      row.tags = tags
      row.enabled = payload.enabled
      row.updatedAt = nowStamp()
      return row
    }

    const row: QuickReplyItem = {
      id: uid('qr'),
      categoryId: payload.categoryId,
      title,
      content,
      tags,
      enabled: payload.enabled,
      useCount: 0,
      updatedAt: nowStamp(),
    }
    replies.value.unshift(row)
    return row
  }

  function removeReply(id: string) {
    replies.value = replies.value.filter((r) => r.id !== id)
  }

  function toggleReply(id: string) {
    const row = replies.value.find((r) => r.id === id)
    if (!row) return
    row.enabled = !row.enabled
    row.updatedAt = nowStamp()
  }

  function recordUse(id: string) {
    const row = replies.value.find((r) => r.id === id)
    if (!row) return
    row.useCount += 1
  }

  function addTag(tag: string) {
    const t = tag.trim()
    if (!t || tagPool.value.includes(t)) return false
    tagPool.value.push(t)
    return true
  }

  return {
    categories,
    replies,
    tagPool,
    sortedCategories,
    allTags,
    categoryName,
    filterReplies,
    saveCategory,
    removeCategory,
    saveReply,
    removeReply,
    toggleReply,
    recordUse,
    addTag,
  }
})
