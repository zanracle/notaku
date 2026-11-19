import { Directory, File, Paths } from 'expo-file-system';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { getDb } from '@/db';
import { dumpAll, type Expense, type Trip } from '@/db/queries';

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
  trips?: Trip[];
  expenses?: Expense[];
  settings?: Record<string, string>;
};

export type RestoreResult = {
  tripsAdded: number;
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
  if (!data || !Array.isArray(data.trips) || !Array.isArray(data.expenses)) {
    throw new Error('Struktur backup tidak dikenali.');
  }

  const db = await getDb();
  const now = new Date().toISOString();
  let tripsAdded = 0;
  let expensesAdded = 0;
  let photosRestored = 0;
  let skipped = 0;

  const knownTrips = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM trips')).map((row) => row.id),
  );

  const receipts = new Directory(Paths.document, 'receipts');
  if (!receipts.exists) receipts.create({ idempotent: true, intermediates: true });

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const trip of data.trips ?? []) {
      if (!trip?.id || !trip.name) {
        skipped += 1;
        continue;
      }
      const result = await txn.runAsync(
        `INSERT OR IGNORE INTO trips (id, name, city, purpose, ref_no, start_date, end_date, budget, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trip.id,
          trip.name,
          trip.city ?? null,
          trip.purpose ?? null,
          trip.refNo ?? null,
          trip.startDate ?? now.slice(0, 10),
          trip.endDate ?? now.slice(0, 10),
          trip.budget ?? null,
          trip.status ?? 'open',
          trip.createdAt ?? now,
          trip.updatedAt ?? now,
        ],
      );
      if (result.changes > 0) tripsAdded += 1;
      knownTrips.add(trip.id);
    }

    for (const expense of data.expenses ?? []) {
      if (!expense?.id || !expense.tripId || !expense.amount) {
        skipped += 1;
        continue;
      }
      if (!knownTrips.has(expense.tripId)) {
        // Dinas tidak ada di backup maupun di perangkat: lewati, jangan langgar foreign key.
        skipped += 1;
        continue;
      }
      let receiptPath: string | null = null;
      let thumbPath: string | null = null;
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
        `INSERT OR IGNORE INTO expenses (id, trip_id, merchant, date, amount, tax, currency, rate, category,
           note, payment_method, receipt_path, thumb_path, receipt_hash, ocr_text, ai_json, source,
           confidence, status, sent_at, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expense.id,
          expense.tripId,
          expense.merchant ?? 'Tanpa nama',
          expense.date ?? now.slice(0, 10),
          expense.amount,
          expense.tax ?? 0,
          expense.currency ?? 'IDR',
          expense.rate ?? null,
          expense.category ?? 'Lain-lain',
          expense.note ?? null,
          expense.paymentMethod ?? null,
          receiptPath,
          thumbPath,
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

    for (const [key, value] of Object.entries(data.settings ?? {})) {
      if (typeof value !== 'string') continue;
      await txn.runAsync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
      );
    }
  });

  return { tripsAdded, expensesAdded, photosRestored, skipped };
}

export function backupFileName(): string {
  return `notaku-${new Date().toISOString().slice(0, 10)}.zip`;
}
