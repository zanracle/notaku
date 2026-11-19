export const SCHEMA_VERSION = 1;

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
];
