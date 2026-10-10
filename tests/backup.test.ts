import { describe, expect, it } from 'vitest';
import { buildBackup, csvToSolves, parseBackup, parseCsv, solvesToCsv } from '../src/lib/backup';
import type { Session, Solve } from '../src/lib/db';

const session: Session = { id: 1, name: 'Main', event: '333', createdAt: 1 };
const solves: Solve[] = [
  { id: 1, sessionId: 1, time: 12_345, penalty: 'none', scramble: "R U R'", date: Date.UTC(2026, 0, 1) },
  { id: 2, sessionId: 1, time: 10_000, penalty: '+2', scramble: 'F2 "x"', date: Date.UTC(2026, 0, 2), comment: 'カンマ, あり' },
  { id: 3, sessionId: 1, time: 9_000, penalty: 'dnf', scramble: 'B', date: Date.UTC(2026, 0, 3), hasVideo: true },
];

describe('JSON バックアップ', () => {
  it('書き出し → 読み込みで記録が一致する（動画フラグは除く）', () => {
    const json = JSON.stringify(buildBackup([session], solves));
    const parsed = parseBackup(json);
    expect(parsed.sessions).toEqual([{ oldId: 1, name: 'Main', event: '333', createdAt: 1 }]);
    expect(parsed.solves).toHaveLength(3);
    expect(parsed.solves[1]).toMatchObject({ time: 10_000, penalty: '+2', comment: 'カンマ, あり', oldSessionId: 1 });
    expect(parsed.solves[2]).not.toHaveProperty('hasVideo');
  });

  it('不正なデータは拒否・除外', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"app":"other"}')).toThrow();
    const parsed = parseBackup(
      JSON.stringify({
        app: 'cyber-cube-timer',
        version: 1,
        sessions: [{ id: 1, name: 'A', event: 'nope' }, { id: 2, name: 'B', event: '222' }],
        solves: [
          { sessionId: 1, time: 1000, penalty: 'none' },
          { sessionId: 2, time: -5, penalty: 'none' },
          { sessionId: 2, time: 3000, penalty: 'weird' },
        ],
      }),
    );
    expect(parsed.sessions.map((s) => s.oldId)).toEqual([2]);
    expect(parsed.solves).toEqual([expect.objectContaining({ time: 3000, penalty: 'none' })]);
  });
});

describe('CSV', () => {
  it('引用符・カンマ・改行を正しく扱う', () => {
    expect(parseCsv('a,"b,c","d""e"\r\n"f\ng",h\n')).toEqual([
      ['a', 'b,c', 'd"e'],
      ['f\ng', 'h'],
    ]);
  });

  it('書き出した CSV を読み戻せる', () => {
    const csv = solvesToCsv(solves);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const back = csvToSolves(csv);
    expect(back.map((s) => [s.time, s.penalty])).toEqual([
      [12_345, 'none'],
      [10_000, '+2'],
      [9_000, 'dnf'],
    ]);
    expect(back[1]?.scramble).toBe('F2 "x"');
    expect(back[1]?.comment).toBe('カンマ, あり');
    expect(back[0]?.date).toBe(Date.UTC(2026, 0, 1));
  });

  it('数式として解釈される先頭文字を無害化する', () => {
    const csv = solvesToCsv([{ ...solves[0]!, comment: '=HYPERLINK("x")' }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('数値だけの値は残し、+ や - で始まる式は無害化する', () => {
    const csv = solvesToCsv([{ ...solves[0]!, comment: '+1+2' }, { ...solves[1]! }]);
    expect(csv).toContain(`'+1+2`);
    expect(csv).toContain(',+2,'); // ペナルティ列の "+2" はそのまま
  });

  it('1 時間を超えるタイムも読み戻せる', () => {
    const long = { ...solves[0]!, time: 3_723_450 };
    const back = csvToSolves(solvesToCsv([long]));
    expect(back[0]?.time).toBe(3_723_450);
  });

  it('範囲外の日付はバックアップ読み込み時に補正され、CSV 出力が落ちない', () => {
    const parsed = parseBackup(
      JSON.stringify({ app: 'cyber-cube-timer', version: 1, sessions: [{ id: 1, name: 'A', event: '333' }], solves: [{ sessionId: 1, time: 1000, penalty: 'none', date: 1e20 }] }),
    );
    expect(Number.isFinite(new Date(parsed.solves[0]!.date).getTime())).toBe(true);
    expect(() => solvesToCsv([{ id: 1, sessionId: 1, ...parsed.solves[0]! }])).not.toThrow();
  });

  it('旧版 v2 の CSV を読み込める', () => {
    const legacy = 'No.,Time (s),Penalty,DNF,Scramble,Date\n1,"12.345","","No","R U","2025/10/19 10:00:00"\n2,"DNF","","Yes","F","x"\n3,"9.500","+2","No","B2","y"\n';
    const back = csvToSolves(legacy);
    expect(back.map((s) => [s.time, s.penalty])).toEqual([
      [12_345, 'none'],
      [0, 'dnf'],
      [9_500, '+2'],
    ]);
    // 日付が読めなくても順序は保たれる
    expect(back[1]!.date).toBeLessThan(back[2]!.date);
  });
});
