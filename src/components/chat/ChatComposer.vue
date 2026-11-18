<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  Message,
  Picture,
  Stamp,
  Tickets,
  Van,
  Wallet,
} from '@element-plus/icons-vue'
import { useSessionStore } from '@/stores/session'
import { useAlsQuery } from '@/composables/useAlsQuery'
import OrderQueryDialog from '@/components/chat/OrderQueryDialog.vue'
import AddCompensationDialog from '@/components/chat/AddCompensationDialog.vue'
import EmailHistoryDialog from '@/components/chat/EmailHistoryDialog.vue'
import type { OrderToolType } from '@/types/chat'

const store = useSessionStore()
const { rememberAls, preferredAls } = useAlsQuery()
const showEmoji = ref(false)
const dialogVisible = ref(false)
const dialogType = ref<OrderToolType | null>(null)
const compensationVisible = ref(false)
const compensationAls = ref('')
const emailVisible = ref(false)
const emailAls = ref('')

watch(
  () => store.pendingOrderTool,
  (pending) => {
    if (!pending) return
    rememberAls(pending.alsNo)
    dialogType.value = pending.type
    dialogVisible.value = true
    store.clearPendingOrderTool()
    ElMessage.success(
      pending.type === 'lastMile'
        ? '客户选择「1-尾程单号」，已自动弹出查询'
        : pending.type === 'label'
          ? '客户选择「2-尾程面单」，已自动弹出查询'
          : '已自动打开订单查询',
    )
  },
)

const emojiList = [
  '😀',
  '😁',
  '😂',
  '😅',
  '😊',
  '😍',
  '👍',
  '🙏',
  '👏',
  '💪',
  '✨',
  '🎉',
  '❤️',
  '💯',
  '😢',
  '😤',
  '🤝',
  '📦',
  '🚚',
  '✅',
  '❗',
  '❓',
  '🕐',
  '📝',
]

type ToolKey = OrderToolType | 'compensation' | 'emailHistory'

const tools: {
  key: ToolKey
  label: string
  icon: typeof Tickets
  tip: string
}[] = [
  {
    key: 'lastMile',
    label: '尾程单号',
    icon: Tickets,
    tip: '输入 ALS 号查询追踪单号、转运单号，可引用到回复框',
  },
  {
    key: 'pod',
    label: '签收凭证POD',
    icon: Stamp,
    tip: '输入 ALS 号查询签收凭证图片预览',
  },
  {
    key: 'track',
    label: '物流轨迹与状态',
    icon: Van,
    tip: '输入 ALS / 订单号查询轨迹表格',
  },
  {
    key: 'label',
    label: '尾程面单',
    icon: Picture,
    tip: '输入 ALS 号查询尾程面单图片预览',
  },
  {
    key: 'logs',
    label: '订单日志',
    icon: Document,
    tip: '输入 ALS 号查询订单全部操作日志（上次查询号自动带入）',
  },
  {
    key: 'compensation',
    label: '添加赔付',
    icon: Wallet,
    tip: '登记阿里赔付（按 ALS 查询并计算人民币金额）',
  },
  {
    key: 'emailHistory',
    label: '查看过往邮件',
    icon: Message,
    tip: '按当前会话订单号查询客户往来邮件（时间线）',
  },
]

function onEnter(e: KeyboardEvent | Event) {
  const event = e as KeyboardEvent
  if (!event.shiftKey) {
    event.preventDefault()
    store.sendMessage()
  }
}

function onAddCompensation() {
  if (!store.activeSession) {
    ElMessage.warning('请先选择会话')
    return
  }
  compensationAls.value =
    preferredAls(store.activeSession.orderNo) ||
    store.activeSession.orderNo ||
    ''
  if (compensationAls.value) rememberAls(compensationAls.value)
  compensationVisible.value = true
}

function onOpenEmailHistory() {
  if (!store.activeSession) {
    ElMessage.warning('请先选择会话')
    return
  }
  emailAls.value =
    preferredAls(store.activeSession.orderNo) ||
    store.activeSession.orderNo ||
    ''
  emailVisible.value = true
}

function onTool(key: ToolKey) {
  if (!store.activeSession) {
    ElMessage.warning('请先选择会话')
    return
  }
  if (key === 'compensation') {
    onAddCompensation()
    return
  }
  if (key === 'emailHistory') {
    onOpenEmailHistory()
    return
  }
  dialogType.value = key
  dialogVisible.value = true
}

function insertEmoji(emoji: string) {
  store.draft += emoji
  showEmoji.value = false
}
</script>

<template>
  <footer class="composer">
    <div class="tool-bar">
      <el-tooltip
        v-for="tool in tools"
        :key="tool.key"
        :content="tool.tip"
        placement="top"
      >
        <button class="tool-btn" type="button" @click="onTool(tool.key)">
          <el-icon :size="16"><component :is="tool.icon" /></el-icon>
          <span>{{ tool.label }}</span>
        </button>
      </el-tooltip>
    </div>

    <div class="emoji-row">
      <button
        class="emoji-toggle"
        type="button"
        :class="{ active: showEmoji }"
        @click="showEmoji = !showEmoji"
      >
        😊 Emoji
      </button>
      <div v-if="showEmoji" class="emoji-panel">
        <button
          v-for="emoji in emojiList"
          :key="emoji"
          type="button"
          class="emoji-item"
          @click="insertEmoji(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <div v-if="store.activeSession?.aiTakeover" class="ai-mask">
      当前由 AI 接管回复，人工输入已暂停。可点击顶栏「取消AI接管」恢复。
    </div>

    <el-input
      v-model="store.draft"
      type="textarea"
      :rows="3"
      resize="none"
      :disabled="!!store.activeSession?.aiTakeover"
      placeholder="输入回复内容，Enter 发送，Shift+Enter 换行"
      @keydown.enter="onEnter"
    />

    <div class="send-row">
      <span class="hint">Enter 发送</span>
      <el-button
        type="primary"
        :disabled="!!store.activeSession?.aiTakeover"
        @click="store.sendMessage()"
        >发送</el-button
      >
    </div>

    <OrderQueryDialog v-model="dialogVisible" :type="dialogType" />
    <AddCompensationDialog
      v-model="compensationVisible"
      :initial-als-no="compensationAls"
    />
    <EmailHistoryDialog v-model="emailVisible" :initial-als-no="emailAls" />
  </footer>
</template>

<style scoped lang="scss">
.composer {
  background: #fff;
  border-top: 1px solid $border;
  padding: 10px 16px 12px;
}

.tool-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid $border;
  background: #fff;
  color: $text-secondary;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;

  &:hover {
    color: $primary;
    border-color: $primary;
    background: $primary-bg;
  }
}

.emoji-row {
  margin-bottom: 8px;
}

.emoji-toggle {
  border: 1px solid $border;
  background: #fafafa;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 12px;
  cursor: pointer;
  color: $text-secondary;

  &.active,
  &:hover {
    border-color: $primary;
    color: $primary;
    background: $primary-bg;
  }
}

.emoji-panel {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
  border: 1px solid $border;
  border-radius: 8px;
  background: #fafbfc;
  max-width: 320px;
}

.emoji-item {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1.4;
  cursor: pointer;
  border-radius: 6px;
  padding: 2px;

  &:hover {
    background: $primary-bg;
  }
}

.send-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.hint {
  font-size: 12px;
  color: $text-muted;
}

.ai-mask {
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ccfbf1;
  color: #0f766e;
  font-size: 12px;
}
</style>
