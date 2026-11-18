<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Right } from '@element-plus/icons-vue'
import {
  normalizeAlsNo,
  queryLogisticsOrder,
  type LogisticsOrder,
} from '@/mock/logisticsOrders'
import { useAlsQuery } from '@/composables/useAlsQuery'
import { useSessionStore } from '@/stores/session'
import type { OrderToolType } from '@/types/chat'

export type { OrderToolType }

const props = defineProps<{
  modelValue: boolean
  type: OrderToolType | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useSessionStore()
const router = useRouter()
const { rememberAls, preferredAls } = useAlsQuery()

const alsInput = ref('')
const logInput = ref('')
const savingLog = ref(false)
const loading = ref(false)
const result = ref<LogisticsOrder | null>(null)
const queried = ref(false)

function nowDateTime() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const titleMap: Record<OrderToolType, string> = {
  lastMile: '尾程单号查询',
  pod: '签收凭证 POD',
  track: '物流轨迹与状态',
  label: '尾程面单',
  logs: '订单日志',
}

const dialogTitle = computed(() =>
  props.type ? titleMap[props.type] : '订单查询',
)

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    alsInput.value = preferredAls(store.activeSession?.orderNo)
    logInput.value = ''
    result.value = null
    queried.value = false
    // 上次查过或会话已有 ALS 时自动带入并查询
    if (alsInput.value) {
      void doQuery()
    }
  },
)

async function doQuery() {
  const als = normalizeAlsNo(alsInput.value)
  if (!als) {
    ElMessage.warning('请输入 ALS 单号')
    return
  }
  loading.value = true
  queried.value = true
  // 模拟接口延迟
  await new Promise((r) => setTimeout(r, 280))
  const data = queryLogisticsOrder(als)
  loading.value = false
  if (!data) {
    result.value = null
    ElMessage.error('未查询到该 ALS 订单，请核对后重试')
    return
  }
  result.value = data
  alsInput.value = data.alsNo
  rememberAls(data.alsNo)
}

function quoteToDraft(text: string) {
  if (!text) return
  const sep = store.draft && !store.draft.endsWith('\n') ? (store.draft.endsWith(' ') ? '' : ' ') : ''
  store.draft += `${sep}${text}`
  ElMessage.success('已引用到回复输入框')
}

function quoteLastMile() {
  if (!result.value) return
  const { alsNo, courier, trackingNo, transferNo, trackUrl } = result.value
  quoteToDraft(
    `订单 ${alsNo}：尾程快递 ${courier}，追踪单号 ${trackingNo}，转运单号 ${transferNo}。轨迹查询：${trackUrl}`,
  )
}

async function saveOrderLog() {
  const text = logInput.value.trim()
  if (!text) {
    ElMessage.warning('请输入日志内容')
    return
  }
  if (!result.value) {
    ElMessage.warning('请先查询订单')
    return
  }
  savingLog.value = true
  await new Promise((r) => setTimeout(r, 180))
  result.value.logs.unshift({
    time: nowDateTime(),
    operator: '客服-林依依',
    action: '人工备注',
    detail: text,
  })
  logInput.value = ''
  savingLog.value = false
  ElMessage.success('日志已保存')
}

function openOrderDetail() {
  if (!result.value) return
  const alsNo = result.value.alsNo
  visible.value = false
  router.push({ name: 'order-detail', params: { alsNo } })
}

function onClosed() {
  result.value = null
  queried.value = false
  loading.value = false
  logInput.value = ''
  savingLog.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    destroy-on-close
    append-to-body
    @closed="onClosed"
  >
    <div class="query-bar">
      <el-input
        v-model="alsInput"
        clearable
        placeholder="请输入 ALS 单号 / 订单号，如 ALS02010204573"
        @keyup.enter="doQuery"
      />
      <el-button type="primary" :loading="loading" @click="doQuery"
        >查询</el-button
      >
    </div>

    <div v-if="loading" class="state">查询中…</div>
    <div v-else-if="queried && !result" class="state empty">暂无数据</div>

    <template v-else-if="result">
      <div class="result-entry">
        <span>查询结果 · {{ result.alsNo }}</span>
        <el-button type="primary" link :icon="Right" @click="openOrderDetail">
          进入订单查看页
        </el-button>
      </div>

      <!-- 尾程单号 -->
      <div v-if="type === 'lastMile'" class="block">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="ALS 单号">{{
            result.alsNo
          }}</el-descriptions-item>
          <el-descriptions-item label="快递公司">{{
            result.courier
          }}</el-descriptions-item>
          <el-descriptions-item label="追踪单号">
            <button
              type="button"
              class="quote-link"
              @click="quoteToDraft(result.trackingNo)"
            >
              {{ result.trackingNo }}
            </button>
            <el-button
              link
              type="primary"
              :icon="DocumentCopy"
              @click="quoteToDraft(result.trackingNo)"
              >引用</el-button
            >
          </el-descriptions-item>
          <el-descriptions-item label="转运单号">
            <button
              type="button"
              class="quote-link"
              @click="quoteToDraft(result.transferNo)"
            >
              {{ result.transferNo }}
            </button>
            <el-button
              link
              type="primary"
              :icon="DocumentCopy"
              @click="quoteToDraft(result.transferNo)"
              >引用</el-button
            >
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">{{
            result.status
          }}</el-descriptions-item>
        </el-descriptions>
        <div class="actions">
          <el-button type="primary" @click="quoteLastMile"
            >一键引用到回复框</el-button
          >
        </div>
      </div>

      <!-- POD / 尾程面单 -->
      <div v-else-if="type === 'pod' || type === 'label'" class="block preview">
        <div class="meta">
          <span>{{ result.alsNo }}</span>
          <span>{{ result.courier }} · {{ result.trackingNo }}</span>
        </div>
        <el-image
          :src="type === 'pod' ? result.podImage : result.labelImage"
          fit="contain"
          :preview-src-list="[
            type === 'pod' ? result.podImage : result.labelImage,
          ]"
          class="preview-img"
        />
        <p class="hint">点击图片可放大预览</p>
      </div>

      <!-- 物流轨迹 -->
      <div v-else-if="type === 'track'" class="block">
        <div class="meta row">
          <el-tag type="success" effect="plain">{{ result.status }}</el-tag>
          <span>{{ result.courier }} · {{ result.trackingNo }}</span>
        </div>
        <el-table :data="result.tracks" size="small" border stripe max-height="360">
          <el-table-column prop="time" label="时间" width="160" />
          <el-table-column prop="location" label="地点" width="140" />
          <el-table-column prop="status" label="状态" width="120" />
          <el-table-column prop="desc" label="轨迹描述" min-width="200" />
        </el-table>
      </div>

      <!-- 订单日志 -->
      <div v-else-if="type === 'logs'" class="block">
        <div class="log-form">
          <span class="log-label">日志：</span>
          <el-input
            v-model="logInput"
            clearable
            placeholder="请输入要补充的订单操作日志"
            @keyup.enter="saveOrderLog"
          />
          <el-button
            type="primary"
            :loading="savingLog"
            :disabled="!logInput.trim()"
            @click="saveOrderLog"
            >保存</el-button
          >
        </div>
        <div class="meta">订单 {{ result.alsNo }} 全部操作日志</div>
        <el-table :data="result.logs" size="small" border stripe max-height="360">
          <el-table-column prop="time" label="时间" width="160" />
          <el-table-column prop="operator" label="操作人" width="110" />
          <el-table-column prop="action" label="动作" width="110" />
          <el-table-column prop="detail" label="详情" min-width="220" />
        </el-table>
      </div>
    </template>

    <template #footer>
      <el-button
        v-if="result"
        type="primary"
        plain
        @click="openOrderDetail"
        >进入订单查看页</el-button
      >
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.query-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  .el-input {
    flex: 1;
  }
}

.log-form {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  .log-label {
    flex-shrink: 0;
    font-size: 13px;
    color: $text-primary;
  }

  .el-input {
    flex: 1;
  }
}

.result-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: $primary-bg;
  color: $text-secondary;
  font-size: 13px;
}

.state {
  padding: 32px 0;
  text-align: center;
  color: $text-secondary;
  font-size: 13px;

  &.empty {
    color: $text-muted;
  }
}

.block {
  min-height: 120px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: $text-secondary;

  &.row {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
}

.quote-link {
  border: none;
  background: transparent;
  color: $primary;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  margin-right: 6px;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: $primary-light;
  }
}

.actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.preview {
  text-align: center;
}

.preview-img {
  width: 100%;
  max-width: 360px;
  border: 1px solid $border;
  border-radius: 8px;
  background: #fafafa;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: $text-muted;
}
</style>
