/**
 * アプリ全体の状態とアクション
 * 旧版のようにグローバル変数を相互参照させず、状態はここに集約する。
 */

import { batch, computed, signal } from '@preact/signals';
import * as db from './lib/db';
import { getEvent, type EventId } from './lib/events';
import { nextScramble } from './lib/scramble';
import { computeStats, detectRecords } from './lib/stats';
import type { Penalty } from './lib/time';

export type View = 'title' | 'timer' | 'battle';
export type DialogName = 'settings' | 'help' | 'sessions' | 'stats' | null;

export const view = signal<View>('title');
export const dialog = signal<DialogName>(null);
/** 詳細を開いている記録 */
export const openSolveId = signal<number | null>(null);

export const sessions = signal<db.Session[]>([]);
export const currentSessionId = signal<number | null>(null);
export const solves = signal<db.Solve[]>([]);
export const ready = signal(false);
export const storageError = signal<string | null>(null);

export const scramble = signal<string | null>(null);
export const scrambleError = signal(false);
/** 計測フェーズ（フォーカスモードや他画面の操作抑止に使う） */
export const timing = signal(false);

export const currentSession = computed(() => sessions.value.find((s) => s.id === currentSessionId.value) ?? null);
export const currentEvent = computed<EventId>(() => currentSession.value?.event ?? '333');
export const stats = computed(() => computeStats(solves.value));

// ---------------------------------------------------------------- トースト

export interface Toast {
  id: number;
  kind: 'info' | 'record' | 'error';
  title: string;
  body?: string;
}
export const toasts = signal<Toast[]>([]);
let toastSeq = 0;

export function showToast(kind: Toast['kind'], title: string, body?: string, ms = 3200): void {
  const id = ++toastSeq;
  toasts.value = [...toasts.value.slice(-3), { id, kind, title, ...(body ? { body } : {}) }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, ms);
}

// ---------------------------------------------------------------- 初期化

const LAST_SESSION_KEY = 'cct:lastSession';

export async function init(): Promise<void> {
  try {
    let list = await db.listSessions();
    if (list.length === 0) {
      list = [await db.createSession(getEvent('333').name, '333')];
    }
    const saved = Number(localStorage.getItem(LAST_SESSION_KEY));
    const target = list.find((s) => s.id === saved) ?? list[list.length - 1]!;
    sessions.value = list;
    await selectSession(target.id);
  } catch (e) {
    console.error(e);
    storageError.value = String(e);
  } finally {
    ready.value = true;
  }
}

let selectRequest = 0;

export async function selectSession(id: number): Promise<void> {
  const req = ++selectRequest;
  const prevEvent = currentEvent.value;
  const list = await db.listSolves(id);
  // 読み込み中に別のセッションが選ばれていたら、古い結果で上書きしない
  if (req !== selectRequest) return;
  batch(() => {
    currentSessionId.value = id;
    solves.value = list;
  });
  try {
    localStorage.setItem(LAST_SESSION_KEY, String(id));
  } catch {
    // 保存できなくても動作に支障はない
  }
  if (prevEvent !== currentEvent.value || scramble.value === null) await refreshScramble();
}

/** 種目を切り替える。その種目の最新セッションへ移動し、無ければ作る */
export async function switchEvent(event: EventId, newName: string): Promise<void> {
  const existing = [...sessions.value].reverse().find((s) => s.event === event);
  if (existing) {
    await selectSession(existing.id);
    return;
  }
  await createSession(newName || getEvent(event).name, event);
}

export async function createSession(name: string, event: EventId): Promise<void> {
  const s = await db.createSession(name.trim().slice(0, 60) || getEvent(event).name, event);
  sessions.value = [...sessions.value, s];
  await selectSession(s.id);
}

export async function renameSession(id: number, name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return;
  await db.updateSession(id, { name: trimmed });
  sessions.value = sessions.value.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
}

export async function deleteSession(id: number, fallbackName: string): Promise<void> {
  await db.deleteSession(id);
  let rest = sessions.value.filter((s) => s.id !== id);
  if (rest.length === 0) rest = [await db.createSession(fallbackName, '333')];
  sessions.value = rest;
  if (currentSessionId.value === id) await selectSession(rest[rest.length - 1]!.id);
}

export async function reloadSessions(): Promise<void> {
  sessions.value = await db.listSessions();
  if (currentSessionId.value !== null) solves.value = await db.listSolves(currentSessionId.value);
}

// ---------------------------------------------------------------- スクランブル

let scrambleRequest = 0;

export async function refreshScramble(): Promise<void> {
  const req = ++scrambleRequest;
  const event = currentEvent.value;
  batch(() => {
    scramble.value = null;
    scrambleError.value = false;
  });
  try {
    const s = await nextScramble(event);
    // 取得中に種目が切り替わった場合などは古い結果を捨てる
    if (req === scrambleRequest) scramble.value = s;
  } catch (e) {
    console.error(e);
    if (req === scrambleRequest) scrambleError.value = true;
  }
}

/** 手入力したスクランブルを使う */
export function setCustomScramble(text: string): void {
  scrambleRequest++;
  batch(() => {
    scramble.value = text.trim();
    scrambleError.value = false;
  });
}

// ---------------------------------------------------------------- 記録

export interface AddResult {
  solve: db.Solve;
  records: string[];
}

export async function addSolve(time: number, penalty: Penalty, usedScramble: string): Promise<AddResult | null> {
  const sessionId = currentSessionId.value;
  if (sessionId === null) return null;
  const solve = await db.addSolve({ sessionId, time, penalty, scramble: usedScramble, date: Date.now() });
  // 計測中にセッションが切り替わっていたら一覧には反映しない
  if (currentSessionId.value !== sessionId) return { solve, records: [] };
  // 保存を待つ間の編集・削除・追加を失わないよう、保存完了時点の一覧に追加する
  const before = solves.value;
  const after = [...before, solve];
  solves.value = after;
  return { solve, records: detectRecords(before, after) };
}

export async function updateSolve(id: number, patch: Partial<Omit<db.Solve, 'id'>>): Promise<void> {
  const next = await db.updateSolve(id, patch);
  if (next) solves.value = solves.value.map((s) => (s.id === id ? next : s));
}

export async function deleteSolve(id: number): Promise<void> {
  await db.deleteSolve(id);
  solves.value = solves.value.filter((s) => s.id !== id);
  if (openSolveId.value === id) openSolveId.value = null;
}

export async function clearCurrentSession(): Promise<void> {
  const id = currentSessionId.value;
  if (id === null) return;
  await db.clearSession(id);
  // 削除中に別のセッションへ切り替わっていたら、その一覧は消さない
  if (currentSessionId.value === id) solves.value = [];
}

export async function attachVideo(solveId: number, blob: Blob): Promise<void> {
  await db.saveVideo(solveId, blob);
  solves.value = solves.value.map((s) => (s.id === solveId ? { ...s, hasVideo: true } : s));
}
