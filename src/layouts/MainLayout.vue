<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound,
  ChatLineSquare,
  Clock,
  Collection,
  DataAnalysis,
  Document,
  FolderOpened,
  Message,
  Wallet,
} from '@element-plus/icons-vue'
import logoUrl from '@/assets/logo.png'
import { useSessionStore } from '@/stores/session'

const store = useSessionStore()
const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

const agentStatusOptions = [
  { label: '在线', value: 'online' },
  { label: '小休/离开', value: 'break' },
  { label: '离线', value: 'away' },
]

function onSimulate() {
  const session = store.simulateIncoming()
  if (!session) return
  ElMessage.success(`已模拟客户「${session.customerName}」互动`)
  if (route.path !== '/chat') router.push('/chat')
}
</script>

<template>
  <el-container class="main-layout">
    <el-header class="app-header" height="56px">
      <div class="brand">
        <img class="brand-logo" :src="logoUrl" alt="鼎尖软件" />
        <div class="brand-text">
          <span class="brand-title">智能客服后台工作台</span>
          <el-tag size="small" effect="dark" type="primary">PRO 2026</el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-button class="simulate-btn" @click="onSimulate">模拟客户互动</el-button>
        <el-select
          v-model="store.agentStatus"
          class="status-select"
          size="default"
        >
          <el-option
            v-for="opt in agentStatusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <div class="agent-profile">
          <el-avatar :size="36" :src="store.agentInfo.avatar" />
          <div class="agent-meta">
            <div class="agent-name">{{ store.agentInfo.name }}</div>
            <div class="agent-id">工号 {{ store.agentInfo.id }}</div>
          </div>
        </div>
      </div>
    </el-header>

    <el-container class="body-wrap">
      <el-aside width="200px" class="app-aside">
        <el-menu
          :default-active="activeMenu"
          router
          class="side-menu"
        >
          <el-menu-item index="/workbench">
            <el-icon><Monitor /></el-icon>
            <span>工作台</span>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><ChatDotRound /></el-icon>
            <span>在线会话</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon>
            <span>历史会话</span>
          </el-menu-item>
          <el-menu-item index="/quick-reply">
            <el-icon><ChatLineSquare /></el-icon>
            <span>快捷回复</span>
          </el-menu-item>
          <el-menu-item index="/knowledge">
            <el-icon><Collection /></el-icon>
            <span>知识库管理</span>
          </el-menu-item>
          <el-menu-item index="/tickets">
            <el-icon><Document /></el-icon>
            <span>工单管理</span>
          </el-menu-item>
          <el-menu-item index="/emails">
            <el-icon><Message /></el-icon>
            <span>客服邮件</span>
          </el-menu-item>
          <el-menu-item index="/compensation">
            <el-icon><Wallet /></el-icon>
            <span>阿里赔付</span>
          </el-menu-item>
          <el-menu-item index="/report">
            <el-icon><DataAnalysis /></el-icon>
            <span>AI 服务报告</span>
          </el-menu-item>
          <el-menu-item index="/reports">
            <el-icon><FolderOpened /></el-icon>
            <span>服务报告列表</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.main-layout {
  height: 100%;
  background: $bg-page;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid $border;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-logo {
  height: 36px;
  width: auto;
  display: block;
  object-fit: contain;
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.simulate-btn {
  --el-button-bg-color: #{$gold};
  --el-button-border-color: #{$gold};
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: #c49210;
  --el-button-hover-border-color: #c49210;
  --el-button-hover-text-color: #fff;
  font-weight: 600;
}

.status-select {
  width: 120px;
}

.agent-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 4px;
}

.agent-meta {
  line-height: 1.3;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
}

.agent-id {
  font-size: 12px;
  color: $text-secondary;
}

.body-wrap {
  height: calc(100% - 56px);
}

.app-aside {
  background: #fff;
  border-right: 1px solid $border;
  padding-top: 8px;
}

.side-menu {
  border-right: none;

  :deep(.el-menu-item) {
    margin: 4px 8px;
    border-radius: 8px;
    height: 44px;
  }

  :deep(.el-menu-item.is-active) {
    background: $primary-bg;
    color: $primary;
    font-weight: 600;
  }
}

.app-main {
  padding: 0;
  overflow: hidden;
  background: $bg-page;
}
</style>
