import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';

import { buildReceiptCsv, buildReceiptHtml, receiptFileName, type ReceiptData } from './build';

const MM_TO_PT = 72 / 25.4;

function receiptsDir(): Directory {
  const dir = new Directory(Paths.document, 'receipts-out');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

async function copyInto(sourceUri: string, fileName: string): Promise<string> {
  const target = new File(receiptsDir(), fileName);
  await target.write(await new File(sourceUri).bytes());
  return target.uri;
}

export async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Perangkat ini tidak punya menu bagikan.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType });
}

export function bundleName(receipts: ReceiptData[], walletName: string, ext: string): string {
  if (receipts.length === 1) return receiptFileName(receipts[0]).replace(/\.pdf$/, `.${ext}`);
  const safe = walletName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'Dompet';
  return `Struk-${safe}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export async function shareReceiptPdf(
  receipts: ReceiptData[],
  walletName: string,
  widthMm: 58 | 80 = 80,
): Promise<string> {
  const html = buildReceiptHtml(receipts, widthMm);
  const { uri } = await Print.printToFileAsync({
    html,
    width: widthMm * MM_TO_PT,
    height: 842,
  });
  const target = await copyInto(uri, bundleName(receipts, walletName, 'pdf'));
  await shareFile(target, 'application/pdf', 'Kirim struk');
  return target;
}

export async function printReceipts(receipts: ReceiptData[], widthMm: 58 | 80 = 80): Promise<void> {
  const html = buildReceiptHtml(receipts, widthMm);
  await Print.printAsync({ html, width: widthMm * MM_TO_PT, height: 842 });
}

export async function shareReceiptCsv(receipts: ReceiptData[], walletName: string): Promise<string> {
  const target = new File(receiptsDir(), bundleName(receipts, walletName, 'csv'));
  await target.write(buildReceiptCsv(receipts));
  await shareFile(target.uri, 'text/csv', 'Kirim rekap CSV');
  return target.uri;
}

export async function captureReceiptImage(
  ref: RefObject<unknown>,
  receipts: ReceiptData[],
  walletName: string,
): Promise<string> {
  if (!ref.current) throw new Error('Struk belum siap.');

  // view-shot bukan modul bawaan Expo Go; dimuat lazily supaya app tetap jalan.
  let captureRef: ((target: unknown, options: Record<string, unknown>) => Promise<string>) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    captureRef = require('react-native-view-shot').captureRef;
  } catch {
    captureRef = null;
  }
  if (!captureRef) {
    throw new Error('Simpan gambar butuh aplikasi versi build. Pakai PDF untuk sekarang.');
  }

  const tmp = await captureRef(ref, {
    format: 'jpg',
    quality: 0.92,
    result: 'tmpfile',
    width: 720,
  });
  const target = await copyInto(tmp, bundleName(receipts, walletName, 'jpg'));
  await shareFile(target, 'image/jpeg', 'Kirim struk sebagai gambar');
  return target;
}
