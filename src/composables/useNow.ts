import { onMounted, onUnmounted, ref } from 'vue'

/** 每秒刷新的当前时间戳，用于 SLA 动态计时 */
export function useNow(intervalMs = 1000) {
  const now = ref(Date.now())
  let timer = 0

  onMounted(() => {
    now.value = Date.now()
    timer = window.setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return now
}
