<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MagicStick } from '@element-plus/icons-vue'
import { queryLogisticsOrder } from '@/mock/logisticsOrders'
import { useAlsQuery } from '@/composables/useAlsQuery'

const route = useRoute()
const router = useRouter()
const { rememberAls } = useAlsQuery()

const alsNo = computed(() => String(route.params.alsNo || '').toUpperCase())

const order = computed(() => {
  if (!alsNo.value) return null
  return queryLogisticsOrder(alsNo.value)
})

watch(
  alsNo,
  (v) => {
    if (v) rememberAls(v)
  },
  { immediate: true },
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/chat')
}

function goChat() {
  router.push('/chat')
}

function goReport() {
  router.push(`/report?als=${alsNo.value}`)
}
</script>

<template>
  <div class="order-page">
    <div class="page-card">
      <div class="page-title">
        <div class="title-left">
          <el-button :icon="ArrowLeft" link type="primary" @click="goBack"
            >返回</el-button
          >
          <h2>订单查看</h2>
          <span v-if="order" class="sub">{{ order.alsNo }}</span>
        </div>
        <div class="title-actions">
          <el-button
            v-if="order"
            type="primary"
            :icon="MagicStick"
            @click="goReport"
            >AI 服务报告</el-button
          >
          <el-button @click="goChat">回到会话</el-button>
        </div>
      </div>

      <el-empty v-if="!order" description="未找到该订单" />

      <template v-else>
        <el-descriptions :column="2" border size="small" class="base-desc">
          <el-descriptions-item label="ALS 单号">{{
            order.alsNo
          }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag type="success" effect="plain">{{ order.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="快递公司">{{
            order.courier
          }}</el-descriptions-item>
          <el-descriptions-item label="追踪单号">{{
            order.trackingNo
          }}</el-descriptions-item>
          <el-descriptions-item label="转运单号">{{
            order.transferNo
          }}</el-descriptions-item>
          <el-descriptions-item label="轨迹查询">
            <a :href="order.trackUrl" target="_blank" rel="noopener">{{
              order.trackUrl
            }}</a>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-grid">
          <section class="section">
            <h3>尾程面单</h3>
            <el-image
              :src="order.labelImage"
              fit="contain"
              :preview-src-list="[order.labelImage]"
              class="doc-img"
            />
          </section>
          <section class="section">
            <h3>签收凭证 POD</h3>
            <el-image
              :src="order.podImage"
              fit="contain"
              :preview-src-list="[order.podImage]"
              class="doc-img"
            />
          </section>
        </div>

        <section class="section">
          <h3>物流轨迹与状态</h3>
          <el-table :data="order.tracks" size="small" border stripe>
            <el-table-column prop="time" label="时间" width="170" />
            <el-table-column prop="location" label="地点" width="150" />
            <el-table-column prop="status" label="状态" width="120" />
            <el-table-column prop="desc" label="轨迹描述" min-width="220" />
          </el-table>
        </section>

        <section class="section">
          <h3>订单操作日志</h3>
          <el-table :data="order.logs" size="small" border stripe>
            <el-table-column prop="time" label="时间" width="170" />
            <el-table-column prop="operator" label="操作人" width="120" />
            <el-table-column prop="action" label="动作" width="120" />
            <el-table-column prop="detail" label="详情" min-width="220" />
          </el-table>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.order-page {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  overflow: auto;
}

.page-card {
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 16px 18px 24px;
  min-height: calc(100% - 4px);
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  .title-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  .sub {
    font-size: 13px;
    color: $text-secondary;
  }

  .title-actions {
    display: flex;
    flex-shrink: 0;
  }
}

.base-desc {
  margin-bottom: 18px;

  a {
    color: $primary;
    word-break: break-all;
  }
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 8px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
}

.section {
  margin-bottom: 20px;

  h3 {
    margin: 0 0 10px;
    font-size: 15px;
    color: $text-primary;
  }
}

.doc-img {
  width: 100%;
  max-width: 320px;
  border: 1px solid $border;
  border-radius: 8px;
  background: #fafafa;
}
</style>
