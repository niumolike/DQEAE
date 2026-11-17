# 贡献指南

感谢参与 DQEAE。提交前请阅读以下约定。

## 基本流程

1. Fork 本仓库，从 `main` 切出 `feat/xxx` 或 `fix/xxx`；
2. 保持改动聚焦，一个 PR 只做一件事；
3. 提交信息用中文或英文均可，格式建议 `feat: ...` / `fix: ...` / `docs: ...`；
4. 在 PR 描述里写清：改了什么、为什么、怎么验证。

## 代码约定

- 前端沿用 chat-demo 的 TypeScript / React / CSS Modules 风格；
- 原生壳在 `android/app/`，构建脚本在 `android/build.mjs`，不引入 Gradle；
- 不要提交 `android/toolchain/`、`node_modules/`、`dist/`、`*.keystore`；
- 新增依赖前先说明用途，优先复用已有依赖。

## 上游同步

聊天界面基于 [chat-demo](https://github.com/deepseek-ai/chat-demo)。通用改进（例如可复用的原生钩子）建议同时向上游提 PR；本项目对 chat-demo 的改动应尽量小，便于同步。

## 签名与密钥

**永远不要**在 PR、Issue、截图或提交里出现 API Key、keystore、密码、Token。示例配置请用占位符。

## DCO

提交即表示你同意以项目许可证（MIT）授权你的贡献，并确认你有权提交该代码。

## 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
