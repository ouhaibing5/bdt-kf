# 智能客服工作台（bdt-kefu）

八达通跨境物流 **智能客服后台工作台** 前端原型。面向阿里国际站（ICBU）物流咨询场景，提供在线会话、快捷回复、知识库、工单与 SLA 计时等能力；后续通过 RPA 与阿里聊天窗口双向同步。

产品需求见：[docs/PRD-智能客服工作台.md](./docs/PRD-智能客服工作台.md)

## 技术栈

- Vue 3 + TypeScript + Vite
- Element Plus（自动按需引入）
- Pinia + Vue Router
- Sass

当前数据为本地 Mock，未接真实后端。

## 环境要求

- Node.js ≥ 22（推荐 22.18+）
- npm ≥ 10

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务
npm run dev
```

本地访问：<http://localhost:5173/>

默认进入「工作台」：`/workbench`

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（Vite） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/workbench` | 工作台首页 |
| `/chat` | 在线会话 |
| `/history` | 历史会话 |
| `/quick-reply` | 快捷回复管理 |
| `/knowledge` | 知识库管理 |
| `/tickets` | 工单管理 |

## 目录结构

```text
src/
  components/chat/   # 会话相关组件（列表、消息、输入、SLA 等）
  layouts/           # 主布局
  views/             # 页面
  stores/            # Pinia 状态
  mock/              # 本地 Mock 数据
  router/            # 路由
  styles/            # 全局样式与变量
  types/             # 类型定义
docs/                # 产品文档（PRD）
```

## 说明

- 路径别名：`@` → `src/`
- Element Plus 组件与 API 通过 `unplugin-vue-components` / `unplugin-auto-import` 自动引入
- SCSS 变量文件：`src/styles/variables.scss`（已在 Vite 中全局注入）
