# Password Manager - Chrome Extension

基于 Chrome Extension Manifest V3 构建的浏览器插件，为 [Password Manager](https://github.com/XiaoLu-Huo/password-manager) 桌面应用提供快速搜索和自动填充功能。

## 功能

- **登录表单检测** — Content Script 自动检测页面中的 `input[type="password"]` 元素，识别登录表单
- **URL 匹配** — 根据当前页面 URL 自动匹配密码库中的凭证
- **快速搜索** — 通过 Popup 弹窗搜索密码库中的凭证，实时展示匹配结果
- **自动填充提示** — 检测到登录表单时自动弹出匹配凭证列表，用户点击即可填充
- **一键填充** — 将匹配的用户名和密码填入登录表单，触发 input/change 事件兼容主流前端框架
- **Vault 状态感知** — Popup 自动检测密码库锁定状态，锁定时提示用户先在桌面应用中解锁
- **会话管理** — Service Worker 通过 `chrome.storage.session` 管理 Session Token

## 技术栈

| 类别 | 技术　　　　　　　　　　　　 |
| ------| ------------------------------|
| 规范 | Chrome Extension Manifest V3 |
| 语言 | TypeScript 5.6　　　　　　　 |
| UI   | React 19　　　　　　　　　　 |
| 构建 | Vite 6　　　　　　　　　　　 |
| 测试 | Vitest + fast-check　　　　　|

## 项目结构

```
password-manager-extension/
├── manifest.json              # Manifest V3 配置
├── popup.html                 # Popup 弹窗 HTML 入口
├── src/
│   ├── popup-entry.tsx        # Popup React 入口
│   ├── PopupApp.tsx           # Popup 主界面（Vault 状态检测 + 搜索 + 填充）
│   ├── QuickSearch.tsx        # 快速搜索组件（关键词搜索凭证列表）
│   ├── AutoFillPrompt.tsx     # 自动填充提示组件（React 版本）
│   ├── service-worker.ts      # 后台服务（API 代理、Session Token 管理）
│   ├── api-client.ts          # HTTP 客户端（与后端通信）
│   ├── content-script.ts      # 内容脚本（表单检测、自动填充、填充提示）
│   ├── types.ts               # TypeScript 类型定义
│   └── __tests__/             # 单元测试
│       ├── setup.ts           # 全局 chrome API mock
│       ├── api-client.test.ts
│       └── content-script.test.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## 前置条件

- Node.js >= 18
- Password Manager 后端服务运行在 `http://localhost:8080`

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录（包含 manifest.json、popup.html、JS 文件）。

### 开发模式（监听文件变化自动重新构建）

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

### 在 Chrome 中加载

1. 运行 `npm run build`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `dist/` 目录

> 注意：使用前需要先在桌面应用中解锁密码库。

## 架构说明

```
┌─────────────┐     消息      ┌────────────────┐    HTTP     ┌──────────┐
│Content Script├──────────────►│ Service Worker  ├────────────►│ Backend  │
│(表单检测+填充)│◄─────────────┤ (API 代理)      │◄────────────┤ :8080    │
└─────────────┘  匹配凭证/填充 └────────────────┘  API 响应   └──────────┘
                                      ▲
                                      │ 消息
                              ┌───────┴───────┐
                              │   Popup UI    │
                              │ (搜索+一键填充) │
                              └───────────────┘
```

### 通信链路

**自动填充流程：**
Content Script 检测到登录表单 → 发送 `LOGIN_FORM_DETECTED` 给 Service Worker → Service Worker 根据 URL 匹配凭证 → 返回匹配列表 → Content Script 显示填充提示 → 用户选择凭证 → 获取明文密码 → 填入表单

**Popup 搜索填充流程：**
用户在 Popup 输入关键词 → 发送 `SEARCH_CREDENTIALS` 给 Service Worker → 展示搜索结果 → 用户选择凭证 → 发送 `AUTO_FILL` 获取密码 → 发送 `FILL_CREDENTIALS` 给 Content Script → 填入表单

### 模块职责

- **Content Script** — 注入到所有网页，检测登录表单、显示自动填充提示、执行表单填充
- **Service Worker** — 后台常驻，作为 API 请求代理，管理 Session Token，处理凭证搜索和匹配
- **API Client** — 封装与后端的 HTTP 通信，统一处理响应解析、401 拦截、网络错误
- **Popup UI** — 点击扩展图标弹出的界面，提供快速搜索和一键填充功能

## 关联项目

- [password-manager](https://github.com/XiaoLu-Huo/password-manager) — 后端 (Spring Boot)
- [password-manager-frontend](https://github.com/XiaoLu-Huo/password-manager-frontend) — 桌面前端 (Electron + React)

## License

Private
