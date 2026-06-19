# 食品企业信用风险分类管理系统

基于需求说明书实现的 Node.js 全栈原型，后端使用 Express，数据库使用 MySQL，ORM 使用 Prisma。系统覆盖企业信用档案、许可资质、监督检查、行政处罚、抽查抽检、投诉举报、信用修复、指标库、评分评级、风险预警、监管任务、统计看板和日志审计等核心模块。

## 技术栈

- Node.js + Express
- MySQL + Prisma
- JWT 登录认证
- 原生 HTML/CSS/JavaScript 监管端页面

## 快速启动

1. 安装依赖：

```bash
npm install
```

2. 创建 MySQL 数据库：

```sql
CREATE DATABASE food_credit_risk DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 配置环境变量：

```bash
copy .env.example .env
```

修改 `.env` 中的 `DATABASE_URL`。

4. 初始化数据库并写入演示数据：

```bash
npm run prisma:migrate -- --name init
npm run seed
```

5. 启动系统：

```bash
npm run dev
```

访问 `http://localhost:3000`。

默认账号：

- 管理员：`admin` / `Admin@123456`
- 监管人员：`supervisor` / `Admin@123456`
- 执法人员：`officer` / `Admin@123456`

## 主要接口

- `POST /api/auth/login` 登录
- `GET /api/dashboard` 风险看板
- `GET /api/enterprises` 企业档案查询
- `GET /api/enterprises/:id` 企业详情
- `POST /api/enterprises` 新增企业
- `GET /api/indicators` 指标库
- `POST /api/scoring/:enterpriseId` 企业评分评级
- `GET /api/warnings` 风险预警
- `POST /api/warnings/:id/judgement` 预警研判
- `GET /api/tasks` 监管任务
- `POST /api/tasks` 生成监管任务
- `PATCH /api/tasks/:id/status` 更新任务状态
- `GET /api/ledger` 监管台账

## 评分规则

系统采用可解释的规则评分模型：初始分 100 分，按指标命中情况扣分，并根据强制规则修正等级。分值默认映射为：

- A：90 分及以上
- B：75-89 分
- C：60-74 分
- D：60 分以下或命中严重强制规则
