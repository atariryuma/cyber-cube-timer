import { describe, expect, it, vi } from 'vitest';
import { TimerMachine, type TimerCallbacks } from '../src/lib/timerMachine';

function setup(inspection: boolean, holdMs = 300) {
  const cb = {
    onStart: vi.fn(),
    onStop: vi.fn(),
    onInspectionAlert: vi.fn(),
    onInspectionDnf: vi.fn(),
  } satisfies TimerCallbacks;
  return { m: new TimerMachine({ inspection, holdMs }, cb), cb };
}

describe('TimerMachine', () => {
  it('長押し不足では開始しない', () => {
    const { m, cb } = setup(false);
    m.press(0);
    expect(m.phase).toBe('holding');
    m.release(100);
    expect(m.phase).toBe('idle');
    expect(cb.onStart).not.toHaveBeenCalled();
  });

  it('長押し → 離して開始 → 押して停止', () => {
    const { m, cb } = setup(false);
    m.press(0);
    m.tick(300);
    expect(m.phase).toBe('ready');
    m.release(400);
    expect(m.phase).toBe('running');
    expect(cb.onStart).toHaveBeenCalledWith('none');
    m.press(10_400);
    expect(m.phase).toBe('stopped');
    expect(cb.onStop).toHaveBeenCalledWith({ time: 10_000, penalty: 'none' });
    m.release(10_500);
    expect(m.phase).toBe('idle');
  });

  it('holdMs = 0 なら即 ready', () => {
    const { m } = setup(false, 0);
    m.press(0);
    expect(m.phase).toBe('ready');
  });

  it('インスペクション: 15 秒以内の開始はペナルティなし、8・12 秒で通知', () => {
    const { m, cb } = setup(true);
    m.press(0);
    m.release(100); // 長押し不足
    expect(m.phase).toBe('idle');
    m.press(1000);
    m.release(1400); // tick なしでも release 時に判定される
    expect(m.phase).toBe('inspection');
    m.tick(1400 + 8000);
    m.tick(1400 + 12_000);
    expect(cb.onInspectionAlert.mock.calls.map((c) => c[0])).toEqual([8, 12]);
    m.press(1400 + 13_000);
    m.release(1400 + 13_500);
    expect(m.phase).toBe('running');
    expect(cb.onStart).toHaveBeenCalledWith('none');
  });

  it('インスペクション 15〜17 秒の開始は +2', () => {
    const { m, cb } = setup(true, 0);
    m.press(0);
    m.release(0);
    m.press(15_500);
    m.release(16_000);
    expect(cb.onStart).toHaveBeenCalledWith('+2');
    m.press(26_000);
    expect(cb.onStop).toHaveBeenCalledWith({ time: 10_000, penalty: '+2' });
  });

  it('インスペクション 17 秒超過は DNF', () => {
    const { m, cb } = setup(true, 0);
    m.press(0);
    m.release(0);
    m.tick(17_000);
    expect(cb.onInspectionDnf).toHaveBeenCalledOnce();
    expect(m.phase).toBe('stopped');
    // 次の試技は離す操作なしで始められる
    m.press(18_000);
    expect(m.phase).toBe('ready');
  });

  it('インスペクション中の長押し取り消しはインスペクションに戻る', () => {
    const { m } = setup(true);
    m.press(0);
    m.tick(300);
    m.release(300);
    m.press(1000);
    m.abortHold();
    expect(m.phase).toBe('inspection');
    expect(m.inspecting).toBe(true);
  });

  it('cancel で試技を破棄', () => {
    const { m, cb } = setup(false, 0);
    m.press(0);
    m.release(0);
    m.cancel();
    expect(m.phase).toBe('idle');
    expect(cb.onStop).not.toHaveBeenCalled();
  });
});
