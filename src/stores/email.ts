import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockEmails } from '@/mock/emails'
import { normalizeAlsNo, queryLogisticsOrder } from '@/mock/logisticsOrders'
import { SERVICE_EMAIL } from '@/types/email'
import type { EmailDirection, EmailMessage } from '@/types/email'

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const useEmailStore = defineStore('email', () => {
  const emails = ref<EmailMessage[]>(structuredClone(mockEmails))

  const keyword = ref('')
  const directionFilter = ref<EmailDirection | 'all'>('all')
  const replyFilter = ref<'all' | 'replied' | 'unreplied'>('all')
  const linkFilter = ref<'all' | 'linked' | 'unlinked'>('all')
  const dateRange = ref<[string, string] | null>(null)
  const page = ref(1)
  const pageSize = ref(10)

  const stats = computed(() => ({
    total: emails.value.length,
    inbound: emails.value.filter((m) => m.direction === 'in').length,
    unreplied: emails.value.filter((m) => m.direction === 'in' && !m.replied)
      .length,
    unlinked: emails.value.filter((m) => !m.alsNo).length,
  }))

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return emails.value
      .filter((m) => {
        if (
          directionFilter.value !== 'all' &&
          m.direction !== directionFilter.value
        )
          return false
        if (replyFilter.value === 'replied' && !(m.direction === 'in' && m.replied))
          return false
        if (
          replyFilter.value === 'unreplied' &&
          !(m.direction === 'in' && !m.replied)
        )
          return false
        if (linkFilter.value === 'linked' && !m.alsNo) return false
        if (linkFilter.value === 'unlinked' && m.alsNo) return false
        if (dateRange.value) {
          const day = m.sentAt.slice(0, 10)
          const [start, end] = dateRange.value
          if (start && day < start) return false
          if (end && day > end) return false
        }
        if (!kw) return true
        const hay =
          `${m.alsNo || ''} ${m.subject} ${m.customerName} ${m.customerEmail} ${m.from} ${m.to}`.toLowerCase()
        return hay.includes(kw)
      })
      .slice()
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  })

  const total = computed(() => filtered.value.length)

  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
  })

  function queryByAls(alsNo: string) {
    const key = normalizeAlsNo(alsNo)
    if (!key) return []
    return emails.value
      .filter((m) => m.alsNo === key)
      .slice()
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  }

  function threadOf(row: EmailMessage) {
    return emails.value
      .filter((m) => m.threadId === row.threadId)
      .slice()
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  }

  function linkAls(id: string, alsNo: string): boolean {
    const key = normalizeAlsNo(alsNo)
    if (!key || !queryLogisticsOrder(key)) return false
    const row = emails.value.find((m) => m.id === id)
    if (!row) return false
    row.alsNo = key
    return true
  }

  function replyEmail(originalId: string, body: string, agentName: string) {
    const original = emails.value.find((m) => m.id === originalId)
    if (!original || !body.trim()) return null
    const sentAt = nowStamp()
    const subject = /^(re|回复|答复)\s*[:：]/i.test(original.subject)
      ? original.subject
      : `Re: ${original.subject}`
    const row: EmailMessage = {
      id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      threadId: original.threadId,
      direction: 'out',
      from: SERVICE_EMAIL,
      to: original.customerEmail,
      subject,
      body: body.trim(),
      sentAt,
      alsNo: original.alsNo,
      customerName: original.customerName,
      customerEmail: original.customerEmail,
      replied: true,
      agentName,
    }
    emails.value.push(row)
    for (const m of emails.value) {
      if (
        m.threadId === original.threadId &&
        m.direction === 'in' &&
        m.sentAt <= sentAt
      ) {
        m.replied = true
      }
    }
    return row
  }

  function resetFilters() {
    keyword.value = ''
    directionFilter.value = 'all'
    replyFilter.value = 'all'
    linkFilter.value = 'all'
    dateRange.value = null
    page.value = 1
  }

  return {
    emails,
    keyword,
    directionFilter,
    replyFilter,
    linkFilter,
    dateRange,
    page,
    pageSize,
    stats,
    filtered,
    total,
    paged,
    queryByAls,
    threadOf,
    linkAls,
    replyEmail,
    resetFilters,
  }
})