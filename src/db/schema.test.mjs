import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { MIGRATIONS } from './schema';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const statement of MIGRATIONS[0]) db.exec(statement);
  return db;
}

function upgrade(db) {
  for (const statement of MIGRATIONS[1]) db.exec(statement);
}

describe('migrasi v1 ke v2', () => {
  it('memindahkan dinas ke dompet dan menjaga biaya lama', () => {
    const db = freshDb();
    db.prepare(
      `INSERT INTO trips (id, name, start_date, end_date, budget, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
    ).run('trip_1', 'Dinas Jakarta', '2026-11-17', '2026-11-19', 2000000, 'now', 'now');

    db.prepare(
      `INSERT INTO expenses (id, trip_id, merchant, date, amount, tax, category, source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ocr', 'draft', ?, ?)`,
    ).run('exp_1', 'trip_1', 'Warung Padang', '2026-11-18', 47000, 0, 'Makan', 'now', 'now');

    upgrade(db);

    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get('trip_1');
    expect(wallet.name).toBe('Dinas Jakarta');
    expect(wallet.budget).toBe(2000000);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get('exp_1');
    expect(expense.wallet_id).toBe('trip_1');
    expect(expense.amount).toBe(47000);
    expect(expense.merchant).toBe('Warung Padang');
  });

  it('mengizinkan biaya baru tanpa dinas', () => {
    const db = freshDb();
    db.prepare(
      `INSERT INTO trips (id, name, start_date, end_date, created_at, updated_at)
       VALUES ('t1', 'Dinas', '2026-11-17', '2026-11-18', 'now', 'now')`,
    ).run();
    upgrade(db);

    db.prepare(
      `INSERT INTO expenses (id, wallet_id, merchant, date, amount, subtotal, tax, category, source, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai', 'draft', ?, ?)`,
    ).run('e2', 't1', 'Kopi Senja', '2026-11-20', 45000, 45000, 0, 'Makan', 'now', 'now');

    db.prepare(
      `INSERT INTO expense_items (id, expense_id, name, qty, price, sort_order)
       VALUES ('i1', 'e2', 'Latte', 2, 20000, 0)`,
    ).run();

    const items = db.prepare('SELECT * FROM expense_items WHERE expense_id = ?').all('e2');
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
    expect(items[0].price).toBe(20000);
  });

  it('menolak biaya dengan dompet yang tidak ada', () => {
    const db = freshDb();
    upgrade(db);
    expect(() =>
      db
        .prepare(
          `INSERT INTO expenses (id, wallet_id, merchant, date, amount, category, source, status, created_at, updated_at)
           VALUES ('x', 'tidak_ada', 'X', '2026-11-20', 1000, 'Lain-lain', 'manual', 'draft', 'now', 'now')`,
        )
        .run(),
    ).toThrow();
  });
});
