/**
 * タイマーの状態機械（DOM に依存しない純粋ロジック）
 *
 * 状態遷移（WCA / スタックマット準拠）:
 *   idle ──押す──▶ holding ──hold経過──▶ ready ──離す──▶ inspection or running
 *   inspection ──押す──▶ holding(インスペクション継続) ──▶ ready ──離す──▶ running
 *   running ──押す──▶ stopped（記録確定） ──離す──▶ idle
 *
 * 時刻はすべて呼び出し側が performance.now() を渡す（テスト容易性のため）。
 */

import type { Penalty } from './time';

export type TimerPhase = 'idle' | 'holding' | 'ready' | 'inspection' | 'running' | 'stopped';

export interface TimerOptions {
  /** インスペクションを行うか */
  inspection: boolean;
  /** 押してから ready になるまでの長押し時間（ms）。0 なら即 ready */
  holdMs: number;
}

export interface TimerCallbacks {
  onPhaseChange?(phase: TimerPhase): void;
  /** 計測開始（インスペクション由来のペナルティ付き） */
  onStart?(penalty: Penalty): void;
  /** 計測終了 */
  onStop?(result: { time: number; penalty: Penalty }): void;
  /** インスペクション 8秒・12秒の警告 */
  onInspectionAlert?(second: 8 | 12): void;
  /** インスペクション 17 秒超過による DNF */
  onInspectionDnf?(): void;
}

export const INSPECTION_MS = 15_000;
export const INSPECTION_DNF_MS = 17_000;

export class TimerMachine {
  phase: TimerPhase = 'idle';
  private pressAt = 0;
  private inspectionStart = 0;
  private inInspection = false;
  private startAt = 0;
  private alerted = new Set<number>();
  private lastResult = 0;
  private startPenalty: Penalty = 'none';

  constructor(
    public options: TimerOptions,
    private readonly cb: TimerCallbacks = {},
  ) {}

  /** キー/タッチを押した */
  press(now: number): void {
    switch (this.phase) {
      case 'running':
        this.stop(now);
        return;
      case 'idle':
      case 'stopped': // インスペクション超過 DNF の後など、離す操作を経ずに次の試技へ進む場合
      case 'inspection':
        this.pressAt = now;
        if (this.options.holdMs <= 0) {
          this.setPhase('ready');
        } else {
          this.setPhase('holding');
        }
        return;
      default:
        return;
    }
  }

  /** キー/タッチを離した */
  release(now: number): void {
    this.tick(now);
    switch (this.phase) {
      case 'holding':
        // 長押し不足: 元の状態へ戻す
        this.setPhase(this.inInspection ? 'inspection' : 'idle');
        return;
      case 'ready':
        if (this.options.inspection && !this.inInspection) {
          this.inInspection = true;
          this.inspectionStart = now;
          this.alerted.clear();
          this.setPhase('inspection');
        } else {
          this.start(now);
        }
        return;
      case 'stopped':
        this.setPhase('idle');
        return;
      default:
        return;
    }
  }

  /** 定期的に呼ぶ（長押し判定・インスペクション超過判定） */
  tick(now: number): void {
    if (this.phase === 'holding' && now - this.pressAt >= this.options.holdMs) {
      this.setPhase('ready');
    }
    if (this.inInspection && this.phase !== 'running') {
      const elapsed = now - this.inspectionStart;
      for (const sec of [8, 12] as const) {
        if (elapsed >= sec * 1000 && !this.alerted.has(sec)) {
          this.alerted.add(sec);
          this.cb.onInspectionAlert?.(sec);
        }
      }
      if (elapsed >= INSPECTION_DNF_MS) {
        this.inInspection = false;
        this.lastResult = 0;
        this.setPhase('stopped');
        this.cb.onInspectionDnf?.();
      }
    }
  }

  /** インスペクション中か（インスペクション中に長押ししている間も true） */
  get inspecting(): boolean {
    return this.inInspection;
  }

  /** インスペクション経過時間（ms）。インスペクション中でなければ null */
  inspectionElapsed(now: number): number | null {
    return this.inInspection ? now - this.inspectionStart : null;
  }

  /** 計測中の経過時間（ms） */
  elapsed(now: number): number {
    if (this.phase === 'running') return now - this.startAt;
    if (this.phase === 'stopped') return this.lastResult;
    return 0;
  }

  /** 長押しを取り消す（ウィンドウのフォーカス喪失など、離す操作を検知できない場合） */
  abortHold(): void {
    if (this.phase === 'holding' || this.phase === 'ready') {
      this.setPhase(this.inInspection ? 'inspection' : 'idle');
    }
  }

  /** 中断（Esc）。計測中・インスペクション中の試技を破棄する */
  cancel(): void {
    this.inInspection = false;
    this.lastResult = 0;
    this.setPhase('idle');
  }

  private start(now: number): void {
    let penalty: Penalty = 'none';
    if (this.inInspection) {
      const elapsed = now - this.inspectionStart;
      if (elapsed >= INSPECTION_DNF_MS) penalty = 'dnf';
      else if (elapsed >= INSPECTION_MS) penalty = '+2';
    }
    this.inInspection = false;
    this.startPenalty = penalty;
    this.startAt = now;
    this.setPhase('running');
    this.cb.onStart?.(penalty);
  }

  private stop(now: number): void {
    const time = Math.max(0, Math.round(now - this.startAt));
    this.lastResult = time;
    this.setPhase('stopped');
    this.cb.onStop?.({ time, penalty: this.startPenalty });
  }

  private setPhase(phase: TimerPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.cb.onPhaseChange?.(phase);
  }
}
