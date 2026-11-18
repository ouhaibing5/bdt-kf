<script setup lang="ts">
import { useSessionStore } from '@/stores/session'
import type { SessionStatus } from '@/types/chat'
import SlaTimer from '@/components/chat/SlaTimer.vue'

const store = useSessionStore()

const tabs: { key: SessionStatus; label: string }[] = [
  { key: 'active', label: '进行中' },
  { key: 'waiting', label: '待接入' },
  { key: 'transferred', label: '已转接' },
  { key: 'ended', label: '已结束' },
]

</script>

<template>
  <aside class="session-list">
    <div class="status-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="status-tab"
        :class="{ active: store.filterStatus === tab.key }"
        @click="store.setFilterStatus(tab.key)"
      >
        {{ tab.label }}
        <span class="count">{{ store.statusCounts[tab.key] }}</span>
      </button>
    </div>

    <div class="filters">
      <el-input
        v-model="store.searchKeyword"
        clearable
        placeholder="搜索客户/手机/消息"
        size="small"
      />
      <el-select
        v-model="store.channelFilter"
        size="small"
        class="channel-select"
      >
        <el-option
          v-for="c in store.channels"
          :key="c"
          :label="c"
          :value="c"
        />
      </el-select>
    </div>

    <div class="cards">
      <div
        v-for="item in store.filteredSessions"
        :key="item.id"
        class="session-card"
        :class="{ active: item.id === store.activeSessionId }"
        @click="store.selectSession(item.id)"
      >
        <el-avatar :size="40" :src="item.avatar" />
        <div class="card-body">
          <div class="row-top">
            <span class="name">{{ item.customerName }}</span>
            <el-tag size="small" effect="plain">{{ item.channel }}</el-tag>
            <span class="time">{{ item.lastTime }}</span>
          </div>
          <div class="preview">
            <el-badge
              v-if="item.unread"
              :value="item.unread"
              class="unread"
            />
            <span class="preview-text">{{ item.lastMessage }}</span>
          </div>
          <div v-if="item.waitingStartedAt || item.aiTakeover" class="sla-row">
            <SlaTimer :session="item" compact />
          </div>
          <div class="tags">
            <span v-for="tag in item.tags" :key="tag" class="biz-tag">{{
              tag
            }}</span>
          </div>
        </div>
      </div>
      <el-empty
        v-if="!store.filteredSessions.length"
        description="暂无会话"
        :image-size="64"
      />
    </div>
  </aside>
</template>

<style scoped lang="scss">
.session-list {
  width: $session-list-width;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid $border;
  height: 100%;
}

.status-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 10px 10px 0;
}

.status-tab {
  border: none;
  background: transparent;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: $text-secondary;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  .count {
    font-weight: 700;
    color: $text-primary;
  }

  &.active {
    background: $primary-bg;
    color: $primary;

    .count {
      color: $primary;
    }
  }
}

.filters {
  display: flex;
  gap: 8px;
  padding: 10px;
}

.channel-select {
  width: 110px;
  flex-shrink: 0;
}

.cards {
  flex: 1;
  overflow: auto;
  padding: 0 8px 12px;
}

.session-card {
  display: flex;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f9fafb;
  }

  &.active {
    background: $primary-bg;
  }
}

.card-body {
  min-width: 0;
  flex: 1;
}

.row-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.name {
  font-weight: 600;
  font-size: 14px;
}

.time {
  margin-left: auto;
  font-size: 11px;
  color: $text-muted;
}

.preview {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.preview-text {
  font-size: 12px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.biz-tag {
  font-size: 11px;
  color: $primary;
  background: $primary-bg;
  padding: 1px 6px;
  border-radius: 4px;
}

.sla-row {
  margin-top: 6px;
}
</style>
