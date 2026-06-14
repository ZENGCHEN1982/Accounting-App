# MoneyLite 上线指南

## 1. Supabase 准备

1. 登录 Supabase，创建一个新项目。
2. 打开项目的 SQL Editor。
3. 执行：

```sql
-- 复制并执行 supabase/schema.sql 的全部内容
```

4. 打开 Project Settings → API，复制：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
```

5. 在 Authentication → Providers 里确认 Email 已启用。

如果开启 Confirm email，用户注册后需要先点邮箱确认链接才能登录。

## 2. 本地连接真实 Supabase

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

然后重启开发服务：

```powershell
npm.cmd run dev
```

打开：

```text
http://localhost:3000
```

## 3. 本地上线前检查

先停止 dev server，再执行：

```powershell
npm.cmd run lint
npm.cmd run build
```

注意：不要在 `npm.cmd run dev` 正在运行时执行 `npm.cmd run build`。Next.js 会复用 `.next` 目录，正在运行的开发服务可能出现 CSS/JS 资源 404，表现为页面没有样式或按钮无交互。

构建检查完成后，如果还要继续开发，重新运行：

```powershell
npm.cmd run dev
```

## 4. 部署到 Vercel

推荐用 Vercel 部署 Next.js。

1. 把 `moneylite` 项目推到 GitHub。
2. 在 Vercel 新建 Project。
3. Root Directory 选择：

```text
moneylite
```

4. Framework Preset 选择 Next.js。
5. 添加环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
```

6. 点击 Deploy。

## 5. Vercel 构建配置

默认即可：

```text
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

如果 Vercel 使用仓库根目录作为项目根目录，请确保 Root Directory 设置为 `moneylite`。

## 6. 上线后检查

- 首页能正常显示样式
- 点击“体验 Demo”可进入 Demo
- 注册新账号
- 登录新账号
- 新增账单
- 编辑账单
- 删除账单
- 新增自定义分类
- 修改预算
- 刷新页面后登录状态仍在
- Supabase 表中能看到新数据

## 7. 当前限制

- Demo 数据存在浏览器 localStorage，不会同步到其他设备。
- 真实账号数据存在 Supabase。
- 默认分类不允许编辑或删除，避免影响基础数据。
- CSV 导出是浏览器本地生成，不会上传到服务器。
