import type { Category, Transaction } from "@/lib/supabase/types";

export const demoUser = {
  id: "demo-user",
  email: "demo@moneylite.app",
  displayName: "Chen Zeng"
};

export const demoCategories: Category[] = [
  {
    id: "cat-food",
    user_id: demoUser.id,
    name: "餐饮",
    type: "expense",
    color: "#e31f1f",
    icon: "餐",
    is_default: true,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "cat-traffic",
    user_id: demoUser.id,
    name: "交通",
    type: "expense",
    color: "#151517",
    icon: "交",
    is_default: true,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "cat-shopping",
    user_id: demoUser.id,
    name: "购物",
    type: "expense",
    color: "#e31f1f",
    icon: "购",
    is_default: true,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "cat-salary",
    user_id: demoUser.id,
    name: "工资",
    type: "income",
    color: "#151517",
    icon: "薪",
    is_default: true,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "cat-reimburse",
    user_id: demoUser.id,
    name: "报销",
    type: "income",
    color: "#151517",
    icon: "报",
    is_default: true,
    created_at: "2026-06-01T00:00:00.000Z"
  }
];

export const demoTransactions: Transaction[] = [
  {
    id: "tx-lunch",
    user_id: demoUser.id,
    category_id: "cat-food",
    type: "expense",
    amount: 36,
    note: "午餐",
    transaction_date: "2026-06-14",
    created_at: "2026-06-14T12:20:00.000Z",
    updated_at: "2026-06-14T12:20:00.000Z"
  },
  {
    id: "tx-subway",
    user_id: demoUser.id,
    category_id: "cat-traffic",
    type: "expense",
    amount: 6,
    note: "地铁",
    transaction_date: "2026-06-14",
    created_at: "2026-06-14T09:05:00.000Z",
    updated_at: "2026-06-14T09:05:00.000Z"
  },
  {
    id: "tx-coffee",
    user_id: demoUser.id,
    category_id: "cat-food",
    type: "expense",
    amount: 28,
    note: "咖啡",
    transaction_date: "2026-06-13",
    created_at: "2026-06-13T15:18:00.000Z",
    updated_at: "2026-06-13T15:18:00.000Z"
  },
  {
    id: "tx-market",
    user_id: demoUser.id,
    category_id: "cat-shopping",
    type: "expense",
    amount: 268.6,
    note: "超市购物",
    transaction_date: "2026-06-13",
    created_at: "2026-06-13T19:42:00.000Z",
    updated_at: "2026-06-13T19:42:00.000Z"
  },
  {
    id: "tx-salary",
    user_id: demoUser.id,
    category_id: "cat-salary",
    type: "income",
    amount: 12000,
    note: "工资",
    transaction_date: "2026-06-10",
    created_at: "2026-06-10T09:00:00.000Z",
    updated_at: "2026-06-10T09:00:00.000Z"
  },
  {
    id: "tx-reimburse",
    user_id: demoUser.id,
    category_id: "cat-reimburse",
    type: "income",
    amount: 800,
    note: "报销",
    transaction_date: "2026-06-09",
    created_at: "2026-06-09T18:00:00.000Z",
    updated_at: "2026-06-09T18:00:00.000Z"
  }
];
