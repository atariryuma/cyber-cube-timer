import { describe, expect, it } from 'vitest';
import { TIERS, applyOutcome, isUnlocked, judge, mulberry32, planCpuMoves, rollCpuTime, sanitizeRecords, tierAverage } from '../src/lib/battle';

describe('judge', () => {
  it('勝ち・負け・引き分け・DNF', () => {
    expect(judge(9_000, 10_000)).toBe('win');
    expect(judge(11_000, 10_000)).toBe('lose');
    expect(judge(10_000, 10_000)).toBe('draw');
    expect(judge(Infinity, 10_000)).toBe('lose');
  });
});

describe('records', () => {
  it('壊れたデータは既定値で補い、全ティアを持つ', () => {
    const r = sanitizeRecords({ beginner: { wins: 2, losses: 'x', best: -1 }, legend: null });
    expect(Object.keys(r)).toHaveLength(TIERS.length);
    expect(r.beginner).toEqual({ wins: 2, losses: 0, draws: 0, best: null });
    expect(r.legend).toEqual({ wins: 0, losses: 0, draws: 0, best: null });
  });

  it('解放は前の相手への勝利から導出（旧版のように消えない）', () => {
    let r = sanitizeRecords(null);
    expect(isUnlocked(r, 0)).toBe(true);
    expect(isUnlocked(r, 1)).toBe(false);
    r = applyOutcome(r, 'beginner', 'win', 50_000);
    expect(isUnlocked(r, 1)).toBe(true);
    expect(r.beginner?.best).toBe(50_000);
    r = applyOutcome(r, 'beginner', 'win', 60_000);
    expect(r.beginner?.best).toBe(50_000);
    r = applyOutcome(r, 'beginner', 'draw', 70_000);
    expect(r.beginner?.draws).toBe(1);
    // 再読み込みしても保持される
    expect(sanitizeRecords(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
});

describe('CPU', () => {
  it('タイムは平均 ±2.5σ に収まり、種目係数が掛かる', () => {
    const rng = mulberry32(42);
    const tier = TIERS[3]!;
    for (let i = 0; i < 500; i++) {
      const t = rollCpuTime(tier, '333', rng);
      expect(t).toBeGreaterThanOrEqual(tier.avgMs * (1 - 2.5 * tier.spread) - 1);
      expect(t).toBeLessThanOrEqual(tier.avgMs * (1 + 2.5 * tier.spread) + 1);
    }
    expect(tierAverage(tier, '222')).toBeLessThan(tierAverage(tier, '333'));
    expect(tierAverage(tier, '777')).toBeGreaterThan(tierAverage(tier, '444'));
  });

  it('手順は解法を順序どおり含み、迷い手は回して戻すペアになる', () => {
    const solution = ["R'", 'U2', 'F'];
    const vocab = [{ move: 'L', inverse: "L'" }];
    const moves = planCpuMoves(solution, vocab, 10_000, 2, mulberry32(1));
    // 目標 20 手 → 解法 3 手 + 迷い手 8 ペア = 19 手（奇数分は切り捨て）
    expect(moves).toHaveLength(19);
    // 迷い手 (L L') を取り除くと元の解法に戻る
    const stripped = [...moves];
    for (let i = 0; i < stripped.length - 1; ) {
      if (stripped[i] === 'L' && stripped[i + 1] === "L'") stripped.splice(i, 2);
      else i++;
    }
    expect(stripped).toEqual(solution);
  });

  it('手数の上限', () => {
    const moves = planCpuMoves(['R'], [{ move: 'U', inverse: "U'" }], 1_000_000, 10, mulberry32(3), 100);
    expect(moves.length).toBeLessThanOrEqual(100);
  });
});
