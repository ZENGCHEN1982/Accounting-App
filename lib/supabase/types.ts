export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};
