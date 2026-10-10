import { describe, expect, it } from 'vitest';
import { averageOf, bestAverage, computeStats, currentAverage, detectRecords, rollingAverages, trimCount, type SolveLike } from '../src/lib/stats';

const ok = (s: number): SolveLike => ({ time: s * 1000, penalty: 'none' });
const dnf: SolveLike = { time: 5000, penalty: 'dnf' };

describe('trimCount', () => {
  it('WCA / csTimer の慣習', () => {
    expect(trimCount(3)).toBe(0);
    expect(trimCount(5)).toBe(1);
    expect(trimCount(12)).toBe(1);
    expect(trimCount(50)).toBe(3);
    expect(trimCount(100)).toBe(5);
  });
});

describe('averageOf', () => {
  it('Ao5 は最速と最遅を除く', () => {
    expect(averageOf([10, 12, 11, 20, 9].map((s) => s * 1000))).toBeCloseTo(11_000);
  });

  it('DNF 1 つは最遅として除外される', () => {
    expect(averageOf([10_000, 12_000, 11_000, Infinity, 9_000])).toBeCloseTo(11_000);
  });

  it('DNF 2 つで平均は DNF', () => {
    expect(averageOf([10_000, Infinity, 11_000, Infinity, 9_000])).toBe(Infinity);
  });

  it('Mo3 は DNF が 1 つでもあれば DNF', () => {
    expect(averageOf([10_000, 11_000, 12_000])).toBeCloseTo(11_000);
    expect(averageOf([10_000, 11_000, Infinity])).toBe(Infinity);
  });

  it('Ao12', () => {
    const values = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 5, 30].map((s) => s * 1000);
    // 5 と 30 を除いた 10..19 の平均 = 14.5
    expect(averageOf(values)).toBeCloseTo(14_500);
  });
});

describe('currentAverage / bestAverage / rollingAverages', () => {
  const values = [20, 10, 11, 12, 13, 30, 9].map((s) => s * 1000);

  it('回数不足は null', () => {
    expect(currentAverage(values.slice(0, 4), 5)).toBeNull();
    expect(bestAverage(values.slice(0, 4), 5)).toBeNull();
  });

  it('最新 5 回の平均', () => {
    // [11, 12, 13, 30, 9] → 11, 12, 13 の平均
    expect(currentAverage(values, 5)).toBeCloseTo(12_000);
  });

  it('全区間の最良', () => {
    // [20,10,11,12,13] → 11, 12, 13 の平均 = 12 / [10,11,12,13,30] → 12 / [11,12,13,30,9] → 12
    expect(bestAverage(values, 5)).toBeCloseTo(12_000);
  });

  it('rolling は配列長を保つ', () => {
    const r = rollingAverages(values, 5);
    expect(r).toHaveLength(values.length);
    expect(r.slice(0, 4)).toEqual([null, null, null, null]);
    expect(r[4]).toBeCloseTo(12_000);
  });
});

describe('computeStats', () => {
  it('空', () => {
    const s = computeStats([]);
    expect(s.count).toBe(0);
    expect(s.best).toBeNull();
    expect(s.mean).toBeNull();
  });

  it('ベスト・平均・DNF 数', () => {
    const s = computeStats([ok(10), ok(12), dnf, { time: 9000, penalty: '+2' }]);
    expect(s.count).toBe(4);
    expect(s.dnfCount).toBe(1);
    expect(s.best).toBe(10_000);
    expect(s.worst).toBe(12_000);
    expect(s.mean).toBeCloseTo((10_000 + 12_000 + 11_000) / 3);
    expect(s.averages.find((a) => a.n === 3)?.current).toBe(Infinity);
  });

  it('全部 DNF ならベストは DNF', () => {
    expect(computeStats([dnf, dnf]).best).toBe(Infinity);
  });
});

describe('detectRecords', () => {
  it('1 回目は記録更新扱いしない', () => {
    expect(detectRecords([], [ok(10)])).toEqual([]);
  });

  it('シングル更新', () => {
    expect(detectRecords([ok(10)], [ok(10), ok(9)])).toEqual(['single']);
  });

  it('Ao5 更新（シングルは更新なし）', () => {
    // 直前の Ao5 = (12 + 12 + 20) / 3、追加後の区間 [8, 12, 12, 20, 10] → (12 + 12 + 10) / 3
    const before = [ok(30), ok(8), ok(12), ok(12), ok(20)];
    const after = [...before, ok(10)];
    expect(detectRecords(before, after)).toEqual(['ao5']);
  });

  it('悪化した記録では何も出ない', () => {
    expect(detectRecords([ok(10), ok(11)], [ok(10), ok(11), ok(12)])).toEqual([]);
  });
});
