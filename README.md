# FitTrace

FitTrace 是一个用于长期记录身体数据、饮食、训练和身材变化的个人健康工具。本仓库是基于 pnpm workspace 的 Monorepo。

## 环境要求

- Node.js 22+
- pnpm 11+
- PostgreSQL 16+

## 开始开发

```bash
cp .env.example .env
pnpm install
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

数据库结构由 `apps/api/prisma/schema.prisma` 和 Prisma Migration 统一管理。

## 目录

- `apps/h5`: Vue 3 H5
- `apps/api`: NestJS REST API
- `apps/miniprogram`: 未来微信小程序占位
- `packages/shared`: 跨应用共享的类型、常量和纯函数
- `docs`: 产品与技术文档
