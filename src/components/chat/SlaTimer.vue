<script setup lang="ts">
import { computed } from 'vue'
import { Timer } from '@element-plus/icons-vue'
import { useNow } from '@/composables/useNow'
import { calcSlaState, formatDuration } from '@/utils/sla'
import type { Session } from '@/types/chat'

const props = defineProps<{
  session: Session | null
  compact?: boolean
}>()

const now = useNow()

const sla = computed(() => calcSlaState(props.session, now.value))

const label = computed(() => {
  if (!sla.value) return ''
  return sla.value.mode === 'first' ? '首响' : '本轮'
})

const text = computed(() => {
  if (!sla.value) return ''
  const { elapsedSec, limitSec, overtime, remainSec } = sla.value
  if (overtime) {
    return `${formatDuration(elapsedSec)} / ${formatDuration(limitSec)} 超时 ${formatDuration(Math.abs(remainSec))}`
  }
  return `${formatDuration(elapsedSec)} / ${formatDuration(limitSec)} 剩余 ${formatDuration(remainSec)}`
})
</script>

<template>
  <div
    v-if="sla"
    class="sla-timer"
    :class="[sla.level, { compact }]"
  >
    <el-icon class="icon"><Timer /></el-icon>
    <span class="label">{{ label }}</span>
    <span class="value">{{ text }}</span>
  </div>
  <div
    v-else-if="session?.aiTakeover"
    class="sla-timer ai"
    :class="{ compact }"
  >
    <span class="label">AI</span>
    <span class="value">接管中 · 不计时</span>
  </div>
</template>

<style scoped lang="scss">
.sla-timer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;

  &.ok {
    color: $primary;
    background: $primary-bg;
  }

  &.warn {
    color: #b45309;
    background: #fffbeb;
    animation: pulse 1.2s ease-in-out infinite;
  }

  &.danger {
    color: #b91c1c;
    background: #fef2f2;
    animation: pulse 0.8s ease-in-out infinite;
  }

  &.ai {
    color: #0f766e;
    background: #ccfbf1;
  }

  &.compact {
    padding: 1px 8px;
    font-size: 11px;
    gap: 4px;

    .icon {
      font-size: 12px;
    }
  }
}

.label {
  opacity: 0.85;
}

.icon {
  font-size: 14px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.72;
  }
}
</style>
