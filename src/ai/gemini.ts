import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { isReasonableReceiptDate, todayISO } from '@/lib/dates';
import { isReasonableAmount, parseMoney } from '@/lib/money';
import { GEMINI_RESPONSE_SCHEMA, buildReceiptPrompt } from './prompt';

const SECURE_KEY = 'notaku_gemini_key';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 15_000;

export type AiErrorCode =
  | 'no_key'
  | 'unauthorized'
  | 'quota'
  | 'timeout'
  | 'network'
  | 'bad_response'
  | 'unknown';

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AiError';
  }
}

export type AiItem = { name: string; qty: number; price: number };

export type AiReceipt = {
  merchant: string;
  date: string;
  total: number;
  subtotal: number;
  tax: number;
  category: string;
  confidence: number;
  items: AiItem[];
};

export type AiUsage = { tokensIn: number | null; tokensOut: number | null };

/* ---------------------------------- key ---------------------------------- */

export async function getApiKey(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(SECURE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY, key.trim());
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEY);
}

/* -------------------------------- requests -------------------------------- */

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
};

async function callGemini(
  key: string,
  model: string,
  body: unknown,
  timeoutMs = TIMEOUT_MS,
): Promise<GeminiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new AiError('timeout', 'AI tidak menjawab dalam 15 detik.');
    }
    throw new AiError('network', 'Tidak bisa menghubungi AI. Periksa koneksi internet.');
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let payload: GeminiResponse = {};
  try {
    payload = raw ? (JSON.parse(raw) as GeminiResponse) : {};
  } catch {
    throw new AiError('bad_response', 'Jawaban AI tidak bisa dibaca.');
  }

  if (!response.ok) {
    const status = payload.error?.status ?? '';
    if (response.status === 401 || response.status === 403 || status.includes('API_KEY')) {
      throw new AiError('unauthorized', 'Kunci AI ditolak. Periksa kembali di Pengaturan.');
    }
    if (response.status === 429) {
      throw new AiError('quota', 'Kuota AI habis atau terlalu sering dipakai. Coba lagi nanti.');
    }
    throw new AiError('network', `AI gagal (${response.status}). Coba lagi.`);
  }

  return payload;
}

function extractJson(payload: GeminiResponse): Record<string, unknown> {
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim()) throw new AiError('bad_response', 'AI tidak mengembalikan data.');
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') throw new Error('not object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new AiError('bad_response', 'Data dari AI tidak berbentuk JSON yang valid.');
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') return parseMoney(value);
  return null;
}

function normalize(data: Record<string, unknown>, categories: string[]): AiReceipt {
  const total = asNumber(data.total);
  if (!isReasonableAmount(total)) {
    throw new AiError('bad_response', 'AI tidak menemukan total yang masuk akal.');
  }
  const rawDate = typeof data.date === 'string' ? data.date.slice(0, 10) : '';
  const date = isReasonableReceiptDate(rawDate) ? rawDate : todayISO();
  const taxRaw = asNumber(data.tax) ?? 0;
  const tax = taxRaw > 0 && taxRaw <= total * 0.15 ? taxRaw : 0;
  const categoryRaw = typeof data.category === 'string' ? data.category : '';
  const category =
    categories.find((c) => c.toLowerCase() === categoryRaw.toLowerCase()) ??
    categories.find((c) => categoryRaw.toLowerCase().includes(c.toLowerCase())) ??
    'Lain-lain';
  const confidenceRaw = asNumber(data.confidence) ?? 60;
  const items = Array.isArray(data.items)
    ? (data.items as unknown[])
        .map((item) => {
          const obj = item as Record<string, unknown>;
          const price = asNumber(obj?.price) ?? 0;
          const qtyRaw = asNumber(obj?.qty) ?? 1;
          const qty = qtyRaw > 0 && qtyRaw <= 99 ? qtyRaw : 1;
          const name = typeof obj?.name === 'string' ? obj.name.trim() : '';
          return name && price > 0 ? { name: name.slice(0, 80), qty, price } : null;
        })
        .filter((item): item is AiItem => item !== null)
        .slice(0, 40)
    : [];

  const subtotalRaw = asNumber(data.subtotal) ?? 0;
  const subtotal =
    subtotalRaw > 0 && subtotalRaw <= total
      ? subtotalRaw
      : items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return {
    merchant: typeof data.merchant === 'string' ? data.merchant.trim().slice(0, 80) : '',
    date,
    total: total as number,
    subtotal,
    tax,
    category,
    confidence: Math.max(0, Math.min(100, confidenceRaw)),
    items,
  };
}

async function readBase64(uri: string): Promise<string> {
  try {
    return await new File(uri).base64();
  } catch {
    throw new AiError('bad_response', 'Foto struk tidak bisa dibaca dari penyimpanan.');
  }
}

export async function askGemini(params: {
  imageUri: string;
  ocrText?: string | null;
  model: string;
  categories: string[];
}): Promise<{ receipt: AiReceipt; usage: AiUsage }> {
  const key = await getApiKey();
  if (!key) throw new AiError('no_key', 'Kunci AI belum diisi.');

  const base64 = await readBase64(params.imageUri);
  const prompt = buildReceiptPrompt(params.ocrText ?? '', params.categories, todayISO());

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 768,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
    },
  };

  let payload: GeminiResponse;
  try {
    payload = await callGemini(key, params.model, body);
  } catch (error) {
    // Satu kali retry hanya untuk gangguan jaringan, bukan untuk kunci atau kuota.
    if (error instanceof AiError && error.code === 'network') {
      payload = await callGemini(key, params.model, body);
    } else {
      throw error;
    }
  }

  const data = extractJson(payload);
  return {
    receipt: normalize(data, params.categories),
    usage: {
      tokensIn: payload.usageMetadata?.promptTokenCount ?? null,
      tokensOut: payload.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

export async function testGeminiKey(
  key: string,
  model: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!key.trim()) return { ok: false, message: 'Kunci masih kosong.' };
  try {
    const payload = await callGemini(
      key.trim(),
      model,
      {
        contents: [{ role: 'user', parts: [{ text: 'Balas dengan JSON {"ok":true}.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 32, responseMimeType: 'application/json' },
      },
      10_000,
    );
    extractJson(payload);
    return { ok: true };
  } catch (error) {
    if (error instanceof AiError) {
      if (error.code === 'unauthorized') return { ok: false, message: 'Kunci ditolak Google. Pastikan kunci benar dan API Gemini aktif.' };
      if (error.code === 'quota') return { ok: false, message: 'Kunci valid, tapi kuota sedang penuh. Coba lagi nanti.' };
      if (error.code === 'timeout') return { ok: false, message: 'Koneksi lambat. Coba lagi.' };
      if (error.code === 'network') return { ok: false, message: 'Tidak ada koneksi ke Google. Periksa internet.' };
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'Tes kunci gagal. Coba lagi.' };
  }
}

export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiError) return error.message;
  return 'AI gagal dipakai. Data manual tetap bisa disimpan.';
}

