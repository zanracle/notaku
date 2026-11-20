import { describe, expect, it } from 'vitest';

import { findDateInText, isReasonableReceiptDate } from '@/lib/dates';
import { groupDigits, parseMoney } from '@/lib/money';
import { FIXTURES } from './fixtures';
import { parseReceipt } from './parse';

describe('parseMoney', () => {
  it('membaca format ribuan Indonesia', () => {
    expect(parseMoney('1.234.500')).toBe(1234500);
    expect(parseMoney('Rp 25.000,-')).toBe(25000);
    expect(parseMoney('12,500')).toBe(12500);
    expect(parseMoney('1,234,500')).toBe(1234500);
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('abc')).toBeNull();
  });

  it('memformat ulang tanpa kehilangan digit', () => {
    expect(groupDigits(1234500)).toBe('1.234.500');
    expect(groupDigits(900)).toBe('900');
    expect(groupDigits('')).toBe('');
  });
});

describe('tanggal struk', () => {
  it('membaca beberapa format', () => {
    expect(findDateInText('18/11/2026', '2026-11-19')).toBe('2026-11-18');
    expect(findDateInText('18-11-26', '2026-11-19')).toBe('2026-11-18');
    expect(findDateInText('18 Nov 2026', '2026-11-19')).toBe('2026-11-18');
    expect(findDateInText('2026-11-18', '2026-11-19')).toBe('2026-11-18');
  });

  it('menolak tanggal masa depan jauh', () => {
    expect(isReasonableReceiptDate('2030-01-01')).toBe(false);
    expect(isReasonableReceiptDate('2026-11-18')).toBe(true);
  });
});

describe('parseReceipt pada fixture nyata', () => {
  for (const fixture of FIXTURES) {
    it(fixture.name, () => {
      const parsed = parseReceipt(fixture.text, '2026-11-19');
      const { expect: exp } = fixture;

      if (exp.amount !== undefined) expect(parsed.amount).toBe(exp.amount);
      if (exp.date !== undefined) expect(parsed.date).toBe(exp.date);
      if (exp.category) expect(parsed.category).toBe(exp.category);
      if (exp.items !== undefined) expect(parsed.items.length).toBe(exp.items);
      if (exp.minConfidence != null) expect(parsed.confidence).toBeGreaterThanOrEqual(exp.minConfidence);
      if (exp.maxConfidence != null) expect(parsed.confidence).toBeLessThanOrEqual(exp.maxConfidence);
      expect(parsed.confidence).toBeGreaterThanOrEqual(0);
      expect(parsed.confidence).toBeLessThanOrEqual(100);
    });
  }

  it('selalu menolak nominal di atas batas wajar', () => {
    const parsed = parseReceipt('TOTAL 99.999.999\n18/11/2026', '2026-11-19');
    expect(parsed.amount).toBeNull();
    expect(parsed.confidence).toBeLessThan(60);
  });

  it('mengisi alasan saat data tidak lengkap', () => {
    const parsed = parseReceipt('', '2026-11-19');
    expect(parsed.amount).toBeNull();
    expect(parsed.date).toBeNull();
    expect(parsed.reasons.length).toBeGreaterThan(0);
  });

  it('membaca item dengan kuantitas dan menghitung subtotal', () => {
    const parsed = parseReceipt(
      `BAKSO PAK KARNO
18/11/2026
BAKSO JUMBO 2 x 30.000
ES TEH 2 x 5.000
TOTAL 70.000`,
      '2026-11-19',
    );
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toMatchObject({ qty: 2, price: 30000 });
    expect(parsed.subtotal).toBe(70000);
    expect(parsed.amount).toBe(70000);
  });
});
