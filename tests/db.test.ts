import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '../src/lib/db';

beforeEach(async () => {
  await db.resetConnectionForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('cyber-cube-timer');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
});

describe('IndexedDB', () => {
  it('セッションと記録の追加・取得・更新・削除', async () => {
    const a = await db.createSession('A', '333');
    const b = await db.createSession('B', '222');
    await db.addSolve({ sessionId: a.id, time: 2000, penalty: 'none', scramble: 'R', date: 2 });
    const first = await db.addSolve({ sessionId: a.id, time: 1000, penalty: 'none', scramble: 'U', date: 1 });
    await db.addSolve({ sessionId: b.id, time: 3000, penalty: 'none', scramble: 'F', date: 3 });

    const listA = await db.listSolves(a.id);
    expect(listA.map((s) => s.time)).toEqual([1000, 2000]); // 日付の古い順

    await db.updateSolve(first.id, { penalty: '+2', comment: 'memo' });
    expect((await db.listSolves(a.id))[0]).toMatchObject({ penalty: '+2', comment: 'memo' });

    await db.deleteSolve(first.id);
    expect(await db.listSolves(a.id)).toHaveLength(1);
    expect(await db.listSolves(b.id)).toHaveLength(1);
  });

  it('動画は別ストアに保存され、記録削除で一緒に消える', async () => {
    const s = await db.createSession('A', '333');
    const solve = await db.addSolve({ sessionId: s.id, time: 1000, penalty: 'none', scramble: '', date: 1 });
    await db.saveVideo(solve.id, new Blob(['video']));
    expect((await db.listSolves(s.id))[0]?.hasVideo).toBe(true);
    expect(await db.getVideo(solve.id)).not.toBeNull();
    await db.deleteSolve(solve.id);
    expect(await db.getVideo(solve.id)).toBeNull();
  });

  it('セッション削除で記録も消える / clearSession はセッションを残す', async () => {
    const a = await db.createSession('A', '333');
    const b = await db.createSession('B', '333');
    await db.addSolves([
      { sessionId: a.id, time: 1, penalty: 'none', scramble: '', date: 1 },
      { sessionId: a.id, time: 2, penalty: 'none', scramble: '', date: 2 },
      { sessionId: b.id, time: 3, penalty: 'none', scramble: '', date: 3 },
    ]);
    await db.clearSession(b.id);
    expect(await db.listSolves(b.id)).toHaveLength(0);
    expect((await db.listSessions()).map((s) => s.name)).toEqual(['A', 'B']);

    await db.deleteSession(a.id);
    expect((await db.listSessions()).map((s) => s.name)).toEqual(['B']);
    expect(await db.listAllSolves()).toHaveLength(0);
  });
});

describe('IndexedDB（競合）', () => {
  it('削除済みの記録には動画を保存しない', async () => {
    const s = await db.createSession('A', '333');
    const solve = await db.addSolve({ sessionId: s.id, time: 1000, penalty: 'none', scramble: '', date: 1 });
    await db.deleteSolve(solve.id);
    await db.saveVideo(solve.id, new Blob(['late video']));
    expect(await db.getVideo(solve.id)).toBeNull();
  });
});
