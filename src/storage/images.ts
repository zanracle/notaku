import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { getDb } from '@/db';

const FOLDER = 'receipts';
const MAX_WIDTH = 1600;
const THUMB_WIDTH = 240;

function receiptsDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

async function writeTo(sourceUri: string, name: string): Promise<string> {
  const dir = receiptsDir();
  const target = new File(dir, name);
  await target.write(await new File(sourceUri).bytes());
  return target.uri;
}

export type SavedPhoto = { receiptPath: string; thumbPath: string; hash: string | null };

/** Kompres foto struk ke sisi terpanjang 1600 px, buat thumbnail, simpan permanen. */
export async function saveReceiptPhoto(sourceUri: string, id: string): Promise<SavedPhoto> {
  const full = await manipulateAsync(sourceUri, [{ resize: { width: MAX_WIDTH } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  const thumb = await manipulateAsync(sourceUri, [{ resize: { width: THUMB_WIDTH } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
  });

  const receiptPath = await writeTo(full.uri, `${id}.jpg`);
  const thumbPath = await writeTo(thumb.uri, `${id}_thumb.jpg`);

  let hash: string | null = null;
  try {
    hash = await new File(receiptPath).digest('SHA-256');
  } catch {
    hash = null;
  }

  return { receiptPath, thumbPath, hash };
}

/** Simpan logo laporan ke penyimpanan permanen, bukan cache galeri. */
export async function saveLogoPhoto(sourceUri: string): Promise<string> {
  const compressed = await manipulateAsync(sourceUri, [{ resize: { width: 400 } }], {
    compress: 0.9,
    format: SaveFormat.PNG,
  });
  const dir = new Directory(Paths.document, 'brand');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, 'logo.png');
  await target.write(await new File(compressed.uri).bytes());
  return target.uri;
}

/** Hapus file foto milik satu biaya. Dipakai setelah purge, bukan setelah hapus lembut. */
export async function deletePhotoFiles(paths: (string | null | undefined)[]): Promise<void> {
  for (const path of paths) {
    if (!path) continue;
    try {
      const file = new File(path);
      if (file.exists) file.delete();
    } catch {
      // file sudah hilang atau tidak bisa diakses; abaikan
    }
  }
}

export async function deleteExpensePhoto(receiptPath: string | null, thumbPath: string | null): Promise<void> {
  await deletePhotoFiles([receiptPath, thumbPath]);
}

export type SweepReport = { removed: number; missing: number };

/**
 * Bersihkan file tanpa baris DB, dan baris DB tanpa file.
 * Dijalankan sekali saat aplikasi dibuka.
 */
export async function sweepOrphanFiles(): Promise<SweepReport> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; receipt_path: string | null; thumb_path: string | null }>(
    'SELECT id, receipt_path, thumb_path FROM expenses',
  );
  const referenced = new Set<string>();
  const missing: string[] = [];

  for (const row of rows) {
    let changed = false;
    if (row.receipt_path) {
      if (fileExists(row.receipt_path)) referenced.add(row.receipt_path);
      else {
        missing.push(row.id);
        changed = true;
      }
    }
    if (row.thumb_path) {
      if (fileExists(row.thumb_path)) referenced.add(row.thumb_path);
      else changed = true;
    }
    if (changed) {
      await db.runAsync(
        'UPDATE expenses SET receipt_path = NULL, thumb_path = NULL, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), row.id],
      );
    }
  }

  let removed = 0;
  try {
    const dir = receiptsDir();
    for (const entry of dir.list()) {
      if (entry instanceof File && !referenced.has(entry.uri)) {
        try {
          entry.delete();
          removed += 1;
        } catch {
          // file sedang dipakai; lewati
        }
      }
    }
  } catch {
    // direktori belum ada
  }

  return { removed, missing: missing.length };
}

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function receiptsDirectoryUri(): string {
  return receiptsDir().uri;
}
