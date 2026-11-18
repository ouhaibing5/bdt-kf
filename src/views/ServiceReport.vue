<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Download,
  Edit,
  List,
  MagicStick,
  Printer,
} from '@element-plus/icons-vue'
import { useEmailStore } from '@/stores/email'
import { useCompensationStore } from '@/stores/compensation'
import { useTicketStore } from '@/stores/ticket'
import { useReportStore } from '@/stores/report'
import { useAlsQuery } from '@/composables/useAlsQuery'
import { normalizeAlsNo } from '@/mock/logisticsOrders'
import {
  exportServiceReportMarkdown,
  generateServiceReport,
} from '@/utils/serviceReport'
import type { ReportSource, ServiceReport } from '@/types/report'

const route = useRoute()
const router = useRouter()
const emailStore = useEmailStore()
const compensationStore = useCompensationStore()
const ticketStore = useTicketStore()
const reportStore = useReportStore()
const { rememberAls, preferredAls } = useAlsQuery()

const alsInput = ref('')
const loading = ref(false)
const report = ref<ServiceReport | null>(null)
const savedId = ref('')
const editing = ref(false)
const editAnalysis = ref<string[]>([])
const editConclusion = ref('')

const savedRow = computed(() =>
  savedId.value ? reportStore.getById(savedId.value) : null,
)

const reportTickets = computed(() => report.value?.tickets || [])

const SOURCE_TAG: Record<
  ReportSource,
  'primary' | 'success' | 'warning' | 'info' | 'danger'
> = {
  轨迹: 'primary',
  日志: 'info',
  邮件: 'success',
  赔付: 'warning',
  工单: 'danger',
}

function onGenerate() {
  const als = normalizeAlsNo(alsInput.value)
  if (!als) {
    ElMessage.warning('请输入 ALS 单号')
    return
  }
  if (!/^ALS\d{8,}$/.test(als)) {
    ElMessage.error('单号格式不正确，应为 ALS + 至少 8 位数字')
    return
  }
  loading.value = true
  report.value = null
  editing.value = false
  setTimeout(() => {
    const result = generateServiceReport({
      alsNo: als,
      emails: emailStore.queryByAls(als),
      compensations: compensationStore.records.filter((r) => r.alsNo === als),
      tickets: ticketStore.tickets,
    })
    loading.value = false
    if (!result) {
      ElMessage.error('未查询到该订单，无法生成报告')
      return
    }
    report.value = result
    savedId.value = reportStore.saveReport(result).id
    rememberAls(als)
    ElMessage.success(
      `AI 分析完成，共聚合 ${result.events.length} 条服务动作，已存入报告列表`,
    )
  }, 800)
}

function startEdit() {
  if (!report.value) return
  editAnalysis.value = report.value.analysis.slice()
  editConclusion.value = report.value.conclusion
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

function saveEdit() {
  if (!report.value) return
  if (!editConclusion.value.trim()) {
    ElMessage.warning('举证结论不能为空')
    return
  }
  const analysis = editAnalysis.value.filter((p) => p.trim())
  if (!analysis.length) {
    ElMessage.warning('AI 分析内容不能为空')
    return
  }
  report.value.analysis = analysis
  report.value.conclusion = editConclusion.value.trim()
  if (savedId.value) reportStore.updateReport(savedId.value, { analysis, conclusion: report.value.conclusion })
  editing.value = false
  ElMessage.success('报告修改已保存')
}

function onExport() {
  if (!report.value) return
  exportServiceReportMarkdown(report.value)
  ElMessage.success('已导出 Markdown 报告')
}

function onPrint() {
  if (!report.value) return
  window.print()
}

function goOrder() {
  if (report.value) router.push(`/orders/${report.value.alsNo}`)
}

function goList() {
  router.push('/reports')
}

onMounted(() => {
  const savedIdParam = String(route.query.id || '')
  if (savedIdParam) {
    const saved = reportStore.getById(savedIdParam)
    if (saved) {
      report.value = structuredClone(saved.report)
      savedId.value = saved.id
      alsInput.value = saved.alsNo
      if (route.query.edit === '1') startEdit()
      return
    }
    ElMessage.warning('未找到该历史报告，可能已被删除')
  }
  const als = normalizeAlsNo(
    String(route.query.als || '') || preferredAls(),
  )
  if (als) {
    alsInput.value = als
    onGenerate()
  }
})
</script>

<template>
  <div class="report-page">
    <div class="page-card">
      <div class="page-title">
        <div>
          <h2>AI 订单分析 · 服务报告</h2>
          <p>
            聚合轨迹、操作日志、邮件、赔付、工单全部留痕，AI 生成完整服务报告，用于平台举证
          </p>
        </div>
        <div v-if="report" class="report-actions">
          <template v-if="editing">
            <el-button type="primary" @click="saveEdit">保存修改</el-button>
            <el-button @click="cancelEdit">取消</el-button>
          </template>
          <el-button v-else :icon="Edit" @click="startEdit">编辑报告</el-button>
          <el-button :icon="Download" @click="onExport">导出 Markdown</el-button>
          <el-button :icon="Printer" @click="onPrint">打印</el-button>
          <el-button :icon="List" @click="goList">报告列表</el-button>
          <el-button @click="goOrder">订单详情</el-button>
        </div>
      </div>

      <div class="query-bar">
        <el-input
          v-model="alsInput"
          clearable
          placeholder="输入 ALS 单号，如 ALS02010204573"
          style="width: 280px"
          @keyup.enter="onGenerate"
        />
        <el-button
          type="primary"
          :icon="MagicStick"
          :loading="loading"
          @click="onGenerate"
          >{{ loading ? 'AI 分析中…' : '生成服务报告' }}</el-button
        >
      </div>

      <el-empty
        v-if="!report && !loading"
        description="输入 ALS 单号生成服务报告；也可从订单详情页一键带入"
      />

      <template v-if="report">
        <el-descriptions :column="3" border size="small" class="order-desc">
          <el-descriptions-item label="ALS 单号">{{
            report.alsNo
          }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{
            report.customerName
          }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag type="success" effect="plain">{{
              report.order.status
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="快递公司">{{
            report.order.courier
          }}</el-descriptions-item>
          <el-descriptions-item label="尾程单号">{{
            report.order.trackingNo
          }}</el-descriptions-item>
          <el-descriptions-item label="转运单号">{{
            report.order.transferNo
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="metric-row">
          <div
            v-for="m in report.metrics"
            :key="m.label"
            class="metric-card"
            :class="m.tone"
          >
            <div class="num">{{ m.value }}</div>
            <div class="label">{{ m.label }}</div>
            <div v-if="m.hint" class="hint">{{ m.hint }}</div>
          </div>
        </div>

        <section class="ai-card">
          <div class="ai-head">
            <el-icon><MagicStick /></el-icon>
            <span>AI 分析</span>
            <el-tag size="small" type="info" effect="plain"
              >生成于 {{ report.generatedAt }}</el-tag
            >
            <el-tag v-if="savedRow?.edited" size="small" type="warning"
              >已人工编辑 · {{ savedRow.updatedAt }}</el-tag
            >
          </div>
          <div v-if="report.issues.length" class="issue-row">
            <span class="issue-label">识别问题：</span>
            <el-tag
              v-for="i in report.issues"
              :key="i"
              size="small"
              type="warning"
              effect="plain"
              >{{ i }}</el-tag
            >
          </div>
          <template v-if="editing">
            <el-input
              v-for="(_, idx) in editAnalysis"
              :key="idx"
              v-model="editAnalysis[idx]"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 8 }"
              class="edit-block"
            />
          </template>
          <template v-else>
            <p v-for="(p, idx) in report.analysis" :key="idx" class="ai-p">
              {{ p }}
            </p>
          </template>

          <div class="check-title">举证完整性核查</div>
          <div class="check-grid">
            <div
              v-for="c in report.evidenceChecks"
              :key="c.label"
              class="check-item"
              :class="{ fail: !c.ok }"
            >
              <span class="check-mark">{{ c.ok ? '✓' : '✗' }}</span>
              <div>
                <div class="check-label">{{ c.label }}</div>
                <div class="check-detail">{{ c.detail }}</div>
              </div>
            </div>
          </div>

          <div class="conclusion">
            <div class="conclusion-title">举证结论</div>
            <el-input
              v-if="editing"
              v-model="editConclusion"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 10 }"
            />
            <p v-else>{{ report.conclusion }}</p>
          </div>

          <el-alert
            v-for="(r, idx) in report.risks"
            :key="idx"
            :title="r"
            type="warning"
            show-icon
            :closable="false"
            class="risk-alert"
          />
        </section>

        <section v-if="reportTickets.length" class="ticket-section">
          <div class="section-title">
            客户工单举证（{{ reportTickets.length }}）
            <span class="section-sub"
              >本单工单 + 按会员名/邮箱匹配的同客户其他订单工单</span
            >
          </div>
          <el-table :data="reportTickets" border stripe size="small">
            <el-table-column label="关联" width="120">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.relation === '本单工单' ? 'primary' : 'info'"
                  >{{ row.relation }}</el-tag
                >
              </template>
            </el-table-column>
            <el-table-column label="工单号" width="160">
              <template #default="{ row }">{{ row.ticket.caseId }}</template>
            </el-table-column>
            <el-table-column label="主题 / 问题" min-width="240">
              <template #default="{ row }">
                <div class="ticket-title">
                  {{ row.ticket.emailTitle || row.ticket.questionInfo || '—' }}
                </div>
                <div class="ticket-sub">{{ row.ticket.fromEmail }}</div>
              </template>
            </el-table-column>
            <el-table-column label="关联订单" width="150">
              <template #default="{ row }">{{
                row.ticket.orderNo || '—'
              }}</template>
            </el-table-column>
            <el-table-column label="工单状态" width="90">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.ticket.caseStatus === '已完成' ? 'success' : 'primary'"
                  effect="plain"
                  >{{ row.ticket.caseStatus }}</el-tag
                >
              </template>
            </el-table-column>
            <el-table-column label="处理人" width="100">
              <template #default="{ row }">{{
                row.ticket.servicerRealName || row.ticket.servicerName || '未分配'
              }}</template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">{{
                row.ticket.caseGmtCreate
              }}</template>
            </el-table-column>
            <el-table-column label="回复留痕" width="90" align="center">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="(row.ticket.replies || []).length ? 'success' : 'info'"
                  >{{ (row.ticket.replies || []).length }} 条</el-tag
                >
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="timeline-section">
          <div class="section-title">
            完整服务时间线（{{ report.events.length }} 条 · 升序）
          </div>
          <el-timeline class="timeline">
            <el-timeline-item
              v-for="(e, idx) in report.events"
              :key="idx"
              :timestamp="e.time"
              placement="top"
              :type="e.highlight ? 'danger' : 'primary'"
              :hollow="!e.highlight"
            >
              <div class="event" :class="{ highlight: e.highlight }">
                <div class="event-head">
                  <el-tag size="small" :type="SOURCE_TAG[e.source]">{{
                    e.source
                  }}</el-tag
                  >
                  <span class="event-title">{{ e.title }}</span>
                  <el-tag v-if="e.highlight" size="small" type="danger"
                    >未回复</el-tag
                  >
                  <span v-if="e.actor" class="event-actor">{{ e.actor }}</span>
                </div>
                <div class="event-detail">{{ e.detail }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.report-page {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  overflow: auto;
}

.page-card {
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 16px 18px 24px;
  min-height: calc(100% - 4px);
}

.page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: $text-secondary;
  }
}

.report-actions {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.query-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.order-desc {
  margin-bottom: 14px;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.metric-card {
  border: 1px solid $border;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;

  .num {
    font-size: 18px;
    font-weight: 700;
    color: $text-primary;
  }

  .label {
    margin-top: 2px;
    font-size: 12px;
    color: $text-secondary;
  }

  .hint {
    margin-top: 2px;
    font-size: 11px;
    color: $text-muted;
  }

  &.ok .num {
    color: #16a34a;
  }

  &.warn .num {
    color: #d97706;
  }

  &.danger {
    background: #fef2f2;
    border-color: #fecaca;

    .num {
      color: #dc2626;
    }
  }
}

.ai-card {
  border: 1px solid #bfdbfe;
  background: $primary-bg;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 18px;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: $primary;
  margin-bottom: 10px;
}

.issue-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;

  .issue-label {
    font-size: 13px;
    color: $text-secondary;
  }
}

.ai-p {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.8;
  color: $text-primary;
}

.edit-block {
  margin-bottom: 8px;
}

.check-title {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.check-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  background: #fff;
  border: 1px solid $border;
  border-radius: 8px;
  padding: 8px 10px;

  .check-mark {
    color: #16a34a;
    font-weight: 700;
  }

  .check-label {
    font-size: 13px;
    font-weight: 600;
  }

  .check-detail {
    font-size: 12px;
    color: $text-secondary;
    margin-top: 2px;
  }

  &.fail {
    border-color: #fecaca;
    background: #fef2f2;

    .check-mark {
      color: #dc2626;
    }
  }
}

.conclusion {
  margin-top: 12px;
  background: #fff;
  border: 1px solid $border;
  border-radius: 8px;
  padding: 10px 12px;

  .conclusion-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.8;
    color: $text-primary;
  }
}

.risk-alert {
  margin-top: 8px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}

.section-sub {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: $text-muted;
}

.ticket-section {
  margin-bottom: 18px;
}

.ticket-title {
  font-size: 12px;
  line-height: 1.5;
}

.ticket-sub {
  font-size: 11px;
  color: $text-muted;
}

.timeline {
  padding-left: 4px;
}

.event {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;

  &.highlight {
    border-color: #fecaca;
    background: #fef2f2;
  }
}

.event-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.event-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.event-actor {
  font-size: 12px;
  color: $text-muted;
}

.event-detail {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: $text-secondary;
  white-space: pre-wrap;
}
</style>

<style lang="scss">
@media print {
  .app-header,
  .app-aside,
  .report-actions,
  .query-bar {
    display: none !important;
  }

  .report-page {
    overflow: visible;
    padding: 0;
  }

  .page-card {
    border: none;
  }
}
</style>