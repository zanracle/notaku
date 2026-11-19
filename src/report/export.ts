import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';

import { formatDateID } from '@/lib/dates';
import { buildReportHtml, reportFileName, reportTotals, type ReportMeta } from './html';

async function dataUri(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const file = new File(path);
    if (!file.exists) return null;
    return `data:image/jpeg;base64,${await file.base64()}`;
  } catch {
    return null;
  }
}

async function collectImages(meta: ReportMeta): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  for (const expense of meta.expenses) {
    const uri = await dataUri(expense.receiptPath);
    if (uri) images[expense.id] = uri;
  }
  const logo = await dataUri(meta.settings.logo_path);
  if (logo) images.__logo = logo;
  return images;
}

function reportsDir(): Directory {
  const dir = new Directory(Paths.document, 'reports');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

async function copyIntoReports(sourceUri: string, fileName: string): Promise<string> {
  const target = new File(reportsDir(), fileName);
  await target.write(await new File(sourceUri).bytes());
  return target.uri;
}

export async function shareFile(
  uri: string,
  mimeType: string,
  dialogTitle: string,
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Perangkat ini tidak punya menu bagikan.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType });
}

export async function shareReportPdf(meta: ReportMeta): Promise<string> {
  const images = await collectImages(meta);
  const html = buildReportHtml(meta, images);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const fileUri = await copyIntoReports(uri, reportFileName(meta, 'pdf'));
  await shareFile(fileUri, 'application/pdf', 'Kirim laporan ke finance');
  return fileUri;
}

export async function printReport(meta: ReportMeta): Promise<void> {
  const images = await collectImages(meta);
  const html = buildReportHtml(meta, images);
  await Print.printAsync({ html });
}

export function buildCsv(meta: ReportMeta): string {
  const { trip } = meta;
  const totals = reportTotals(meta);
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines: string[] = [];
  lines.push(['Tanggal', 'Merchant', 'Kategori', 'Pajak', 'Nominal', 'Catatan', 'Dinas', 'Status'].join(';'));
  for (const expense of meta.expenses) {
    lines.push(
      [
        expense.date,
        escape(expense.merchant),
        escape(expense.category),
        expense.tax ?? 0,
        expense.amount,
        escape(expense.note),
        escape(trip.name),
        expense.status,
      ].join(';'),
    );
  }
  lines.push(['', '', '', '', totals.total, '', '', ''].join(';'));
  return `\ufeff${lines.join('\r\n')}`;
}

export async function shareReportCsv(meta: ReportMeta): Promise<string> {
  const target = new File(reportsDir(), reportFileName(meta, 'csv'));
  await target.write(buildCsv(meta));
  await shareFile(target.uri, 'text/csv', 'Kirim rekap CSV');
  return target.uri;
}

export async function captureReportImage(
  ref: RefObject<unknown>,
  meta: ReportMeta,
): Promise<string> {
  if (!ref.current) throw new Error('Laporan belum siap.');

  // view-shot bukan modul bawaan Expo Go. Di-require saat dipakai supaya
  // aplikasi tetap jalan di Expo Go; hanya export gambar yang tidak tersedia.
  let captureRef: ((target: unknown, options: Record<string, unknown>) => Promise<string>) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    captureRef = require('react-native-view-shot').captureRef;
  } catch {
    captureRef = null;
  }
  if (!captureRef) {
    throw new Error('Export gambar butuh aplikasi versi build. Pakai PDF untuk sekarang.');
  }

  const tmp = await captureRef(ref, {
    format: 'jpg',
    quality: 0.9,
    result: 'tmpfile',
    width: 1080,
  });
  const fileName = reportFileName(meta, 'jpg');
  const fileUri = await copyIntoReports(tmp, fileName);
  await shareFile(fileUri, 'image/jpeg', 'Kirim laporan sebagai gambar');
  return fileUri;
}

export function reportSummaryLine(meta: ReportMeta): string {
  const totals = reportTotals(meta);
  return `${totals.count} biaya · ${formatDateID(meta.trip.startDate)} – ${formatDateID(meta.trip.endDate)}`;
}
