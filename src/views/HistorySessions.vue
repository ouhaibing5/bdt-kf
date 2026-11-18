<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, RefreshRight, View } from '@element-plus/icons-vue'
import { useSessionStore } from '@/stores/session'
import type { Session, SessionStatus } from '@/types/chat'

const store = useSessionStore()
const router = useRouter()

const statusOptions: { label: string; value: SessionStatus | 'all' }[] = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '待接入', value: 'waiting' },
  { label: '已转接', value: 'transferred' },
  { label: '已结束', value: 'ended' },
]

const statusLabel: Record<SessionStatus, string> = {
  active: '进行中',
  waiting: '待接入',
  transferred: '已转接',
  ended: '已结束',
}

const statusTagType: Record<
  SessionStatus,
  'primary' | 'warning' | 'info' | 'success'
> = {
  active: 'primary',
  waiting: 'warning',
  transferred: 'info',
  ended: 'success',
}

function defaultRange(): [Date, Date] {
  const end = new Date(2026, 9, 13)
  const start = new Date(2026, 9, 7)
  return [start, end]
}

const dateRange = ref<[Date, Date] | null>(defaultRange())
const status = ref<SessionStatus | 'all'>('all')
const keyword = ref('')
const detailVisible = ref(false)
const current = ref<Session | null>(null)

function formatDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const queryRange = computed<[string, string] | null>(() => {
  if (!dateRange.value?.[0] || !dateRange.value?.[1]) return null
  return [formatDay(dateRange.value[0]), formatDay(dateRange.value[1])]
})

const tableData = computed(() =>
  store.queryHistory({
    dateRange: queryRange.value,
    status: status.value,
    keyword: keyword.value,
  }),
)

function onSearch() {
  ElMessage.success(`共查询到 ${tableData.value.length} 条会话`)
}

function onReset() {
  dateRange.value = defaultRange()
  status.value = 'all'
  keyword.value = ''
}

function openDetail(row: Session) {
  current.value = row
  detailVisible.value = true
}

function goOnline(row: Session) {
  store.openHistorySession(row.id)
  router.push('/chat')
}
</script>

<template>
  <div class="history-page">
    <div class="page-card">
      <div class="page-title">
        <h2>历史会话</h2>
        <span class="sub">按日期与状态查询过往会话记录</span>
      </div>

      <el-form class="filter-form" :inline="true" @submit.prevent="onSearch">
        <el-form-item label="会话日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format=""
            :clearable="true"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="会话状态">
          <el-select v-model="status" style="width: 140px">
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            clearable
            placeholder="客户/手机/订单/客服"
            style="width: 200px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch"
            >查询</el-button
          >
          <el-button :icon="RefreshRight" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="result-meta">
        共 <strong>{{ tableData.length }}</strong> 条记录
        <span v-if="queryRange" class="range-tip">
          （{{ queryRange[0] }} ~ {{ queryRange[1] }}）
        </span>
      </div>

      <el-table :data="tableData" stripe height="100%" class="history-table">
        <el-table-column label="客户" min-width="160">
          <template #default="{ row }">
            <div class="customer-cell">
              <el-avatar :size="32" :src="row.avatar" />
              <div>
                <div class="name">{{ row.customerName }}</div>
                <div class="phone">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="渠道" min-width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="statusTagType[row.status as SessionStatus]"
              effect="light"
            >
              {{ statusLabel[row.status as SessionStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startedAt" label="开始时间" min-width="160" />
        <el-table-column label="结束时间" min-width="160">
          <template #default="{ row }">
            {{ row.endedAt || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="agentName" label="接待客服" width="100" />
        <el-table-column
          prop="lastMessage"
          label="最后消息"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="View"
              @click="openDetail(row as Session)"
              >详情</el-button
            >
            <el-button
              link
              type="primary"
              @click="goOnline(row as Session)"
              >在线打开</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer
      v-model="detailVisible"
      size="480px"
      :title="current ? `会话详情 · ${current.customerName}` : '会话详情'"
    >
      <template v-if="current">
        <el-descriptions :column="1" border size="small" class="detail-desc">
          <el-descriptions-item label="状态">
            {{ statusLabel[current.status] }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道">{{
            current.channel
          }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{
            current.startedAt
          }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{
            current.endedAt || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="接待客服">{{
            current.agentName || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{
            current.orderNo || '—'
          }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="msg-title">消息记录</h4>
        <div class="msg-timeline">
          <div
            v-for="msg in current.messages"
            :key="msg.id"
            class="msg-item"
            :class="msg.type"
          >
            <div class="msg-meta">
              <span class="type">
                {{
                  {
                    system: '系统',
                    customer: '客户',
                    agent: '客服',
                    logistics: '物流',
                    internal: '内部备注',
                    summary: '结束摘要',
                  }[msg.type]
                }}
              </span>
              <span>{{ msg.time }}</span>
            </div>
            <div class="msg-body">
              <template v-if="msg.type === 'logistics'">
                {{ msg.logistics?.company }} {{ msg.logistics?.trackingNo }} ·
                {{ msg.logistics?.status }}
              </template>
              <template v-else-if="msg.type === 'summary'">
                {{ msg.summary?.category }} / {{ msg.summary?.satisfaction }}
              </template>
              <template v-else>{{ msg.content }}</template>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.history-page {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.page-card {
  height: 100%;
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  .sub {
    font-size: 13px;
    color: $text-secondary;
  }
}

.filter-form {
  margin-bottom: 4px;
}

.result-meta {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 10px;

  strong {
    color: $primary;
  }

  .range-tip {
    margin-left: 4px;
  }
}

.history-table {
  flex: 1;
  min-height: 0;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .name {
    font-weight: 600;
  }

  .phone {
    font-size: 12px;
    color: $text-muted;
  }
}

.detail-desc {
  margin-bottom: 16px;
}

.msg-title {
  margin: 8px 0 10px;
  font-size: 14px;
}

.msg-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 320px);
  overflow: auto;
}

.msg-item {
  border: 1px solid $border;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fafafa;

  &.agent {
    background: $primary-bg;
    border-color: #bfdbfe;
  }

  &.internal {
    background: $warning-bg;
    border-color: $warning-border;
  }

  &.system,
  &.summary {
    background: #f3f4f6;
  }
}

.msg-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 4px;

  .type {
    font-weight: 600;
    color: $text-secondary;
  }
}

.msg-body {
  font-size: 13px;
  line-height: 1.5;
  color: $text-primary;
  white-space: pre-wrap;
}
</style>
