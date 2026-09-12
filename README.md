# EditRocket

EditRocket 是一个基于 Tauri、Vite 和 TypeScript 构建的桌面文本编辑器。

## 功能概览

- 基于 Monaco Editor 的代码编辑体验
- 文件树、搜索、任务和大纲面板
- 多标签页、分屏、差异查看与预览
- 内置终端、十六进制查看器和宏录制
- 可切换的深色与浅色主题
- 通过 Tauri 提供原生文件系统、对话框和 SQLite 能力

## 开发环境

需要安装：

- Node.js（建议使用当前 LTS 版本）
- Rust 工具链
- Tauri v2 的系统依赖，请参阅 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)

## 开始使用

```bash
npm install
npm run tauri:dev
```

仅运行前端开发服务器：

```bash
npm run dev
```

构建可发布的桌面应用：

```bash
npm run tauri:build
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建前端资源 |
| `npm run tauri:dev` | 启动桌面应用开发模式 |
| `npm run tauri:build` | 打包桌面应用 |

## 技术栈

- Tauri 2 / Rust
- TypeScript / Vite
- Monaco Editor
- xterm.js
- Three.js

## 许可证

本项目采用 [MIT License](LICENSE)。
