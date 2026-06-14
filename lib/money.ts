import type { Category, Transaction, TransactionType } from "@/lib/supabase/types";

export type TransactionView = Transaction & {
  category?: Category;
};

export function currency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

export function getCategory(categories: Category[], categoryId: string | null) {
  return categories.find((category) => category.id === categoryId);
}

export function summarize(transactions: Transaction[]) {
  const income = sumByType(transactions, "income");
  const expense = sumByType(transactions, "expense");

  return {
    income,
    expense,
    balance: income - expense
  };
}

export function sumByType(transactions: Transaction[], type: TransactionType) {
  return transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
}

export function withCategories(transactions: Transaction[], categories: Category[]): TransactionView[] {
  return transactions
    .map((transaction) => ({
      ...transaction,
      category: getCategory(categories, transaction.category_id)
    }))
    .sort((a, b) => {
      const dateDiff = b.transaction_date.localeCompare(a.transaction_date);
      return dateDiff !== 0 ? dateDiff : b.created_at.localeCompare(a.created_at);
    });
}

export function groupByDate(transactions: TransactionView[]) {
  return transactions.reduce<Array<{ date: string; label: string; rows: TransactionView[] }>>((groups, transaction) => {
    const label = formatDateLabel(transaction.transaction_date);
    const group = groups.find((item) => item.date === transaction.transaction_date);

    if (group) {
      group.rows.push(transaction);
    } else {
      groups.push({ date: transaction.transaction_date, label, rows: [transaction] });
    }

    return groups;
  }, []);
}

export function formatDateLabel(date: string) {
  if (date === "2026-06-14") return "今天";
  if (date === "2026-06-13") return "昨天";

  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function categoryTotals(transactions: TransactionView[]) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const name = transaction.category?.name ?? "其他";
    totals.set(name, (totals.get(name) ?? 0) + transaction.amount);
  }

  const max = Math.max(...totals.values(), 1);
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, ratio: Math.round((value / max) * 100) }))
    .sort((a, b) => b.value - a.value);
}
