# DQEAE APK

## 产物

`dist/DQEAE.apk`（约 1.9 MB）

- 包名 `com.dqeae.app`，应用名「DQEAE」；
- minSdk 24（Android 7.0），targetSdk 34；
- v2 + v3 签名；
- 内核是**官方 chat-demo 源码 fork**，只加了三个钩子，UI 没动；
- 外面套一层引导页（导出 → 导入 → API Key）。

签名密钥：`android/keystore/dsmigrate.keystore`
别名 `dsmigrate`，密码 `dsmigrate123`。正式发布前请换掉并离线备份，否则无法覆盖更新。

## 结构

```
assets/
  index.html          引导页（原生壳加载这个）
  app/                官方 chat-demo 构建产物
    index.html
    static/js|css|media
```

引导页和聊天页同源（`https://appassets.local`），共享 IndexedDB 与 localStorage。

### 原生能力（`MainActivity`）

- `openExternal(url)`：打开系统浏览器（导出页、开放平台）；
- `pickZip()`：系统文件选择器，选中后复制到 `cache/import.zip`；
- `/__import.zip`：拦截请求，把缓存里的 ZIP 交给网页；
- `beginSave/appendSave/endSave`：导出 ZIP 分块写到缓存，再走「另存为」；
- 返回键、`alert`/`confirm`、键盘收起。

### chat-demo 的三个钩子（`src/native.ts`）

- `window.__dsImport(file)` → 复用官方 `importHistory`；
- `window.__dsHasData()` / `__dsReady()` → 引导页判断是否已有数据；
- `window.__dsSetKey(key)` → 预填 API Key。

**没有重写它的 IndexedDB 事务**，消息树、分支、附件都交给官方代码。

## 构建

```powershell
# 1. 构建 chat-demo（首次需在 chatdemo/app 里 pnpm install --node-linker=hoisted）
node chatdemo/build.mjs

# 2. 打 APK
node android/build.mjs
```

工具链在 `android/toolchain/`：platform-35、build-tools 35、Zulu JRE 17。
不需要 Gradle / Android Studio。

## 已验证

- `aapt2 dump badging`：包名、应用名、图标、`INTERNET`、min 24 / target 34；
- `apksigner verify`：v2 + v3 通过；
- APK 内含 `assets/index.html`、`assets/app/index.html`、`classes.dex`；
- bundle 里能找到 `__dsImport` / `__dsHasData` / `__dsReady` / `__dsSetKey`；
- 引导页里能找到 `pickZip` / `openExternal` / `__onZipPicked` / `importHistory` 调用；
- chat-demo 源码可重复构建（rspack 约 1 秒）。

## 未验证（本机没有 Android 运行时）

- 真机启动、引导流程、SAF 选择、ZIP 导入；
- 真实 API 调用（依赖 `api.deepseek.com` 对 `https://appassets.local` 的 CORS）；
- 语音输入（还没有申请 `RECORD_AUDIO` 和 `onPermissionRequest`）。

装到手机后按这个顺序试：能打开引导页 → 打开浏览器导出 → 选 ZIP 导入 →
填 Key → 进入聊天 → 发一句话。任何一步失败，把 `adb logcat` 发我。

## 下一步

1. 合并改成「摘要 + 最近 20 轮 + 语气样本」（见 `PLAN.md`）；
2. 角色卡：会话绑定 system prompt；
3. 语音权限与外部链接处理；
4. 换正式包名/签名、隐私政策、上架材料。
