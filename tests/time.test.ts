import { describe, expect, it } from 'vitest';
import { effectiveMs, formatAverage, formatMs, formatRunning, formatSolve, parseTimeInput } from '../src/lib/time';

describe('formatMs', () => {
  it('秒・分・時を整形する', () => {
    expect(formatMs(0)).toBe('0.00');
    expect(formatMs(9876)).toBe('9.87');
    expect(formatMs(62345)).toBe('1:02.34');
    expect(formatMs(3_723_450)).toBe('1:02:03.45');
  });

  it('WCA 規則どおり表示桁より下は切り捨てる', () => {
    expect(formatMs(12_999)).toBe('12.99');
    expect(formatMs(12_999, 3)).toBe('12.999');
  });

  it('DNF（Infinity）と負数', () => {
    expect(formatMs(Infinity)).toBe('DNF');
    expect(formatMs(-5)).toBe('0.00');
  });
});

describe('formatAverage', () => {
  it('平均は四捨五入する', () => {
    expect(formatAverage(12_345)).toBe('12.35');
    expect(formatAverage(12_344)).toBe('12.34');
    expect(formatAverage(null)).toBe('-');
    expect(formatAverage(Infinity)).toBe('DNF');
  });
});

describe('formatRunning', () => {
  it('表示モードごとに桁を落とす', () => {
    expect(formatRunning(12_345, 'full', 3)).toBe('12.345');
    expect(formatRunning(12_345, 'tenths', 2)).toBe('12.3');
    expect(formatRunning(12_345, 'seconds', 2)).toBe('12');
    expect(formatRunning(12_345, 'hidden', 2)).toBe('…');
  });
});

describe('penalty', () => {
  it('effectiveMs', () => {
    expect(effectiveMs(10_000, 'none')).toBe(10_000);
    expect(effectiveMs(10_000, '+2')).toBe(12_000);
    expect(effectiveMs(10_000, 'dnf')).toBe(Infinity);
  });

  it('formatSolve', () => {
    expect(formatSolve(10_000, '+2')).toBe('12.00+');
    expect(formatSolve(10_000, 'dnf')).toBe('DNF(10.00)');
  });
});

describe('parseTimeInput', () => {
  it('数字だけなら下 2 桁を 1/100 秒とみなす', () => {
    expect(parseTimeInput('1234')).toEqual({ time: 12_340, penalty: 'none' });
    expect(parseTimeInput('5')).toEqual({ time: 50, penalty: 'none' });
    expect(parseTimeInput('10234')).toEqual({ time: 62_340, penalty: 'none' });
  });

  it('区切り付きの表記', () => {
    expect(parseTimeInput('12.34')).toEqual({ time: 12_340, penalty: 'none' });
    expect(parseTimeInput('1:02.5')).toEqual({ time: 62_500, penalty: 'none' });
    expect(parseTimeInput('12.345')).toEqual({ time: 12_345, penalty: 'none' });
  });

  it('ペナルティ', () => {
    expect(parseTimeInput('dnf')).toEqual({ time: 0, penalty: 'dnf' });
    expect(parseTimeInput('12.34+')).toEqual({ time: 12_340, penalty: '+2' });
  });

  it('不正な入力', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('1:75.00')).toBeNull();
    expect(parseTimeInput('0')).toBeNull();
    expect(parseTimeInput('17000')).toBeNull();
  });
});
