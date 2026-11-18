<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import type { ChatMessage } from '@/types/chat'

const store = useSessionStore()
const listRef = ref<HTMLElement | null>(null)

async function scrollBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

watch(
  () => [
    store.activeSessionId,
    store.activeSession?.messages.length,
  ],
  () => scrollBottom(),
  { immediate: true },
)

function isCustomerSide(msg: ChatMessage) {
  return msg.type === 'customer'
}
</script>

<template>
  <div ref="listRef" class="message-list">
    <template v-if="store.activeSession">
      <div
        v-for="msg in store.activeSession.messages"
        :key="msg.id"
        class="msg-row"
        :class="msg.type"
      >
        <div v-if="msg.type === 'system'" class="system-msg">
          {{ msg.content }}
        </div>

        <div v-else-if="msg.type === 'summary'" class="summary-card">
          <div class="summary-title">会话已结束</div>
          <div class="summary-body">
            <span>分类：{{ msg.summary?.category }}</span>
            <span>满意度：{{ msg.summary?.satisfaction }}</span>
            <span>时间：{{ msg.summary?.endedAt }}</span>
          </div>
        </div>

        <div v-else-if="msg.type === 'logistics'" class="logistics-card">
          <div class="logistics-head">
            <strong>{{ msg.logistics?.company }} 物流详情</strong>
            <el-tag size="small" type="success">{{
              msg.logistics?.status
            }}</el-tag>
          </div>
          <div class="logistics-no">运单号：{{ msg.logistics?.trackingNo }}</div>
          <el-timeline class="logistics-timeline">
            <el-timeline-item
              v-for="(t, idx) in msg.logistics?.tracks || []"
              :key="idx"
              :timestamp="t.time"
              placement="top"
              :type="idx === 0 ? 'primary' : 'info'"
            >
              {{ t.desc }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <div v-else-if="msg.type === 'internal'" class="internal-card">
          <div class="internal-label">
            内部协作备注（客户不可见）
            <span v-if="msg.author">· {{ msg.author }}</span>
            <span class="time">{{ msg.time }}</span>
          </div>
          <div class="internal-content">{{ msg.content }}</div>
        </div>

        <template v-else>
          <el-avatar
            v-if="isCustomerSide(msg)"
            :size="32"
            :src="store.activeSession.avatar"
          />
          <div class="bubble-wrap" :class="{ agent: msg.type === 'agent' }">
            <div class="bubble" :class="msg.type">
              {{ msg.content }}
            </div>
            <div class="meta">
              <span>{{ msg.time }}</span>
              <span v-if="msg.type === 'agent' && msg.read">已读</span>
            </div>
          </div>
          <el-avatar
            v-if="msg.type === 'agent'"
            :size="32"
            :src="store.agentInfo.avatar"
          />
        </template>
      </div>
    </template>
    <el-empty v-else description="请选择会话" />
  </div>
</template>

<style scoped lang="scss">
.message-list {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
  background: #f5f7fb;
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  align-items: flex-start;

  &.agent {
    justify-content: flex-end;
  }

  &.system,
  &.summary,
  &.logistics,
  &.internal {
    justify-content: center;
  }
}

.system-msg {
  font-size: 12px;
  color: $text-muted;
  background: rgba(0, 0, 0, 0.04);
  padding: 6px 12px;
  border-radius: 999px;
  max-width: 90%;
  text-align: center;
}

.bubble-wrap {
  max-width: 62%;
  display: flex;
  flex-direction: column;

  &.agent {
    align-items: flex-end;
  }
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;

  &.customer {
    background: #fff;
    border: 1px solid $border;
    border-top-left-radius: 4px;
  }

  &.agent {
    background: $primary;
    color: #fff;
    border-top-right-radius: 4px;
  }
}

.meta {
  margin-top: 4px;
  font-size: 11px;
  color: $text-muted;
  display: flex;
  gap: 8px;
}

.logistics-card {
  width: min(420px, 90%);
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.logistics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.logistics-no {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.logistics-timeline {
  padding-left: 2px;
  margin-top: 4px;
}

.internal-card {
  width: min(460px, 90%);
  background: $warning-bg;
  border: 1px solid $warning-border;
  border-radius: 10px;
  padding: 10px 14px;
}

.internal-label {
  font-size: 12px;
  color: #c2410c;
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  gap: 6px;
  align-items: center;

  .time {
    margin-left: auto;
    font-weight: 400;
    color: #9a3412;
  }
}

.internal-content {
  font-size: 13px;
  color: #7c2d12;
  line-height: 1.5;
}

.summary-card {
  background: #fff;
  border: 1px dashed $border;
  border-radius: 10px;
  padding: 12px 16px;
  text-align: center;
  min-width: 280px;
}

.summary-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.summary-body {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: $text-secondary;
}
</style>
