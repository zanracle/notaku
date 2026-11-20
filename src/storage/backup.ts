import { Directory, File, Paths } from 'expo-file-system';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { getDb } from '@/db';
import { dumpAll, type Expense, type ExpenseItem, type Wallet } from '@/db/queries';

const FOLDER = 'backups';

function backupsDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export type BackupResult = { path: string; fileName: string; sizeKb: number; photos: number };

export async function createBackup(): Promise<BackupResult> {
  const data = await dumpAll();
  const files: Record<string, Uint8Array> = {
    'data.json': strToU8(JSON.stringify(data, null, 2)),
  };

  let photos = 0;
  for (const expense of data.expenses) {
    if (!expense.receiptPath) continue;
    try {
      const file = new File(expense.receiptPath);
      if (!file.exists) continue;
      files[`images/${expense.id}.jpg`] = await file.bytes();
      photos += 1;
    } catch {
      // foto rusak: backup tetap dibuat tanpa foto ini
    }
  }

  const zipped = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  const fileName = `notaku-${stamp}.zip`;
  const target = new File(backupsDir(), fileName);
  await target.write(zipped);

  return {
    path: target.uri,
    fileName,
    sizeKb: Math.max(1, Math.round(zipped.byteLength / 1024)),
    photos,
  };
}

type BackupData = {
  version?: number;
  exportedAt?: string;
  wallets?: Wallet[];
  trips?: { id: string; name: string; budget?: number | null; createdAt?: string; updatedAt?: string }[];
  expenses?: Expense[];
  items?: ExpenseItem[];
  settings?: Record<string, string>;
};

export type RestoreResult = {
  walletsAdded: number;
  expensesAdded: number;
  photosRestored: number;
  skipped: number;
};

/**
 * Restore bersifat menambah, bukan menimpa. ID yang sudah ada di perangkat
 * dipertahankan supaya pekerjaan lokal tidak hilang.
 */
export async function restoreBackup(zipUri: string): Promise<RestoreResult> {
  const bytes = await new File(zipUri).bytes();
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    throw new Error('File backup rusak atau bukan file NotaKu.');
  }

  const dataFile = unzipped['data.json'];
  if (!dataFile) throw new Error('Backup tidak berisi data.json.');

  let data: BackupData;
  try {
    data = JSON.parse(strFromU8(dataFile)) as BackupData;
  } catch {
    throw new Error('Isi backup tidak bisa dibaca.');
  }
  if (!data || !Array.isArray(data.expenses)) {
    throw new Error('Struktur backup tidak dikenali.');
  }

  // Backup versi lama menyimpan "trips"; versi baru "wallets".
  const wallets: Wallet[] =
    data.wallets ??
    (data.trips ?? []).map((trip) => ({
      id: trip.id,
      name: trip.name,
      color: '#0E7C5F',
      budget: trip.budget ?? null,
      createdAt: trip.createdAt ?? new Date().toISOString(),
      updatedAt: trip.updatedAt ?? new Date().toISOString(),
    }));

  const db = await getDb();
  const now = new Date().toISOString();
  let walletsAdded = 0;
  let expensesAdded = 0;
  let photosRestored = 0;
  let skipped = 0;

  const knownWallets = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM wallets')).map((row) => row.id),
  );

  const receipts = new Directory(Paths.document, 'receipts');
  if (!receipts.exists) receipts.create({ idempotent: true, intermediates: true });

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const wallet of wallets) {
      if (!wallet?.id || !wallet.name) {
        skipped += 1;
        continue;
      }
      const result = await txn.runAsync(
        `INSERT OR IGNORE INTO wallets (id, name, color, budget, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          wallet.id,
          wallet.name,
          wallet.color ?? '#0E7C5F',
          wallet.budget ?? null,
          wallet.createdAt ?? now,
          wallet.updatedAt ?? now,
        ],
      );
      if (result.changes > 0) walletsAdded += 1;
      knownWallets.add(wallet.id);
    }

    for (const expense of data.expenses ?? []) {
      const walletId = expense?.walletId ?? (expense as unknown as { tripId?: string })?.tripId;
      if (!expense?.id || !walletId || !expense.amount) {
        skipped += 1;
        continue;
      }
      if (!knownWallets.has(walletId)) {
        skipped += 1;
        continue;
      }

      let receiptPath: string | null = null;
      const photo = unzipped[`images/${expense.id}.jpg`];
      if (photo) {
        try {
          const receiptFile = new File(receipts, `${expense.id}.jpg`);
          await receiptFile.write(photo);
          receiptPath = receiptFile.uri;
          photosRestored += 1;
        } catch {
          receiptPath = null;
        }
      }

      const result = await txn.runAsync(
        `INSERT OR IGNORE INTO expenses (id, wallet_id, merchant, date, amount, subtotal, tax,
           currency, rate, category, note, payment_method, receipt_path, thumb_path, receipt_hash,
           ocr_text, ai_json, source, confidence, status, sent_at, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expense.id,
          walletId,
          expense.merchant ?? 'Tanpa nama',
          expense.date ?? now.slice(0, 10),
          expense.amount,
          expense.subtotal ?? null,
          expense.tax ?? 0,
          expense.currency ?? 'IDR',
          expense.rate ?? null,
          expense.category ?? 'Lain-lain',
          expense.note ?? null,
          expense.paymentMethod ?? null,
          receiptPath,
          null,
          expense.receiptHash ?? null,
          expense.ocrText ?? null,
          expense.aiJson ?? null,
          expense.source ?? 'manual',
          expense.confidence ?? null,
          expense.status ?? 'draft',
          expense.sentAt ?? null,
          expense.deletedAt ?? null,
          expense.createdAt ?? now,
          expense.updatedAt ?? now,
        ],
      );
      if (result.changes > 0) expensesAdded += 1;
    }

    for (const item of data.items ?? []) {
      if (!item?.id || !item.expenseId || !item.name) continue;
      await txn.runAsync(
        `INSERT OR IGNORE INTO expense_items (id, expense_id, name, qty, price, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.expenseId, item.name, item.qty ?? 1, item.price ?? 0, item.sortOrder ?? 0],
      );
    }

    for (const [key, value] of Object.entries(data.settings ?? {})) {
      if (typeof value !== 'string') continue;
      await txn.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  });

  return { walletsAdded, expensesAdded, photosRestored, skipped };
}

export function backupFileName(): string {
  return `notaku-${new Date().toISOString().slice(0, 10)}.zip`;
}

