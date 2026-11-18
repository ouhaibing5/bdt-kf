<script setup lang="ts">
import SessionList from '@/components/chat/SessionList.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import MessageList from '@/components/chat/MessageList.vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import RightPanel from '@/components/chat/RightPanel.vue'
</script>

<template>
  <div class="workbench">
    <SessionList />
    <section class="center">
      <ChatHeader />
      <MessageList />
      <ChatComposer />
    </section>
    <RightPanel />
  </div>
</template>

<style scoped lang="scss">
.workbench {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}
</style>
