/**
 * スクランブル生成
 *
 * cubing.js（WCA 公式スクランブラー TNoodle と同等のアルゴリズム）でランダム状態スクランブルを生成する。
 * 生成は Web Worker 内で行われ、初回は探索テーブル構築に数秒かかる種目（4x4x4 等）があるため、
 * 種目ごとに次のスクランブルを先読みしてキューに貯めておく。
 */

import type { EventId } from './events';

type Generator = (event: EventId) => Promise<string>;

let generator: Generator | null = null;

async function loadGenerator(): Promise<Generator> {
  if (generator) return generator;
  const { randomScrambleForEvent } = await import('cubing/scramble');
  generator = async (event) => (await randomScrambleForEvent(event)).toString();
  return generator;
}

/** テストなどで生成器を差し替える */
export function setScrambleGeneratorForTests(fn: Generator | null): void {
  generator = fn;
  queues.clear();
}

const queues = new Map<EventId, Promise<string>[]>();
const PREFETCH = 1;

function enqueue(event: EventId): Promise<string> {
  const p = loadGenerator().then((gen) => gen(event));
  // 未処理の reject で警告が出ないよう、先読み分は失敗を握りつぶして取り出し時に再評価させる
  p.catch(() => undefined);
  return p;
}

/** 次のスクランブルを取得し、同じ種目の次の 1 つを先読みしておく */
export async function nextScramble(event: EventId): Promise<string> {
  let queue = queues.get(event);
  if (!queue) {
    queue = [];
    queues.set(event, queue);
  }
  const current = queue.shift() ?? enqueue(event);
  while (queue.length < PREFETCH) queue.push(enqueue(event));
  try {
    return await current;
  } catch (e) {
    // 先読みが失敗していた場合は 1 回だけ作り直す
    console.warn('スクランブル生成に失敗したため再試行します', e);
    return enqueue(event);
  }
}

/** 起動直後に重い種目の初期化を裏で始めておく */
export function warmUp(event: EventId): void {
  void nextScramble(event).then((s) => {
    // 取得した分はキューの先頭に戻す（捨てない）
    queues.get(event)?.unshift(Promise.resolve(s));
  });
}

/** スクランブルの手数（Megaminx などの改行を含む表記にも対応） */
export function moveCount(scramble: string): number {
  return scramble.split(/\s+/).filter((t) => t && t !== '/').length;
}
