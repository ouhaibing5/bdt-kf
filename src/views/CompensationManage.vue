<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import { useCompensationStore } from '@/stores/compensation'
import {
  COMPENSATION_TYPES,
  type CompensationRecord,
} from '@/types/compensation'
import { exportCompensationsCsv } from '@/utils/exportCompensation'
import AddCompensationDialog from '@/components/chat/AddCompensationDialog.vue'

const store = useCompensationStore()
const addVisible = ref(false)
const detailVisible = ref(false)
const current = ref<CompensationRecord | null>(null)

watch(
  () => [store.keyword, store.typeFilter, store.partyFilter, store.dateRange],
  () => {
    store.page = 1
  },
)

const dateModel = computed({
  get: () => {
    if (!store.dateRange) return null
    return store.dateRange.map((d) => d.replace(/-/g, '/')) as [string, string]
  },
  set: (val: [string, string] | null) => {
    if (!val) {
      store.dateRange = null
      return
    }
    store.dateRange = val.map((d) => d.replace(/\//g, '-').slice(0, 10)) as [
      string,
      string,
    ]
  },
})

function onSearch() {
  store.page = 1
  ElMessage.success(`共 ${store.total} 条赔付记录`)
}

function onReset() {
  store.resetFilters()
}

function openDetail(row: CompensationRecord) {
  current.value = row
  detailVisible.value = true
}

async function onRemove(row: CompensationRecord) {
  await ElMessageBox.confirm(
    `确认删除赔付记录 ${row.ticketNo}（${row.alsNo}）？`,
    '删除确认',
    { type: 'warning' },
  )
  store.removeRecord(row.id)
  ElMessage.success('已删除')
}

function money(n: number) {
  return `¥${n.toFixed(2)}`
}

function onExport() {
  const rows = store.filtered
  if (!rows.length) {
    ElMessage.warning('当前筛选结果为空，无法导出')
    return
  }
  exportCompensationsCsv(rows)
  ElMessage.success(`已导出 ${rows.length} 条赔付记录`)
}
</script>

<template>
  <div class="comp-page">
    <div class="page-card">
      <div class="page-title">
        <div>
          <h2>阿里赔付</h2>
          <p>
            对齐赔付模板字段：单号 · 类型 · 汇率货值 · 运费 · 工单号；金额按预报下单日汇率折算人民币
          </p>
        </div>
        <div class="title-actions">
          <el-button :icon="Download" @click="onExport">导出</el-button>
          <el-button type="primary" :icon="Plus" @click="addVisible = true"
            >添加赔付</el-button
          >
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card">
          <div class="num">{{ store.records.length }}</div>
          <div class="label">全部记录</div>
        </div>
        <div class="stat-card accent">
          <div class="num">{{ money(store.totalAmount) }}</div>
          <div class="label">赔付总额（CNY）</div>
        </div>
        <div class="stat-card">
          <div class="num">{{ store.typeStats['尾程丢件'] || 0 }}</div>
          <div class="label">尾程丢件</div>
        </div>
        <div class="stat-card">
          <div class="num">{{ store.typeStats['运输破损'] || 0 }}</div>
          <div class="label">运输破损</div>
        </div>
      </div>

      <el-form class="filter-form" :inline="true" @submit.prevent="onSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="store.keyword"
            clearable
            placeholder="ALS / 追踪号 / 工单号 / 原因"
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="赔付类型">
          <el-select v-model="store.typeFilter" style="width: 140px">
            <el-option label="全部类型" value="all" />
            <el-option
              v-for="t in COMPENSATION_TYPES"
              :key="t"
              :label="t"
              :value="t"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="责任方">
          <el-select v-model="store.partyFilter" style="width: 140px">
            <el-option label="全部责任方" value="all" />
            <el-option
              v-for="p in store.partyOptions"
              :key="p"
              :label="p"
              :value="p"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="登记日期">
          <el-date-picker
            v-model="dateModel"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY/MM/DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch"
            >查询</el-button
          >
          <el-button :icon="RefreshRight" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="result-meta">
        共 <strong>{{ store.total }}</strong> 条
      </div>

      <el-table :data="store.paged" border stripe height="100%" class="table">
        <el-table-column prop="registerTime" label="登记时间" width="160" />
        <el-table-column prop="orderTime" label="预报下单时间" width="160" />
        <el-table-column prop="alsNo" label="客户单号" width="150" />
        <el-table-column prop="trackingNo" label="追踪单号" min-width="150" />
        <el-table-column prop="transferNo" label="转单号" width="130" />
        <el-table-column prop="compensationType" label="赔付类型" width="110" />
        <el-table-column prop="responsibleParty" label="责任方" width="110" />
        <el-table-column label="汇率" width="80">
          <template #default="{ row }">{{ row.exchangeRate }}</template>
        </el-table-column>
        <el-table-column label="货值(CNY)" width="110" align="right">
          <template #default="{ row }">{{
            money(row.goodsAmountCny)
          }}</template>
        </el-table-column>
        <el-table-column label="运费(CNY)" width="100" align="right">
          <template #default="{ row }">{{
            money(row.freightAmountCny)
          }}</template>
        </el-table-column>
        <el-table-column label="总金额(CNY)" width="120" align="right">
          <template #default="{ row }">
            <strong class="total">{{ money(row.totalAmountCny) }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="ticketNo" label="赔付工单号" width="140" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDetail(row as CompensationRecord)"
              >详情</el-button
            >
            <el-button
              link
              type="danger"
              @click="onRemove(row as CompensationRecord)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="store.page"
          v-model:page-size="store.pageSize"
          :total="store.total"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </div>

    <AddCompensationDialog v-model="addVisible" />

    <el-drawer
      v-model="detailVisible"
      size="480px"
      :title="current ? `赔付详情 · ${current.ticketNo}` : '赔付详情'"
    >
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="客户单号">{{
            current.alsNo
          }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{
            current.customerName || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="预报下单">{{
            current.orderTime
          }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{
            current.registerTime
          }}</el-descriptions-item>
          <el-descriptions-item label="追踪单号">{{
            current.trackingNo
          }}</el-descriptions-item>
          <el-descriptions-item label="转单号">{{
            current.transferNo
          }}</el-descriptions-item>
          <el-descriptions-item label="赔付类型">{{
            current.compensationType
          }}</el-descriptions-item>
          <el-descriptions-item label="责任方">{{
            current.responsibleParty
          }}</el-descriptions-item>
          <el-descriptions-item label="申报货值"
            >{{ current.declaredValue }} {{ current.currency }}</el-descriptions-item
          >
          <el-descriptions-item label="下单日汇率">{{
            current.exchangeRate
          }}</el-descriptions-item>
          <el-descriptions-item label="货值金额">{{
            money(current.goodsAmountCny)
          }}</el-descriptions-item>
          <el-descriptions-item label="运费金额">{{
            money(current.freightAmountCny)
          }}</el-descriptions-item>
          <el-descriptions-item label="总金额">
            <strong class="total">{{ money(current.totalAmountCny) }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="赔付原因">{{
            current.reason
          }}</el-descriptions-item>
          <el-descriptions-item label="登记人">{{
            current.createdBy
          }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.comp-page {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.page-card {
  height: 100%;
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: $text-secondary;
  }
}

.title-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  border: 1px solid $border;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafafa;

  .num {
    font-size: 20px;
    font-weight: 700;
    color: $text-primary;
  }

  .label {
    margin-top: 2px;
    font-size: 12px;
    color: $text-secondary;
  }

  &.accent {
    background: $primary-bg;
    border-color: #bfdbfe;

    .num {
      color: $primary;
      font-size: 16px;
    }
  }
}

.filter-form {
  margin-bottom: 4px;
}

.result-meta {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 8px;

  strong {
    color: $primary;
  }
}

.table {
  flex: 1;
  min-height: 0;
}

.total {
  color: $primary;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
