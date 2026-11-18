<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useEmailStore } from '@/stores/email'
import { useSessionStore } from '@/stores/session'
import { useAlsQuery } from '@/composables/useAlsQuery'
import type { EmailMessage } from '@/types/email'

const props = defineProps<{
  modelValue: boolean
  initialAlsNo?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const emailStore = useEmailStore()
const sessionStore = useSessionStore()
const router = useRouter()
const { preferredAls, rememberAls } = useAlsQuery()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const alsInput = ref('')
const loading = ref(false)
const queriedAls = ref('')
const results = ref<EmailMessage[]>([])
const expandedIds = ref(new Set<string>())

const unrepliedCount = computed(
  () => results.value.filter((m) => m.direction === 'in' && !m.replied).length,
)

const customerName = computed(() => results.value[0]?.customerName || '')

const emptyText = computed(() =>
  queriedAls.value
    ? '该订单暂无往来邮件'
    : '当前会话无订单号，请输入 ALS 查询',
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    results.value = []
    queriedAls.value = ''
    expandedIds.value = new Set()
    alsInput.value =
      (props.initialAlsNo || '').trim().toUpperCase() ||
      preferredAls(sessionStore.activeSession?.orderNo) ||
      sessionStore.activeSession?.orderNo ||
      ''
    if (alsInput.value) void lookup()
  },
)

async function lookup() {
  const als = alsInput.value.trim().toUpperCase()
  if (!als) {
    ElMessage.warning('请输入 ALS 单号')
    return
  }
  loading.value = true
  await new Promise((r) => setTimeout(r, 220))
  results.value = emailStore.queryByAls(als)
  queriedAls.value = als
  loading.value = false
  expandedIds.value = new Set()
  if (results.value.length) rememberAls(als)
}

function toggleBody(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function nodeType(m: EmailMessage) {
  if (m.direction === 'out') return 'success'
  return m.replied ? 'primary' : 'danger'
}

function gotoManage() {
  emailStore.resetFilters()
  emailStore.keyword = queriedAls.value || alsInput.value.trim().toUpperCase()
  router.push('/emails')
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="过往邮件"
    width="640px"
    destroy-on-close
    append-to-body
  >
    <div class="query-bar">
      <el-input
        v-model="alsInput"
        clearable
        placeholder="输入 ALS 单号切换查询"
        @keyup.enter="lookup"
      />
      <el-button type="primary" :loading="loading" @click="lookup"
        >查询</el-button
      >
    </div>

    <div v-loading="loading" class="result-wrap">
      <template v-if="results.length">
        <div class="summary">
          订单 <strong>{{ queriedAls }}</strong> · 客户 {{ customerName }} · 共
          {{ results.length }} 封
          <el-tag v-if="unrepliedCount" size="small" type="danger"
            >未回复 {{ unrepliedCount }}</el-tag
          >
        </div>
        <el-timeline class="timeline">
          <el-timeline-item
            v-for="m in results"
            :key="m.id"
            :timestamp="m.sentAt"
            placement="top"
            :type="nodeType(m)"
          >
            <div class="mail-item">
              <div class="mail-head">
                <el-tag
                  size="small"
                  :type="m.direction === 'in' ? 'primary' : 'success'"
                  >{{ m.direction === 'in' ? '收' : '发' }}</el-tag
                >
                <span class="mail-subject">{{ m.subject }}</span>
                <el-tag
                  v-if="m.direction === 'in' && !m.replied"
                  size="small"
                  type="danger"
                  >未回复</el-tag
                >
              </div>
              <div class="mail-addr">{{ m.from }} → {{ m.to }}</div>
              <el-button
                link
                type="primary"
                size="small"
                @click="toggleBody(m.id)"
                >{{ expandedIds.has(m.id) ? '收起正文' : '展开正文' }}</el-button
              >
              <div v-if="expandedIds.has(m.id)" class="mail-body">{{
                m.body
              }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </template>

      <el-empty
        v-else-if="!loading"
        :description="emptyText"
        :image-size="64"
      />
    </div>

    <template #footer>
      <el-button
        link
        type="primary"
        :disabled="!queriedAls"
        @click="gotoManage"
        >前往客服邮件页</el-button
      >
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.query-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;

  .el-input {
    flex: 1;
  }
}

.result-wrap {
  min-height: 120px;
  max-height: 440px;
  overflow-y: auto;
}

.summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 12px;

  strong {
    color: $primary;
  }
}

.timeline {
  padding-left: 4px;
}

.mail-item {
  border: 1px solid $border;
  border-radius: 8px;
  padding: 8px 10px;
}

.mail-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mail-subject {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
}

.mail-addr {
  margin-top: 4px;
  font-size: 12px;
  color: $text-muted;
}

.mail-body {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fafafa;
  font-size: 12px;
  line-height: 1.7;
  color: $text-secondary;
  white-space: pre-wrap;
}
</style>