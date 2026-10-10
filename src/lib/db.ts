/**
 * IndexedDB による記録の永続化
 *
 * ストア構成:
 *   sessions : { id, name, event, createdAt }
 *   solves   : { id, sessionId, time, penalty, scramble, date, comment?, hasVideo? }
 *   videos   : { solveId, blob }  … 動画は別ストアに分け、記録一覧の読み込みを軽く保つ
 *
 * データはすべて利用者のブラウザ内にのみ保存され、外部には送信しない。
 */

import type { EventId } from './events';
import type { Penalty } from './time';

export interface Session {
  id: number;
  name: string;
  event: EventId;
  createdAt: number;
}

export interface Solve {
  id: number;
  sessionId: number;
  /** 素のタイム（ms、ペナルティ加算前） */
  time: number;
  penalty: Penalty;
  scramble: string;
  /** 記録日時（epoch ms） */
  date: number;
  comment?: string;
  hasVideo?: boolean;
}

export type NewSolve = Omit<Solve, 'id'>;

const DB_NAME = 'cyber-cube-timer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('solves')) {
        const solves = db.createObjectStore('solves', { keyPath: 'id', autoIncrement: true });
        solves.createIndex('sessionId', 'sessionId', { unique: false });
      }
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'solveId' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // 別タブで新バージョンが開かれたら閉じて再接続させる
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
    req.onblocked = () => console.warn('IndexedDB のアップグレードが他のタブにブロックされています');
  });
  return dbPromise;
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });
}

async function store(name: 'sessions' | 'solves' | 'videos', mode: IDBTransactionMode) {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

/** 書き込み用: 処理の結果を返すのはトランザクションがコミットされてから */
async function write<T>(name: 'sessions' | 'solves', fn: (s: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await open();
  const tx = db.transaction(name, 'readwrite');
  const committed = done(tx);
  try {
    const result = await fn(tx.objectStore(name));
    await committed;
    return result;
  } catch (e) {
    // fn 側の失敗で返す場合も、コミット待ちの reject を未処理のまま残さない
    committed.catch(() => undefined);
    throw e;
  }
}

// ---------------------------------------------------------------- sessions

export async function listSessions(): Promise<Session[]> {
  const s = await store('sessions', 'readonly');
  const all = await promisify(s.getAll() as IDBRequest<Session[]>);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function createSession(name: string, event: EventId): Promise<Session> {
  const data = { name, event, createdAt: Date.now() };
  const id = await write('sessions', async (s) => (await promisify(s.add(data))) as number);
  return { id, ...data };
}

export async function updateSession(id: number, patch: Partial<Omit<Session, 'id'>>): Promise<void> {
  await write('sessions', async (s) => {
    const cur = (await promisify(s.get(id))) as Session | undefined;
    if (cur) await promisify(s.put({ ...cur, ...patch, id }));
  });
}

/** セッションとその記録・動画をまとめて削除 */
export async function deleteSession(id: number): Promise<void> {
  const db = await open();
  const tx = db.transaction(['sessions', 'solves', 'videos'], 'readwrite');
  tx.objectStore('sessions').delete(id);
  const solves = tx.objectStore('solves');
  const videos = tx.objectStore('videos');
  const keys = (await promisify(solves.index('sessionId').getAllKeys(id))) as number[];
  for (const key of keys) {
    solves.delete(key);
    videos.delete(key);
  }
  await done(tx);
}

// ---------------------------------------------------------------- solves

/** セッションの記録を古い順で返す */
export async function listSolves(sessionId: number): Promise<Solve[]> {
  const s = await store('solves', 'readonly');
  const all = (await promisify(s.index('sessionId').getAll(sessionId))) as Solve[];
  return all.sort((a, b) => a.date - b.date || a.id - b.id);
}

export async function listAllSolves(): Promise<Solve[]> {
  const s = await store('solves', 'readonly');
  return (await promisify(s.getAll())) as Solve[];
}

export async function addSolve(solve: NewSolve): Promise<Solve> {
  const id = await write('solves', async (s) => (await promisify(s.add(solve))) as number);
  return { id, ...solve };
}

export async function addSolves(solves: NewSolve[]): Promise<void> {
  const db = await open();
  const tx = db.transaction('solves', 'readwrite');
  const s = tx.objectStore('solves');
  for (const solve of solves) s.add(solve);
  await done(tx);
}

export async function updateSolve(id: number, patch: Partial<Omit<Solve, 'id'>>): Promise<Solve | null> {
  return write('solves', async (s) => {
    const cur = (await promisify(s.get(id))) as Solve | undefined;
    if (!cur) return null;
    const next = { ...cur, ...patch, id };
    await promisify(s.put(next));
    return next;
  });
}

export async function deleteSolve(id: number): Promise<void> {
  const db = await open();
  const tx = db.transaction(['solves', 'videos'], 'readwrite');
  tx.objectStore('solves').delete(id);
  tx.objectStore('videos').delete(id);
  await done(tx);
}

/** セッション内の記録だけを全削除（セッション自体は残す） */
export async function clearSession(sessionId: number): Promise<void> {
  const db = await open();
  const tx = db.transaction(['solves', 'videos'], 'readwrite');
  const solves = tx.objectStore('solves');
  const videos = tx.objectStore('videos');
  const keys = (await promisify(solves.index('sessionId').getAllKeys(sessionId))) as number[];
  for (const key of keys) {
    solves.delete(key);
    videos.delete(key);
  }
  await done(tx);
}

// ---------------------------------------------------------------- videos

export async function saveVideo(solveId: number, blob: Blob): Promise<void> {
  const db = await open();
  const tx = db.transaction(['videos', 'solves'], 'readwrite');
  const committed = done(tx);
  const solves = tx.objectStore('solves');
  const cur = (await promisify(solves.get(solveId))) as Solve | undefined;
  // 録画の停止を待つ間に記録が削除されていたら、孤立した動画を残さない
  if (cur) {
    tx.objectStore('videos').put({ solveId, blob });
    solves.put({ ...cur, hasVideo: true });
  }
  await committed;
}

export async function getVideo(solveId: number): Promise<Blob | null> {
  const s = await store('videos', 'readonly');
  const rec = (await promisify(s.get(solveId))) as { blob: Blob } | undefined;
  return rec?.blob ?? null;
}

// ---------------------------------------------------------------- 全データ

/** テスト用: 接続を閉じて次回 open で作り直す */
export async function resetConnectionForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
