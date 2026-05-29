# Desktop Release 常见问题与解决方案

- **仓库**：`pubgo/colanode`
- **分支**：`refactor/3`
- **文档日期**：2026-05-29

---

## 1. macOS Gatekeeper 提示"已损坏，无法打开"

**现象**：从 GitHub Releases 下载 DMG 安装后，打开 app 弹出提示：

> "Colanode.app" 已损坏，无法打开。你应该将它移到废纸篓。

**原因**：app 未经 Apple 代码签名和公证（notarize）。macOS 对从网上下载的未签名 app 会添加隔离属性（quarantine），Gatekeeper 将其判定为"已损坏"。

**解决方案**：

```bash
# 移除隔离属性（路径替换为实际 .app 位置）
xattr -cr ~/Downloads/Colanode.app
# 或者安装到 /Applications 后
xattr -cr /Applications/Colanode.app
```

**根本修复**：配置 Apple Developer 证书进行代码签名 + 公证。

---

## 2. SqliteError: attempt to write a readonly database

**现象**：app 启动后控制台报错：

```
Error invoking remote method 'init': SqliteError: attempt to write a readonly database
```

**原因**：之前使用 `sudo` 运行开发版时，`~/Library/Application Support/Colanode-Local/` 目录及其中的 SQLite 文件被创建为 root 属主。正常用户运行 app 时无写入权限。

**解决方案**（二选一）：

```bash
# 方案 A：修复权限
sudo chown -R $(whoami) ~/Library/Application\ Support/Colanode-Local/

# 方案 B：删除旧数据，让 app 重新创建
rm -rf ~/Library/Application\ Support/Colanode-Local/
```

---

## 3. 构建时 EACCES 权限错误（.vite/build）

**现象**：执行 `npm run dev` 或 `npm run make` 时报错：

```
EACCES: permission denied, open 'apps/desktop/.vite/build/...'
```

**原因**：之前用 `sudo` 跑过构建，`.vite/` 目录下文件属主为 root。

**解决方案**：

```bash
sudo chown -R $(whoami) apps/desktop/.vite
# 或直接删除缓存
sudo rm -rf apps/desktop/.vite
```

**预防**：避免混用 sudo 和普通用户运行构建命令；如果必须用 sudo，构建完成后及时修复权限。

---

## 4. Electron 下载超时

**现象**：首次构建时报错：

```
ReadError: The server aborted pending request
```

**原因**：网络不稳定导致 Electron 二进制下载中断。

**解决方案**：

- 重试即可（Electron 有缓存，第二次会快很多）
- 或设置 `ELECTRON_MIRROR` 使用国内镜像：
  ```bash
  export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
  ```

---

## 5. GitHub Actions 工作流不触发

**现象**：推送 `v*` tag 后工作流未执行。

**原因**：Fork 仓库默认可能未启用 Actions，或工作流文件不在默认分支上。

**解决方案**：

1. 进入 fork 仓库 Settings → Actions → General，确认 "Allow all actions" 已勾选
2. 确保工作流 YAML 文件存在于触发 tag 所在分支
3. 手动触发或重新推送 tag

---

## 6. Release 为 Draft 状态，看不到构建产物

**现象**：CI 构建成功，但在 releases 页面找不到产物。

**原因**：`@electron-forge/publisher-github` 默认创建 Draft release。

**解决方案**：

- 去 GitHub releases 页面点击对应 draft → Edit → Publish release
- 或用 CLI：
  ```bash
  gh release edit v1.0.0-demo.2 --repo pubgo/colanode --draft=false
  ```

---

## 7. CSP 警告：script-src was not explicitly set

**现象**：控制台输出：

```
Note that 'script-src' was not explicitly set, so 'default-src' is used as a fallback.
```

**影响**：这是 Content Security Policy 的信息性警告，不影响功能。如需消除，可在 `index.html` 的 meta CSP 标签中显式设置 `script-src`。

---

## 8. 字体加载失败（ERR_UNEXPECTED）

**现象**：

```
satoshi-variable.woff2: Failed to load resource: net::ERR_UNEXPECTED
```

**原因**：Electron 打包后静态资源路径可能与开发环境不一致，或 CSP 策略阻止了字体加载。

**排查方向**：

1. 确认字体文件是否正确包含在 asar/打包产物中
2. 检查 Vite 构建配置中 `assetsInclude` 是否覆盖 woff2
3. 检查 CSP 是否允许 `font-src`

---

## 构建环境备忘

| 项目         | 值                                              |
| ------------ | ----------------------------------------------- |
| Node         | 22                                              |
| Electron     | 40.8.5                                          |
| 打包工具     | @electron-forge                                 |
| Token secret | `RELEASER_TOKEN`                                |
| 存储目录     | `~/Library/Application Support/Colanode-Local/` |
| LOCAL_ONLY   | `true`（hardcoded in main.ts）                  |
