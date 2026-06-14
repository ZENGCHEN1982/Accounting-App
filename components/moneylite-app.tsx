"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleUserRound,
  Home,
  Plus,
  ReceiptText,
  Search,
  Settings,
  WalletCards
} from "lucide-react";
import { clsx } from "clsx";
import { demoCategories, demoTransactions, demoUser } from "@/lib/demo-data";
import { categoryTotals, currency, groupByDate, summarize, withCategories, type TransactionView } from "@/lib/money";
import {
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransaction,
  fetchCategories,
  fetchTransactions,
  getCurrentSession,
  getCurrentUser,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateCategory,
  updateTransaction
} from "@/lib/supabase/queries";
import type { Category, Transaction, TransactionType } from "@/lib/supabase/types";

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const demoStorageKey = "moneylite-demo-state";
const defaultMonthlyBudget = 10000;

type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

type Tab = "home" | "bills" | "add" | "stats" | "profile" | "login";
type BudgetStatus = {
  label: string;
  description: string;
  tone: "safe" | "warning" | "danger";
};
type MonthlyTrendPoint = {
  month: string;
  label: string;
  balance: number;
  height: number;
};

export function MoneyLiteApp() {
  const [tab, setTab] = useState<Tab>("login");
  const [user, setUser] = useState<AppUser | null>(null);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions);
  const [editingTransaction, setEditingTransaction] = useState<TransactionView | null>(null);
  const [newTransactionType, setNewTransactionType] = useState<TransactionType>("expense");
  const [monthlyBudget, setMonthlyBudget] = useState(defaultMonthlyBudget);
  const [selectedMonth, setSelectedMonth] = useState("2026-06");
  const [message, setMessage] = useState("点击“体验 Demo”后即可开始记账。");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.transaction_date.startsWith(selectedMonth)),
    [selectedMonth, transactions]
  );
  const views = useMemo(() => withCategories(monthTransactions, categories), [categories, monthTransactions]);
  const summary = useMemo(() => summarize(monthTransactions), [monthTransactions]);
  const totals = useMemo(() => categoryTotals(views), [views]);
  const budgetStatus = useMemo(() => getBudgetStatus(summary.expense, monthlyBudget), [monthlyBudget, summary.expense]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(transactions, selectedMonth), [selectedMonth, transactions]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const restoredDemo = restoreDemoState();
        if (restoredDemo && !cancelled) {
          setUser(demoUser);
          setCategories(restoredDemo.categories);
          setTransactions(restoredDemo.transactions);
          setMonthlyBudget(restoredDemo.monthlyBudget);
          setMessage("已恢复上次 Demo 数据。");
          setTab("home");
        }

        if (!hasSupabaseEnv) return;

        const session = await getCurrentSession();
        if (!session?.user?.email || cancelled) return;

        const [nextCategories, nextTransactions] = await Promise.all([fetchCategories(), fetchTransactions()]);
        if (cancelled) return;

        setUser({
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.email.split("@")[0] || "MoneyLite User"
        });
        setCategories(nextCategories.length ? nextCategories : demoCategories);
        setTransactions(nextTransactions);
        setMessage("已恢复 Supabase 登录状态。");
        setTab("home");
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "启动恢复失败，可继续使用 Demo。");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.id === demoUser.id) {
      persistDemoState(categories, transactions, monthlyBudget);
    }
  }, [categories, monthlyBudget, transactions, user?.id]);

  async function handleDemo() {
    setUser(demoUser);
    setCategories(demoCategories);
    setTransactions(demoTransactions);
    setMonthlyBudget(defaultMonthlyBudget);
    persistDemoState(demoCategories, demoTransactions, defaultMonthlyBudget);
    setMessage("已进入 Demo 模式。新增账单会立刻更新首页、账单和统计。");
    setTab("home");
  }

  async function handleAuth(email: string, password: string, mode: "login" | "signup") {
    if (!hasSupabaseEnv) {
      setMessage("还没有配置 Supabase 环境变量，请先使用 Demo，或填写 .env.local 后重启。");
      return;
    }

    setLoading(true);
    setMessage(mode === "login" ? "正在登录..." : "正在注册...");

    try {
      const result = mode === "login" ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
      if (result.error) throw result.error;

      const supabaseUser = result.data.user ?? (await getCurrentUser());
      if (!supabaseUser?.email) {
        setMessage("账号已创建。若开启邮箱验证，请先完成邮件确认。");
        return;
      }

      const [nextCategories, nextTransactions] = await Promise.all([fetchCategories(), fetchTransactions()]);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        displayName: supabaseUser.email.split("@")[0] || "MoneyLite User"
      });
      setCategories(nextCategories.length ? nextCategories : demoCategories);
      setTransactions(nextTransactions);
      setMessage("已连接 Supabase，后续账单会写入数据库。");
      setTab("home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "认证失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (hasSupabaseEnv && user?.id !== demoUser.id) {
      await signOut();
    }
    setUser(null);
    setCategories(demoCategories);
    setTransactions(demoTransactions);
    setMonthlyBudget(defaultMonthlyBudget);
    clearDemoState();
    setMessage("已退出。可以登录或继续体验 Demo。");
    setTab("login");
  }

  async function handleCreateTransaction(input: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    note: string;
    transactionDate: string;
  }) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        const saved = await createTransaction({
          userId: user.id,
          categoryId: input.categoryId,
          type: input.type,
          amount: input.amount,
          note: input.note,
          transactionDate: input.transactionDate
        });
        setTransactions((current) => [saved, ...current]);
      } else {
        const now = new Date().toISOString();
        setTransactions((current) => [
          {
            id: `demo-${crypto.randomUUID()}`,
            user_id: user.id,
            category_id: input.categoryId,
            type: input.type,
            amount: input.amount,
            note: input.note,
            transaction_date: input.transactionDate,
            created_at: now,
            updated_at: now
          },
          ...current
        ]);
      }

      setMessage(`已保存：${input.note || "新账单"} ${currency(input.amount)}`);
      setSelectedMonth(input.transactionDate.slice(0, 7));
      setTab("bills");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后再试。");
    }
  }

  async function handleUpdateTransaction(input: {
    id: string;
    type: TransactionType;
    amount: number;
    categoryId: string;
    note: string;
    transactionDate: string;
  }) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        const saved = await updateTransaction(input);
        setTransactions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        const now = new Date().toISOString();
        setTransactions((current) =>
          current.map((item) =>
            item.id === input.id
              ? {
                  ...item,
                  category_id: input.categoryId,
                  type: input.type,
                  amount: input.amount,
                  note: input.note,
                  transaction_date: input.transactionDate,
                  updated_at: now
                }
              : item
          )
        );
      }

      setEditingTransaction(null);
      setMessage(`已修改：${input.note || "账单"} ${currency(input.amount)}`);
      setSelectedMonth(input.transactionDate.slice(0, 7));
      setTab("bills");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改失败，请稍后再试。");
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        await deleteTransaction(id);
      }

      setTransactions((current) => current.filter((item) => item.id !== id));
      setEditingTransaction(null);
      setMessage("已删除这笔账单。");
      setTab("bills");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败，请稍后再试。");
    }
  }

  async function handleCreateCategory(input: { name: string; type: TransactionType; icon: string }) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    const name = input.name.trim();
    const icon = input.icon.trim().slice(0, 2) || name.slice(0, 1) || "记";
    if (!name) {
      setMessage("分类名称不能为空。");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        const saved = await createCategory({
          userId: user.id,
          name,
          type: input.type,
          icon,
          color: input.type === "expense" ? "#e31f1f" : "#151517"
        });
        setCategories((current) => [...current, saved]);
      } else {
        const now = new Date().toISOString();
        setCategories((current) => [
          ...current,
          {
            id: `demo-cat-${crypto.randomUUID()}`,
            user_id: user.id,
            name,
            type: input.type,
            color: input.type === "expense" ? "#e31f1f" : "#151517",
            icon,
            is_default: false,
            created_at: now
          }
        ]);
      }

      setMessage(`已新增分类：${name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增分类失败，请稍后再试。");
    }
  }

  async function handleUpdateCategory(input: { id: string; name: string; type: TransactionType; icon: string }) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    const existing = categories.find((category) => category.id === input.id);
    if (!existing) {
      setMessage("没有找到这个分类。");
      return;
    }

    if (existing.is_default) {
      setMessage("默认分类暂时不支持修改，避免影响历史账单。");
      return;
    }

    const name = input.name.trim();
    const icon = input.icon.trim().slice(0, 2) || name.slice(0, 1) || "记";
    if (!name) {
      setMessage("分类名称不能为空。");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        const saved = await updateCategory({
          id: input.id,
          name,
          type: input.type,
          icon,
          color: input.type === "expense" ? "#e31f1f" : "#151517"
        });
        setCategories((current) => current.map((category) => (category.id === saved.id ? saved : category)));
      } else {
        setCategories((current) =>
          current.map((category) =>
            category.id === input.id
              ? {
                  ...category,
                  name,
                  type: input.type,
                  icon,
                  color: input.type === "expense" ? "#e31f1f" : "#151517"
                }
              : category
          )
        );
      }

      setMessage(`已修改分类：${name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改分类失败，请稍后再试。");
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!user) {
      setMessage("请先登录或体验 Demo。");
      setTab("login");
      return;
    }

    const existing = categories.find((category) => category.id === id);
    if (!existing) {
      setMessage("没有找到这个分类。");
      return;
    }

    if (existing.is_default) {
      setMessage("默认分类暂时不支持删除。");
      return;
    }

    try {
      if (user.id !== demoUser.id && hasSupabaseEnv) {
        await deleteCategory(id);
      }

      setCategories((current) => current.filter((category) => category.id !== id));
      setTransactions((current) => current.map((transaction) => (transaction.category_id === id ? { ...transaction, category_id: null } : transaction)));
      setMessage(`已删除分类：${existing.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除分类失败，请稍后再试。");
    }
  }

  function openEditor(transaction: TransactionView) {
    setEditingTransaction(transaction);
    setTab("add");
  }

  function openCreator(type: TransactionType = "expense") {
    setEditingTransaction(null);
    setNewTransactionType(type);
    setTab("add");
  }

  return (
    <main className="min-h-svh text-ink sm:flex sm:items-center sm:justify-center sm:px-5 sm:py-8 md:px-10">
      <section className="mx-auto flex min-h-svh max-w-6xl justify-center sm:min-h-0 sm:w-full">
        <PhoneFrame>
          {tab === "login" && <LoginScreen loading={loading} onAuth={handleAuth} onDemo={handleDemo} />}
          {tab === "home" && <HomeScreen summary={summary} transactions={views.slice(0, 4)} user={user} budgetStatus={budgetStatus} onAdd={openCreator} onEdit={openEditor} />}
          {tab === "add" && (
            <TransactionFormScreen
              categories={categories}
              editingTransaction={editingTransaction}
              defaultType={newTransactionType}
              onCreate={handleCreateTransaction}
              onUpdate={handleUpdateTransaction}
              onDelete={handleDeleteTransaction}
              onCancel={() => {
                setEditingTransaction(null);
                setTab("bills");
              }}
            />
          )}
          {tab === "bills" && <BillsScreen summary={summary} transactions={views} onEdit={openEditor} />}
          {tab === "stats" && <StatsScreen totals={totals} trend={monthlyTrend} />}
          {tab === "profile" && (
            <ProfileScreen
              user={user}
              categories={categories}
              summary={summary}
              monthlyBudget={monthlyBudget}
              onBudgetChange={setMonthlyBudget}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onLogout={handleLogout}
            />
          )}
          {tab !== "login" && <BottomNav active={tab} onChange={setTab} />}
        </PhoneFrame>
      </section>
    </main>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative h-svh w-full overflow-hidden bg-paper sm:h-[calc(100svh-4rem)] sm:max-h-[844px] sm:min-h-[680px] sm:max-w-[390px] sm:rounded-[34px] sm:shadow-soft sm:ring-1 sm:ring-black/5">
      {children}
    </section>
  );
}

function TopBar({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="flex h-[88px] items-center justify-between px-6 pt-5">
      <div>
        <h2 className="text-[23px] font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      <div className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink">{action}</div>
    </header>
  );
}

function LoginScreen({
  loading,
  onAuth,
  onDemo
}: {
  loading: boolean;
  onAuth: (email: string, password: string, mode: "login" | "signup") => void;
  onDemo: () => void;
}) {
  const [email, setEmail] = useState("name@example.com");
  const [password, setPassword] = useState("moneylite123");

  return (
    <div className="px-6 pt-12">
      <div className="flex flex-col items-center text-center">
        <div className="grid size-[72px] place-items-center rounded-[28px] bg-ink text-3xl font-bold text-white">M</div>
        <h2 className="mt-4 text-4xl font-bold">小账本</h2>
        <p className="mt-2 text-sm text-muted">把钱花得更明白</p>
      </div>

      <div className="mt-7 rounded-[28px] bg-ink p-5 text-white shadow-card">
        <p className="text-xs text-white/70">快速开始</p>
        <p className="mt-2 text-2xl font-bold">Demo 或 Supabase 登录</p>
      </div>

      <div className="mt-8 space-y-3">
        <TextInput label="邮箱" value={email} onChange={setEmail} />
        <TextInput label="密码" value={password} onChange={setPassword} type="password" />
        <PrimaryButton disabled={loading} onClick={() => onAuth(email, password, "login")}>
          {loading ? "处理中..." : "登录"}
        </PrimaryButton>
        <SecondaryButton disabled={loading} onClick={() => onAuth(email, password, "signup")}>
          注册新账号
        </SecondaryButton>
        <button className="h-[52px] w-full rounded-full bg-ink text-sm font-bold text-white" onClick={onDemo}>
          稍后体验 Demo
        </button>
      </div>
    </div>
  );
}

function HomeScreen({
  summary,
  transactions,
  user,
  budgetStatus,
  onAdd,
  onEdit
}: {
  summary: ReturnType<typeof summarize>;
  transactions: TransactionView[];
  user: AppUser | null;
  budgetStatus: BudgetStatus;
  onAdd: (type?: TransactionType) => void;
  onEdit: (transaction: TransactionView) => void;
}) {
  return (
    <div className="relative h-full overflow-y-auto pb-28">
      <TopBar title={`早上好，${user?.displayName ?? "Chen"}`} subtitle="当前月份 · 预算健康" action={<Settings className="size-5" />} />
      <section className="mx-6 rounded-[30px] bg-ink p-5 text-white shadow-card">
        <p className="text-xs text-white/70">月度结余</p>
        <p className="mt-4 text-4xl font-bold">{currency(summary.balance)}</p>
        <div className="mt-5 flex gap-3">
          <DarkMetric label="收入" value={currency(summary.income)} />
          <DarkMetric label="支出" value={currency(summary.expense)} danger />
        </div>
        <div className={clsx("mt-4 rounded-[18px] px-3 py-2 text-xs font-bold", budgetStatus.tone === "safe" ? "bg-white/10 text-white" : "bg-brand text-white")}>
          {budgetStatus.description}
        </div>
      </section>
      <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
        <PrimaryButton onClick={() => onAdd("expense")}>记支出</PrimaryButton>
        <SecondaryButton onClick={() => onAdd("income")}>记收入</SecondaryButton>
      </div>
      <Card className="mx-6 mt-4">
        <h3 className="mb-3 text-lg font-bold">最近账单</h3>
        {transactions.map((item) => (
          <TransactionRow key={item.id} item={item} onClick={() => onEdit(item)} />
        ))}
      </Card>
    </div>
  );
}

function TransactionFormScreen({
  categories,
  editingTransaction,
  defaultType,
  onCreate,
  onUpdate,
  onDelete,
  onCancel
}: {
  categories: Category[];
  editingTransaction: TransactionView | null;
  defaultType: TransactionType;
  onCreate: (input: { type: TransactionType; amount: number; categoryId: string; note: string; transactionDate: string }) => void;
  onUpdate: (input: { id: string; type: TransactionType; amount: number; categoryId: string; note: string; transactionDate: string }) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? defaultType);
  const visibleCategories = categories.filter((category) => category.type === type);
  const [categoryId, setCategoryId] = useState(editingTransaction?.category_id ?? visibleCategories[0]?.id ?? "");
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : "128");
  const [note, setNote] = useState(editingTransaction?.note ?? "晚餐和饮料");
  const [transactionDate, setTransactionDate] = useState(editingTransaction?.transaction_date ?? "2026-06-14");
  const selectedCategory = visibleCategories.find((category) => category.id === categoryId) ?? visibleCategories[0];

  function changeType(nextType: TransactionType) {
    const nextCategories = categories.filter((category) => category.type === nextType);
    setType(nextType);
    setCategoryId(nextCategories[0]?.id ?? "");
  }

  function submit() {
    const numericAmount = Number(amount);
    if (!selectedCategory || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (editingTransaction) {
      onUpdate({ id: editingTransaction.id, type, amount: numericAmount, categoryId: selectedCategory.id, note, transactionDate });
    } else {
      onCreate({ type, amount: numericAmount, categoryId: selectedCategory.id, note, transactionDate });
    }
  }

  return (
    <div className="relative h-full overflow-y-auto pb-28">
      <TopBar title={editingTransaction ? "编辑账单" : "记一笔"} subtitle={editingTransaction ? "修改金额、分类、日期或备注" : "快速保存一条收支记录"} action={<button className="text-xl font-bold" onClick={onCancel}>×</button>} />
      <div className="mx-6 mt-3 flex rounded-full bg-white p-1.5 shadow-card">
        <button className={segClass(type === "income")} onClick={() => changeType("income")}>
          收入
        </button>
        <button className={segClass(type === "expense")} onClick={() => changeType("expense")}>
          支出
        </button>
      </div>
      <Card className="mx-6 mt-5">
        <p className="text-xs text-muted">金额</p>
        <input className="mt-2 w-full bg-transparent text-[42px] font-bold leading-tight outline-none" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
        <p className="mt-2 text-xs font-bold text-brand">当前分类：{selectedCategory?.name ?? "未选择"}</p>
      </Card>
      <section className="mx-6 mt-5">
        <h3 className="mb-3 text-lg font-bold">选择分类</h3>
        <div className="grid grid-cols-4 gap-3">
          {visibleCategories.map((category) => (
            <CategoryChip key={category.id} category={category} active={category.id === selectedCategory?.id} onClick={() => setCategoryId(category.id)} />
          ))}
        </div>
      </section>
      <div className="mx-6 mt-5 space-y-3">
        <TextInput label="日期" value={transactionDate} onChange={setTransactionDate} icon={<CalendarDays className="size-4" />} />
        <TextInput label="备注" value={note} onChange={setNote} />
        <PrimaryButton onClick={submit}>{editingTransaction ? "保存修改" : "保存账单"}</PrimaryButton>
        {editingTransaction ? (
          <button className="h-[48px] w-full rounded-full border border-brand bg-white text-sm font-bold text-brand" onClick={() => onDelete(editingTransaction.id)}>
            删除这笔账单
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BillsScreen({ summary, transactions, onEdit }: { summary: ReturnType<typeof summarize>; transactions: TransactionView[]; onEdit: (transaction: TransactionView) => void }) {
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = filter === "all" || transaction.type === filter;
    const text = `${transaction.note ?? ""} ${transaction.category?.name ?? ""} ${transaction.transaction_date}`.toLowerCase();
    const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
    return matchesType && matchesQuery;
  });
  const groups = groupByDate(filteredTransactions);

  return (
    <div className="relative h-full overflow-y-auto pb-28">
      <TopBar title="账单" subtitle="筛选、搜索、编辑所有记录" action={<Search className="size-5" />} />
      <div className="mx-6 mt-3 flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>全部</Chip>
        <Chip active={filter === "income"} onClick={() => setFilter("income")}>收入</Chip>
        <Chip active={filter === "expense"} onClick={() => setFilter("expense")}>支出</Chip>
      </div>
      <label className="mx-6 mt-3 flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm shadow-card">
        <Search className="size-4 text-muted" />
        <input
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索备注、分类或日期"
        />
      </label>
      <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
        <MetricCard label="收入" value={currency(summary.income)} />
        <MetricCard label="支出" value={currency(summary.expense)} danger />
      </div>
      <Card className="mx-6 mt-4 max-h-[462px] overflow-auto">
        {groups.length ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.date}>
                <p className="mb-1 text-sm font-bold text-muted">{group.label}</p>
                {group.rows.map((item) => (
                  <TransactionRow key={item.id} item={item} onClick={() => onEdit(item)} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="font-bold">没有找到符合条件的账单</p>
            <p className="mt-2 text-sm text-muted">换个关键词或筛选条件试试。</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatsScreen({ totals, trend }: { totals: Array<{ name: string; value: number; ratio: number }>; trend: MonthlyTrendPoint[] }) {
  const latestBalance = trend.at(-1)?.balance ?? 0;
  return (
    <div className="relative h-full overflow-y-auto pb-28">
      <TopBar title="统计" subtitle="看懂当前月份钱流向" action={<ArrowUpRight className="size-5" />} />
      <Card className="mx-6 mt-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">近 6 个月结余趋势</h3>
          <span className={clsx("text-sm font-bold", latestBalance >= 0 ? "text-ink" : "text-brand")}>{currency(latestBalance)}</span>
        </div>
        <div className="mt-4 flex h-[118px] items-end justify-between rounded-[22px] bg-soft px-6 pb-5">
          {trend.map((item, index) => (
            <div
              key={item.month}
              className={clsx("w-6 rounded-full", item.balance === 0 ? "bg-line" : index === trend.length - 1 ? "bg-brand" : "bg-ink")}
              style={{ height: item.height }}
              title={`${item.label} ${currency(item.balance)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-muted">
          {trend.map((item) => (
            <span key={item.month}>{item.label}</span>
          ))}
        </div>
      </Card>
      <Card className="mx-6 mt-4">
        <h3 className="font-bold">支出分类占比</h3>
        <div className="mt-4 space-y-4">
          {totals.slice(0, 4).map((item, index) => (
            <Progress key={item.name} label={item.name} value={currency(item.value)} ratio={item.ratio} danger={index === 0} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProfileScreen({
  user,
  categories,
  summary,
  monthlyBudget,
  onBudgetChange,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onLogout
}: {
  user: AppUser | null;
  categories: Category[];
  summary: ReturnType<typeof summarize>;
  monthlyBudget: number;
  onBudgetChange: (budget: number) => void;
  onCreateCategory: (input: { name: string; type: TransactionType; icon: string }) => void;
  onUpdateCategory: (input: { id: string; name: string; type: TransactionType; icon: string }) => void;
  onDeleteCategory: (id: string) => void;
  onLogout: () => void;
}) {
  const budgetRatio = monthlyBudget > 0 ? Math.min(100, Math.round((summary.expense / monthlyBudget) * 100)) : 100;
  const remaining = Math.max(0, monthlyBudget - summary.expense);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [categoryType, setCategoryType] = useState<TransactionType>("expense");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  function submitCategory() {
    if (editingCategoryId) {
      onUpdateCategory({
        id: editingCategoryId,
        name: categoryName,
        icon: categoryIcon,
        type: categoryType
      });
    } else {
      onCreateCategory({
        name: categoryName,
        icon: categoryIcon,
        type: categoryType
      });
    }
    setCategoryName("");
    setCategoryIcon("");
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  }

  function startEditCategory(category: Category) {
    if (category.is_default) return;
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryType(category.type);
    setShowCategoryForm(true);
  }

  function resetCategoryForm() {
    setCategoryName("");
    setCategoryIcon("");
    setCategoryType("expense");
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  }

  return (
    <div className="relative h-full overflow-y-auto pb-28">
      <TopBar title="我的" subtitle="分类、预算和账号设置" action={<CircleUserRound className="size-5" />} />
      <Card className="mx-6 mt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-14 place-items-center rounded-full bg-ink text-2xl font-bold text-white">{user?.displayName.slice(0, 1).toUpperCase() ?? "M"}</div>
          <div className="min-w-0">
            <h3 className="font-bold">{user?.displayName ?? "未登录用户"}</h3>
            <p className="mt-1 text-xs text-muted">{user?.email ?? "使用 Demo 或 Supabase 登录"}</p>
          </div>
          </div>
          <button className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white" onClick={onLogout}>
            退出
          </button>
        </div>
      </Card>
      <Card className="mx-6 mt-4">
        <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">月度预算</h3>
          <label className="flex h-9 w-32 items-center rounded-full border border-line bg-white px-3 text-sm font-bold">
            <span className="mr-1 text-muted">¥</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-right outline-none"
              value={monthlyBudget}
              onChange={(event) => {
                const value = Number(event.target.value);
                onBudgetChange(Number.isFinite(value) ? value : 0);
              }}
              inputMode="decimal"
            />
          </label>
        </div>
        <div className="mt-4">
          <Progress label="预算使用" value={`${currency(summary.expense)} / ${currency(monthlyBudget)}`} ratio={budgetRatio} danger />
        </div>
        <p className="mt-4 text-xs text-muted">还可以花 {currency(remaining)}，节奏不错。</p>
      </Card>
      <Card className="mx-6 mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">分类管理</h3>
          <button className="text-xs font-bold text-brand" onClick={() => setShowCategoryForm((value) => !value)}>
            {showCategoryForm ? "收起" : "新增"}
          </button>
        </div>
        {showCategoryForm ? (
          <div className="mb-3 rounded-[22px] bg-soft p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">{editingCategoryId ? "编辑分类" : "新增分类"}</p>
              {editingCategoryId ? (
                <button className="text-xs font-bold text-muted" onClick={resetCategoryForm}>
                  取消
                </button>
              ) : null}
            </div>
            <div className="mb-3 flex rounded-full bg-white p-1">
              <button className={segClass(categoryType === "income")} onClick={() => setCategoryType("income")}>
                收入
              </button>
              <button className={segClass(categoryType === "expense")} onClick={() => setCategoryType("expense")}>
                支出
              </button>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-2">
              <input
                className="h-11 rounded-full border border-line bg-white px-3 text-center text-sm font-bold outline-none"
                value={categoryIcon}
                onChange={(event) => setCategoryIcon(event.target.value)}
                placeholder="图标"
                maxLength={2}
              />
              <input
                className="h-11 rounded-full border border-line bg-white px-4 text-sm font-bold outline-none"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="分类名称，如房租"
              />
            </div>
            <button className="mt-3 h-10 w-full rounded-full bg-brand text-sm font-bold text-white" onClick={submitCategory}>
              {editingCategoryId ? "保存修改" : "保存分类"}
            </button>
          </div>
        ) : null}
        <div className="max-h-[190px] overflow-auto pr-1">
          {categories.map((category) => (
            <div key={category.id} className="flex min-h-[52px] items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={clsx("grid size-9 place-items-center rounded-full text-sm font-bold", category.type === "expense" ? "bg-brandSoft text-brand" : "bg-soft text-ink")}>{category.icon}</span>
                <div>
                  <p className="text-sm font-bold">{category.name}</p>
                  <p className="text-xs text-muted">{category.type === "expense" ? "支出" : "收入"} · {category.is_default ? "默认分类" : "自定义分类"}</p>
                </div>
              </div>
              {category.is_default ? (
                <span className="text-xs font-bold text-muted">默认</span>
              ) : (
                <span className="flex items-center gap-2">
                  <button className="text-xs font-bold text-muted" onClick={() => startEditCategory(category)}>
                    编辑
                  </button>
                  <button className="text-xs font-bold text-brand" onClick={() => onDeleteCategory(category.id)}>
                    删除
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-[28px] bg-white p-4 shadow-card", className)}>{children}</section>;
}

function TextInput({ label, value, onChange, type = "text", icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; icon?: React.ReactNode }) {
  return (
    <label className="flex h-[66px] items-center justify-between rounded-[18px] border border-line bg-white px-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-muted">{label}</span>
        <input className="mt-1 block w-full bg-transparent text-sm font-semibold outline-none" value={value} onChange={(event) => onChange(event.target.value)} type={type} />
      </span>
      {icon}
    </label>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="h-[52px] w-full rounded-full bg-brand text-sm font-bold text-white shadow-card disabled:opacity-55" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="h-[52px] w-full rounded-full border border-line bg-white text-sm font-bold text-ink disabled:opacity-55" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function DarkMetric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="min-w-0 flex-1 rounded-[18px] bg-white/10 px-3 py-2">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className={clsx("mt-1 truncate font-bold", danger ? "text-brand" : "text-white")}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={clsx("mt-1 truncate text-lg font-bold", danger ? "text-brand" : "text-ink")}>{value}</p>
    </div>
  );
}

function TransactionRow({ item, onClick }: { item: TransactionView; onClick?: () => void }) {
  const isRed = item.type === "expense";
  return (
    <button className="flex min-h-[58px] w-full items-center justify-between gap-3 text-left" onClick={onClick}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={clsx("grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold", isRed ? "bg-brandSoft text-brand" : "bg-soft text-ink")}>{item.category?.icon ?? "记"}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{item.note || item.category?.name || "未命名账单"}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{item.category?.name ?? "其他"} · {item.transaction_date}</span>
        </span>
      </div>
      <span className={clsx("shrink-0 text-sm font-bold", isRed ? "text-brand" : "text-ink")}>
        {isRed ? "-" : "+"}
        {currency(item.amount)}
      </span>
    </button>
  );
}

function CategoryChip({ category, active, onClick }: { category: Category; active?: boolean; onClick: () => void }) {
  return (
    <button className={clsx("h-[82px] rounded-[18px] border bg-white p-2 text-center", active ? "border-brand bg-brandSoft" : "border-line")} onClick={onClick}>
      <span className={clsx("mx-auto grid size-9 place-items-center rounded-full text-sm font-bold", active ? "bg-brand text-white" : "bg-soft text-ink")}>{category.icon}</span>
      <span className="mt-2 block text-xs font-semibold">{category.name}</span>
    </button>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button className={clsx("rounded-full border px-4 py-2 text-xs font-bold", active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink")} onClick={onClick}>
      {children}
    </button>
  );
}

function Progress({ label, value, ratio, danger }: { label: string; value: string; ratio: number; danger?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-soft">
        <div className={clsx("h-2 rounded-full", danger ? "bg-brand" : "bg-ink")} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: Array<{ label: string; value: Tab; icon: typeof Home }> = [
    { label: "首页", value: "home", icon: Home },
    { label: "账单", value: "bills", icon: ReceiptText },
    { label: "记账", value: "add", icon: Plus },
    { label: "统计", value: "stats", icon: BarChart3 },
    { label: "我的", value: "profile", icon: WalletCards }
  ];

  return (
    <nav className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-6 right-6 flex h-16 items-center justify-between rounded-full bg-white px-2 shadow-card sm:bottom-9">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.value === active;
        return (
          <button key={item.value} className={clsx("flex min-w-12 flex-col items-center rounded-[18px] px-3 py-1.5 text-[10px] font-medium", isActive ? "bg-ink text-white" : "text-muted")} onClick={() => onChange(item.value)}>
            <Icon className="mb-1 size-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function segClass(active: boolean) {
  return clsx("h-11 flex-1 rounded-full text-sm font-bold", active ? "bg-brand text-white" : "text-ink");
}

function restoreDemoState() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(demoStorageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      categories?: Category[];
      transactions?: Transaction[];
      monthlyBudget?: number;
    };

    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
      return null;
    }

    return {
      categories: parsed.categories,
      transactions: parsed.transactions,
      monthlyBudget: typeof parsed.monthlyBudget === "number" ? parsed.monthlyBudget : defaultMonthlyBudget
    };
  } catch {
    return null;
  }
}

function persistDemoState(categories: Category[], transactions: Transaction[], monthlyBudget: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(demoStorageKey, JSON.stringify({ categories, transactions, monthlyBudget }));
}

function clearDemoState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(demoStorageKey);
}

function buildMonthlyTrend(transactions: Transaction[], selectedMonth: string): MonthlyTrendPoint[] {
  const [year, month] = selectedMonth.split("-").map(Number);
  const baseDate = new Date(year, month - 1, 1);
  const points = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - (5 - index), 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthlyTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(monthKey));
    const balance = monthlyTransactions.reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0);

    return {
      month: monthKey,
      label: `${date.getMonth() + 1}月`,
      balance,
      height: 10
    };
  });
  const maxAbsBalance = Math.max(...points.map((point) => Math.abs(point.balance)), 0);

  return points.map((point) => ({
    ...point,
    height: point.balance === 0 || maxAbsBalance === 0 ? 10 : Math.max(18, Math.round((Math.abs(point.balance) / maxAbsBalance) * 98))
  }));
}

function getBudgetStatus(expense: number, budget: number): BudgetStatus {
  if (budget <= 0) {
    return {
      label: "未设置预算",
      description: "设置预算后会显示使用提醒",
      tone: "warning"
    };
  }

  const ratio = expense / budget;

  if (ratio >= 1) {
    return {
      label: "已超支",
      description: `已超过预算 ${currency(expense - budget)}`,
      tone: "danger"
    };
  }

  if (ratio >= 0.8) {
    return {
      label: "接近预算",
      description: `预算已使用 ${Math.round(ratio * 100)}%，注意控制支出`,
      tone: "warning"
    };
  }

  return {
    label: "预算健康",
    description: `预算已使用 ${Math.round(ratio * 100)}%，节奏不错`,
    tone: "safe"
  };
}
