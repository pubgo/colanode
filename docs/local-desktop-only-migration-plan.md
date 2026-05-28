# Colanode 纯本地桌面化改造计划（Local Desktop Only）

- **仓库**：`colanode/colanode`
- **当前分支**：`refactor/1`
- **文档日期**：2026-05-28
- **目标形态**：仅保留本地桌面客户端能力，数据（文件、元数据、内容）全部本地持久化，不依赖远程服务端。

---

## 1. 背景与目标

当前项目是“本地优先 + 远程同步”的双层架构：
- 本地 SQLite + 本地文件系统承接即时读写；
- 服务端（Fastify/Postgres/Redis）承接账号、协作同步、远程文件与多端同步。

本次改造目标：
1. **移除远程依赖**（账号登录、server 管理、socket 同步、远程上传下载）。
2. **保留核心体验**（页面/数据库/消息/附件等本地使用能力）。
3. **全面本地化存储**（节点、文档、文件、元数据均仅在本机）。
4. **仓库瘦身**（可删除不再需要的 app/package/module）。

---

## 2. 改造范围与非目标

### 2.1 范围（In Scope）
- `apps/desktop` 启动链路改造为单机本地模式。
- `packages/client` 去远程耦合（account/server/sync/upload/download 相关）。
- `packages/ui` 去认证、服务器选择与登录流程。
- 本地数据模型重整（本地 profile / 本地 workspace）。
- 文档与构建流水线同步更新。

### 2.2 非目标（Out of Scope）
- 不保留跨设备同步。
- 不保留多人实时协作（单机模式不依赖网络协同）。
- 不在本阶段实现端到端加密同步（因已无远程传输链路）。

---

## 3. 目标架构方案

## 3.1 方案 A：开关式本地模式（过渡方案）
通过 `LOCAL_ONLY` feature flag 禁用远程逻辑：
- 优点：改动小、可快速验证、可回滚。
- 缺点：历史远程代码仍在，维护成本偏高。

## 3.2 方案 B：桌面专线重构（推荐中期方案）
建立本地专用服务层：
- 引入 `LocalProfileService / LocalWorkspaceService`；
- 删除/替换 `AccountService / ServerService / SyncService` 等远程耦合层；
- 文件流转改为“写盘即可用”。

优点：结构清晰、后续维护成本低；
缺点：改造量中等，需要一次迁移与回归测试。

## 3.3 方案 C：仓库裁剪（最终方案）
在 B 稳定后，物理删除无用模块：
- 已删除：服务端与移动端应用目录；
- 视产品范围再评估：`hosting`、`apps/web`；
- 清理 root scripts / turbo pipeline / CI。

优点：仓库体积、构建时长、认知负担显著降低；
缺点：不可逆程度高，需要明确产品边界。

## 3.4 最终建议
采用 **A -> B -> C** 三段式：
1. 先跑通纯本地可运行链路；
2. 再替换核心服务抽象；
3. 最后做物理删减和仓库瘦身。

---

## 4. 分阶段改造计划（可执行）

## 阶段 0：护栏与基线（1-2 天）
**目标**：在不破坏现有功能前提下建立迁移护栏。

任务：
- 增加 `LOCAL_ONLY` 运行开关（desktop 启动可配置）。
- 建立基线清单：启动、创建节点、编辑文档、附件、重启恢复。
- 记录当前构建与测试基线。

产出：
- 本地模式切换能力；
- 基线测试报告（最小场景）。

---

## 阶段 1：本地身份与初始化（2-3 天）
**目标**：移除“登录/选服务器”前置，首启直接可用。

任务：
- desktop 初始化取消默认 EU/US server 注入；
- 首启自动创建 `LocalProfile` 与默认 workspace；
- 路由改造：无 workspace 时自动初始化，而非跳转 `/auth/*`。

产出：
- 冷启动直达主界面；
- 无远程 server/account 依赖。

---

## 阶段 2：去远程同步与远程文件链路（4-6 天）
**目标**：核心业务在纯本地模式闭环运行。

任务：
- 下线 `sync-service/synchronizer/mutation-service` 网络行为；
- 下线 jobs：`account.sync`、`server.sync`、`mutations.sync`、`token.delete`、远程 `file.upload/download`；
- 文件状态语义改造：本地写盘后直接可读可用；
- 清理查询中远程下载请求构造（如 `file.download.request.get`）。

产出：
- 节点/文档/附件全本地闭环；
- 无 socket / http 依赖。

---

## 阶段 3：UI 与数据模型精简（3-5 天）
**目标**：移除已无业务意义的认证与服务器概念。

任务：
- 删除 `packages/ui` 的 `auth/*`、`servers/*` 页面和路由；
- 精简 `mutations/queries`：移除 `email.*`、`google.login`、`server.*` 等；
- app database 迁移：移除或冻结 `servers/accounts` 相关结构，建立本地 profile 映射。

产出：
- UI 不再出现登录/服务器管理入口；
- 数据模型与本地单机语义一致。

---

## 阶段 4：仓库瘦身与收尾（2-4 天）
**目标**：物理删除无用模块并更新工程配置。

任务：
- 删除目录（按确认范围）：`hosting`、`apps/web`；
- 验证服务端与移动端应用目录已从仓库移除；
- 更新 root `package.json` scripts、workspace 配置、`turbo.json` task 图；
- 更新 README/CONTRIBUTING/开发文档。

产出：
- 桌面单机化仓库结构；
- CI/开发流程与新结构一致。

---

## 5. 删除清单（建议）

## 5.1 第二/三阶段可删（逻辑替换后）
- `packages/client/src/services/accounts/*`
- `packages/client/src/services/server-service.ts`
- `packages/client/src/services/workspaces/sync-service.ts`
- `packages/client/src/services/workspaces/synchronizer.ts`
- `packages/client/src/services/workspaces/mutation-service.ts`
- `packages/client/src/jobs/account-sync.ts`
- `packages/client/src/jobs/server-sync.ts`
- `packages/client/src/jobs/token-delete.ts`
- `packages/client/src/jobs/file-upload.ts`
- `packages/client/src/jobs/file-download.ts`
- `packages/client/src/jobs/local-file-download.ts`
- `packages/client/src/jobs/mutations-sync.ts`
- `packages/ui/src/components/auth/**`
- `packages/ui/src/components/servers/**`
- `packages/ui/src/routes/auth/**`

## 5.2 第四阶段可删（仓库级）
- `hosting/**`
- `apps/web/**`（若明确仅桌面）

---

## 6. 风险与应对

1. **权限与角色逻辑仍依赖 user/workspace**  
   - 应对：保留本地 owner 用户模型，不一次性移除用户语义。

2. **文件状态卡住（历史 Pending/Uploading 语义）**  
   - 应对：改为本地 ready 语义，补迁移脚本统一状态。

3. **历史数据兼容问题（旧库有 account/server）**  
   - 应对：提供一次性迁移：旧账号映射到 local profile，保留 workspace 数据。

4. **删减过快导致连锁编译失败**  
   - 应对：先 no-op 替换再物理删除；每阶段强制回归测试。

---

## 7. 验收标准（DoD）

功能验收：
- 首次启动无需登录，自动进入默认 workspace；
- 创建/编辑/删除页面、数据库、消息、附件均可本地完成；
- 重启后内容完整恢复；
- 全流程不发起远程请求（HTTP/WebSocket）。

工程验收：
- 桌面端构建通过；
- 相关测试通过（至少核心 smoke + 回归）；
- 文档、脚本、CI 与仓库结构一致。

---

## 8. 实施顺序建议（简版）

1. 先上 `LOCAL_ONLY` 护栏；
2. 再改初始化（本地 profile/workspace）；
3. 再砍同步与远程文件链路；
4. 再删 UI（auth/server）；
5. 最后做仓库物理瘦身。

> 备注：若希望风险最小，可在阶段 2 和阶段 3 之间安排一轮“冻结窗口”，只做测试与缺陷修复，不叠加新功能。
