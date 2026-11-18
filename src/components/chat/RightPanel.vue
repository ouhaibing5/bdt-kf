<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useQuickReplyStore } from '@/stores/quickReply'

const store = useSessionStore()
const qrStore = useQuickReplyStore()
const activeTab = ref('knowledge')
const keyword = ref('')
const categoryId = ref<string | 'all'>('all')
const selectedTags = ref<string[]>([])

const filteredReplies = computed(() =>
  qrStore.filterReplies(
    {
      keyword: keyword.value,
      categoryId: categoryId.value,
      tags: selectedTags.value,
    },
    true,
  ),
)

const orderCount = computed(() => store.activeSession?.orders.length ?? 0)

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tag)
}

function clearTagFilter() {
  selectedTags.value = []
  keyword.value = ''
  categoryId.value = 'all'
}

function useReply(content: string, sendDirect: boolean, id: string) {
  store.applyQuickReply(content, sendDirect)
  qrStore.recordUse(id)
}
</script>

<template>
  <aside class="right-panel">
    <el-tabs v-model="activeTab" class="panel-tabs">
      <el-tab-pane label="客户画像" name="profile" />
      <el-tab-pane :label="`关联订单 (${orderCount})`" name="orders" />
      <el-tab-pane label="快捷回复" name="knowledge" />
    </el-tabs>

    <div v-if="!store.activeSession" class="empty-wrap">
      <el-empty description="请选择会话" :image-size="56" />
    </div>

    <template v-else>
      <div v-show="activeTab === 'profile'" class="panel-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="注册天数">
            {{ store.activeSession.profile.registerDays }} 天
          </el-descriptions-item>
          <el-descriptions-item label="历史订单">
            {{ store.activeSession.profile.orderCount }} 笔
          </el-descriptions-item>
          <el-descriptions-item label="累计消费">
            ¥{{ store.activeSession.profile.totalAmount.toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="备注">
            {{ store.activeSession.profile.remark || '—' }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="profile-tags">
          <el-tag
            v-for="tag in store.activeSession.profile.tags"
            :key="tag"
            size="small"
            effect="plain"
            type="primary"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>

      <div v-show="activeTab === 'orders'" class="panel-body">
        <el-empty
          v-if="!store.activeSession.orders.length"
          description="暂无关联订单"
          :image-size="56"
        />
        <div
          v-for="order in store.activeSession.orders"
          :key="order.id"
          class="order-card"
        >
          <div class="order-top">
            <strong>{{ order.productName }}</strong>
            <el-tag size="small">{{ order.status }}</el-tag>
          </div>
          <div class="order-line">订单号：{{ order.id }}</div>
          <div class="order-line">金额：¥{{ order.amount }}</div>
          <div class="order-line">下单：{{ order.createdAt }}</div>
          <div v-if="order.trackingNo" class="order-line">
            物流：{{ order.courier }} {{ order.trackingNo }}
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'knowledge'" class="panel-body knowledge">
        <div class="kb-toolbar">
          <el-input
            v-model="keyword"
            clearable
            size="small"
            placeholder="搜索话术"
          />
          <el-select
            v-model="categoryId"
            size="small"
            placeholder="分类"
            style="width: 112px; flex-shrink: 0"
          >
            <el-option label="全部分类" value="all" />
            <el-option
              v-for="c in qrStore.sortedCategories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </div>

        <div class="tag-bar">
          <div class="tag-scroll">
            <button
              v-for="tag in qrStore.allTags"
              :key="tag"
              type="button"
              class="tag-pill"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <button
            v-if="selectedTags.length || keyword || categoryId !== 'all'"
            type="button"
            class="tag-clear"
            @click="clearTagFilter"
          >
            清空
          </button>
        </div>

        <div class="kb-count">共 {{ filteredReplies.length }} 条可用话术</div>

        <div
          v-for="item in filteredReplies"
          :key="item.id"
          class="kb-card"
        >
          <div class="kb-head">
            <strong class="kb-title">{{ item.title }}</strong>
            <span class="kb-cat">{{
              qrStore.categoryName(item.categoryId)
            }}</span>
          </div>
          <div class="kb-tags">
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="mini-tag"
              @click="toggleTag(tag)"
              >{{ tag }}</span
            >
            <span class="use-count">用过 {{ item.useCount }}</span>
          </div>
          <p class="kb-content">{{ item.content }}</p>
          <div class="kb-actions">
            <el-button
              size="small"
              :disabled="!!store.activeSession?.aiTakeover"
              @click="useReply(item.content, false, item.id)"
              >填入</el-button
            >
            <el-button
              size="small"
              type="primary"
              :disabled="!!store.activeSession?.aiTakeover"
              @click="useReply(item.content, true, item.id)"
              >引用发送</el-button
            >
          </div>
        </div>
        <el-empty
          v-if="!filteredReplies.length"
          description="无匹配话术"
          :image-size="56"
        />
      </div>
    </template>
  </aside>
</template>

<style scoped lang="scss">
.right-panel {
  width: $right-panel-width;
  flex-shrink: 0;
  height: 100%;
  background: #fff;
  border-left: 1px solid $border;
  display: flex;
  flex-direction: column;
}

.panel-tabs {
  padding: 0 12px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.empty-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.order-card {
  border: 1px solid $border;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  background: #fafafa;
}

.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.order-line {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.7;
}

.knowledge {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.kb-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  min-width: 0;
}

.tag-scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
}

.tag-pill {
  flex-shrink: 0;
  border: 1px solid $border;
  background: #fff;
  color: $text-secondary;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;

  &:hover {
    border-color: $primary;
    color: $primary;
  }

  &.active {
    background: $primary;
    border-color: $primary;
    color: #fff;
    font-weight: 600;
  }
}

.tag-clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: $primary;
  font-size: 12px;
  cursor: pointer;
  padding: 0 2px;
}

.kb-count {
  font-size: 12px;
  color: $text-muted;
  margin-bottom: 8px;
}

.kb-card {
  border: 1px solid $border;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 48%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: border-color 0.15s;

  &:hover {
    border-color: #bfdbfe;
  }
}

.kb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.kb-title {
  font-size: 13px;
  color: $text-primary;
}

.kb-cat {
  flex-shrink: 0;
  font-size: 11px;
  color: $primary;
  background: $primary-bg;
  padding: 1px 8px;
  border-radius: 999px;
}

.kb-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.mini-tag {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    color: $primary;
    background: $primary-bg;
  }
}

.use-count {
  margin-left: auto;
  font-size: 11px;
  color: $text-muted;
}

.kb-content {
  margin: 0 0 10px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kb-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
