import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SavedReport, ServiceReport } from '@/types/report'

const STORAGE_KEY = 'bdt-kefu-service-reports'

function nowStamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function load(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const useReportStore = defineStore('serviceReport', () => {
  const reports = ref<SavedReport[]>(load())
  const keyword = ref('')

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.value))
    } catch {
      // 存储满等异常时保留内存态，不阻断页面
    }
  }

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    const sorted = reports.value
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (!kw) return sorted
    return sorted.filter((r) =>
      `${r.alsNo} ${r.customerName} ${r.report.order.courier} ${r.report.order.trackingNo}`
        .toLowerCase()
        .includes(kw),
    )
  })

  const stats = computed(() => ({
    total: reports.value.length,
    edited: reports.value.filter((r) => r.edited).length,
    orders: new Set(reports.value.map((r) => r.alsNo)).size,
  }))

  function getById(id: string) {
    return reports.value.find((r) => r.id === id) || null
  }

  function saveReport(report: ServiceReport) {
    const row: SavedReport = {
      id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      alsNo: report.alsNo,
      customerName: report.customerName,
      generatedAt: report.generatedAt,
      updatedAt: report.generatedAt,
      edited: false,
      report: structuredClone(report),
    }
    reports.value.unshift(row)
    persist()
    return row
  }

  function updateReport(
    id: string,
    patch: { analysis: string[]; conclusion: string },
  ) {
    const row = getById(id)
    if (!row) return false
    row.report.analysis = patch.analysis.filter((p) => p.trim())
    row.report.conclusion = patch.conclusion.trim()
    row.edited = true
    row.updatedAt = nowStamp()
    persist()
    return true
  }

  function removeReport(id: string) {
    const idx = reports.value.findIndex((r) => r.id === id)
    if (idx >= 0) {
      reports.value.splice(idx, 1)
      persist()
    }
  }

  return {
    reports,
    keyword,
    filtered,
    stats,
    getById,
    saveReport,
    updateReport,
    removeReport,
  }
})