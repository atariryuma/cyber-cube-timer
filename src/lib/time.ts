/**
 * タイムの表示・解析ユーティリティ
 * 内部表現はすべてミリ秒（number）。DNF は Infinity で表す。
 */

export type Penalty = 'none' | '+2' | 'dnf';

export const PLUS_TWO_MS = 2000;

/** 表示精度（小数点以下の桁数）。WCA 公式記録は 1/100 秒 */
export type Precision = 2 | 3;

/**
 * ミリ秒を "12.34" / "1:02.34" / "1:02:03.45" 形式に整形する。
 * WCA 規則に合わせ、表示桁より下は切り捨てる（四捨五入しない）。
 */
export function formatMs(ms: number, precision: Precision = 2): string {
  if (!Number.isFinite(ms)) return 'DNF';
  if (ms < 0) ms = 0;
  const unit = precision === 3 ? 1 : 10;
  const truncated = Math.floor(ms / unit) * unit;
  const totalSeconds = Math.floor(truncated / 1000);
  const fraction = Math.floor((truncated % 1000) / unit)
    .toString()
    .padStart(precision, '0');
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}.${fraction}`;
  }
  if (minutes > 0) {
    return `${minutes}:${pad2(seconds)}.${fraction}`;
  }
  return `${seconds}.${fraction}`;
}

/** 平均値は WCA 規則どおり四捨五入して表示する */
export function formatAverage(ms: number | null, precision: Precision = 2): string {
  if (ms === null) return '-';
  if (!Number.isFinite(ms)) return 'DNF';
  const unit = precision === 3 ? 1 : 10;
  return formatMs(Math.round(ms / unit) * unit, precision);
}

/** 実行中タイマー用の表示（更新頻度設定に応じて桁を落とす） */
export function formatRunning(ms: number, mode: 'full' | 'tenths' | 'seconds' | 'hidden', precision: Precision): string {
  switch (mode) {
    case 'hidden':
      return '…';
    case 'seconds':
      return formatMs(ms, 2).replace(/\.\d+$/, '');
    case 'tenths':
      return formatMs(ms, 2).replace(/\d$/, '');
    default:
      return formatMs(ms, precision);
  }
}

/** ペナルティ適用後のタイム（DNF は Infinity） */
export function effectiveMs(time: number, penalty: Penalty): number {
  if (penalty === 'dnf') return Infinity;
  if (penalty === '+2') return time + PLUS_TWO_MS;
  return time;
}

/** 記録表示（+2 は "12.34+"、DNF は "DNF(12.34)"） */
export function formatSolve(time: number, penalty: Penalty, precision: Precision = 2): string {
  if (penalty === 'dnf') return `DNF(${formatMs(time, precision)})`;
  if (penalty === '+2') return `${formatMs(time + PLUS_TWO_MS, precision)}+`;
  return formatMs(time, precision);
}

/**
 * 手入力されたタイムを解析する。
 * "1234" → 12.34 秒（csTimer と同じ「数字だけなら下2桁が小数」規則）
 * "12.34" / "1:02.34" / "DNF" / "12.34+" に対応。解析できなければ null。
 */
export function parseTimeInput(raw: string): { time: number; penalty: Penalty } | null {
  const input = raw.trim().toUpperCase();
  if (input === '') return null;
  if (input === 'DNF') return { time: 0, penalty: 'dnf' };

  let penalty: Penalty = 'none';
  let body = input;
  if (body.endsWith('+')) {
    penalty = '+2';
    body = body.slice(0, -1);
  }

  let ms: number | null = null;
  if (/^\d+$/.test(body)) {
    // 数字のみ: 末尾2桁を 1/100 秒、その前を秒（4桁以上なら分も）とみなす
    const digits = body.padStart(3, '0');
    const cs = Number(digits.slice(-2));
    const rest = digits.slice(0, -2);
    const secs = Number(rest.slice(-2));
    const mins = rest.length > 2 ? Number(rest.slice(0, -2)) : 0;
    if (rest.length > 2 && secs >= 60) return null;
    ms = (mins * 60 + secs) * 1000 + cs * 10;
  } else {
    const m = /^(?:(\d+):)?(\d+)(?:\.(\d{1,3}))?$/.exec(body);
    if (!m) return null;
    const mins = m[1] ? Number(m[1]) : 0;
    const secs = Number(m[2]);
    if (m[1] && secs >= 60) return null;
    const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
    ms = (mins * 60 + secs) * 1000 + frac;
  }

  if (ms === null || !Number.isFinite(ms) || ms <= 0) return null;
  return { time: ms, penalty };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
