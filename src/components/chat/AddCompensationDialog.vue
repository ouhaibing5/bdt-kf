<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  calcCompensationAmounts,
  getExchangeRateByOrderDate,
  queryCompensationOrderBase,
} from '@/mock/compensation'
import { useCompensationStore } from '@/stores/compensation'
import { useSessionStore } from '@/stores/session'
import { useAlsQuery } from '@/composables/useAlsQuery'
import {
  COMPENSATION_TYPES,
  RESPONSIBLE_PARTIES,
  type CompensationOrderBase,
  type CompensationType,
} from '@/types/compensation'

const props = defineProps<{
  modelValue: boolean
  /** 打开时优先使用的 ALS（如订单日志弹窗带入） */
  initialAlsNo?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [ticketNo: string, alsNo: string, totalAmountCny: number]
}>()

const store = useCompensationStore()
const sessionStore = useSessionStore()
const { preferredAls, rememberAls } = useAlsQuery()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const saving = ref(false)
const orderBase = ref<CompensationOrderBase | null>(null)

const form = reactive({
  alsNo: '',
  compensationType: '尾程丢件' as CompensationType,
  responsibleParty: '尾程承运商',
  reason: '',
  /** 可覆盖查询出的申报货值 */
  declaredValue: 0,
  /** 可覆盖运费 CNY */
  freightCny: 0,
})

const exchangeRate = computed(() =>
  orderBase.value
    ? getExchangeRateByOrderDate(orderBase.value.orderTime)
    : 0,
)

const amounts = computed(() => {
  if (!orderBase.value || !exchangeRate.value) {
    return { goodsAmountCny: 0, freightAmountCny: 0, totalAmountCny: 0 }
  }
  return calcCompensationAmounts({
    declaredValue: Number(form.declaredValue) || 0,
    exchangeRate: exchangeRate.value,
    freightCny: Number(form.freightCny) || 0,
  })
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.alsNo =
      (props.initialAlsNo || '').trim().toUpperCase() ||
      preferredAls(sessionStore.activeSession?.orderNo) ||
      sessionStore.activeSession?.orderNo ||
      ''
    form.compensationType = '尾程丢件'
    form.responsibleParty = '尾程承运商'
    form.reason = ''
    orderBase.value = null
    form.declaredValue = 0
    form.freightCny = 0
    if (form.alsNo) void lookupOrder()
  },
)

async function lookupOrder() {
  const als = form.alsNo.trim().toUpperCase()
  if (!als) {
    ElMessage.warning('请输入客户单号（ALS…）')
    return
  }
  loading.value = true
  await new Promise((r) => setTimeout(r, 220))
  const data = queryCompensationOrderBase(als)
  loading.value = false
  if (!data) {
    orderBase.value = null
    ElMessage.error('未查询到该 ALS 订单')
    return
  }
  orderBase.value = data
  form.alsNo = data.alsNo
  form.declaredValue = data.declaredValue
  form.freightCny = data.freightCny
  rememberAls(data.alsNo)
}

async function onSubmit() {
  if (!orderBase.value) {
    ElMessage.warning('请先查询 ALS 单号')
    return
  }
  if (!form.reason.trim()) {
    ElMessage.warning('请填写赔付原因')
    return
  }
  saving.value = true
  await new Promise((r) => setTimeout(r, 200))
  const amt = amounts.value
  const row = store.addRecord({
    orderTime: orderBase.value.orderTime,
    alsNo: orderBase.value.alsNo,
    trackingNo: orderBase.value.trackingNo,
    transferNo: orderBase.value.transferNo,
    responsibleParty: form.responsibleParty,
    compensationType: form.compensationType,
    reason: form.reason.trim(),
    declaredValue: Number(form.declaredValue) || 0,
    currency: orderBase.value.currency,
    exchangeRate: exchangeRate.value,
    goodsAmountCny: amt.goodsAmountCny,
    freightAmountCny: amt.freightAmountCny,
    totalAmountCny: amt.totalAmountCny,
    createdBy: sessionStore.agentInfo.name,
    sessionId: sessionStore.activeSession?.id,
    customerName:
      orderBase.value.customerName ||
      sessionStore.activeSession?.customerName,
  })
  saving.value = false
  ElMessage.success(`赔付已登记：${row.ticketNo}，合计 ¥${row.totalAmountCny.toFixed(2)}`)
  emit('saved', row.ticketNo, row.alsNo, row.totalAmountCny)
  visible.value = false

  // 填入一条说明到回复框，方便告知客户
  const tip = [
    `已为您登记阿里赔付申请（工单 ${row.ticketNo}）。`,
    `订单 ${row.alsNo}，类型：${row.compensationType}。`,
    `按预报下单日汇率 ${row.exchangeRate} 计算：`,
    `货值 ¥${row.goodsAmountCny.toFixed(2)} + 运费 ¥${row.freightAmountCny.toFixed(2)} = 合计 ¥${row.totalAmountCny.toFixed(2)}（人民币）。`,
    '后续进度我们会同步跟进。',
  ].join('')
  if (sessionStore.activeSession && !sessionStore.activeSession.aiTakeover) {
    const sep =
      sessionStore.draft && !/\s$/.test(sessionStore.draft) ? ' ' : ''
    sessionStore.draft += `${sep}${tip}`
  }
}

function money(n: number) {
  return `¥${n.toFixed(2)}`
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="添加阿里赔付"
    width="720px"
    destroy-on-close
    append-to-body
  >
    <div class="query-bar">
      <el-input
        v-model="form.alsNo"
        clearable
        placeholder="请输入客户单号 ALS…"
        @keyup.enter="lookupOrder"
      />
      <el-button type="primary" :loading="loading" @click="lookupOrder"
        >查询订单</el-button
      >
    </div>

    <template v-if="orderBase">
      <el-descriptions :column="2" border size="small" class="base-desc">
        <el-descriptions-item label="客户单号">{{
          orderBase.alsNo
        }}</el-descriptions-item>
        <el-descriptions-item label="预报下单时间">{{
          orderBase.orderTime
        }}</el-descriptions-item>
        <el-descriptions-item label="追踪单号">{{
          orderBase.trackingNo
        }}</el-descriptions-item>
        <el-descriptions-item label="转单号">{{
          orderBase.transferNo
        }}</el-descriptions-item>
        <el-descriptions-item label="承运商">{{
          orderBase.courier
        }}</el-descriptions-item>
        <el-descriptions-item label="下单日汇率">
          1 {{ orderBase.currency }} = {{ exchangeRate }} CNY
        </el-descriptions-item>
      </el-descriptions>

      <el-form label-width="110px" class="comp-form" @submit.prevent>
        <el-form-item label="赔付类型" required>
          <el-select v-model="form.compensationType" style="width: 100%">
            <el-option
              v-for="t in COMPENSATION_TYPES"
              :key="t"
              :label="t"
              :value="t"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="责任方" required>
          <el-select v-model="form.responsibleParty" style="width: 100%">
            <el-option
              v-for="p in RESPONSIBLE_PARTIES"
              :key="p"
              :label="p"
              :value="p"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申报货值" required>
          <el-input-number
            v-model="form.declaredValue"
            :min="0"
            :precision="2"
            :step="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="unit">{{ orderBase.currency }}</span>
          <span class="hint"
            >× 汇率 {{ exchangeRate }} =
            {{ money(amounts.goodsAmountCny) }}</span
          >
        </el-form-item>
        <el-form-item label="运费" required>
          <el-input-number
            v-model="form.freightCny"
            :min="0"
            :precision="2"
            :step="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="unit">CNY</span>
        </el-form-item>
        <el-form-item label="赔付原因" required>
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="2"
            placeholder="请填写赔付原因"
          />
        </el-form-item>
      </el-form>

      <div class="amount-card">
        <div class="formula">
          计算：申报货值 × 下单日汇率 + 运费（保留 2 位小数，人民币展示）
        </div>
        <div class="amount-row">
          <span>货值金额（CNY）</span>
          <strong>{{ money(amounts.goodsAmountCny) }}</strong>
        </div>
        <div class="amount-row">
          <span>运费金额（CNY）</span>
          <strong>{{ money(amounts.freightAmountCny) }}</strong>
        </div>
        <div class="amount-row total">
          <span>赔付总金额（CNY）</span>
          <strong>{{ money(amounts.totalAmountCny) }}</strong>
        </div>
      </div>
    </template>

    <el-empty
      v-else-if="!loading"
      description="请先输入 ALS 单号并查询"
      :image-size="64"
    />

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!orderBase"
        @click="onSubmit"
        >保存赔付</el-button
      >
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

.base-desc {
  margin-bottom: 14px;
}

.comp-form {
  margin-top: 4px;
}

.unit {
  margin-left: 8px;
  color: $text-secondary;
  font-size: 13px;
}

.hint {
  margin-left: 12px;
  color: $primary;
  font-size: 13px;
}

.amount-card {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  background: $primary-bg;
  border: 1px solid #bfdbfe;
}

.formula {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 10px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: $text-secondary;
  padding: 4px 0;

  strong {
    color: $text-primary;
    font-size: 14px;
  }

  &.total {
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px dashed #93c5fd;
    color: $text-primary;

    strong {
      color: $primary;
      font-size: 18px;
    }
  }
}
</style>
