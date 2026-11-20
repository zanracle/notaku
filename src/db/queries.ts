import { getDb } from './index';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { newId } from '@/lib/id';
import { todayISO } from '@/lib/dates';

export type Wallet = {
  id: string;
  name: string;
  color: string;
  budget: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseItem = {
  id: string;
  expenseId: string;
  name: string;
  qty: number;
  price: number;
  sortOrder: number;
};

export type Expense = {
  id: string;
  walletId: string;
  merchant: string;
  date: string;
  amount: number;
  subtotal: number | null;
  tax: number;
  currency: string;
  rate: number | null;
  category: string;
  note: string | null;
  paymentMethod: string | null;
  receiptPath: string | null;
  thumbPath: string | null;
  receiptHash: string | null;
  ocrText: string | null;
  aiJson: string | null;
  source: 'manual' | 'ocr' | 'ai';
  confidence: number | null;
  status: 'draft' | 'siap' | 'terkirim';
  sentAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const WALLET_COLUMNS = `id, name, color, budget, created_at AS createdAt, updated_at AS updatedAt`;

const EXPENSE_COLUMNS = `id, wallet_id AS walletId, merchant, date, amount, subtotal, tax, currency, rate,
  category, note, payment_method AS paymentMethod, receipt_path AS receiptPath,
  thumb_path AS thumbPath, receipt_hash AS receiptHash, ocr_text AS ocrText, ai_json AS aiJson,
  source, confidence, status, sent_at AS sentAt, deleted_at AS deletedAt,
  created_at AS createdAt, updated_at AS updatedAt`;

const ITEM_COLUMNS = `id, expense_id AS expenseId, name, qty, price, sort_order AS sortOrder`;

const now = () => new Date().toISOString();

/* --------------------------------- wallets -------------------------------- */

export async function listWallets(): Promise<Wallet[]> {
  const db = await getDb();
  return db.getAllAsync<Wallet>(`SELECT ${WALLET_COLUMNS} FROM wallets ORDER BY created_at ASC`);
}

export async function getWallet(id: string): Promise<Wallet | null> {
  const db = await getDb();
  return db.getFirstAsync<Wallet>(`SELECT ${WALLET_COLUMNS} FROM wallets WHERE id = ?`, [id]);
}

export async function createWallet(input: {
  name: string;
  color?: string;
  budget?: number | null;
}): Promise<Wallet> {
  const db = await getDb();
  const id = newId('wal');
  const ts = now();
  await db.runAsync(
    'INSERT INTO wallets (id, name, color, budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name.trim() || 'Dompet', input.color ?? '#0E7C5F', input.budget ?? null, ts, ts],
  );
  const wallet = await getWallet(id);
  if (!wallet) throw new Error('Gagal membuat dompet');
  return wallet;
}

export async function updateWallet(
  id: string,
  patch: { name?: string; color?: string; budget?: number | null },
): Promise<void> {
  const db = await getDb();
  const current = await getWallet(id);
  if (!current) throw new Error('Dompet tidak ditemukan');
  await db.runAsync(
    'UPDATE wallets SET name = ?, color = ?, budget = ?, updated_at = ? WHERE id = ?',
    [
      patch.name?.trim() || current.name,
      patch.color ?? current.color,
      patch.budget !== undefined ? patch.budget : current.budget,
      now(),
      id,
    ],
  );
}

export async function deleteWallet(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM expenses WHERE wallet_id = ?',
    [id],
  );
  if ((row?.count ?? 0) > 0) {
    throw new Error('Dompet masih punya catatan. Pindahkan atau hapus catatannya dulu.');
  }
  await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
}

export async function ensureDefaultWallet(): Promise<Wallet> {
  const wallets = await listWallets();
  if (wallets.length > 0) return wallets[0];
  return createWallet({ name: 'Dompet Harian', color: '#0E7C5F' });
}

/* -------------------------------- expenses -------------------------------- */

export type ItemInput = { name: string; qty?: number; price: number };

export type ExpenseInput = {
  walletId: string;
  merchant: string;
  date: string;
  amount: number;
  subtotal?: number | null;
  tax?: number;
  category: string;
  note?: string | null;
  paymentMethod?: string | null;
  receiptPath?: string | null;
  thumbPath?: string | null;
  receiptHash?: string | null;
  ocrText?: string | null;
  aiJson?: string | null;
  source?: 'manual' | 'ocr' | 'ai';
  confidence?: number | null;
  items?: ItemInput[];
};

async function insertItems(
  tx: { runAsync: (sql: string, params: (string | number | null)[]) => Promise<unknown> },
  expenseId: string,
  items: ItemInput[],
): Promise<void> {
  let order = 0;
  for (const item of items) {
    if (!item.name.trim() || !Number.isFinite(item.price)) continue;
    await tx.runAsync(
      'INSERT INTO expense_items (id, expense_id, name, qty, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [newId('itm'), expenseId, item.name.trim().slice(0, 120), item.qty ?? 1, Math.round(item.price), order],
    );
    order += 1;
  }
}

function assertParams(sql: string, params: unknown[]): void {
  const count = (sql.match(/\?/g) ?? []).length;
  if (count !== params.length) {
    throw new Error(`Parameter SQL tidak cocok: ${count} placeholder, ${params.length} nilai.`);
  }
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const db = await getDb();
  const id = newId('exp');
  const ts = now();
  const sql = `INSERT INTO expenses (id, wallet_id, merchant, date, amount, subtotal, tax, category, note,
      payment_method, receipt_path, thumb_path, receipt_hash, ocr_text, ai_json, source, confidence,
      status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    id,
    input.walletId,
    input.merchant.trim() || 'Tanpa nama',
    input.date,
    input.amount,
    input.subtotal ?? null,
    input.tax ?? 0,
    input.category,
    input.note?.trim() || null,
    input.paymentMethod?.trim() || null,
    input.receiptPath ?? null,
    input.thumbPath ?? null,
    input.receiptHash ?? null,
    input.ocrText ?? null,
    input.aiJson ?? null,
    input.source ?? 'manual',
    input.confidence ?? null,
    'draft',
    ts,
    ts,
  ];
  assertParams(sql, params);

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(sql, params);
    await insertItems(tx, id, input.items ?? []);
  });
  const expense = await getExpense(id);
  if (!expense) throw new Error('Gagal menyimpan catatan');
  return expense;
}

export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInput> & { items?: ItemInput[] },
): Promise<void> {
  const db = await getDb();
  const current = await getExpense(id);
  if (!current) throw new Error('Catatan tidak ditemukan');

  const sql = `UPDATE expenses SET wallet_id = ?, merchant = ?, date = ?, amount = ?, subtotal = ?, tax = ?,
      category = ?, note = ?, payment_method = ?, receipt_path = ?, thumb_path = ?, receipt_hash = ?,
      ocr_text = ?, ai_json = ?, source = ?, confidence = ?, updated_at = ?
    WHERE id = ?`;
  const params = [
    patch.walletId ?? current.walletId,
    (patch.merchant ?? current.merchant).trim() || 'Tanpa nama',
    patch.date ?? current.date,
    patch.amount ?? current.amount,
    patch.subtotal !== undefined ? patch.subtotal : current.subtotal,
    patch.tax ?? current.tax,
    patch.category ?? current.category,
    patch.note !== undefined ? patch.note?.trim() || null : current.note,
    patch.paymentMethod !== undefined ? patch.paymentMethod?.trim() || null : current.paymentMethod,
    patch.receiptPath !== undefined ? patch.receiptPath : current.receiptPath,
    patch.thumbPath !== undefined ? patch.thumbPath : current.thumbPath,
    patch.receiptHash !== undefined ? patch.receiptHash : current.receiptHash,
    patch.ocrText !== undefined ? patch.ocrText : current.ocrText,
    patch.aiJson !== undefined ? patch.aiJson : current.aiJson,
    patch.source ?? current.source,
    patch.confidence !== undefined ? patch.confidence : current.confidence,
    now(),
    id,
  ];
  assertParams(sql, params);

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(sql, params);
    if (patch.items) {
      await tx.runAsync('DELETE FROM expense_items WHERE expense_id = ?', [id]);
      await insertItems(tx, id, patch.items);
    }
  });
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  return db.getFirstAsync<Expense>(`SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ?`, [id]);
}

export async function listItems(expenseId: string): Promise<ExpenseItem[]> {
  const db = await getDb();
  return db.getAllAsync<ExpenseItem>(
    `SELECT ${ITEM_COLUMNS} FROM expense_items WHERE expense_id = ? ORDER BY sort_order ASC`,
    [expenseId],
  );
}

export async function listItemsFor(expenseIds: string[]): Promise<Record<string, ExpenseItem[]>> {
  if (expenseIds.length === 0) return {};
  const db = await getDb();
  const placeholders = expenseIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<ExpenseItem>(
    `SELECT ${ITEM_COLUMNS} FROM expense_items WHERE expense_id IN (${placeholders}) ORDER BY sort_order ASC`,
    expenseIds,
  );
  const map: Record<string, ExpenseItem[]> = {};
  for (const row of rows) (map[row.expenseId] ??= []).push(row);
  return map;
}

export type ExpenseQuery = {
  walletId?: string;
  from?: string;
  to?: string;
  category?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  limit?: number;
};

export async function listExpenses(query: ExpenseQuery = {}): Promise<Expense[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.onlyDeleted) where.push('deleted_at IS NOT NULL');
  else if (!query.includeDeleted) where.push('deleted_at IS NULL');

  if (query.walletId) {
    where.push('wallet_id = ?');
    params.push(query.walletId);
  }
  if (query.from) {
    where.push('date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    where.push('date <= ?');
    params.push(query.to);
  }
  if (query.category) {
    where.push('category = ?');
    params.push(query.category);
  }
  if (query.search?.trim()) {
    where.push('(merchant LIKE ? OR note LIKE ?)');
    const like = `%${query.search.trim()}%`;
    params.push(like, like);
  }
  if (query.minAmount != null) {
    where.push('amount >= ?');
    params.push(query.minAmount);
  }
  if (query.maxAmount != null) {
    where.push('amount <= ?');
    params.push(query.maxAmount);
  }

  const sql = `SELECT ${EXPENSE_COLUMNS} FROM expenses
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY date DESC, created_at DESC
    ${query.limit ? `LIMIT ${Math.floor(query.limit)}` : ''}`;
  return db.getAllAsync<Expense>(sql, params);
}

export async function softDeleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?', [now(), now(), id]);
}

export async function restoreExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE expenses SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now(), id]);
}

/** Hapus permanen. Mengembalikan path file foto untuk dibersihkan pemanggil. */
export async function purgeExpense(id: string): Promise<string[]> {
  const db = await getDb();
  const expense = await getExpense(id);
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  return [expense?.receiptPath, expense?.thumbPath].filter((p): p is string => Boolean(p));
}

export type Totals = { total: number; count: number; tax: number };

export async function totals(
  query: { walletId?: string; from?: string; to?: string } = {},
): Promise<Totals> {
  const db = await getDb();
  const where = ['deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (query.walletId) {
    where.push('wallet_id = ?');
    params.push(query.walletId);
  }
  if (query.from) {
    where.push('date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    where.push('date <= ?');
    params.push(query.to);
  }
  const row = await db.getFirstAsync<{ total: number | null; count: number; tax: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count, COALESCE(SUM(tax), 0) AS tax
     FROM expenses WHERE ${where.join(' AND ')}`,
    params,
  );
  return { total: row?.total ?? 0, count: row?.count ?? 0, tax: row?.tax ?? 0 };
}

export type CategoryTotal = { category: string; total: number; count: number };

export async function totalsByCategory(
  query: { walletId?: string; from?: string; to?: string } = {},
): Promise<CategoryTotal[]> {
  const db = await getDb();
  const where = ['deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (query.walletId) {
    where.push('wallet_id = ?');
    params.push(query.walletId);
  }
  if (query.from) {
    where.push('date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    where.push('date <= ?');
    params.push(query.to);
  }
  return db.getAllAsync<CategoryTotal>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM expenses WHERE ${where.join(' AND ')}
     GROUP BY category ORDER BY total DESC`,
    params,
  );
}

export async function dailyTotals(from: string, to: string, walletId?: string): Promise<{ date: string; total: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ date: string; total: number }>(
    `SELECT date, COALESCE(SUM(amount), 0) AS total FROM expenses
     WHERE deleted_at IS NULL AND date >= ? AND date <= ? ${walletId ? 'AND wallet_id = ?' : ''}
     GROUP BY date ORDER BY date ASC`,
    walletId ? [from, to, walletId] : [from, to],
  );
}

export type DuplicateHit = { expense: Expense; samePhoto: boolean };

/** Kembalikan kandidat duplikat. Tidak memblokir; UI yang memutuskan. */
export async function findDuplicate(input: {
  amount: number;
  date: string;
  merchant: string;
  hash?: string | null;
  excludeId?: string;
}): Promise<DuplicateHit | null> {
  const db = await getDb();
  if (input.hash) {
    const same = await db.getFirstAsync<Expense>(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses
       WHERE receipt_hash = ? AND deleted_at IS NULL AND id != ? LIMIT 1`,
      [input.hash, input.excludeId ?? ''],
    );
    if (same) return { expense: same, samePhoto: true };
  }

  const from = new Date(`${input.date}T12:00:00`);
  from.setDate(from.getDate() - 1);
  const to = new Date(`${input.date}T12:00:00`);
  to.setDate(to.getDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const merchant = input.merchant.trim().toLowerCase();

  const rows = await db.getAllAsync<Expense>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses
     WHERE deleted_at IS NULL AND amount = ? AND date BETWEEN ? AND ? AND id != ?`,
    [input.amount, iso(from), iso(to), input.excludeId ?? ''],
  );
  const hit = rows.find((r) => {
    const a = r.merchant.toLowerCase();
    return a === merchant || a.includes(merchant) || merchant.includes(a);
  });
  return hit ? { expense: hit, samePhoto: false } : null;
}

/* -------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored: Record<string, string> = {};
  for (const row of rows) stored[row.key] = row.value;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

/* -------------------------------- ai usage -------------------------------- */

export async function logAiUsage(entry: {
  model: string;
  ok: boolean;
  tokensIn?: number | null;
  tokensOut?: number | null;
  error?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO ai_usage (id, at, model, ok, tokens_in, tokens_out, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newId('ai'), now(), entry.model, entry.ok ? 1 : 0, entry.tokensIn ?? null, entry.tokensOut ?? null, entry.error ?? null],
  );
}

export async function aiUsageThisMonth(): Promise<{ calls: number; failed: number }> {
  const db = await getDb();
  const prefix = new Date().toISOString().slice(0, 7);
  const row = await db.getFirstAsync<{ calls: number; failed: number }>(
    `SELECT COUNT(*) AS calls, COALESCE(SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END), 0) AS failed
     FROM ai_usage WHERE at LIKE ?`,
    [`${prefix}%`],
  );
  return { calls: row?.calls ?? 0, failed: row?.failed ?? 0 };
}

/* --------------------------------- export --------------------------------- */

export async function dumpAll(): Promise<{
  version: number;
  exportedAt: string;
  wallets: Wallet[];
  expenses: Expense[];
  items: ExpenseItem[];
  settings: Record<string, string>;
}> {
  const db = await getDb();
  const wallets = await db.getAllAsync<Wallet>(`SELECT ${WALLET_COLUMNS} FROM wallets`);
  const expenses = await db.getAllAsync<Expense>(`SELECT ${EXPENSE_COLUMNS} FROM expenses ORDER BY date ASC`);
  const items = await db.getAllAsync<ExpenseItem>(`SELECT ${ITEM_COLUMNS} FROM expense_items`);
  return {
    version: 2,
    exportedAt: now(),
    wallets,
    expenses,
    items,
    settings: await getSettings(),
  };
}

export async function recentWalletId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ walletId: string }>(
    `SELECT wallet_id AS walletId FROM expenses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
  );
  return row?.walletId ?? null;
}

export function monthRange(iso: string = todayISO()): { from: string; to: string } {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${iso.slice(0, 7)}-01`, to: `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}` };
}

