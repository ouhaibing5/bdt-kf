import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockTickets } from '@/mock/tickets'
import type { TicketItem, TicketReply, TicketReplyChannel } from '@/types/ticket'

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const useTicketStore = defineStore('ticket', () => {
  const tickets = ref<TicketItem[]>(structuredClone(mockTickets))

  const keyword = ref('')
  const caseStatus = ref<string>('all')
  const taskStatus = ref<string>('all')
  const flagFilter = ref<'all' | '1' | '2'>('all')
  const servicerFilter = ref('all')
  const dateRange = ref<[string, string] | null>(null)

  const page = ref(1)
  const pageSize = ref(10)

  const statusStats = computed(() => ({
    pending: tickets.value.filter((t) => t.taskStatus === '待分配').length,
    processing: tickets.value.filter((t) => t.taskStatus === '处理中').length,
    done: tickets.value.filter((t) => t.taskStatus === '已结束').length,
    total: tickets.value.length,
  }))

  const openBadge = computed(
    () => statusStats.value.pending + statusStats.value.processing,
  )

  const servicerOptions = computed(() => {
    const set = new Set<string>()
    for (const t of tickets.value) {
      const name = t.servicerShowName || t.servicerRealName
      if (name) set.add(name)
    }
    return Array.from(set)
  })

  const filteredTickets = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return tickets.value
      .filter((t) => {
        if (caseStatus.value !== 'all' && t.caseStatus !== caseStatus.value)
          return false
        if (taskStatus.value !== 'all' && t.taskStatus !== taskStatus.value)
          return false
        if (flagFilter.value !== 'all' && String(t.flagColor) !== flagFilter.value)
          return false
        if (
          servicerFilter.value !== 'all' &&
          t.servicerShowName !== servicerFilter.value &&
          t.servicerRealName !== servicerFilter.value
        ) {
          return false
        }
        if (dateRange.value) {
          const day = t.caseGmtCreate.slice(0, 10).replace(/\//g, '-')
          const [start, end] = dateRange.value
          if (start && day < start) return false
          if (end && day > end) return false
        }
        if (!kw) return true
        const hay =
          `${t.caseId} ${t.memberName} ${t.emailTitle} ${t.fromEmail} ${t.orderNo} ${t.questionInfo} ${t.servicerShowName} ${t.servicerRealName}`.toLowerCase()
        return hay.includes(kw)
      })
      .slice()
      .sort((a, b) => b.caseGmtCreate.localeCompare(a.caseGmtCreate))
  })

  const pagedTickets = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredTickets.value.slice(start, start + pageSize.value)
  })

  const total = computed(() => filteredTickets.value.length)

  function resetFilters() {
    keyword.value = ''
    caseStatus.value = 'all'
    taskStatus.value = 'all'
    flagFilter.value = 'all'
    servicerFilter.value = 'all'
    dateRange.value = null
    page.value = 1
  }

  function getById(id: string) {
    return tickets.value.find((t) => t.id === id) || null
  }

  function assignTicket(
    id: string,
    agent: { showName: string; realName: string; name: string },
  ) {
    const row = getById(id)
    if (!row) return false
    row.servicerShowName = agent.showName
    row.servicerRealName = agent.realName
    row.servicerName = agent.name
    row.taskStatus = '处理中'
    row.caseStatus = '处理中'
    row.assignTime = nowStamp()
    row.caseGmtModified = nowStamp()
    return true
  }

  function finishTicket(id: string) {
    const row = getById(id)
    if (!row) return false
    row.taskStatus = '已结束'
    row.caseStatus = '已完成'
    row.endTime = nowStamp()
    row.caseGmtModified = nowStamp()
    return true
  }

  function toggleFlag(id: string) {
    const row = getById(id)
    if (!row) return
    row.flagColor = row.flagColor === 2 ? 1 : 2
  }

  function addReply(
    id: string,
    input: {
      channel: TicketReplyChannel
      content: string
      agentName: string
      phoneNo?: string
    },
  ) {
    const row = getById(id)
    if (!row || !input.content.trim()) return null
    const reply: TicketReply = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channel: input.channel,
      content: input.content.trim(),
      agentName: input.agentName,
      createdAt: nowStamp(),
      phoneNo: input.phoneNo?.trim() || undefined,
    }
    if (!row.replies) row.replies = []
    row.replies.push(reply)
    row.caseGmtModified = nowStamp()
    return reply
  }

  return {
    tickets,
    keyword,
    caseStatus,
    taskStatus,
    flagFilter,
    servicerFilter,
    dateRange,
    page,
    pageSize,
    statusStats,
    openBadge,
    servicerOptions,
    filteredTickets,
    pagedTickets,
    total,
    resetFilters,
    getById,
    assignTicket,
    finishTicket,
    toggleFlag,
    addReply,
  }
})
