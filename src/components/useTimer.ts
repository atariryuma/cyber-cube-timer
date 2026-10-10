import { useSignal, type Signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { TimerMachine, INSPECTION_MS, type TimerPhase } from '../lib/timerMachine';
import { formatMs, formatRunning, type Penalty } from '../lib/time';
import { settings } from '../lib/settings';
import { playSound, speak, unlockAudio } from '../lib/sound';

export interface UseTimerOptions {
  /** false の間はキー入力を無視する（ダイアログ表示中など） */
  enabled: boolean;
  inspection: boolean;
  onStart?(penalty: Penalty): void;
  onStop?(result: { time: number; penalty: Penalty }): void;
  onInspectionDnf?(): void;
  onCancel?(): void;
}

export interface TimerController {
  phase: TimerPhase;
  /** インスペクション中か（インスペクション中の長押しも含む） */
  inInspection: boolean;
  /** メイン表示の文字列（rAF で直接更新される） */
  display: Signal<string>;
  /** インスペクション表示（"15"〜"1"、超過時は "+2"） */
  inspectionText: Signal<string>;
  /** インスペクションの警告段階（0: なし, 1: 8秒経過, 2: 12秒経過, 3: 超過） */
  inspectionLevel: Signal<number>;
  pointerHandlers: {
    onPointerDown(e: PointerEvent): void;
    onPointerUp(e: PointerEvent): void;
    onPointerCancel(e: PointerEvent): void;
  };
  /** 表示を指定タイムに固定（手入力や DNF 表示用） */
  showResult(text: string): void;
  cancel(): void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

function dialogOpen(): boolean {
  return !!document.querySelector('dialog[open]');
}

export function useTimer(opts: UseTimerOptions): TimerController {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const display = useSignal(formatMs(0, settings.value.precision));
  const inspectionText = useSignal('15');
  const inspectionLevel = useSignal(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const machine = useMemo(
    () =>
      new TimerMachine(
        { inspection: opts.inspection, holdMs: settings.value.holdMs },
        {
          onPhaseChange: (p) => {
            setPhase(p);
            if (p === 'ready' && settings.value.sound && settings.value.holdMs > 0) playSound('ready');
          },
          onStart: (penalty) => {
            if (settings.value.sound) playSound('start');
            optsRef.current.onStart?.(penalty);
          },
          onStop: (r) => {
            if (settings.value.sound) playSound('stop');
            display.value = formatMs(r.time, settings.value.precision);
            optsRef.current.onStop?.(r);
          },
          onInspectionAlert: (sec) => {
            const s = settings.value;
            if (s.inspectionAlert === 'voice') {
              const spoken = speak(s.lang === 'ja' ? `${sec}秒` : `${sec} seconds`, s.lang);
              if (!spoken && s.sound) playSound('alert');
            } else if (s.inspectionAlert === 'beep') {
              playSound('alert');
            }
          },
          onInspectionDnf: () => {
            display.value = 'DNF';
            optsRef.current.onInspectionDnf?.();
          },
        },
      ),
    // 状態機械は画面ごとに 1 つ。オプションは下で毎回同期する
    [],
  );

  // 設定変更を状態機械へ反映
  machine.options = { inspection: opts.inspection, holdMs: settings.value.holdMs };

  // 計測中・インスペクション中は rAF で表示を更新
  useEffect(() => {
    if (phase === 'idle' || phase === 'stopped') return;
    let id = 0;
    const loop = () => {
      const now = performance.now();
      machine.tick(now);
      const s = settings.value;
      if (machine.phase === 'running') {
        display.value = formatRunning(machine.elapsed(now), s.runningDisplay, s.precision);
      }
      const insp = machine.inspectionElapsed(now);
      if (insp !== null) {
        const remain = Math.ceil((INSPECTION_MS - insp) / 1000);
        inspectionText.value = remain > 0 ? String(remain) : '+2';
        inspectionLevel.value = insp >= INSPECTION_MS ? 3 : insp >= 12_000 ? 2 : insp >= 8_000 ? 1 : 0;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [phase, machine, display, inspectionText, inspectionLevel]);

  // 無効化された（ダイアログが開いた等）ら進行中の試技は中断する。
  // 放置すると裏で計測が続き、戻ってからの停止で離れていた時間まで記録されてしまう
  useEffect(() => {
    if (opts.enabled) return;
    if (machine.phase === 'idle' || machine.phase === 'stopped') return;
    machine.cancel();
    display.value = formatMs(0, settings.value.precision);
    optsRef.current.onCancel?.();
  }, [opts.enabled, machine, display]);

  // 長押し → READY の切り替えは rAF が間引かれても遅れないよう、タイマーでも確実に行う
  useEffect(() => {
    if (phase !== 'holding') return;
    const id = setTimeout(() => machine.tick(performance.now()), settings.value.holdMs + 5);
    return () => clearTimeout(id);
  }, [phase, machine]);

  // ready 表示になる前（待機中）は 0 に戻す
  useEffect(() => {
    if (phase === 'inspection') {
      inspectionText.value = '15';
      inspectionLevel.value = 0;
    }
    if (phase === 'ready' && machine.inspectionElapsed(performance.now()) === null) {
      display.value = formatMs(0, settings.value.precision);
    }
  }, [phase, machine, display, inspectionText, inspectionLevel]);

  // キーボード
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!optsRef.current.enabled || dialogOpen() || isTypingTarget(e.target)) return;
      if (e.repeat) {
        if (e.code === 'Space') e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        if (machine.phase !== 'idle' && machine.phase !== 'stopped') {
          e.preventDefault();
          machine.cancel();
          display.value = formatMs(0, settings.value.precision);
          optsRef.current.onCancel?.();
        }
        return;
      }
      if (machine.phase === 'running') {
        // 計測中はどのキーでも停止（修飾キー単独は除く）
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
        e.preventDefault();
        machine.press(performance.now());
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        unlockAudio();
        machine.press(performance.now());
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!optsRef.current.enabled || isTypingTarget(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        machine.release(performance.now());
      } else if (machine.phase === 'stopped') {
        machine.release(performance.now());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [machine, display]);

  // 画面が裏に回ったら長押し状態を解除（離すイベントを取りこぼすため）
  useEffect(() => {
    const onBlur = () => machine.abortHold();
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [machine]);

  // 計測中の画面スリープを防ぐ
  useEffect(() => {
    if (phase !== 'running' && phase !== 'inspection') return;
    let lock: WakeLockSentinel | null = null;
    let ended = false;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => {
        // 取得完了前に計測が終わっていたら即座に解放する
        if (ended) void l.release().catch(() => undefined);
        else lock = l;
      })
      .catch(() => undefined);
    return () => {
      ended = true;
      void lock?.release().catch(() => undefined);
    };
  }, [phase]);

  const pointerHandlers = useMemo(
    () => ({
      onPointerDown(e: PointerEvent) {
        if (!optsRef.current.enabled || e.button > 0) return;
        e.preventDefault();
        unlockAudio();
        machine.press(performance.now());
      },
      onPointerUp(e: PointerEvent) {
        if (!optsRef.current.enabled) return;
        e.preventDefault();
        machine.release(performance.now());
      },
      onPointerCancel() {
        machine.abortHold();
      },
    }),
    [machine],
  );

  return {
    phase,
    inInspection: machine.inspecting,
    display,
    inspectionText,
    inspectionLevel,
    pointerHandlers,
    showResult(text: string) {
      display.value = text;
    },
    cancel() {
      machine.cancel();
      display.value = formatMs(0, settings.value.precision);
    },
  };
}
