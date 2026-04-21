# Password Manager - Chrome Extension 🔌

基于 Chrome Extension Manifest V3 构建的浏览器插件，为 [Password Manager](https://github.com/XiaoLu-Huo/password-manager) 提供快速搜索和自动填充功能。

## 功能特性

- 登录表单自动检测（识别 `input[type="password"]` 元素，支持 iframe 内表单）
- 根据当前页面 URL 自动匹配密码库中的凭证（支持子域名回退匹配，如 `smart.mail.163.com` → `163.com`）
- Popup 弹窗快速搜索凭证，实时展示匹配结果
- 凭证 CRUD：在 Popup 中直接新建、查看详情、编辑和删除凭证
- 检测到登录表单时自动弹出匹配凭证下拉列表
- 一键填充用户名和密码（触发 `input` / `change` 事件，兼容 React、Vue 等主流前端框架）
- 跨页面导航填充：从 Popup 选择凭证后自动打开目标 URL 并填充（等待 SPA 渲染后重试）
- Vault 状态感知（锁定时在 Popup 中直接输入主密码解锁，支持 TOTP 两步验证）
- Service Worker 通过 `chrome.storage.session` 管理 Session Token，浏览器会话内免重复登录

## 技术栈

| 类别 | 技术 |
|------|------|
| 规范 | Chrome Extension Manifest V3 |
| 语言 | TypeScript 5.6 |
| UI | React 19 |
| 构建 | Vite 6 + @vitejs/plugin-react |
| 测试 | Vitest 2 + jsdom + fast-check (PBT) |

## 前置条件

- Node.js >= 18
- Password Manager 后端服务运行在 `http://localhost:8080`（可在 `api-client.ts` 中修改 `DEFAULT_BASE_URL`）

## 快速开始

```bash
# 安装依赖
npm install

# 构建（产物输出到 dist/）
npm run build

# 开发模式（监听文件变化自动重新构建）
npm run dev

# 运行测试（单次执行）
npm test

# 测试监听模式
npm run test:watch
```

### 在 Chrome 中加载

1. 运行 `npm run build`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目根目录下的 `dist/` 目录

> 使用前需要先解锁密码库——可以在桌面应用中解锁，也可以直接在插件 Popup 中输入主密码解锁。

### 开发调试技巧

- 修改代码后，`npm run dev` 会自动重新构建 `dist/`，但需要在 `chrome://extensions/` 页面点击扩展卡片上的刷新按钮使更改生效
- Service Worker 调试：在 `chrome://extensions/` 页面点击扩展卡片中的「Service Worker」链接，打开 DevTools
- Content Script 调试：在目标网页按 F12 打开 DevTools，在 Sources 面板的 Content Scripts 分组中找到 `content-script.js`
- Popup 调试：右键点击扩展图标 → 「审查弹出内容」

## 项目结构

```
password-manager-extension/
├── manifest.json              # Manifest V3 配置
├── popup.html                 # Popup 弹窗 HTML 入口
├── generate-icons.py          # 图标生成脚本
├── icons/                     # 扩展图标（16/48/128px）
├── src/
│   ├── popup-entry.tsx        # Popup React 入口（挂载到 popup.html）
│   ├── PopupApp.tsx           # Popup 主界面（Vault 状态检测 + 视图路由）
│   ├── QuickSearch.tsx        # 快速搜索组件
│   ├── CredentialDetailView.tsx  # 凭证详情视图（查看 / 填充 / 删除）
│   ├── CredentialForm.tsx     # 凭证表单组件（新建 / 编辑）
│   ├── AutoFillPrompt.tsx     # 自动填充提示组件
│   ├── service-worker.ts      # 后台服务（API 代理、Session Token 管理、消息路由）
│   ├── api-client.ts          # HTTP 客户端（Bearer Token、401 拦截、NetworkError 封装）
│   ├── content-script.ts      # 内容脚本（表单检测、下拉列表、自动填充）
│   ├── types.ts               # TypeScript 类型定义（消息协议、DTO、自定义错误）
│   └── __tests__/             # 单元测试
│       ├── setup.ts           #   全局 chrome API mock
│       ├── api-client.test.ts
│       └── content-script.test.ts
├── vite.config.ts             # Vite 多入口构建 + 静态资源拷贝
├── vitest.config.ts           # Vitest 配置（jsdom 环境）
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
                              │ (搜索+CRUD+填充)│
                              └───────────────┘
```

### 消息协议

扩展内部通过 `chrome.runtime.sendMessage` 进行模块间通信，所有消息类型定义在 `types.ts` 的 `ExtensionMessage` 联合类型中：

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `SEARCH_CREDENTIALS` | Popup → SW | 按关键词搜索凭证 |
| `LIST_CREDENTIALS` | Popup → SW | 获取全部凭证列表 |
| `GET_CREDENTIAL` | Popup → SW | 获取单个凭证详情 |
| `CREATE_CREDENTIAL` | Popup → SW | 新建凭证 |
| `UPDATE_CREDENTIAL` | Popup → SW | 更新凭证 |
| `DELETE_CREDENTIAL` | Popup → SW | 删除凭证 |
| `REVEAL_PASSWORD` | Popup → SW | 获取凭证明文密码 |
| `AUTO_FILL` | Popup → SW | 获取指定凭证的用户名和明文密码用于填充 |
| `NAVIGATE_AND_FILL` | Popup → SW | 打开目标 URL 并自动填充凭证 |
| `CHECK_VAULT_STATUS` | Popup → SW | 检查密码库是否已解锁 |
| `UNLOCK_VAULT` | Popup → SW | 使用主密码解锁密码库 |
| `VERIFY_TOTP` | Popup → SW | 提交 TOTP 验证码完成两步验证 |
| `LOGIN_FORM_DETECTED` | CS → SW | Content Script 检测到登录表单，请求 URL 匹配凭证 |
| `FILL_CREDENTIALS` | SW/Popup → CS | 向 Content Script 发送用户名和密码执行表单填充 |

> SW = Service Worker，CS = Content Script

### 通信流程

**自动填充流程：**
Content Script 检测到登录表单 → 发送 `LOGIN_FORM_DETECTED` 给 Service Worker → 根据 URL hostname 匹配凭证（支持子域名回退） → 返回匹配列表 → Content Script 在密码框下方显示下拉列表 → 用户选择 → 发送 `AUTO_FILL` 获取明文密码 → 填入表单

**Popup 搜索填充流程：**
用户输入关键词 → 发送 `SEARCH_CREDENTIALS` 给 Service Worker → 展示结果 → 用户点击「填充」→ 发送 `AUTO_FILL` 获取密码 → 向当前标签页所有 frame 发送 `FILL_CREDENTIALS` → Content Script 填入表单

**跨页面导航填充流程：**
用户在凭证详情中点击「导航并填充」→ 发送 `NAVIGATE_AND_FILL` → Service Worker 先获取凭证 → 创建新标签页打开目标 URL → 等待页面加载完成（+ 1.5s SPA 渲染延迟）→ 向所有 frame 发送 `FILL_CREDENTIALS` → 15s 超时保护

**Vault 解锁流程：**
Popup 启动 → `CHECK_VAULT_STATUS` 检查状态 → 若未解锁，显示主密码输入界面 → 用户输入主密码 → `UNLOCK_VAULT` → 后端返回 `mfaRequired: true` 时切换到 TOTP 输入界面 → `VERIFY_TOTP` → 解锁成功，保存 Session Token 到 `chrome.storage.session`

### 模块职责

| 模块 | 职责 |
|------|------|
| Content Script | 注入到所有网页（含 iframe），检测登录表单、显示匹配凭证下拉列表、执行表单填充（触发 input/change 事件） |
| Service Worker | 后台常驻，作为 API 请求代理，管理 Session Token，处理所有消息路由和业务逻辑 |
| API Client | 封装与后端的 HTTP 通信，自动附加 Bearer Token，统一解析 `ApiResponse<T>`（code=0 成功），401 自动清除 Token，网络异常封装为 `NetworkError` |
| Popup UI | 点击扩展图标弹出的界面，包含四个视图：凭证列表（搜索+填充）、凭证详情、新建凭证、编辑凭证；未解锁时显示主密码/TOTP 输入界面 |

### 后端 API 端点

API Client 默认请求 `http://localhost:8080/api`，Service Worker 使用的后端端点：

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/auth/unlock` | 主密码解锁 |
| POST | `/auth/verify-totp` | TOTP 两步验证 |
| GET | `/credentials` | 获取全部凭证列表 |
| GET | `/credentials/search?keyword=` | 按关键词搜索凭证 |
| GET | `/credentials/{id}` | 获取凭证详情 |
| POST | `/credentials` | 新建凭证 |
| PUT | `/credentials/{id}` | 更新凭证 |
| DELETE | `/credentials/{id}` | 删除凭证 |
| POST | `/credentials/{id}/reveal-password` | 获取凭证明文密码 |
| GET | `/settings` | 获取设置（用于检测 Vault 状态） |

### 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 获取当前标签页信息用于 URL 匹配和凭证填充 |
| `storage` | 通过 `chrome.storage.session` 存储 Session Token（仅浏览器会话内有效） |
| `clipboardWrite` | 支持复制密码到剪贴板 |
| `webNavigation` | 获取标签页所有 frame 信息（`getAllFrames`），支持 iframe 内表单填充 |

### Host Permissions

```json
"host_permissions": ["http://localhost:8080/*"]
```

仅允许扩展向本地后端服务发起请求。如需连接远程后端，需同步修改 `manifest.json` 中的 `host_permissions` 和 `api-client.ts` 中的 `DEFAULT_BASE_URL`。

### Content Script 注入策略

```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content-script.js"],
  "run_at": "document_idle",
  "all_frames": true
}]
```

- `<all_urls>`：注入到所有网页，以便检测任意站点的登录表单
- `document_idle`：在页面加载完成后注入，避免阻塞页面渲染
- `all_frames: true`：同时注入到 iframe 中，覆盖嵌套登录表单场景

### 构建配置

Vite 配置了三个入口（`service-worker.ts`、`content-script.ts`、`popup.html`），构建产物输出到 `dist/`，并通过自定义插件自动拷贝 `manifest.json` 和 `icons/` 到输出目录。输出格式为 ES Module，文件名不含 hash（Chrome 扩展要求固定文件名）。

## 自定义错误类型

| 错误类型 | 触发场景 |
|---------|---------|
| `ApiError` | 后端返回 `code ≠ 0` 的业务错误 |
| `NetworkError` | `fetch` 请求失败（后端未启动、网络断开等） |
| `AuthExpiredError` | 后端返回 HTTP 401，Session Token 自动清除 |

## 关联项目

- [password-manager](https://github.com/XiaoLu-Huo/password-manager) — 后端 (Spring Boot)
- [password-manager-frontend](https://github.com/XiaoLu-Huo/password-manager-frontend) — 桌面前端 (Electron + React)

## License

Private
