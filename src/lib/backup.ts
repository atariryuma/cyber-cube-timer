/**
 * バックアップ（JSON）と CSV の入出力
 * 動画はサイズが大きいためバックアップに含めない。
 */

import { isEventId, type EventId } from './events';
import type { NewSolve, Session, Solve } from './db';
import { formatMs, type Penalty } from './time';

export const BACKUP_APP = 'cyber-cube-timer';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  sessions: { id: number; name: string; event: EventId; createdAt: number }[];
  solves: Omit<Solve, 'hasVideo'>[];
}

export function buildBackup(sessions: Session[], solves: Solve[]): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: sessions.map(({ id, name, event, createdAt }) => ({ id, name, event, createdAt })),
    solves: solves.map(({ hasVideo: _hasVideo, ...rest }) => rest),
  };
}

export interface ParsedBackup {
  sessions: { oldId: number; name: string; event: EventId; createdAt: number }[];
  solves: (Omit<NewSolve, 'sessionId'> & { oldSessionId: number })[];
}

const PENALTIES: readonly Penalty[] = ['none', '+2', 'dnf'];

/** バックアップ JSON を検証して取り込み可能な形にする。不正なら例外 */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('invalid-json');
  }
  if (!data || typeof data !== 'object') throw new Error('invalid-format');
  const d = data as Record<string, unknown>;
  if (d.app !== BACKUP_APP || !Array.isArray(d.sessions) || !Array.isArray(d.solves)) {
    throw new Error('invalid-format');
  }
  const sessions: ParsedBackup['sessions'] = [];
  for (const s of d.sessions as unknown[]) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    if (typeof o.id !== 'number' || typeof o.name !== 'string' || !isEventId(o.event)) continue;
    sessions.push({
      oldId: o.id,
      name: o.name.slice(0, 60),
      event: o.event,
      createdAt: isValidDate(o.createdAt) ? o.createdAt : Date.now(),
    });
  }
  const known = new Set(sessions.map((s) => s.oldId));
  const solves: ParsedBackup['solves'] = [];
  for (const s of d.solves as unknown[]) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    if (typeof o.sessionId !== 'number' || !known.has(o.sessionId)) continue;
    if (typeof o.time !== 'number' || !Number.isFinite(o.time) || o.time < 0) continue;
    const penalty = PENALTIES.includes(o.penalty as Penalty) ? (o.penalty as Penalty) : 'none';
    solves.push({
      oldSessionId: o.sessionId,
      time: Math.round(o.time),
      penalty,
      scramble: typeof o.scramble === 'string' ? o.scramble : '',
      date: isValidDate(o.date) ? o.date : Date.now(),
      ...(typeof o.comment === 'string' && o.comment ? { comment: o.comment.slice(0, 500) } : {}),
    });
  }
  return { sessions, solves };
}

/** Date として扱える日時（epoch ms）か。範囲外の値は CSV 出力時の toISOString で例外になる */
function isValidDate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(new Date(v).getTime());
}

// ---------------------------------------------------------------- CSV

function csvCell(value: string): string {
  // 表計算ソフトでの数式実行（CSV インジェクション）を防ぐ
  // 例外は「全体が単なる数値」の場合のみ（"+2" など）。"+1+2" のような式は無害化する
  const safe = /^[=+\-@\t\r]/.test(value) && !/^[+-]?\d+(\.\d+)?$/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function solvesToCsv(solves: Solve[]): string {
  const header = ['No', 'Time', 'Penalty', 'Result', 'Scramble', 'Date', 'Comment'];
  const rows = solves.map((s, i) => [
    String(i + 1),
    formatMs(s.time, 3),
    s.penalty === 'none' ? '' : s.penalty === '+2' ? '+2' : 'DNF',
    s.penalty === 'dnf' ? 'DNF' : formatMs(s.time + (s.penalty === '+2' ? 2000 : 0), 3),
    s.scramble.replace(/\s*\n\s*/g, ' '),
    new Date(s.date).toISOString(),
    s.comment ?? '',
  ]);
  // Excel で文字化けしないよう BOM を付ける
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** RFC 4180 形式の CSV を 2 次元配列にする */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "12.34" / "1:02.34" / "1:02:03.45" を ms にする */
function parseSeconds(value: string): number | null {
  const m = /^(?:(?:(\d+):)?(\d+):)?(\d+(?:\.\d+)?)$/.exec(value.trim());
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = m[2] ? Number(m[2]) : 0;
  const ms = Math.round((hours * 3600 + minutes * 60 + Number(m[3])) * 1000);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * CSV を記録として読み込む。対応形式:
 *  - 本アプリ v3 の CSV（No, Time, Penalty, Result, Scramble, Date, Comment）
 *  - 旧版 v2 の CSV（No., Time (s), Penalty, DNF, Scramble, Date）
 */
export function csvToSolves(text: string): Omit<NewSolve, 'sessionId'>[] {
  const rows = parseCsv(text);
  const header = rows.shift()?.map((h) => h.trim().toLowerCase());
  if (!header) return [];
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iTime = col('time', 'time (s)');
  const iPenalty = col('penalty');
  const iDnf = col('dnf');
  const iResult = col('result');
  const iScramble = col('scramble');
  const iDate = col('date');
  const iComment = col('comment');
  if (iTime < 0) throw new Error('invalid-format');

  const base = Date.now() - rows.length * 1000;
  const out: Omit<NewSolve, 'sessionId'>[] = [];
  rows.forEach((r, idx) => {
    const timeCell = (r[iTime] ?? '').trim();
    const pen = (r[iPenalty] ?? '').trim().toUpperCase();
    const isDnf =
      timeCell.toUpperCase() === 'DNF' ||
      pen === 'DNF' ||
      (iDnf >= 0 && /^(yes|true|1)$/i.test((r[iDnf] ?? '').trim())) ||
      (iResult >= 0 && (r[iResult] ?? '').trim().toUpperCase() === 'DNF');
    const time = parseSeconds(timeCell) ?? 0;
    if (!isDnf && time <= 0) return;
    const parsedDate = iDate >= 0 ? Date.parse(r[iDate] ?? '') : NaN;
    out.push({
      time,
      penalty: isDnf ? 'dnf' : pen === '+2' ? '+2' : 'none',
      scramble: iScramble >= 0 ? (r[iScramble] ?? '').trim() : '',
      // 旧版の日付はロケール依存で解析できないことがあるため、その場合は並び順を保った仮の日時にする
      date: Number.isFinite(parsedDate) ? parsedDate : base + idx * 1000,
      ...(iComment >= 0 && r[iComment] ? { comment: r[iComment]!.slice(0, 500) } : {}),
    });
  });
  return out;
}

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
