import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../i18n';
import { getEvent } from '../lib/events';
import { settings } from '../lib/settings';
import { formatAverage, formatMs, parseTimeInput, type Penalty } from '../lib/time';
import { playSound } from '../lib/sound';
import * as camera from '../lib/camera';
import {
  addSolve,
  attachVideo,
  currentEvent,
  currentSessionId,
  deleteSolve,
  refreshScramble,
  scramble,
  showToast,
  solves,
  stats,
  timing,
  updateSolve,
} from '../state';
import { CubePreview } from './CubePreview';
import { HistoryList } from './HistoryList';
import { ScrambleBar } from './ScrambleBar';
import { StatsPanel } from './StatsPanel';
import { useTimer } from './useTimer';
import { celebrate } from './Celebration';

/** タイムアタック（通常練習）画面 */
export function TimeAttack({ active }: { active: boolean }) {
  const T = t.value;
  const s = settings.value;
  const event = currentEvent.value;
  const inspection = s.inspection && getEvent(event).inspection;
  const usedScramble = useRef<string>('');
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const typing = s.inputMode === 'typing';

  const save = async (time: number, penalty: Penalty, scr: string) => {
    // 録画は停止した瞬間に止める（DB 保存を待つ間に次の計測が始まっても混ざらないように）
    const video = camera.stopRecording();
    setRecording(false);
    void refreshScramble();
    const result = await addSolve(time, penalty, scr);
    if (!result) return;
    announceRecords(result.records, result.solve.time, penalty);
    const blob = await video;
    if (blob) await attachVideo(result.solve.id, blob);
  };

  const timer = useTimer({
    enabled: active && !typing,
    inspection,
    onStart: () => {
      usedScramble.current = scramble.value ?? '';
      if (camera.currentStream() && camera.startRecording()) setRecording(true);
    },
    onStop: ({ time, penalty }) => void save(time, penalty, usedScramble.current),
    onInspectionDnf: () => {
      void save(0, 'dnf', scramble.value ?? '');
      showToast('error', T.timer.dnfInspection);
    },
    onCancel: () => {
      camera.discardRecording();
      setRecording(false);
    },
  });

  const phase = timer.phase;
  const isTiming = phase === 'inspection' || phase === 'running' || phase === 'holding' || phase === 'ready';

  useEffect(() => {
    timing.value = isTiming && phase !== 'holding';
    return () => {
      timing.value = false;
    };
  }, [isTiming, phase]);

  // セッション切替・精度変更時は待機中の表示を 0 に戻す（前のセッションのタイムを残さない）
  const sessionId = currentSessionId.value;
  useEffect(() => {
    if (phase === 'idle' || phase === 'stopped') timer.showResult(formatMs(0, s.precision));
  }, [sessionId, s.precision]);

  // ショートカット（待機中のみ）
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTiming || document.querySelector('dialog[open]')) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void refreshScramble();
        return;
      }
      if (!e.altKey) return;
      const last = solves.value[solves.value.length - 1];
      const map: Record<string, Penalty | 'delete'> = { Digit2: '+2', KeyD: 'dnf', KeyO: 'none', KeyZ: 'delete' };
      const action = map[e.code];
      if (!action) return;
      e.preventDefault();
      if (!last) {
        showToast('info', T.toast.noSolves);
        return;
      }
      if (action === 'delete') {
        if (window.confirm(T.history.deleteConfirm)) {
          void deleteSolve(last.id).then(() => showToast('info', T.toast.deleted));
        }
      } else {
        void updateSolve(last.id, { penalty: action });
        showToast('info', T.toast.penaltySet(action === 'none' ? 'OK' : action.toUpperCase()));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, isTiming, T]);

  // 画面を離れたらカメラを止める
  useEffect(() => {
    if (active) return;
    camera.stopCamera();
    setCameraOn(false);
    setRecording(false);
  }, [active]);
  useEffect(() => () => camera.stopCamera(), []);

  const toggleCamera = async () => {
    if (cameraOn) {
      camera.stopCamera();
      setCameraOn(false);
      setRecording(false);
      return;
    }
    try {
      await camera.startCamera();
      setCameraOn(true);
    } catch (e) {
      // 取得中に画面を離れた場合（AbortError）は通知しない
      if (!(e instanceof DOMException && e.name === 'AbortError')) showToast('error', T.timer.cameraError);
    }
  };

  // <video> が描画されてからストリームを接続する
  useEffect(() => {
    if (cameraOn && videoRef.current) videoRef.current.srcObject = camera.currentStream();
  }, [cameraOn]);

  const last = solves.value[solves.value.length - 1];
  const setLastPenalty = (p: Penalty) => last && void updateSolve(last.id, { penalty: p });

  const instruction = (() => {
    const touch = matchMedia('(pointer: coarse)').matches;
    switch (phase) {
      case 'holding':
        return T.timer.holding;
      case 'ready':
        return T.timer.ready;
      case 'inspection':
        return T.timer.inspection;
      case 'running':
        return T.timer.running;
      case 'stopped':
        return T.timer.stopped;
      default:
        return touch ? T.timer.idleTouch : T.timer.idle;
    }
  })();

  const st = stats.value;
  const ao5 = st.averages.find((a) => a.n === 5);
  const ao12 = st.averages.find((a) => a.n === 12);
  const focus = s.focusMode && timing.value;

  return (
    <div class={`time-attack${focus ? ' is-focus' : ''}`}>
      <aside class="ta-left">
        {s.scrambleView !== 'off' && (
          <section class="panel preview-panel">
            <header class="panel__header">
              <span class="panel__title">{T.scramble.preview}</span>
              {/^\d{3}/.test(event) && <span class="panel__hint">{T.scramble.holdHint}</span>}
            </header>
            <CubePreview event={event} scramble={scramble.value} visualization={s.scrambleView === '2D' ? '2D' : '3D'} />
          </section>
        )}
        <section class="panel camera-panel">
          <header class="panel__header">
            <span class="panel__title">{T.timer.camera}</span>
            {recording && <span class="rec-badge">● {T.timer.recording}</span>}
            {camera.cameraSupported() && (
              <button type="button" class={`chip-btn${cameraOn ? ' chip-btn--on' : ''}`} onClick={toggleCamera} aria-pressed={cameraOn}>
                {cameraOn ? T.timer.cameraOff : T.timer.cameraOn}
              </button>
            )}
          </header>
          {cameraOn ? <video ref={videoRef} class="camera-video" autoplay playsInline muted /> : <p class="panel__note">{T.timer.cameraNote}</p>}
        </section>
      </aside>

      <section class="ta-center">
        <ScrambleBar disabled={isTiming} />

        {typing ? (
          <TypingInput onSubmit={(time, penalty) => void save(time, penalty, scramble.value ?? '')} />
        ) : (
          <div
            class={`timer-area phase-${phase}`}
            {...timer.pointerHandlers}
            role="button"
            tabIndex={-1}
            aria-label={instruction}
          >
            {timer.inInspection ? (
              <div class={`inspection inspection--lv${timer.inspectionLevel.value}`} aria-live="off">
                {timer.inspectionText}
              </div>
            ) : (
              <div class="timer-display" aria-live="off">
                {timer.display}
              </div>
            )}
            <div class="timer-instruction">{instruction}</div>
            {(phase === 'inspection' || phase === 'running') && <div class="timer-esc">{T.timer.escHint}</div>}
          </div>
        )}

        <div class={`last-solve${last && !isTiming ? ' is-visible' : ''}`}>
          {last && (
            <>
              <span class="last-solve__label">{T.timer.lastSolve}</span>
              <div class="seg" role="group" aria-label={T.solve.penalty}>
                {(['none', '+2', 'dnf'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    class={`seg__btn${last.penalty === p ? ' is-active' : ''}`}
                    aria-pressed={last.penalty === p}
                    onClick={() => setLastPenalty(p)}
                  >
                    {p === 'none' ? T.penalty.ok : p === '+2' ? T.penalty.plus2 : T.penalty.dnf}
                  </button>
                ))}
              </div>
              <button
                type="button"
                class="chip-btn"
                onClick={() => {
                  const c = window.prompt(T.penalty.commentPrompt, last.comment ?? '');
                  if (c !== null) void updateSolve(last.id, { comment: c.slice(0, 500) });
                }}
              >
                💬
              </button>
              <button
                type="button"
                class="chip-btn chip-btn--danger"
                onClick={() => {
                  if (window.confirm(T.history.deleteConfirm)) void deleteSolve(last.id);
                }}
                aria-label={T.common.delete}
              >
                ✕
              </button>
            </>
          )}
        </div>

        <div class="quick-stats">
          <div>
            <span>{T.stats.best}</span>
            <b>{st.best === null ? '-' : formatMs(st.best, s.precision)}</b>
          </div>
          <div>
            <span>Ao5</span>
            <b>{formatAverage(ao5?.current ?? null, s.precision)}</b>
          </div>
          <div>
            <span>Ao12</span>
            <b>{formatAverage(ao12?.current ?? null, s.precision)}</b>
          </div>
          <div>
            <span>{T.stats.count}</span>
            <b>{st.count}</b>
          </div>
        </div>
      </section>

      <aside class="ta-right">
        <StatsPanel />
        <HistoryList />
      </aside>
    </div>
  );
}

function TypingInput({ onSubmit }: { onSubmit(time: number, penalty: Penalty): void }) {
  const T = t.value;
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  return (
    <form
      class="typing"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseTimeInput(value);
        if (!parsed) {
          setError(true);
          return;
        }
        setError(false);
        setValue('');
        onSubmit(parsed.time, parsed.penalty);
      }}
    >
      <input
        class="typing__input"
        inputMode="decimal"
        autoComplete="off"
        placeholder={T.timer.typingPlaceholder}
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        aria-invalid={error}
        aria-describedby="typing-help"
      />
      <p id="typing-help" class={`typing__help${error ? ' is-error' : ''}`}>
        {error ? T.timer.typingInvalid : T.timer.typingHelp}
      </p>
    </form>
  );
}

function announceRecords(records: string[], _time: number, penalty: Penalty) {
  const T = t.value;
  const s = settings.value;
  const total = solves.value.length;
  if (total === 1 && penalty !== 'dnf') {
    showToast('record', T.records.first, formatMs(stats.value.best ?? 0, s.precision));
    return;
  }
  if (records.length === 0) return;
  const st = stats.value;
  const parts = records.map((r) => {
    const name = T.records.names[r] ?? r;
    if (r === 'single') return `${name} ${formatMs(st.best ?? 0, s.precision)}`;
    const n = r === 'mo3' ? 3 : Number(r.slice(2));
    const avg = st.averages.find((a) => a.n === n);
    return `${name} ${formatAverage(avg?.best ?? null, s.precision)}`;
  });
  showToast('record', T.records.newRecord, parts.join(' / '), 4500);
  if (s.sound) playSound('record');
  if (s.celebrate) celebrate();
}
