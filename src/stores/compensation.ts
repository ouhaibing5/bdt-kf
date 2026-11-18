import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockCompensations } from '@/mock/compensation'
import type {
  CompensationRecord,
  CompensationType,
} from '@/types/compensation'

function uid() {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function nextTicketNo() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `PF${day}${seq}`
}

export const useCompensationStore = defineStore('compensation', () => {
  const records = ref<CompensationRecord[]>(structuredClone(mockCompensations))

  const keyword = ref('')
  const typeFilter = ref<CompensationType | 'all'>('all')
  const partyFilter = ref<string>('all')
  /** 按登记日期过滤 */
  const dateRange = ref<[string, string] | null>(null)
  const page = ref(1)
  const pageSize = ref(10)

  const typeStats = computed(() => {
    const map: Record<string, number> = {}
    for (const r of records.value) {
      map[r.compensationType] = (map[r.compensationType] || 0) + 1
    }
    return map
  })

  const totalAmount = computed(() =>
    records.value.reduce((s, r) => s + r.totalAmountCny, 0),
  )

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return records.value
      .filter((r) => {
        if (typeFilter.value !== 'all' && r.compensationType !== typeFilter.value)
          return false
        if (
          partyFilter.value !== 'all' &&
          r.responsibleParty !== partyFilter.value
        )
          return false
        if (dateRange.value) {
          const day = r.registerTime.slice(0, 10)
          const [start, end] = dateRange.value
          if (start && day < start) return false
          if (end && day > end) return false
        }
        if (!kw) return true
        const hay =
          `${r.alsNo} ${r.trackingNo} ${r.transferNo} ${r.ticketNo} ${r.reason} ${r.customerName || ''} ${r.compensationType}`.toLowerCase()
        return hay.includes(kw)
      })
      .slice()
      .sort((a, b) => b.registerTime.localeCompare(a.registerTime))
  })

  const total = computed(() => filtered.value.length)

  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
  })

  const partyOptions = computed(() => {
    const set = new Set(records.value.map((r) => r.responsibleParty))
    return Array.from(set)
  })

  function addRecord(
    input: Omit<CompensationRecord, 'id' | 'registerTime' | 'ticketNo'> & {
      ticketNo?: string
      registerTime?: string
    },
  ) {
    const row: CompensationRecord = {
      ...input,
      id: uid(),
      registerTime: input.registerTime || nowStamp(),
      ticketNo: input.ticketNo || nextTicketNo(),
    }
    records.value.unshift(row)
    return row
  }

  function removeRecord(id: string) {
    const idx = records.value.findIndex((r) => r.id === id)
    if (idx >= 0) records.value.splice(idx, 1)
  }

  function resetFilters() {
    keyword.value = ''
    typeFilter.value = 'all'
    partyFilter.value = 'all'
    dateRange.value = null
    page.value = 1
  }

  return {
    records,
    keyword,
    typeFilter,
    partyFilter,
    dateRange,
    page,
    pageSize,
    typeStats,
    totalAmount,
    filtered,
    total,
    paged,
    partyOptions,
    addRecord,
    removeRecord,
    resetFilters,
  }
})
