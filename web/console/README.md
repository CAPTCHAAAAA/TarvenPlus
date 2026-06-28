# Meoo 项目开发指南

本项目从 [Meoo](https://meoo.space) 平台导出，修改后可重新导入。
以下规则确保项目能被平台正确识别和恢复，请在使用本地 AI 工具（Cursor / Copilot / Claude Code 等）开发时遵守。

## 启动项目

```bash
pnpm install
pnpm dev
```

开发服务器端口：**3015**（`http://localhost:3015`）

## 开发约束

- **技术栈**：react + vite，不要更换框架或构建工具（如切换为 Angular / Svelte），否则导入时会被拒绝
- **不要删除以下文件**：`meoo-manifest.json`、`meoo-cloud-snapshot.json`（重新导入时需要；同名隐藏文件为平台兼容副本）

## 导入回平台

1. 将项目打包为 ZIP（排除 `node_modules`、`.git`、`dist` 目录）
2. 在 Meoo 首页点击输入框的「+」→「导入项目」
3. 上传 ZIP → 平台自动验证 → 创建新项目

