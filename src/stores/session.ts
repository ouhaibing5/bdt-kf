import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentInfo, mockSessions, simulatePhrases } from '@/mock/sessions'
import { queryLogisticsOrder, extractAlsFromText } from '@/mock/logisticsOrders'
import { buildAiReply } from '@/utils/aiRetrieve'
import {
  buildIntentMenu,
  parseIntentChoice,
  resolveAlsForGuide,
} from '@/utils/intentGuide'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useQuickReplyStore } from '@/stores/quickReply'
import { useAlsQuery } from '@/composables/useAlsQuery'
import type {
  AgentStatus,
  ChatMessage,
  PendingOrderTool,
  ReplyMode,
  Session,
  SessionStatus,
} from '@/types/chat'

function nowTime() {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function lastDialogMessage(session: Session) {
  for (let i = session.messages.length - 1; i >= 0; i -= 1) {
    const m = session.messages[i]
    if (m.type === 'customer' || m.type === 'agent') return m
  }
  return null
}

function bootstrapWaitingTimers(list: Session[]) {
  const now = Date.now()
  for (const s of list) {
    if (s.status !== 'active' && s.status !== 'waiting') continue
    const last = lastDialogMessage(s)
    if (last?.type === 'customer') {
      // 演示：随机已等待几秒，便于打开即可看到计时
      s.waitingStartedAt = now - (3 + Math.floor(Math.random() * 8)) * 1000
    } else {
      s.waitingStartedAt = null
    }
  }
  return list
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>(
    bootstrapWaitingTimers(structuredClone(mockSessions)),
  )
  const activeSessionId = ref('s2')
  const filterStatus = ref<SessionStatus>('active')
  const searchKeyword = ref('')
  const channelFilter = ref('全部渠道')
  const draft = ref('')
  const replyMode = ref<ReplyMode>('public')
  const agentStatus = ref<AgentStatus>('break')
  const ticketBadge = ref(3)
  /** 客户选序号后，驱动工具栏弹窗 */
  const pendingOrderTool = ref<PendingOrderTool | null>(null)

  const activeSession = computed(
    () => sessions.value.find((s) => s.id === activeSessionId.value) ?? null,
  )

  function clearPendingOrderTool() {
    pendingOrderTool.value = null
  }

  function pushAgentAutoReply(session: Session, content: string) {
    const message: ChatMessage = {
      id: uid('bot'),
      type: 'agent',
      content,
      time: nowTime(),
      read: true,
      author: '智能引导',
    }
    session.messages.push(message)
    session.lastMessage = content
    session.lastTime = message.time
    clearWaiting(session)
  }

  function bindAlsToSession(session: Session, alsNo: string) {
    session.guidedAlsNo = alsNo
    session.orderNo = alsNo
    const order = queryLogisticsOrder(alsNo)
    if (order) {
      session.trackingNo = order.trackingNo
      session.courier = order.courier
      if (!session.orders.some((o) => o.id === alsNo)) {
        session.orders = [
          {
            id: alsNo,
            productName: '跨境物流订单',
            amount: session.orders[0]?.amount ?? 0,
            status: order.status,
            createdAt: session.orders[0]?.createdAt || nowTime(),
            trackingNo: order.trackingNo,
            courier: order.courier,
          },
          ...session.orders,
        ]
      }
    }
    useAlsQuery().rememberAls(alsNo)
  }

  function sendIntentMenu(session: Session, alsNo: string) {
    bindAlsToSession(session, alsNo)
    session.intentMenuSent = true
    session.awaitingIntentChoice = true
    pushAgentAutoReply(session, buildIntentMenu(alsNo))
    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content: '系统提示：已发送首次进线意图引导，等待客户回复问题序号',
      time: nowTime(),
    })
  }

  function handleIntentChoice(session: Session, choice: number) {
    const alsNo =
      session.guidedAlsNo ||
      extractAlsFromText(session.orderNo) ||
      session.orderNo
    session.awaitingIntentChoice = false
    const order = alsNo ? queryLogisticsOrder(alsNo) : null

    if (choice === 1) {
      if (order) {
        pushAgentAutoReply(
          session,
          [
            `已为您查询到订单 ${order.alsNo} 的尾程单号信息：`,
            `快递公司：${order.courier}`,
            `追踪单号：${order.trackingNo}`,
            `转运单号：${order.transferNo}`,
            `轨迹查询：${order.trackUrl}`,
          ].join('\n'),
        )
        pendingOrderTool.value = { type: 'lastMile', alsNo: order.alsNo }
      } else {
        pushAgentAutoReply(
          session,
          '暂未查到尾程单号，请确认 ALS 单号是否正确，或稍后再试。',
        )
      }
      return
    }

    if (choice === 2) {
      if (order) {
        pushAgentAutoReply(
          session,
          `订单 ${order.alsNo} 尾程面单已为您调出，请查看弹窗预览；如需发送面单图片请告知。`,
        )
        pendingOrderTool.value = { type: 'label', alsNo: order.alsNo }
      } else {
        pushAgentAutoReply(session, '暂未查到尾程面单，请确认 ALS 单号后重试。')
      }
      return
    }

    if (choice === 3) {
      pushAgentAutoReply(
        session,
        order
          ? `订单 ${order.alsNo} 尾程物流联系方式：${order.logisticsContact}（承运商 ${order.courier}，单号 ${order.trackingNo}）`
          : '暂未查到尾程物流联系方式，请提供正确 ALS 单号。',
      )
      return
    }

    if (choice === 4) {
      pushAgentAutoReply(
        session,
        '收到，关于承运类咨询（产品是否可承运、运费等），请补充：货物品名、重量尺寸、起运地/目的地，我这边帮您核对渠道与报价。',
      )
      markWaiting(session)
      return
    }

    // 5 转人工
    session.status = 'transferred'
    session.sessionStatusText = '已转人工客服'
    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content: '系统提示：客户选择「其他-转人工客服」，会话已转人工接待',
      time: nowTime(),
    })
    pushAgentAutoReply(
      session,
      '好的，已为您转接人工客服，请稍候，专员马上为您服务。',
    )
    markWaiting(session)
  }

  /** 客户进线/发消息后的引导与序号处理 */
  function afterCustomerMessage(session: Session, content: string) {
    if (session.aiTakeover) return

    if (session.awaitingIntentChoice) {
      const choice = parseIntentChoice(content)
      if (choice) {
        window.setTimeout(() => {
          const live = sessions.value.find((s) => s.id === session.id)
          if (!live?.awaitingIntentChoice) return
          handleIntentChoice(live, choice)
        }, 450)
        return
      }
    }

    if (!session.intentMenuSent) {
      const alsNo = resolveAlsForGuide(content, session.orderNo)
      if (alsNo) {
        window.setTimeout(() => {
          const live = sessions.value.find((s) => s.id === session.id)
          if (!live || live.intentMenuSent) return
          sendIntentMenu(live, alsNo)
        }, 500)
      }
    }
  }

  const statusCounts = computed(() => {
    const counts: Record<SessionStatus, number> = {
      active: 0,
      waiting: 0,
      transferred: 0,
      ended: 0,
    }
    for (const s of sessions.value) counts[s.status] += 1
    return counts
  })

  const filteredSessions = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase()
    return sessions.value.filter((s) => {
      if (s.status !== filterStatus.value) return false
      if (
        channelFilter.value !== '全部渠道' &&
        s.channel !== channelFilter.value
      ) {
        return false
      }
      if (!kw) return true
      const hay = `${s.customerName} ${s.phone} ${s.lastMessage} ${s.tags.join(' ')}`.toLowerCase()
      return hay.includes(kw)
    })
  })

  const channels = computed(() => {
    const set = new Set(sessions.value.map((s) => s.channel))
    return ['全部渠道', ...Array.from(set)]
  })

  function selectSession(id: string) {
    activeSessionId.value = id
    const session = sessions.value.find((s) => s.id === id)
    if (session) session.unread = 0
  }

  function setFilterStatus(status: SessionStatus) {
    filterStatus.value = status
    const first = sessions.value.find((s) => s.status === status)
    if (first) selectSession(first.id)
  }

  function resolveVariable(key: string, session: Session) {
    const map: Record<string, string> = {
      客户名: session.customerName,
      订单号: session.orderNo || '（暂无订单号）',
      运单号: session.trackingNo || '（暂无运单号）',
      快递公司: session.courier || '（暂无快递公司）',
    }
    return map[key] ?? `{${key}}`
  }

  function fillTemplate(template: string, session: Session) {
    return template.replace(/\{(客户名|订单号|运单号|快递公司)\}/g, (_, key) =>
      resolveVariable(key, session),
    )
  }

  function insertVariable(key: string) {
    const session = activeSession.value
    if (!session) return
    draft.value += resolveVariable(key, session)
  }

  function markWaiting(session: Session) {
    session.waitingStartedAt = Date.now()
  }

  function clearWaiting(session: Session) {
    session.waitingStartedAt = null
  }

  function sendMessage(content?: string) {
    const session = activeSession.value
    const text = (content ?? draft.value).trim()
    if (!session || !text) return
    if (session.aiTakeover) return

    const message: ChatMessage = {
      id: uid('msg'),
      type: 'agent',
      content: text,
      time: nowTime(),
      read: true,
    }

    session.messages.push(message)
    session.lastMessage = text
    session.lastTime = message.time
    clearWaiting(session)
    if (session.status === 'ended') {
      session.sessionStatusText = undefined
    }
    if (!content) draft.value = ''
  }

  function pushAiReply(session: Session, question: string) {
    const kbStore = useKnowledgeStore()
    const qrStore = useQuickReplyStore()
    const result = buildAiReply({
      question,
      session,
      knowledge: kbStore.enabledItems(),
      quickReplies: qrStore.replies.filter((r) => r.enabled),
    })

    for (const hit of result.hits) {
      if (hit.type === 'knowledge') kbStore.recordUse(hit.id)
      if (hit.type === 'quickReply') qrStore.recordUse(hit.id)
    }

    const sources = result.hits
      .map(
        (h) =>
          `${h.type === 'knowledge' ? '知识库' : '快捷回复'}「${h.title}」`,
      )
      .join('、')

    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content: sources
        ? `AI 检索完成（意图：${result.intent}），已调用：${sources}`
        : `AI 检索完成（意图：${result.intent}），未命中知识，使用兜底话术`,
      time: nowTime(),
    })

    session.messages.push({
      id: uid('ai'),
      type: 'agent',
      content: result.reply,
      time: nowTime(),
      read: true,
      author: 'AI助手',
    })
    session.lastMessage = result.reply
    session.lastTime = nowTime()
    clearWaiting(session)
  }

  function enableAiTakeover() {
    const session = activeSession.value
    if (!session) return
    session.aiTakeover = true
    clearWaiting(session)
    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content:
        '系统提示：会话已切换为 AI 接管，将自动检索知识库 + 快捷回复后回复客户',
      time: nowTime(),
    })

    const last = lastDialogMessage(session)
    if (last?.type === 'customer') {
      window.setTimeout(() => {
        const current = sessions.value.find((s) => s.id === session.id)
        if (!current?.aiTakeover) return
        pushAiReply(current, last.content)
      }, 600)
    }
  }

  function disableAiTakeover() {
    const session = activeSession.value
    if (!session) return
    session.aiTakeover = false
    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content: '系统提示：已取消 AI 接管，请人工继续接待',
      time: nowTime(),
    })
    const last = lastDialogMessage(session)
    if (last?.type === 'customer') markWaiting(session)
  }

  function applyQuickReply(content: string, sendDirect = false) {
    const session = activeSession.value
    if (!session) return
    const filled = fillTemplate(content, session)
    if (sendDirect) {
      sendMessage(filled)
    } else {
      draft.value = filled
    }
  }

  function queryOrder() {
    const session = activeSession.value
    if (!session) return false
    if (!session.orderNo || !session.orders.length) {
      session.messages.push({
        id: uid('sys'),
        type: 'system',
        content: '未查询到关联订单，请确认订单号后重试',
        time: nowTime(),
      })
      return false
    }
    const order = session.orders[0]
    session.messages.push({
      id: uid('sys'),
      type: 'system',
      content: `订单查询结果：${order.id}｜${order.productName}｜¥${order.amount}｜状态 ${order.status}｜下单 ${order.createdAt}`,
      time: nowTime(),
    })
    return true
  }

  function queryTracking() {
    const session = activeSession.value
    if (!session) return false
    if (!session.trackingNo) {
      session.messages.push({
        id: uid('sys'),
        type: 'system',
        content: '当前会话暂无运单号，无法查询轨迹',
        time: nowTime(),
      })
      return false
    }
    session.messages.push({
      id: uid('logistics'),
      type: 'logistics',
      content: '物流详情',
      time: nowTime(),
      logistics: {
        company: session.courier || '快递公司',
        trackingNo: session.trackingNo,
        status: session.orders[0]?.status || '运输中',
        tracks: [
          {
            time: nowTime().slice(0, 5),
            desc: `【${session.city}】根据运单 ${session.trackingNo} 查询：快件运输中，请保持电话畅通`,
          },
          {
            time: '09:20',
            desc: `【${session.city}转运中心】快件已发出`,
          },
          {
            time: '18:40',
            desc: '【始发地】快件已揽收',
          },
        ],
      },
    })
    return true
  }

  function simulateCustomerReply(sessionId: string, content: string) {
    const target = sessions.value.find((s) => s.id === sessionId)
    if (!target) return null
    const msg: ChatMessage = {
      id: uid('sim'),
      type: 'customer',
      content,
      time: nowTime(),
    }
    target.messages.push(msg)
    target.lastMessage = content
    target.lastTime = msg.time
    if (target.id !== activeSessionId.value) target.unread += 1
    if (target.aiTakeover) {
      clearWaiting(target)
      window.setTimeout(() => {
        const current = sessions.value.find((s) => s.id === target.id)
        if (!current?.aiTakeover) return
        pushAiReply(current, content)
      }, 600)
    } else {
      markWaiting(target)
      afterCustomerMessage(target, content)
    }
    return target
  }

  function simulateIncoming() {
    // 当前会话在等序号时，优先模拟回复「1」方便演示弹窗
    const active = activeSession.value
    if (active?.awaitingIntentChoice && active.status === 'active') {
      filterStatus.value = 'active'
      return simulateCustomerReply(active.id, '1')
    }

    const phrase =
      simulatePhrases[Math.floor(Math.random() * simulatePhrases.length)]
    const activeOnes = sessions.value.filter((s) => s.status === 'active')

    if (Math.random() > 0.35 && activeOnes.length) {
      const target = activeOnes[Math.floor(Math.random() * activeOnes.length)]
      // 该会话在等序号则回序号，否则用随机话术
      const content = target.awaitingIntentChoice ? '1' : phrase
      filterStatus.value = 'active'
      return simulateCustomerReply(target.id, content)
    }

    const names = ['韩雪', '刘洋', '何静', '马超', '唐果']
    const channels = ['官网 H5', '抖音旗舰店', 'App 客户端', '天猫旗舰店']
    const name = names[Math.floor(Math.random() * names.length)]
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const id = uid('session')
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const startedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${nowTime()}`
    const alsNo = extractAlsFromText(phrase) || `ALS${Date.now().toString().slice(-11)}`

    const newSession: Session = {
      id,
      customerName: name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + id)}`,
      channel,
      vipLevel: 'VIP1',
      phone: `1${Math.floor(Math.random() * 9 + 3)}********`,
      city: '广州市',
      device: '未知设备',
      status: 'waiting',
      lastMessage: phrase,
      lastTime: nowTime(),
      startedAt,
      agentName: agentInfo.name,
      tags: ['#新进线'],
      unread: 1,
      orderNo: alsNo,
      trackingNo: '',
      courier: '',
      intentMenuSent: false,
      awaitingIntentChoice: false,
      profile: {
        level: 'VIP1',
        registerDays: 1,
        orderCount: 1,
        totalAmount: 199,
        tags: ['模拟进线'],
      },
      orders: [
        {
          id: alsNo,
          productName: '跨境物流订单',
          amount: 199,
          status: '运输中',
          createdAt: new Date().toLocaleString('zh-CN'),
        },
      ],
      messages: [
        {
          id: uid('sys'),
          type: 'system',
          content: `系统提示：模拟客户 ${name} 经 ${channel} 进线（待接入）`,
          time: nowTime(),
        },
        {
          id: uid('sim'),
          type: 'customer',
          content: phrase,
          time: nowTime(),
        },
      ],
    }

    // auto accept into active for smoother demo
    newSession.status = 'active'
    newSession.messages[0].content = `系统提示：模拟客户 ${name} 经 ${channel} 进线，已自动接入`
    markWaiting(newSession)
    sessions.value.unshift(newSession)
    filterStatus.value = 'active'
    selectSession(id)
    afterCustomerMessage(newSession, phrase)
    return newSession
  }

  function queryHistory(params: {
    dateRange: [string, string] | null
    status: SessionStatus | 'all'
    keyword?: string
  }) {
    const kw = (params.keyword || '').trim().toLowerCase()
    const [start, end] = params.dateRange || [null, null]

    return sessions.value
      .filter((s) => {
        if (params.status !== 'all' && s.status !== params.status) return false

        const day = s.startedAt.slice(0, 10)
        if (start && day < start) return false
        if (end && day > end) return false

        if (!kw) return true
        const hay =
          `${s.customerName} ${s.phone} ${s.channel} ${s.orderNo} ${s.lastMessage} ${s.agentName || ''}`.toLowerCase()
        return hay.includes(kw)
      })
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  function openHistorySession(id: string) {
    const session = sessions.value.find((s) => s.id === id)
    if (!session) return
    filterStatus.value = session.status
    selectSession(id)
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    filterStatus,
    searchKeyword,
    channelFilter,
    draft,
    replyMode,
    agentStatus,
    ticketBadge,
    pendingOrderTool,
    statusCounts,
    filteredSessions,
    channels,
    agentInfo,
    selectSession,
    setFilterStatus,
    insertVariable,
    sendMessage,
    applyQuickReply,
    queryOrder,
    queryTracking,
    enableAiTakeover,
    disableAiTakeover,
    simulateIncoming,
    simulateCustomerReply,
    clearPendingOrderTool,
    queryHistory,
    openHistorySession,
  }
})
