<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Cpu, Switch, Ticket } from '@element-plus/icons-vue'
import { useSessionStore } from '@/stores/session'
import SlaTimer from '@/components/chat/SlaTimer.vue'

const store = useSessionStore()

function onTransfer() {
  ElMessage.info('转接功能第一期为演示提示')
}

function onTicket() {
  ElMessage.success('已生成工单（Mock）')
  store.ticketBadge += 1
}

function onAiTakeover() {
  const session = store.activeSession
  if (!session) return
  if (session.aiTakeover) {
    store.disableAiTakeover()
    ElMessage.success('已取消 AI 接管')
  } else {
    store.enableAiTakeover()
    ElMessage.success('已开启 AI 接管')
  }
}
</script>

<template>
  <header v-if="store.activeSession" class="chat-header">
    <div class="left">
      <el-avatar :size="40" :src="store.activeSession.avatar" />
      <div class="info">
        <div class="title-row">
          <span class="name">{{ store.activeSession.customerName }}</span>
          <el-tag size="small" effect="plain">{{
            store.activeSession.channel
          }}</el-tag>
          <span
            v-if="store.activeSession.sessionStatusText"
            class="status-text"
          >
            {{ store.activeSession.sessionStatusText }}
          </span>
          <SlaTimer :session="store.activeSession" />
        </div>
        <div class="meta-row">
          <span>{{ store.activeSession.phone }}</span>
          <span>·</span>
          <span>{{ store.activeSession.city }}</span>
          <span>·</span>
          <span>{{ store.activeSession.device }}</span>
          <span class="sla-rule">首响 ≤20s · 每轮 ≤2min</span>
        </div>
      </div>
    </div>
    <div class="actions">
      <el-button :icon="Switch" @click="onTransfer">转接</el-button>
      <el-button
        :type="store.activeSession.aiTakeover ? 'success' : 'default'"
        :icon="Cpu"
        @click="onAiTakeover"
      >
        {{ store.activeSession.aiTakeover ? '取消AI接管' : 'AI接管' }}
      </el-button>
      <el-button type="primary" :icon="Ticket" @click="onTicket"
        >生成工单</el-button
      >
    </div>
  </header>
</template>

<style scoped lang="scss">
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid $border;
  gap: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.info {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.name {
  font-size: 16px;
  font-weight: 700;
}

.status-text {
  font-size: 12px;
  color: $text-muted;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 999px;
}

.meta-row {
  margin-top: 4px;
  font-size: 12px;
  color: $text-secondary;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.sla-rule {
  margin-left: 4px;
  color: $text-muted;
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
