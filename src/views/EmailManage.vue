<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import { useEmailStore } from '@/stores/email'
import { useSessionStore } from '@/stores/session'
import { EMAIL_DIRECTIONS, type EmailMessage } from '@/types/email'

const store = useEmailStore()
const sessionStore = useSessionStore()
const detailVisible = ref(false)
const current = ref<EmailMessage | null>(null)
const linkAlsInput = ref('')
const linkInputRef = ref<{ focus: () => void } | null>(null)
const replyBody = ref('')
const replying = ref(false)

watch(
  () => [
    store.keyword,
    store.directionFilter,
    store.replyFilter,
    store.linkFilter,
    store.dateRange,
  ],
  () => {
    store.page = 1
  },
)

const dateModel = computed({
  get: () => {
    if (!store.dateRange) return null
    return store.dateRange.map((d) => d.replace(/-/g, '/')) as [string, string]
  },
  set: (val: [string, string] | null) => {
    if (!val) {
      store.dateRange = null
      return
    }
    store.dateRange = val.map((d) => d.replace(/\//g, '-').slice(0, 10)) as [
      string,
      string,
    ]
  },
})

const thread = computed(() =>
  current.value ? store.threadOf(current.value) : [],
)

function onSearch() {
  store.page = 1
  ElMessage.success(`共 ${store.total} 封邮件`)
}

function onReset() {
  store.resetFilters()
}

function showUnreplied() {
  store.resetFilters()
  store.replyFilter = 'unreplied'
}

function showUnlinked() {
  store.resetFilters()
  store.linkFilter = 'unlinked'
}

function openDetail(row: EmailMessage, focusLink = false) {
  current.value = row
  linkAlsInput.value = ''
  replyBody.value = ''
  detailVisible.value = true
  if (focusLink) {
    nextTick(() => linkInputRef.value?.focus())
  }
}

function onLink() {
  if (!current.value) return
  const als = linkAlsInput.value.trim()
  if (!als) {
    ElMessage.warning('请输入 ALS 单号')
    return
  }
  if (store.linkAls(current.value.id, als)) {
    ElMessage.success(`已关联 ${current.value.alsNo}`)
    linkAlsInput.value = ''
  } else {
    ElMessage.error('未查询到该 ALS 订单，请检查单号')
  }
}

function onReply() {
  if (!current.value || replying.value) return
  if (!replyBody.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  replying.value = true
  setTimeout(() => {
    const row = store.replyEmail(
      current.value!.id,
      replyBody.value,
      sessionStore.agentInfo.name,
    )
    replying.value = false
    if (row) {
      ElMessage.success(`已回复 ${row.customerName}（${row.customerEmail}）`)
      replyBody.value = ''
    } else {
      ElMessage.error('回复失败，请重试')
    }
  }, 200)
}

function replyLabel(m: EmailMessage) {
  if (m.direction === 'out') return '已发出'
  return m.replied ? '已回复' : '未回复'
}

function replyTag(m: EmailMessage) {
  if (m.direction === 'out') return 'info'
  return m.replied ? 'success' : 'danger'
}

function nodeType(m: EmailMessage) {
  if (m.direction === 'out') return 'success'
  return m.replied ? 'primary' : 'danger'
}
</script>

<template>
  <div class="email-page">
    <div class="page-card">
      <div class="page-title">
        <div>
          <h2>客服邮件</h2>
          <p>
            客户往来邮件与 ALS 订单关联 · 标题/正文自动提取单号，未关联邮件可人工补绑
          </p>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card">
          <div class="num">{{ store.stats.total }}</div>
          <div class="label">邮件总数</div>
        </div>
        <div class="stat-card">
          <div class="num">{{ store.stats.inbound }}</div>
          <div class="label">收件数</div>
        </div>
        <div class="stat-card accent clickable" @click="showUnreplied">
          <div class="num">{{ store.stats.unreplied }}</div>
          <div class="label">未回复（点击筛选）</div>
        </div>
        <div class="stat-card clickable" @click="showUnlinked">
          <div class="num">{{ store.stats.unlinked }}</div>
          <div class="label">未关联订单（点击筛选）</div>
        </div>
      </div>

      <el-form class="filter-form" :inline="true" @submit.prevent="onSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="store.keyword"
            clearable
            placeholder="ALS / 客户 / 主题 / 邮箱"
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="方向">
          <el-select v-model="store.directionFilter" style="width: 110px">
            <el-option label="全部方向" value="all" />
            <el-option
              v-for="d in EMAIL_DIRECTIONS"
              :key="d.value"
              :label="d.label"
              :value="d.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="回复状态">
          <el-select v-model="store.replyFilter" style="width: 120px">
            <el-option label="全部状态" value="all" />
            <el-option label="已回复" value="replied" />
            <el-option label="未回复" value="unreplied" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联状态">
          <el-select v-model="store.linkFilter" style="width: 120px">
            <el-option label="全部关联" value="all" />
            <el-option label="已关联" value="linked" />
            <el-option label="未关联" value="unlinked" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateModel"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY/MM/DD"
            style="width: 240px"
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
        共 <strong>{{ store.total }}</strong> 封
      </div>

      <el-table :data="store.paged" border stripe height="100%" class="table">
        <el-table-column prop="sentAt" label="时间" width="160" />
        <el-table-column label="方向" width="70">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.direction === 'in' ? 'primary' : 'success'"
              >{{ row.direction === 'in' ? '收' : '发' }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="subject"
          label="主题"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column prop="customerName" label="客户" width="110" />
        <el-table-column
          prop="customerEmail"
          label="客户邮箱"
          width="190"
          show-overflow-tooltip
        />
        <el-table-column label="关联单号" width="150">
          <template #default="{ row }">
            <span v-if="row.alsNo">{{ row.alsNo }}</span>
            <el-tag v-else size="small" type="info">未关联</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回复状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="replyTag(row as EmailMessage)">{{
              replyLabel(row as EmailMessage)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetail(row as EmailMessage)"
              >详情</el-button
            >
            <el-button
              v-if="!row.alsNo"
              link
              type="warning"
              @click="openDetail(row as EmailMessage, true)"
              >关联</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="store.page"
          v-model:page-size="store.pageSize"
          :total="store.total"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </div>

    <el-drawer
      v-model="detailVisible"
      size="520px"
      :title="current ? `邮件详情 · ${current.customerName}` : '邮件详情'"
    >
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="主题">{{
            current.subject
          }}</el-descriptions-item>
          <el-descriptions-item label="方向">{{
            current.direction === 'in' ? '收件' : '发件'
          }}</el-descriptions-item>
          <el-descriptions-item label="发件人">{{
            current.from
          }}</el-descriptions-item>
          <el-descriptions-item label="收件人">{{
            current.to
          }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{
            current.sentAt
          }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{
            current.customerName
          }}</el-descriptions-item>
          <el-descriptions-item label="关联单号">
            <span v-if="current.alsNo">{{ current.alsNo }}</span>
            <el-tag v-else size="small" type="info">未关联</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="回复状态">
            <el-tag size="small" :type="replyTag(current)">{{
              replyLabel(current)
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="current.agentName" label="客服">{{
            current.agentName
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="body-card">{{ current.body }}</div>

        <template v-if="current.direction === 'in'">
          <div class="section-title">回复邮件</div>
          <div class="reply-meta">
            回复至 {{ current.customerName }}（{{ current.customerEmail }}）·
            主题：Re: {{ current.subject.replace(/^(re|回复|答复)\s*[:：]\s*/i, '') }}
          </div>
          <el-input
            v-model="replyBody"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            placeholder="输入回复内容，发送后将记录到本线程并标记该邮件已回复"
          />
          <div class="reply-actions">
            <el-button
              type="primary"
              :loading="replying"
              @click="onReply"
              >发送回复</el-button
            >
          </div>
        </template>

        <template v-if="!current.alsNo">
          <div class="section-title">关联订单</div>
          <div class="link-bar">
            <el-input
              ref="linkInputRef"
              v-model="linkAlsInput"
              clearable
              placeholder="输入 ALS 单号人工关联"
              @keyup.enter="onLink"
            />
            <el-button type="primary" @click="onLink">关联订单</el-button>
          </div>
        </template>

        <div class="section-title">往来线程（{{ thread.length }} 封）</div>
        <el-timeline class="thread">
          <el-timeline-item
            v-for="m in thread"
            :key="m.id"
            :timestamp="m.sentAt"
            placement="top"
            :type="nodeType(m)"
            :hollow="m.id !== current.id"
          >
            <div class="thread-item" :class="{ active: m.id === current.id }">
              <div class="thread-head">
                <el-tag
                  size="small"
                  :type="m.direction === 'in' ? 'primary' : 'success'"
                  >{{ m.direction === 'in' ? '收' : '发' }}</el-tag
                >
                <span class="thread-subject">{{ m.subject }}</span>
                <el-tag
                  v-if="m.direction === 'in' && !m.replied"
                  size="small"
                  type="danger"
                  >未回复</el-tag
                >
              </div>
              <div class="thread-addr">{{ m.from }} → {{ m.to }}</div>
              <div class="thread-body">{{ m.body }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.email-page {
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

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  border: 1px solid $border;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;

  .num {
    font-size: 20px;
    font-weight: 700;
    color: $text-primary;
  }

  .label {
    margin-top: 2px;
    font-size: 12px;
    color: $text-secondary;
  }

  &.accent {
    background: $primary-bg;
    border-color: #bfdbfe;

    .num {
      color: $primary;
    }
  }

  &.clickable {
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: $primary;
    }
  }
}

.filter-form {
  margin-bottom: 4px;
}

.result-meta {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 8px;

  strong {
    color: $primary;
  }
}

.table {
  flex: 1;
  min-height: 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.body-card {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid $border;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: $text-primary;
}

.section-title {
  margin: 16px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}

.link-bar {
  display: flex;
  gap: 10px;

  .el-input {
    flex: 1;
  }
}

.reply-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;
}

.reply-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.thread {
  padding-left: 4px;
}

.thread-item {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;

  &.active {
    border-color: $primary;
    background: $primary-bg;
  }
}

.thread-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.thread-subject {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.thread-addr {
  margin-top: 4px;
  font-size: 12px;
  color: $text-muted;
}

.thread-body {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: $text-secondary;
  white-space: pre-wrap;
}
</style>