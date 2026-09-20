# FitTrace

FitTrace 是一个用于长期记录身体数据、饮食、训练和身材变化的个人健康工具。本仓库是基于 pnpm workspace 的 Monorepo。

## 环境要求

- Node.js 22.12+（下限来自 Vite 7；`.nvmrc` 固定为 24，`pnpm install` 会按 `engines` 校验）
- pnpm 11+
- PostgreSQL 16+

## 开始开发

```bash
cp .env.example .env
pnpm install
pnpm --filter @fit-trace/api prisma:migrate
pnpm dev
```

- H5: http://localhost:5173
- API: http://localhost:3000/api/v1
- 健康检查: http://localhost:3000/api/v1/health

## 常用命令

```bash
pnpm dev:h5
pnpm dev:api
pnpm lint
pnpm typecheck
pnpm build
```

## 代码规范与编辑器

提交前跑一次：

```bash
pnpm check   # prettier --check + eslint + oxlint + typecheck
```

- `pnpm lint:fix` 自动修复 ESLint 可修复的问题，`pnpm format` 统一格式
- 简单组件风格、命名与导入顺序等约定见 `eslint.config.mjs`（flat config）
- 仓库根目录已放好 `.vscode/settings.json` 与 `.vscode/extensions.json`：
  保存时自动格式化、ESLint 自动修复、按工作区 TypeScript 版本解析类型
- 首次打开工作区时，VS Code 会询问是否使用工作区 TypeScript 版本，选择“使用工作区版本”，
  这样编辑器与实际构建（TypeScript 5.9）保持一致

数据库结构由 `apps/api/prisma/schema.prisma` 和 Prisma Migration 统一管理。

## Phase 2 Auth API

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

`/auth/me` 需要 `Authorization: Bearer <token>`。开发前请在 `.env` 中设置可用的 PostgreSQL `DATABASE_URL` 和足够长的 `JWT_SECRET`。

## 目录

- `apps/h5`: Vue 3 H5
- `apps/api`: NestJS REST API
- `apps/miniprogram`: 未来微信小程序占位
- `packages/shared`: 跨应用共享的类型、常量和纯函数
- `docs`: 产品与技术文档
