<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Download, Edit, Search, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useReportStore } from '@/stores/report'
import { exportServiceReportMarkdown } from '@/utils/serviceReport'
import type { SavedReport } from '@/types/report'

const router = useRouter()
const store = useReportStore()

function unrepliedCount(r: SavedReport) {
  return r.report.events.filter((e) => e.highlight).length
}

function onView(row: SavedReport) {
  router.push(`/report?id=${row.id}`)
}

function onEdit(row: SavedReport) {
  router.push(`/report?id=${row.id}&edit=1`)
}

function onExport(row: SavedReport) {
  exportServiceReportMarkdown(row.report)
  ElMessage.success('已导出 Markdown 报告')
}

async function onRemove(row: SavedReport) {
  await ElMessageBox.confirm(
    `确认删除 ${row.alsNo} 的服务报告（生成于 ${row.generatedAt}）？删除后不可恢复。`,
    '删除报告',
    { type: 'warning' },
  )
  store.removeReport(row.id)
  ElMessage.success('报告已删除')
}
</script>

<template>
  <div class="report-list-page">
    <div class="page-card">
      <div class="page-title">
        <div>
          <h2>服务报告列表</h2>
          <p>
            历史生成的服务报告自动留存（本地持久化），支持查看、编辑、导出与删除
          </p>
        </div>
        <el-button type="primary" @click="router.push('/report')"
          >生成新报告</el-button
        >
      </div>

      <div class="stat-row">
        <div class="stat-card">
          <div class="num">{{ store.stats.total }}</div>
          <div class="label">报告总数</div>
        </div>
        <div class="stat-card">
          <div class="num">{{ store.stats.orders }}</div>
          <div class="label">覆盖订单数</div>
        </div>
        <div class="stat-card">
          <div class="num">{{ store.stats.edited }}</div>
          <div class="label">已人工编辑</div>
        </div>
      </div>

      <el-form class="filter-form" :inline="true" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="store.keyword"
            clearable
            placeholder="ALS / 客户 / 快递公司 / 尾程单号"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button @click="store.keyword = ''">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="result-meta">
        共 <strong>{{ store.filtered.length }}</strong> 份报告
      </div>

      <el-table
        :data="store.filtered"
        border
        stripe
        height="100%"
        class="table"
        empty-text="暂无历史报告，前往「AI 服务报告」生成后自动留存"
      >
        <el-table-column prop="alsNo" label="ALS 单号" width="160" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column label="快递公司 / 尾程单号" min-width="220">
          <template #default="{ row }">
            <div>{{ (row as SavedReport).report.order.courier }}</div>
            <div class="muted">
              {{ (row as SavedReport).report.order.trackingNo }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="服务动作" width="90" align="center">
          <template #default="{ row }">
            {{ (row as SavedReport).report.events.length }}
          </template>
        </el-table-column>
        <el-table-column label="未回复邮件" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="unrepliedCount(row as SavedReport) ? 'danger' : 'success'"
              >{{ unrepliedCount(row as SavedReport) }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column prop="generatedAt" label="生成时间" width="160" />
        <el-table-column prop="updatedAt" label="最近更新" width="160" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.edited ? 'warning' : 'info'"
              effect="plain"
              >{{ row.edited ? '已编辑' : '原始' }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="View"
              @click="onView(row as SavedReport)"
              >查看</el-button
            >
            <el-button
              link
              type="primary"
              :icon="Edit"
              @click="onEdit(row as SavedReport)"
              >编辑</el-button
            >
            <el-button
              link
              type="primary"
              :icon="Download"
              @click="onExport(row as SavedReport)"
              >导出</el-button
            >
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="onRemove(row as SavedReport)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.report-list-page {
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

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.muted {
  font-size: 12px;
  color: $text-muted;
}
</style>