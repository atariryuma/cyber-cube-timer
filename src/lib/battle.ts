/**
 * CPU 対戦モードのロジック（DOM 非依存）
 *
 * 旧版の不具合（毎回の読み込みで戦績が消える・引き分けが負け扱い・
 * ギブアップ後に二重判定される等）を避けるため、
 * 解放状態は戦績から導出し、保存するのは戦績だけにする。
 */

import { getEvent, type EventId } from './events';

export interface Tier {
  id: string;
  icon: string;
  name: { ja: string; en: string };
  title: { ja: string; en: string };
  color: string;
  /** 3x3x3 基準の平均タイム（ms） */
  avgMs: number;
  /** ばらつき（標準偏差 / 平均） */
  spread: number;
  /** 1 秒あたりの回転数（CPU アニメーションの手数に使う） */
  tps: number;
}

export const TIERS: readonly Tier[] = [
  { id: 'beginner', icon: '🌱', name: { ja: 'ビギナー', en: 'Beginner' }, title: { ja: 'はじめての一歩', en: 'First steps' }, color: '#8bc34a', avgMs: 120_000, spread: 0.18, tps: 1.2 },
  { id: 'novice', icon: '📘', name: { ja: 'ノービス', en: 'Novice' }, title: { ja: 'LBL 法マスター', en: 'Layer-by-layer' }, color: '#4fc3f7', avgMs: 90_000, spread: 0.16, tps: 1.5 },
  { id: 'amateur', icon: '⚙️', name: { ja: 'アマチュア', en: 'Amateur' }, title: { ja: '1分の壁', en: 'Sub-1 hunter' }, color: '#26c6da', avgMs: 60_000, spread: 0.14, tps: 2 },
  { id: 'intermediate', icon: '🥉', name: { ja: '中級者', en: 'Intermediate' }, title: { ja: 'CFOP 入門', en: 'CFOP learner' }, color: '#cd7f32', avgMs: 40_000, spread: 0.12, tps: 2.6 },
  { id: 'skilled', icon: '🥈', name: { ja: '上級者', en: 'Skilled' }, title: { ja: 'F2L の使い手', en: 'F2L fluent' }, color: '#c0c0c0', avgMs: 30_000, spread: 0.11, tps: 3.2 },
  { id: 'advanced', icon: '🥇', name: { ja: 'エキスパート', en: 'Advanced' }, title: { ja: 'Sub-20 クラブ', en: 'Sub-20 club' }, color: '#ffd54f', avgMs: 20_000, spread: 0.1, tps: 4 },
  { id: 'expert', icon: '💎', name: { ja: 'マスター', en: 'Expert' }, title: { ja: 'Full OLL/PLL', en: 'Full OLL/PLL' }, color: '#40c4ff', avgMs: 15_000, spread: 0.09, tps: 5 },
  { id: 'master', icon: '⭐', name: { ja: 'グランドマスター', en: 'Master' }, title: { ja: '大会入賞常連', en: 'Podium regular' }, color: '#e040fb', avgMs: 11_000, spread: 0.08, tps: 6 },
  { id: 'champion', icon: '🏆', name: { ja: 'チャンピオン', en: 'Champion' }, title: { ja: '全国王者', en: 'National champion' }, color: '#ff5252', avgMs: 8_000, spread: 0.07, tps: 7 },
  { id: 'legend', icon: '👑', name: { ja: 'レジェンド', en: 'Legend' }, title: { ja: '世界記録保持者', en: 'World-class' }, color: '#ffea00', avgMs: 5_500, spread: 0.06, tps: 8.5 },
];

export interface TierRecord {
  wins: number;
  losses: number;
  draws: number;
  /** この相手に勝ったときの自己最速（ms） */
  best: number | null;
}

export type BattleRecords = Record<string, TierRecord>;

const KEY = 'cct:battle';

export function emptyRecord(): TierRecord {
  return { wins: 0, losses: 0, draws: 0, best: null };
}

export function sanitizeRecords(raw: unknown): BattleRecords {
  const out: BattleRecords = {};
  for (const tier of TIERS) {
    const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[tier.id] : undefined;
    const rec = emptyRecord();
    if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>;
      for (const k of ['wins', 'losses', 'draws'] as const) {
        if (typeof o[k] === 'number' && Number.isFinite(o[k]) && (o[k] as number) >= 0) rec[k] = Math.floor(o[k] as number);
      }
      if (typeof o.best === 'number' && Number.isFinite(o.best) && o.best > 0) rec.best = o.best;
    }
    out[tier.id] = rec;
  }
  return out;
}

export function loadRecords(): BattleRecords {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeRecords(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeRecords(null);
  }
}

export function saveRecords(records: BattleRecords): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // 保存できなくても対戦自体は続けられる
  }
}

/** 1 つ前の相手に 1 勝以上していれば解放（最初の相手は常に解放） */
export function isUnlocked(records: BattleRecords, index: number): boolean {
  if (index <= 0) return true;
  const prev = TIERS[index - 1];
  return !!prev && (records[prev.id]?.wins ?? 0) > 0;
}

export type Outcome = 'win' | 'lose' | 'draw';

/** 判定（player は effectiveMs 適用済み、DNF は Infinity）。同タイムは引き分け */
export function judge(playerMs: number, cpuMs: number): Outcome {
  if (!Number.isFinite(playerMs)) return 'lose';
  if (playerMs < cpuMs) return 'win';
  if (playerMs > cpuMs) return 'lose';
  return 'draw';
}

export function applyOutcome(records: BattleRecords, tierId: string, outcome: Outcome, playerMs: number): BattleRecords {
  const cur = records[tierId] ?? emptyRecord();
  const next: TierRecord = { ...cur };
  if (outcome === 'win') {
    next.wins++;
    if (Number.isFinite(playerMs) && (next.best === null || playerMs < next.best)) next.best = playerMs;
  } else if (outcome === 'lose') {
    next.losses++;
  } else {
    next.draws++;
  }
  return { ...records, [tierId]: next };
}

/** 種目に応じた CPU の平均タイム */
export function tierAverage(tier: Tier, event: EventId): number {
  return tier.avgMs * getEvent(event).battleScale;
}

/** 正規乱数（Box-Muller） */
function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** CPU のタイムを決める。平均 ±2.5σ でクリップした正規分布 */
export function rollCpuTime(tier: Tier, event: EventId, rng: () => number = Math.random): number {
  const avg = tierAverage(tier, event);
  const z = Math.max(-2.5, Math.min(2.5, gaussian(rng)));
  return Math.round(avg * (1 + z * tier.spread));
}

export interface MoveToken {
  move: string;
  inverse: string;
}

/**
 * CPU の「解く手順」を作る。スクランブルの逆手順に、迷い（ある手を回して戻す）を
 * 挟み込み、ティアの TPS に見合う手数にする。
 * solution はスクランブルの逆手順、vocabulary は迷い手に使う手の候補。
 */
export function planCpuMoves(
  solution: readonly string[],
  vocabulary: readonly MoveToken[],
  targetMs: number,
  tps: number,
  rng: () => number = Math.random,
  maxMoves = 240,
): string[] {
  const desired = Math.min(maxMoves, Math.round((targetMs / 1000) * tps));
  let pairs = Math.max(0, Math.floor((desired - solution.length) / 2));
  if (vocabulary.length === 0) pairs = 0;
  const out = [...solution];
  for (let i = 0; i < pairs; i++) {
    const token = vocabulary[Math.floor(rng() * vocabulary.length)]!;
    const at = Math.floor(rng() * (out.length + 1));
    out.splice(at, 0, token.move, token.inverse);
  }
  return out;
}

/** 乱数の再現が必要な場面（テスト）向けの簡易 PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
