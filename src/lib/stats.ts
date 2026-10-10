/**
 * 統計計算（WCA 規則準拠）
 *
 * - Mo3: 3回の単純平均。DNF が1つでもあれば DNF
 * - Ao5 / Ao12: 最速・最遅を1つずつ除いた平均。DNF は最遅扱いで、2つ以上なら DNF
 * - Ao50 / Ao100 など: 上下それぞれ ceil(5%) を除外（csTimer と同じ慣習）
 *
 * 入力の配列は「古い順」。ms は effectiveMs 適用済み（DNF = Infinity）。
 */

import { effectiveMs, type Penalty } from './time';

export interface SolveLike {
  time: number;
  penalty: Penalty;
}

/** 平均から除外する片側の個数 */
export function trimCount(n: number): number {
  if (n <= 3) return 0;
  if (n <= 12) return 1;
  return Math.ceil(n * 0.05);
}

/**
 * n 回の平均を計算する。null は回数不足、Infinity は DNF。
 * values は対象区間ちょうど n 個を渡す。
 */
export function averageOf(values: readonly number[]): number | null {
  const n = values.length;
  if (n === 0) return null;
  const trim = trimCount(n);
  if (trim === 0) {
    // Mo3 などの単純平均
    if (values.some((v) => !Number.isFinite(v))) return Infinity;
    return values.reduce((a, b) => a + b, 0) / n;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const kept = sorted.slice(trim, n - trim);
  if (kept.some((v) => !Number.isFinite(v))) return Infinity;
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

/** 末尾 n 個の現在の平均 */
export function currentAverage(values: readonly number[], n: number): number | null {
  if (values.length < n) return null;
  return averageOf(values.slice(values.length - n));
}

/**
 * すべての区間の平均を返す（グラフ用）。区間が足りない位置は null。
 * 返り値の長さは values と同じ。
 */
export function rollingAverages(values: readonly number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array<number | null>(values.length).fill(null);
  for (let i = n - 1; i < values.length; i++) {
    out[i] = averageOf(values.slice(i - n + 1, i + 1));
  }
  return out;
}

/** 区間平均の最良値（DNF しかなければ Infinity、回数不足なら null） */
export function bestAverage(values: readonly number[], n: number): number | null {
  if (values.length < n) return null;
  let best = Infinity;
  for (let i = n; i <= values.length; i++) {
    const avg = averageOf(values.slice(i - n, i));
    if (avg !== null && avg < best) best = avg;
  }
  return best;
}

export interface AverageStat {
  n: number;
  current: number | null;
  best: number | null;
}

export interface SessionStats {
  count: number;
  solvedCount: number;
  dnfCount: number;
  best: number | null;
  worst: number | null;
  mean: number | null;
  stdDev: number | null;
  averages: AverageStat[];
}

export const AVERAGE_SIZES = [3, 5, 12, 50, 100] as const;

export function computeStats(solves: readonly SolveLike[]): SessionStats {
  const values = solves.map((s) => effectiveMs(s.time, s.penalty));
  const finite = values.filter((v) => Number.isFinite(v));
  const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null;
  const stdDev =
    mean !== null && finite.length > 1
      ? Math.sqrt(finite.reduce((a, v) => a + (v - mean) ** 2, 0) / (finite.length - 1))
      : null;

  return {
    count: values.length,
    solvedCount: finite.length,
    dnfCount: values.length - finite.length,
    best: finite.length ? Math.min(...finite) : values.length ? Infinity : null,
    worst: finite.length ? Math.max(...finite) : null,
    mean,
    stdDev,
    // n = 3 は trimCount が 0 なので自動的に Mo3（単純平均）になる
    averages: AVERAGE_SIZES.map((n) => ({ n, current: currentAverage(values, n), best: bestAverage(values, n) })),
  };
}

/**
 * 新記録の判定。追加直前の記録列 before と追加後 after を比較し、
 * 更新された項目名（'single' や 'ao5' など）を返す。
 */
export function detectRecords(before: readonly SolveLike[], after: readonly SolveLike[]): string[] {
  const prev = computeStats(before);
  const next = computeStats(after);
  const records: string[] = [];
  const improved = (a: number | null, b: number | null) =>
    b !== null && Number.isFinite(b) && (a === null || !Number.isFinite(a) || b < a);

  // 1回目は「記録更新」とは呼ばない（比較対象がないため）
  if (prev.solvedCount > 0 && improved(prev.best, next.best)) records.push('single');
  next.averages.forEach((avg, i) => {
    const old = prev.averages[i];
    if (old && old.best !== null && improved(old.best, avg.best)) {
      records.push(avg.n === 3 ? 'mo3' : `ao${avg.n}`);
    }
  });
  return records;
}
