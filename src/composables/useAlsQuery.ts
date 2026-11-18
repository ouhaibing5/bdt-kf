import { ref } from 'vue'
import { extractAlsFromText } from '@/mock/logisticsOrders'

/** 跨弹窗共享：最近一次成功查询过的 ALS 号 */
const lastQueriedAls = ref('')

export function useAlsQuery() {
  function rememberAls(alsNo: string) {
    const v = alsNo.trim().toUpperCase()
    if (v) lastQueriedAls.value = v
  }

  /** 优先用上次查询号，其次会话订单号里的 ALS */
  function preferredAls(sessionOrderNo?: string) {
    return lastQueriedAls.value || extractAlsFromText(sessionOrderNo) || ''
  }

  return {
    lastQueriedAls,
    rememberAls,
    preferredAls,
  }
}
