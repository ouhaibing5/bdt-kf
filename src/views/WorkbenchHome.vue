<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChatDotRound,
  ChatLineSquare,
  Clock,
  Collection,
  Cpu,
  Document,
  Odometer,
  WarningFilled,
} from '@element-plus/icons-vue'
import { useNow } from '@/composables/useNow'
import { calcSlaState } from '@/utils/sla'
import { useSessionStore } from '@/stores/session'
import { useTicketStore } from '@/stores/ticket'
import { useQuickReplyStore } from '@/stores/quickReply'
import { useKnowledgeStore } from '@/stores/knowledge'

const router = useRouter()
const sessionStore = useSessionStore()
const ticketStore = useTicketStore()
const qrStore = useQuickReplyStore()
const kbStore = useKnowledgeStore()
const now = useNow()

const agentStatusLabel: Record<string, string> = {
  online: '在线接待中',
  break: '小休/离开',
  away: '离线',
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const overtimeSessions = computed(() =>
  sessionStore.sessions.filter((s) => {
    const sla = calcSlaState(s, now.value)
    return !!sla?.overtime
  }),
)

const aiSessions = computed(() =>
  sessionStore.sessions.filter((s) => s.aiTakeover && s.status === 'active'),
)

const pendingTickets = computed(() =>
  ticketStore.tickets
    .filter((t) => t.taskStatus === '待分配' || t.taskStatus === '处理中')
    .slice(0, 5),
)

const urgentSessions = computed(() =>
  sessionStore.sessions
    .filter((s) => s.status === 'active' || s.status === 'waiting')
    .slice()
    .sort((a, b) => {
      const sa = calcSlaState(a, now.value)
      const sb = calcSlaState(b, now.value)
      const ra = sa ? (sa.overtime ? -1000 : sa.remainSec) : 9999
      const rb = sb ? (sb.overtime ? -1000 : sb.remainSec) : 9999
      return ra - rb
    })
    .slice(0, 6),
)

const hotReplies = computed(() =>
  qrStore.replies
    .filter((r) => r.enabled)
    .slice()
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 5),
)

const hotKnowledge = computed(() =>
  kbStore.items
    .filter((i) => i.enabled)
    .slice()
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 5),
)

const kpis = computed(() => [
  {
    key: 'active',
    label: '进行中会话',
    value: sessionStore.statusCounts.active,
    tip: `待接入 ${sessionStore.statusCounts.waiting}`,
    color: 'blue',
    path: '/chat',
  },
  {
    key: 'sla',
    label: 'SLA 超时',
    value: overtimeSessions.value.length,
    tip: '首响20s / 本轮2min',
    color: 'red',
    path: '/chat',
  },
  {
    key: 'ticket',
    label: '待办工单',
    value: ticketStore.openBadge,
    tip: `待分配 ${ticketStore.statusStats.pending} · 处理中 ${ticketStore.statusStats.processing}`,
    color: 'amber',
    path: '/tickets',
  },
  {
    key: 'ai',
    label: 'AI 接管中',
    value: aiSessions.value.length,
    tip: '知识库 + 快捷回复自动应答',
    color: 'teal',
    path: '/chat',
  },
])

const shortcuts = [
  {
    title: '在线会话',
    desc: '接待客户、查尾程单号',
    icon: ChatDotRound,
    path: '/chat',
  },
  {
    title: '历史会话',
    desc: '按日期/状态回溯',
    icon: Clock,
    path: '/history',
  },
  {
    title: '工单管理',
    desc: '邮件工单分配完结',
    icon: Document,
    path: '/tickets',
  },
  {
    title: '快捷回复',
    desc: '话术分类与标签',
    icon: ChatLineSquare,
    path: '/quick-reply',
  },
  {
    title: '知识库',
    desc: '供 AI 检索调用',
    icon: Collection,
    path: '/knowledge',
  },
]

function go(path: string) {
  router.push(path)
}

function openSession(id: string) {
  sessionStore.selectSession(id)
  const s = sessionStore.sessions.find((x) => x.id === id)
  if (s) sessionStore.setFilterStatus(s.status)
  router.push('/chat')
}

function slaText(sessionId: string) {
  const s = sessionStore.sessions.find((x) => x.id === sessionId)
  if (!s) return '—'
  if (s.aiTakeover) return 'AI接管'
  const sla = calcSlaState(s, now.value)
  if (!sla) return '空闲'
  if (sla.overtime) return '已超时'
  return `剩余 ${sla.remainSec}s`
}
</script>

<template>
  <div class="workbench">
    <section class="hero">
      <div class="hero-main">
        <div class="eyebrow">
          <el-icon><Odometer /></el-icon>
          客服工作台
        </div>
        <h1>
          {{ greeting }}，{{ sessionStore.agentInfo.name }}
        </h1>
        <p>
          今日聚焦跨境物流咨询：尾程单号、面单、轨迹与清关。当前状态
          <strong>{{ agentStatusLabel[sessionStore.agentStatus] }}</strong>
          · 工号 {{ sessionStore.agentInfo.id }}
        </p>
        <div class="hero-actions">
          <el-button type="primary" @click="go('/chat')">进入在线会话</el-button>
          <el-button @click="go('/tickets')">处理待办工单</el-button>
          <el-button
            :type="sessionStore.agentStatus === 'online' ? 'success' : 'warning'"
            plain
            @click="
              sessionStore.agentStatus =
                sessionStore.agentStatus === 'online' ? 'break' : 'online'
            "
          >
            {{
              sessionStore.agentStatus === 'online' ? '切换小休' : '切换在线'
            }}
          </el-button>
        </div>
      </div>
      <div class="hero-side">
        <div class="side-item">
          <span class="label">快捷回复</span>
          <strong>{{ qrStore.replies.filter((r) => r.enabled).length }}</strong>
          <em>条启用</em>
        </div>
        <div class="side-item">
          <span class="label">知识库</span>
          <strong>{{ kbStore.items.filter((i) => i.enabled).length }}</strong>
          <em>篇可调用</em>
        </div>
        <div class="side-item">
          <span class="label">历史会话</span>
          <strong>{{ sessionStore.statusCounts.ended }}</strong>
          <em>条已结束</em>
        </div>
      </div>
    </section>

    <section class="kpi-row">
      <button
        v-for="kpi in kpis"
        :key="kpi.key"
        class="kpi-card"
        :class="kpi.color"
        type="button"
        @click="go(kpi.path)"
      >
        <div class="kpi-label">{{ kpi.label }}</div>
        <div class="kpi-value">{{ kpi.value }}</div>
        <div class="kpi-tip">{{ kpi.tip }}</div>
      </button>
    </section>

    <section class="shortcut-row">
      <button
        v-for="item in shortcuts"
        :key="item.path"
        class="shortcut-card"
        type="button"
        @click="go(item.path)"
      >
        <el-icon class="icon" :size="20"><component :is="item.icon" /></el-icon>
        <div>
          <div class="title">{{ item.title }}</div>
          <div class="desc">{{ item.desc }}</div>
        </div>
      </button>
    </section>

    <section class="grid-2">
      <div class="panel">
        <div class="panel-head">
          <h3>
            <el-icon><WarningFilled /></el-icon>
            优先接待
          </h3>
          <el-button link type="primary" @click="go('/chat')">全部会话</el-button>
        </div>
        <div
          v-for="item in urgentSessions"
          :key="item.id"
          class="list-row"
          @click="openSession(item.id)"
        >
          <el-avatar :size="34" :src="item.avatar" />
          <div class="list-body">
            <div class="top">
              <strong>{{ item.customerName }}</strong>
              <el-tag size="small" effect="plain">{{ item.channel }}</el-tag>
              <span class="sla" :class="{ danger: slaText(item.id) === '已超时' }">
                {{ slaText(item.id) }}
              </span>
            </div>
            <div class="preview">{{ item.lastMessage }}</div>
          </div>
        </div>
        <el-empty
          v-if="!urgentSessions.length"
          description="暂无待接待会话"
          :image-size="56"
        />
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>
            <el-icon><Document /></el-icon>
            待办工单
          </h3>
          <el-button link type="primary" @click="go('/tickets')">工单中心</el-button>
        </div>
        <div
          v-for="ticket in pendingTickets"
          :key="ticket.id"
          class="list-row"
          @click="go('/tickets')"
        >
          <div class="ticket-flag" :class="{ red: ticket.flagColor === 2 }">⚑</div>
          <div class="list-body">
            <div class="top">
              <strong>{{ ticket.caseId }}</strong>
              <el-tag
                size="small"
                :type="ticket.taskStatus === '待分配' ? 'warning' : 'primary'"
              >
                {{ ticket.taskStatus }}
              </el-tag>
            </div>
            <div class="preview">
              <span v-if="ticket.orderNo" class="order">{{ ticket.orderNo }}</span>
              {{ ticket.emailTitle || ticket.questionInfo }}
            </div>
          </div>
        </div>
        <el-empty
          v-if="!pendingTickets.length"
          description="暂无待办工单"
          :image-size="56"
        />
      </div>
    </section>

    <section class="grid-2">
      <div class="panel">
        <div class="panel-head">
          <h3>
            <el-icon><ChatLineSquare /></el-icon>
            热门快捷回复
          </h3>
          <el-button link type="primary" @click="go('/quick-reply')"
            >管理</el-button
          >
        </div>
        <div v-for="item in hotReplies" :key="item.id" class="hot-row">
          <div class="hot-title">{{ item.title }}</div>
          <div class="hot-meta">
            <el-tag
              v-for="tag in item.tags.slice(0, 2)"
              :key="tag"
              size="small"
              effect="plain"
              >{{ tag }}</el-tag
            >
            <span class="count">用过 {{ item.useCount }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>
            <el-icon><Cpu /></el-icon>
            AI 高频知识
          </h3>
          <el-button link type="primary" @click="go('/knowledge')"
            >管理</el-button
          >
        </div>
        <div v-for="item in hotKnowledge" :key="item.id" class="hot-row">
          <div class="hot-title">{{ item.title }}</div>
          <div class="hot-meta">
            <span class="cat">{{ kbStore.categoryName(item.categoryId) }}</span>
            <span class="count">AI调用 {{ item.useCount }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.workbench {
  height: 100%;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 40%),
    $bg-page;
}

.hero {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.hero-main {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%);
  color: #fff;
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.18);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
}

.hero-main p {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.92;
  max-width: 560px;

  strong {
    font-weight: 700;
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-side {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
}

.side-item {
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: baseline;
  gap: 8px;

  .label {
    font-size: 13px;
    color: $text-secondary;
  }

  strong {
    font-size: 22px;
    color: $primary;
  }

  em {
    font-style: normal;
    font-size: 12px;
    color: $text-muted;
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.kpi-card {
  border: 1px solid $border;
  background: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  }

  .kpi-label {
    font-size: 13px;
    color: $text-secondary;
  }

  .kpi-value {
    margin-top: 6px;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
  }

  .kpi-tip {
    margin-top: 6px;
    font-size: 12px;
    color: $text-muted;
  }

  &.blue .kpi-value {
    color: $primary;
  }
  &.red .kpi-value {
    color: #dc2626;
  }
  &.amber .kpi-value {
    color: #d97706;
  }
  &.teal .kpi-value {
    color: #0f766e;
  }
}

.shortcut-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.shortcut-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid $border;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  .icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: $primary-bg;
    color: $primary;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
  }

  .desc {
    margin-top: 2px;
    font-size: 12px;
    color: $text-muted;
  }
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.panel {
  background: #fff;
  border: 1px solid $border;
  border-radius: 14px;
  padding: 12px 14px 8px;
  min-height: 280px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 15px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

.list-row {
  display: flex;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
}

.list-body {
  min-width: 0;
  flex: 1;
}

.top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  strong {
    font-size: 13px;
  }
}

.preview {
  margin-top: 4px;
  font-size: 12px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sla {
  margin-left: auto;
  font-size: 12px;
  color: $primary;
  font-weight: 600;

  &.danger {
    color: #dc2626;
  }
}

.order {
  color: $primary;
  font-weight: 600;
  margin-right: 6px;
}

.ticket-flag {
  width: 28px;
  text-align: center;
  color: #cbd5e1;
  font-size: 16px;
  line-height: 34px;

  &.red {
    color: #ef4444;
  }
}

.hot-row {
  padding: 10px 4px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
}

.hot-title {
  font-size: 13px;
  font-weight: 600;
}

.hot-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .cat {
    font-size: 12px;
    color: $primary;
    background: $primary-bg;
    padding: 1px 8px;
    border-radius: 999px;
  }

  .count {
    margin-left: auto;
    font-size: 12px;
    color: $text-muted;
  }
}

@media (max-width: 1200px) {
  .hero,
  .grid-2,
  .kpi-row,
  .shortcut-row {
    grid-template-columns: 1fr 1fr;
  }

  .shortcut-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .hero,
  .grid-2,
  .kpi-row,
  .shortcut-row {
    grid-template-columns: 1fr;
  }
}
</style>
