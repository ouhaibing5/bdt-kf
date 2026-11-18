<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, Search, View } from '@element-plus/icons-vue'
import { useTicketStore } from '@/stores/ticket'
import { useSessionStore } from '@/stores/session'
import type { TicketItem, TicketReplyChannel } from '@/types/ticket'

const store = useTicketStore()
const sessionStore = useSessionStore()
const detailVisible = ref(false)
const current = ref<TicketItem | null>(null)
const replyChannel = ref<TicketReplyChannel>('phone')
const replyContent = ref('')
const replyPhoneNo = ref('')
const replying = ref(false)

watch(
  () => [
    store.keyword,
    store.caseStatus,
    store.taskStatus,
    store.flagFilter,
    store.servicerFilter,
    store.dateRange,
  ],
  () => {
    store.page = 1
  },
)

const caseStatusOptions = [
  { label: '全部工单状态', value: 'all' },
  { label: '处理中', value: '处理中' },
  { label: '已完成', value: '已完成' },
]

const taskStatusOptions = [
  { label: '全部任务状态', value: 'all' },
  { label: '待分配', value: '待分配' },
  { label: '处理中', value: '处理中' },
  { label: '已结束', value: '已结束' },
]

function statusType(status: string) {
  if (status === '待分配') return 'warning'
  if (status === '处理中') return 'primary'
  if (status === '已结束' || status === '已完成') return 'success'
  return 'info'
}

function openDetail(row: TicketItem) {
  current.value = row
  replyChannel.value = 'phone'
  replyContent.value = ''
  replyPhoneNo.value = ''
  detailVisible.value = true
}

function onReply() {
  if (!current.value || replying.value) return
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  replying.value = true
  setTimeout(() => {
    const reply = store.addReply(current.value!.id, {
      channel: replyChannel.value,
      content: replyContent.value,
      agentName: sessionStore.agentInfo.name,
      phoneNo: replyChannel.value === 'phone' ? replyPhoneNo.value : undefined,
    })
    replying.value = false
    if (reply) {
      ElMessage.success(
        reply.channel === 'phone' ? '电话沟通回复已记录' : '邮件回复已记录',
      )
      replyContent.value = ''
      replyPhoneNo.value = ''
    } else {
      ElMessage.error('回复失败，请重试')
    }
  }, 200)
}

function onSearch() {
  store.page = 1
  ElMessage.success(`共 ${store.total} 条工单`)
}

async function onAssign(row: TicketItem) {
  await ElMessageBox.confirm(`将工单 ${row.caseId} 分配给当前客服林依依？`, '分配工单')
  store.assignTicket(row.id, {
    showName: '物流客服林依依',
    realName: '林依依',
    name: 'lyy08012',
  })
  ElMessage.success('分配成功')
}

async function onFinish(row: TicketItem) {
  await ElMessageBox.confirm(`确认完结工单 ${row.caseId}？`, '完结工单', {
    type: 'warning',
  })
  store.finishTicket(row.id)
  ElMessage.success('工单已完结')
}

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
</script>

<template>
  <div class="ticket-page">
    <div class="page-card">
      <div class="page-title">
        <div>
          <h2>工单管理</h2>
          <p>
            对齐超级工单检索字段：邮件渠道 · ICBU 物流咨询 · 技能组「八达通」
          </p>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card pending">
          <div class="num">{{ store.statusStats.pending }}</div>
          <div class="label">待分配</div>
        </div>
        <div class="stat-card processing">
          <div class="num">{{ store.statusStats.processing }}</div>
          <div class="label">处理中</div>
        </div>
        <div class="stat-card done">
          <div class="num">{{ store.statusStats.done }}</div>
          <div class="label">已结束</div>
        </div>
        <div class="stat-card total">
          <div class="num">{{ store.statusStats.total }}</div>
          <div class="label">全部工单</div>
        </div>
      </div>

      <el-form class="filter-form" :inline="true" @submit.prevent="onSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="store.keyword"
            clearable
            placeholder="工单号/会员/邮件/订单号"
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="任务状态">
          <el-select v-model="store.taskStatus" style="width: 130px">
            <el-option
              v-for="opt in taskStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工单状态">
          <el-select v-model="store.caseStatus" style="width: 140px">
            <el-option
              v-for="opt in caseStatusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处理人">
          <el-select v-model="store.servicerFilter" style="width: 150px">
            <el-option label="全部处理人" value="all" />
            <el-option
              v-for="name in store.servicerOptions"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="旗帜">
          <el-select v-model="store.flagFilter" style="width: 110px">
            <el-option label="全部" value="all" />
            <el-option label="默认" value="1" />
            <el-option label="标红" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="dateModel"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY/MM/DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch"
            >查询</el-button
          >
          <el-button :icon="RefreshRight" @click="store.resetFilters()"
            >重置</el-button
          >
        </el-form-item>
      </el-form>

      <div class="result-meta">
        共 <strong>{{ store.total }}</strong> 条 · 渠道：邮件 · 技能组：ICBU-物流咨询-八达通
      </div>

      <el-table :data="store.pagedTickets" stripe height="100%" class="ticket-table">
        <el-table-column label="旗" width="52" align="center">
          <template #default="{ row }">
            <button
              type="button"
              class="flag-btn"
              :class="{ red: row.flagColor === 2 }"
              title="切换旗帜"
              @click="store.toggleFlag(row.id)"
            >
              ⚑
            </button>
          </template>
        </el-table-column>
        <el-table-column prop="caseId" label="工单编号" min-width="150" />
        <el-table-column label="邮件主题 / 问题" min-width="240">
          <template #default="{ row }">
            <div class="title-cell">
              <div class="email-title" :title="row.emailTitle">
                {{ row.emailTitle || row.questionInfo || '—' }}
              </div>
              <div class="sub">
                <span v-if="row.orderNo" class="order">{{ row.orderNo }}</span>
                <span v-if="row.fromEmail">{{ row.fromEmail }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="会员" min-width="130">
          <template #default="{ row }">
            <div>{{ row.memberName }}</div>
            <div class="muted">{{ row.cmsMemberType }}</div>
          </template>
        </el-table-column>
        <el-table-column label="任务状态" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.taskStatus)" effect="light">
              {{ row.taskStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工单状态" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.caseStatus)" effect="plain">
              {{ row.caseStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">
            <el-tag size="small" type="danger" effect="plain">{{
              row.priority
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理人" min-width="120">
          <template #default="{ row }">
            <div>{{ row.servicerShowName || '—' }}</div>
            <div class="muted">{{ row.servicerRealName || '未分配' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="channelType" label="渠道" width="96" />
        <el-table-column prop="caseGmtCreate" label="创建时间" min-width="150" />
        <el-table-column prop="caseGmtModified" label="更新时间" min-width="150" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="View"
              @click="openDetail(row as TicketItem)"
              >详情</el-button
            >
            <el-button
              v-if="row.taskStatus === '待分配'"
              link
              type="primary"
              @click="onAssign(row as TicketItem)"
              >分配</el-button
            >
            <el-button
              v-if="row.taskStatus === '处理中'"
              link
              type="primary"
              @click="openDetail(row as TicketItem)"
              >回复</el-button
            >
            <el-button
              v-if="row.taskStatus === '处理中'"
              link
              type="success"
              @click="onFinish(row as TicketItem)"
              >完结</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="store.page"
          v-model:page-size="store.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="store.total"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </div>

    <el-drawer
      v-model="detailVisible"
      size="520px"
      :title="current ? `工单详情 · ${current.caseId}` : '工单详情'"
    >
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="工单编号">{{
            current.caseId
          }}</el-descriptions-item>
          <el-descriptions-item label="任务 ID">{{
            current.id
          }}</el-descriptions-item>
          <el-descriptions-item label="邮件主题">{{
            current.emailTitle || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="发件邮箱">{{
            current.fromEmail || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="物流订单号">{{
            current.orderNo || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="业务编号">{{
            current.bizId || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="会员">
            {{ current.memberName }}（{{ current.memberId }}）
          </el-descriptions-item>
          <el-descriptions-item label="会员类型">{{
            current.cmsMemberType
          }}</el-descriptions-item>
          <el-descriptions-item label="任务状态">{{
            current.taskStatus
          }}</el-descriptions-item>
          <el-descriptions-item label="工单状态">{{
            current.caseStatus
          }}</el-descriptions-item>
          <el-descriptions-item label="优先级"
            >{{ current.priority }} / 工单优先级
            {{ current.casePriority }}</el-descriptions-item
          >
          <el-descriptions-item label="处理人">
            {{ current.servicerShowName || '—' }}
            {{ current.servicerRealName ? `（${current.servicerRealName}）` : '' }}
          </el-descriptions-item>
          <el-descriptions-item label="技能组">{{
            current.groupName
          }}</el-descriptions-item>
          <el-descriptions-item label="渠道 / 模板">
            {{ current.channelType }} · {{ current.templateName }}
          </el-descriptions-item>
          <el-descriptions-item label="业务类目">{{
            current.sopCateName
          }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{
            current.taskTypeName
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            current.caseGmtCreate
          }}</el-descriptions-item>
          <el-descriptions-item label="分配时间">{{
            current.assignTime || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{
            current.caseGmtModified
          }}</el-descriptions-item>
          <el-descriptions-item label="完结时间">{{
            current.endTime || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag
              v-for="tag in current.tags"
              :key="tag"
              size="small"
              class="tag-gap"
              >{{ tag }}</el-tag
            >
            <span v-if="!current.tags.length">—</span>
          </el-descriptions-item>
        </el-descriptions>

        <template v-if="current.taskStatus === '处理中'">
          <div class="section-title">回复客户</div>
          <el-radio-group v-model="replyChannel" class="reply-channel">
            <el-radio-button value="phone">电话沟通回复</el-radio-button>
            <el-radio-button value="email">邮件回复</el-radio-button>
          </el-radio-group>
          <div class="reply-meta">
            <template v-if="replyChannel === 'phone'">
              记录与 {{ current.memberName }} 的电话沟通结论，作为工单处理留痕
            </template>
            <template v-else>
              回复至 {{ current.fromEmail || '客户邮箱' }} · 主题：Re:
              {{ (current.emailTitle || current.questionInfo || '').replace(/^(re|回复|答复)\s*[:：]\s*/i, '') }}
            </template>
          </div>
          <el-input
            v-if="replyChannel === 'phone'"
            v-model="replyPhoneNo"
            clearable
            placeholder="联系号码（选填）"
            class="reply-phone"
          />
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            :placeholder="
              replyChannel === 'phone'
                ? '记录沟通要点：客户诉求、处理方案、客户确认结果等'
                : '输入邮件回复内容，提交后记录到工单回复留痕'
            "
          />
          <div class="reply-actions">
            <el-button type="primary" :loading="replying" @click="onReply"
              >提交回复</el-button
            >
          </div>
        </template>

        <template v-if="current.replies?.length">
          <div class="section-title">
            回复记录（{{ current.replies.length }}）
          </div>
          <div
            v-for="r in current.replies"
            :key="r.id"
            class="reply-record"
          >
            <div class="reply-record-head">
              <el-tag
                size="small"
                :type="r.channel === 'phone' ? 'warning' : 'success'"
                >{{ r.channel === 'phone' ? '电话沟通' : '邮件回复' }}</el-tag
              >
              <span class="reply-record-meta"
                >{{ r.agentName }} · {{ r.createdAt }}</span
              >
              <span v-if="r.phoneNo" class="reply-record-meta"
                >☎ {{ r.phoneNo }}</span
              >
            </div>
            <div class="reply-record-body">{{ r.content }}</div>
          </div>
        </template>

        <div class="drawer-actions">
          <el-button
            v-if="current.taskStatus === '待分配'"
            type="primary"
            @click="onAssign(current)"
            >分配给我</el-button
          >
          <el-button
            v-if="current.taskStatus === '处理中'"
            type="success"
            @click="onFinish(current)"
            >完结工单</el-button
          >
          <el-button @click="store.toggleFlag(current.id)">
            {{ current.flagColor === 2 ? '取消标红' : '标红旗帜' }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.ticket-page {
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
  margin-bottom: 14px;
}

.stat-card {
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid $border;

  .num {
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
  }

  .label {
    margin-top: 4px;
    font-size: 12px;
    color: $text-secondary;
  }

  &.pending {
    background: #fffbeb;
    border-color: #fde68a;
    .num {
      color: #b45309;
    }
  }

  &.processing {
    background: $primary-bg;
    border-color: #bfdbfe;
    .num {
      color: $primary;
    }
  }

  &.done {
    background: #ecfdf5;
    border-color: #a7f3d0;
    .num {
      color: #047857;
    }
  }

  &.total {
    background: #f8fafc;
    .num {
      color: $text-primary;
    }
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
}

.ticket-table {
  flex: 1;
  min-height: 0;
}

.title-cell {
  .email-title {
    font-size: 13px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .sub {
    margin-top: 4px;
    font-size: 12px;
    color: $text-muted;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .order {
    color: $primary;
    font-weight: 600;
  }
}

.muted {
  font-size: 12px;
  color: $text-muted;
}

.flag-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #cbd5e1;

  &.red {
    color: #ef4444;
  }
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.tag-gap {
  margin-right: 6px;
}

.drawer-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.section-title {
  margin: 16px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}

.reply-channel {
  margin-bottom: 8px;
}

.reply-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;
}

.reply-phone {
  margin-bottom: 8px;
}

.reply-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.reply-record {
  border: 1px solid $border;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #fafafa;
}

.reply-record-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.reply-record-meta {
  font-size: 12px;
  color: $text-muted;
}

.reply-record-body {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: $text-primary;
  white-space: pre-wrap;
}
</style>
