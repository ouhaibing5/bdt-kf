<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '功能模块')
</script>

<template>
  <div class="placeholder">
    <el-empty :description="`${title}（第一期占位，后续开放）`">
      <template #image>
        <div class="placeholder-icon">{{ title.slice(0, 1) }}</div>
      </template>
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  border: 1px solid $border;
}

.placeholder-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: $primary-bg;
  color: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin: 0 auto 8px;
}
</style>
