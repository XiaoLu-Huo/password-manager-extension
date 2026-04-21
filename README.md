# Password Manager - Chrome Extension 🔌

基于 Chrome Extension Manifest V3 构建的浏览器插件，为 [Password Manager](https://github.com/XiaoLu-Huo/password-manager) 提供快速搜索和自动填充功能。

## 功能特性

- 登录表单自动检测（识别 `input[type="password"]` 元素）
- 根据当前页面 URL 自动匹配密码库中的凭证
- Popup 弹窗快速搜索凭证，实时展示匹配结果
- 凭证详情查看
- 检测到登录表单时自动弹出匹配凭证列表
- 一键填充用户名和密码（触发 input/change 事件，兼容主流前端框架）
- Vault 状态感知（锁定时提示用户先在桌面应用中解锁）
- Service Worker 通过 `chrome.storage.session` 管理 Session Token

## 技术栈

| 类别 | 技术 |
|------|------|
| 规范 | Chrome Extension Manifest V3 |
| 语言 | TypeScript 5.6 |
| UI | React 19 |
| 构建 | Vite 6 |
| 测试 | Vitest + fast-check (PBT) |

## 前置条件

- Node.js >= 18
- Password Manager 后端服务运行在 `http://localhost:8080`

## 快速开始

```bash
# 安装依赖
npm install

# 构建（产物输出到 dist/）
npm run build

# 开发模式（监听文件变化自动重新构建）
npm run dev

# 运行测试
npm test
```

### 在 Chrome 中加载

1. 运行 `npm run build`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `dist/` 目录

> 使用前需要先在桌面应用中解锁密码库。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建扩展 |
| `npm run dev` | 开发模式（watch） |
| `npm test` | 运行测试（单次执行） |
| `npm run test:watch` | 测试监听模式 |

## 项目结构

```
password-manager-extension/
├── manifest.json              # Manifest V3 配置
├── popup.html                 # Popup 弹窗 HTML 入口
├── icons/                     # 扩展图标（16/48/128px）
├── src/
│   ├── popup-entry.tsx        # Popup React 入口
│   ├── PopupApp.tsx           # Popup 主界面（Vault 状态检测 + 路由）
│   ├── QuickSearch.tsx        # 快速搜索组件
│   ├── CredentialDetailView.tsx  # 凭证详情视图
│   ├── CredentialForm.tsx     # 凭证表单组件
│   ├── AutoFillPrompt.tsx     # 自动填充提示组件
│   ├── service-worker.ts      # 后台服务（API 代理、Session Token 管理）
│   ├── api-client.ts          # HTTP 客户端（与后端通信）
│   ├── content-script.ts      # 内容脚本（表单检测、自动填充）
│   ├── types.ts               # TypeScript 类型定义
│   └── __tests__/             # 单元测试
│       ├── setup.ts           #   全局 chrome API mock
│       ├── api-client.test.ts
│       └── content-script.test.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

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

### 通信流程

自动填充：Content Script 检测到登录表单 → 发送 `LOGIN_FORM_DETECTED` 给 Service Worker → 根据 URL 匹配凭证 → 返回匹配列表 → Content Script 显示填充提示 → 用户选择 → 获取明文密码 → 填入表单

Popup 搜索填充：用户输入关键词 → 发送 `SEARCH_CREDENTIALS` 给 Service Worker → 展示结果 → 用户选择凭证 → 发送 `AUTO_FILL` 获取密码 → 发送 `FILL_CREDENTIALS` 给 Content Script → 填入表单

### 模块职责

| 模块 | 职责 |
|------|------|
| Content Script | 注入到所有网页，检测登录表单、显示自动填充提示、执行表单填充 |
| Service Worker | 后台常驻，作为 API 请求代理，管理 Session Token，处理凭证搜索和匹配 |
| API Client | 封装与后端的 HTTP 通信，统一处理响应解析、401 拦截、网络错误 |
| Popup UI | 点击扩展图标弹出的界面，提供快速搜索、凭证详情查看和一键填充功能 |

### 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 获取当前标签页信息用于 URL 匹配 |
| `storage` | 通过 `chrome.storage.session` 存储 Session Token |
| `clipboardWrite` | 支持复制密码到剪贴板 |
| `webNavigation` | 监听页面导航事件触发表单检测 |

## 关联项目

- [password-manager](https://github.com/XiaoLu-Huo/password-manager) — 后端 (Spring Boot)
- [password-manager-frontend](https://github.com/XiaoLu-Huo/password-manager-frontend) — 桌面前端 (Electron + React)

## License

Private
