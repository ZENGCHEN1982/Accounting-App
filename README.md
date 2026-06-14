# MoneyLite 小账本

红黑白极简风个人记账 App，使用 Next.js + Supabase。

## 本地运行

1. 复制环境变量：

```bash
cp .env.example .env.local
```

2. 填入 Supabase 项目的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

3. 安装依赖并启动：

```bash
npm install
npm run dev
```

4. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。

没有配置 Supabase 时，首页仍可使用 **Demo 模式**。Demo 数据只保存在当前浏览器运行状态里，刷新页面会回到初始示例数据。

开发时建议只保持一个 dev server：

```bash
npm run dev
```

不要在 dev server 正在运行时执行 `npm run build`，否则 Next.js 的 `.next` 目录会被生产构建覆盖，浏览器可能出现 CSS/JS 资源 404，表现为没有样式或按钮无交互。

## MVP 功能

- 邮箱登录/注册入口，支持 Supabase Auth
- Demo 模式，无需数据库即可试用交互，并会保存在浏览器本地
- 首页月度统计
- 按月份查看收入、支出、结余、账单和统计
- 快速记一笔，支持收入/支出、分类、日期、备注
- 账单列表，按日期分组，支持点击编辑和删除
- 统计分析，按分类统计支出
- 分类管理，支持新增、编辑、删除自定义分类
- 本月预算设置
- 预算健康、接近预算、已超支提醒
- 当前账单 CSV 导出
- Demo 数据一键重置

## Supabase 表

执行 `supabase/schema.sql` 会创建：

- `profiles`
- `categories`
- `transactions`

脚本同时启用 RLS，并在新用户注册时自动创建个人资料和默认分类。

## 上线

详细步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
