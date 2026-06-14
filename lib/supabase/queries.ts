"use client";

import { createClient } from "@/lib/supabase/client";
import type { Category, Transaction, TransactionType } from "@/lib/supabase/types";

export type NewTransactionInput = {
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  note: string;
  transactionDate: string;
};

export type UpdateTransactionInput = {
  id: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  note: string;
  transactionDate: string;
};

export type NewCategoryInput = {
  userId: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getCurrentSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: NewCategoryInput): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: input.userId,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      is_default: false
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color
    })
    .eq("id", input.id)
    .eq("is_default", false)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("is_default", false);
  if (error) throw error;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(input: NewTransactionInput): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: input.userId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      transaction_date: input.transactionDate
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      transaction_date: input.transactionDate
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
