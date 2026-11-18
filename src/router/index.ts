import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import WorkbenchHome from '@/views/WorkbenchHome.vue'
import ChatWorkbench from '@/views/ChatWorkbench.vue'
import HistorySessions from '@/views/HistorySessions.vue'
import QuickReplyManage from '@/views/QuickReplyManage.vue'
import TicketManage from '@/views/TicketManage.vue'
import KnowledgeManage from '@/views/KnowledgeManage.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import CompensationManage from '@/views/CompensationManage.vue'
import EmailManage from '@/views/EmailManage.vue'
import ServiceReport from '@/views/ServiceReport.vue'
import ReportHistory from '@/views/ReportHistory.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/workbench',
      children: [
        {
          path: 'workbench',
          name: 'workbench',
          component: WorkbenchHome,
          meta: { title: '工作台' },
        },
        {
          path: 'chat',
          name: 'chat',
          component: ChatWorkbench,
          meta: { title: '在线会话' },
        },
        {
          path: 'history',
          name: 'history',
          component: HistorySessions,
          meta: { title: '历史会话' },
        },
        {
          path: 'quick-reply',
          name: 'quick-reply',
          component: QuickReplyManage,
          meta: { title: '快捷回复' },
        },
        {
          path: 'knowledge',
          name: 'knowledge',
          component: KnowledgeManage,
          meta: { title: '知识库管理' },
        },
        {
          path: 'tickets',
          name: 'tickets',
          component: TicketManage,
          meta: { title: '工单管理' },
        },
        {
          path: 'emails',
          name: 'emails',
          component: EmailManage,
          meta: { title: '客服邮件' },
        },
        {
          path: 'compensation',
          name: 'compensation',
          component: CompensationManage,
          meta: { title: '阿里赔付' },
        },
        {
          path: 'report',
          name: 'report',
          component: ServiceReport,
          meta: { title: 'AI 服务报告' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: ReportHistory,
          meta: { title: '服务报告列表' },
        },
        {
          path: 'orders/:alsNo',
          name: 'order-detail',
          component: OrderDetail,
          meta: { title: '订单查看' },
        },
      ],
    },
  ],
})

export default router
