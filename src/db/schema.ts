export const SCHEMA_VERSION = 3;

/**
 * Semua migrasi berurutan. Tambah entri baru di akhir; jangan ubah entri lama,
 * karena database pengguna sudah menjalankannya.
 */
export const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      city TEXT,
      purpose TEXT,
      ref_no TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL REFERENCES trips(id),
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      tax INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'IDR',
      rate REAL,
      category TEXT NOT NULL,
      note TEXT,
      payment_method TEXT,
      receipt_path TEXT,
      thumb_path TEXT,
      receipt_hash TEXT,
      ocr_text TEXT,
      ai_json TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY NOT NULL,
      at TEXT NOT NULL,
      model TEXT NOT NULL,
      ok INTEGER NOT NULL,
      tokens_in INTEGER,
      tokens_out INTEGER,
      error TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_hash ON expenses(receipt_hash);`,
    `CREATE INDEX IF NOT EXISTS idx_ai_usage_at ON ai_usage(at);`,
  ],
  [
    // Dompet menggantikan dinas. Tabel trips dibiarkan (tidak dipakai) agar data lama aman.
    `CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#0E7C5F',
      budget INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `INSERT OR IGNORE INTO wallets (id, name, color, budget, created_at, updated_at)
      SELECT id, name, '#0E7C5F', budget, created_at, updated_at FROM trips;`,
    // expenses dibangun ulang: trip_id nullable tidak cukup, kolomnya NOT NULL dan ber-FK.
    `CREATE TABLE expenses_v2 (
      id TEXT PRIMARY KEY NOT NULL,
      wallet_id TEXT NOT NULL REFERENCES wallets(id),
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      subtotal INTEGER,
      tax INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'IDR',
      rate REAL,
      category TEXT NOT NULL,
      note TEXT,
      payment_method TEXT,
      receipt_path TEXT,
      thumb_path TEXT,
      receipt_hash TEXT,
      ocr_text TEXT,
      ai_json TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `INSERT INTO expenses_v2 (id, wallet_id, merchant, date, amount, tax, currency, rate, category, note,
       payment_method, receipt_path, thumb_path, receipt_hash, ocr_text, ai_json, source, confidence,
       status, sent_at, deleted_at, created_at, updated_at)
     SELECT id, trip_id, merchant, date, amount, tax, currency, rate, category, note,
       payment_method, receipt_path, thumb_path, receipt_hash, ocr_text, ai_json, source, confidence,
       status, sent_at, deleted_at, created_at, updated_at FROM expenses;`,
    `DROP TABLE expenses;`,
    `ALTER TABLE expenses_v2 RENAME TO expenses;`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_wallet ON expenses(wallet_id);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_hash ON expenses(receipt_hash);`,
    `CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY NOT NULL,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );`,
    `CREATE INDEX IF NOT EXISTS idx_items_expense ON expense_items(expense_id);`,
  ],
  [
    `CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (wallet_id, category)
    );`,
    `CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      wallet_id TEXT NOT NULL REFERENCES wallets(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_wallet ON budgets(wallet_id);`,
    `CREATE INDEX IF NOT EXISTS idx_templates_wallet ON templates(wallet_id);`,
  ],
];
