import { getDb } from './index';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { newId } from '@/lib/id';
import { todayISO } from '@/lib/dates';

export type Trip = {
  id: string;
  name: string;
  city: string | null;
  purpose: string | null;
  refNo: string | null;
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  tripId: string;
  merchant: string;
  date: string;
  amount: number;
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

const TRIP_COLUMNS = `id, name, city, purpose, ref_no AS refNo, start_date AS startDate,
  end_date AS endDate, budget, status, created_at AS createdAt, updated_at AS updatedAt`;

const EXPENSE_COLUMNS = `id, trip_id AS tripId, merchant, date, amount, tax, currency, rate,
  category, note, payment_method AS paymentMethod, receipt_path AS receiptPath,
  thumb_path AS thumbPath, receipt_hash AS receiptHash, ocr_text AS ocrText, ai_json AS aiJson,
  source, confidence, status, sent_at AS sentAt, deleted_at AS deletedAt,
  created_at AS createdAt, updated_at AS updatedAt`;

const now = () => new Date().toISOString();

/* ---------------------------------- trips --------------------------------- */

export async function listTrips(): Promise<Trip[]> {
  const db = await getDb();
  return db.getAllAsync<Trip>(
    `SELECT ${TRIP_COLUMNS} FROM trips ORDER BY status = 'open' DESC, start_date DESC`,
  );
}

export async function getTrip(id: string): Promise<Trip | null> {
  const db = await getDb();
  return db.getFirstAsync<Trip>(`SELECT ${TRIP_COLUMNS} FROM trips WHERE id = ?`, [id]);
}

export type TripInput = {
  name: string;
  city?: string | null;
  purpose?: string | null;
  refNo?: string | null;
  startDate: string;
  endDate: string;
  budget?: number | null;
};

export async function createTrip(input: TripInput): Promise<Trip> {
  const db = await getDb();
  const id = newId('trip');
  const ts = now();
  await db.runAsync(
    `INSERT INTO trips (id, name, city, purpose, ref_no, start_date, end_date, budget, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    [
      id,
      input.name.trim(),
      input.city?.trim() || null,
      input.purpose?.trim() || null,
      input.refNo?.trim() || null,
      input.startDate,
      input.endDate,
      input.budget ?? null,
      ts,
      ts,
    ],
  );
  const trip = await getTrip(id);
  if (!trip) throw new Error('Gagal membuat dinas');
  return trip;
}

export async function updateTrip(id: string, patch: Partial<TripInput & { status: string }>): Promise<void> {
  const db = await getDb();
  const current = await getTrip(id);
  if (!current) throw new Error('Dinas tidak ditemukan');
  await db.runAsync(
    `UPDATE trips SET name = ?, city = ?, purpose = ?, ref_no = ?, start_date = ?, end_date = ?,
       budget = ?, status = ?, updated_at = ? WHERE id = ?`,
    [
      patch.name?.trim() ?? current.name,
      patch.city !== undefined ? patch.city || null : current.city,
      patch.purpose !== undefined ? patch.purpose || null : current.purpose,
      patch.refNo !== undefined ? patch.refNo || null : current.refNo,
      patch.startDate ?? current.startDate,
      patch.endDate ?? current.endDate,
      patch.budget !== undefined ? patch.budget ?? null : current.budget,
      patch.status ?? current.status,
      now(),
      id,
    ],
  );
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM expenses WHERE trip_id = ?',
    [id],
  );
  if ((row?.count ?? 0) > 0) {
    throw new Error('Dinas masih punya biaya. Hapus atau pindahkan biayanya dulu.');
  }
  await db.runAsync('DELETE FROM trips WHERE id = ?', [id]);
}

/** Dinas yang sedang berjalan hari ini, atau yang paling baru. */
export async function activeTrip(): Promise<Trip | null> {
  const db = await getDb();
  const today = todayISO();
  const running = await db.getFirstAsync<Trip>(
    `SELECT ${TRIP_COLUMNS} FROM trips
     WHERE status = 'open' AND start_date <= ? AND end_date >= ?
     ORDER BY start_date DESC LIMIT 1`,
    [today, today],
  );
  if (running) return running;
  return db.getFirstAsync<Trip>(
    `SELECT ${TRIP_COLUMNS} FROM trips WHERE status = 'open' ORDER BY start_date DESC LIMIT 1`,
  );
}

export async function ensureDefaultTrip(): Promise<Trip> {
  const existing = await listTrips();
  if (existing.length > 0) return existing[0];
  const today = todayISO();
  return createTrip({ name: 'Dinas Umum', startDate: today, endDate: today });
}

/* -------------------------------- expenses -------------------------------- */

export type ExpenseInput = {
  tripId: string;
  merchant: string;
  date: string;
  amount: number;
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
  status?: 'draft' | 'siap' | 'terkirim';
};

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const db = await getDb();
  const id = newId('exp');
  const ts = now();
  await db.runAsync(
    `INSERT INTO expenses (id, trip_id, merchant, date, amount, tax, category, note, payment_method,
       receipt_path, thumb_path, receipt_hash, ocr_text, ai_json, source, confidence, status,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.tripId,
      input.merchant.trim() || 'Tanpa nama',
      input.date,
      input.amount,
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
      input.status ?? 'draft',
      ts,
      ts,
    ],
  );
  const expense = await getExpense(id);
  if (!expense) throw new Error('Gagal menyimpan biaya');
  return expense;
}

export async function updateExpense(id: string, patch: Partial<ExpenseInput>): Promise<void> {
  const db = await getDb();
  const current = await getExpense(id);
  if (!current) throw new Error('Biaya tidak ditemukan');
  await db.runAsync(
    `UPDATE expenses SET trip_id = ?, merchant = ?, date = ?, amount = ?, tax = ?, category = ?,
       note = ?, payment_method = ?, receipt_path = ?, thumb_path = ?, receipt_hash = ?,
       ocr_text = ?, ai_json = ?, source = ?, confidence = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      patch.tripId ?? current.tripId,
      (patch.merchant ?? current.merchant).trim() || 'Tanpa nama',
      patch.date ?? current.date,
      patch.amount ?? current.amount,
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
      patch.status ?? current.status,
      now(),
      id,
    ],
  );
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  return db.getFirstAsync<Expense>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ?`,
    [id],
  );
}

export type ExpenseQuery = {
  tripId?: string;
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

  if (query.tripId) {
    where.push('trip_id = ?');
    params.push(query.tripId);
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

export async function purgeExpense(id: string): Promise<string | null> {
  const db = await getDb();
  const expense = await getExpense(id);
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  return expense?.receiptPath ?? null;
}

export type Totals = { total: number; count: number; tax: number };

export async function totals(query: { tripId?: string; from?: string; to?: string } = {}): Promise<Totals> {
  const db = await getDb();
  const where = ['deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (query.tripId) {
    where.push('trip_id = ?');
    params.push(query.tripId);
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

export async function totalsByCategory(tripId?: string): Promise<CategoryTotal[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryTotal>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM expenses WHERE deleted_at IS NULL ${tripId ? 'AND trip_id = ?' : ''}
     GROUP BY category ORDER BY total DESC`,
    tripId ? [tripId] : [],
  );
}

export async function countNotReported(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM expenses WHERE deleted_at IS NULL AND status != 'terkirim'`,
  );
  return row?.count ?? 0;
}

export async function markTripSent(tripId: string): Promise<void> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    `UPDATE expenses SET status = 'terkirim', sent_at = ?, updated_at = ?
     WHERE trip_id = ? AND deleted_at IS NULL`,
    [ts, ts, tripId],
  );
  await db.runAsync("UPDATE trips SET status = 'closed', updated_at = ? WHERE id = ?", [ts, tripId]);
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
       WHERE receipt_hash = ? AND deleted_at IS NULL AND id != ?
       LIMIT 1`,
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
    [
      newId('ai'),
      now(),
      entry.model,
      entry.ok ? 1 : 0,
      entry.tokensIn ?? null,
      entry.tokensOut ?? null,
      entry.error ?? null,
    ],
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
  trips: Trip[];
  expenses: Expense[];
  settings: Record<string, string>;
}> {
  const db = await getDb();
  const trips = await db.getAllAsync<Trip>(`SELECT ${TRIP_COLUMNS} FROM trips`);
  const expenses = await db.getAllAsync<Expense>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses ORDER BY date ASC`,
  );
  return { version: 1, exportedAt: now(), trips, expenses, settings: await getSettings() };
}

export async function isEmptyDatabase(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM expenses');
  return (row?.count ?? 0) === 0;
}
