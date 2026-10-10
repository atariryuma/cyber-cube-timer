import { useEffect, useRef, useState } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import type { TwistyPlayer } from 'cubing/twisty';
import { eventName, t } from '../i18n';
import { EVENTS, getEvent, isEventId, type EventId } from '../lib/events';
import { settings } from '../lib/settings';
import { effectiveMs, formatMs, formatSolve, type Penalty } from '../lib/time';
import { nextScramble } from '../lib/scramble';
import { playSound } from '../lib/sound';
import * as camera from '../lib/camera';
import {
  TIERS,
  applyOutcome,
  isUnlocked,
  judge,
  loadRecords,
  planCpuMoves,
  rollCpuTime,
  saveRecords,
  tierAverage,
  type BattleRecords,
  type Outcome,
  type Tier,
} from '../lib/battle';
import { dialog, timing, view } from '../state';
import { Dialog } from './Dialog';
import { ScrambleGuide } from './ScrambleGuide';
import { useTimer } from './useTimer';
import { celebrate } from './Celebration';

const EVENT_KEY = 'cct:battleEvent';

function loadBattleEvent(): EventId {
  try {
    const v = localStorage.getItem(EVENT_KEY);
    return isEventId(v) ? v : '333';
  } catch {
    return '333';
  }
}

interface MatchResult {
  outcome: Outcome;
  player: { time: number; penalty: Penalty } | null;
  cpuMs: number;
  unlocked: Tier | null;
}

/** バトルモード全体（相手選択 → 対戦 → 結果） */
export function Battle({ active }: { active: boolean }) {
  const [records, setRecords] = useState<BattleRecords>(loadRecords);
  const [event, setEvent] = useState<EventId>(loadBattleEvent);
  const [tierIndex, setTierIndex] = useState<number | null>(null);
  // 同じ相手との再戦でも対戦をやり直せるよう、対戦ごとに番号を振る
  const [matchNo, setMatchNo] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(EVENT_KEY, event);
    } catch {
      // 保存できなくても続行
    }
  }, [event]);

  useEffect(() => {
    if (!active) setTierIndex(null);
  }, [active]);

  const finish = (tier: Tier, outcome: Outcome, playerMs: number) => {
    const next = applyOutcome(records, tier.id, outcome, playerMs);
    setRecords(next);
    saveRecords(next);
    return next;
  };

  if (tierIndex === null) {
    return (
      <OpponentSelect
        records={records}
        event={event}
        onEvent={setEvent}
        onPick={(i) => {
          setTierIndex(i);
          setMatchNo((n) => n + 1);
        }}
      />
    );
  }

  return (
    <Race
      key={matchNo}
      active={active}
      tierIndex={tierIndex}
      event={event}
      records={records}
      onFinish={finish}
      onRematch={() => setMatchNo((n) => n + 1)}
      onNext={() => {
        setTierIndex(Math.min(TIERS.length - 1, tierIndex + 1));
        setMatchNo((n) => n + 1);
      }}
      onChange={() => setTierIndex(null)}
    />
  );
}

// ---------------------------------------------------------------- 相手選択

function OpponentSelect({
  records,
  event,
  onEvent,
  onPick,
}: {
  records: BattleRecords;
  event: EventId;
  onEvent(e: EventId): void;
  onPick(i: number): void;
}) {
  const T = t.value;
  const B = T.battle;
  const lang = settings.value.lang;
  const totals = Object.values(records).reduce((a, r) => ({ w: a.w + r.wins, l: a.l + r.losses, d: a.d + r.draws }), { w: 0, l: 0, d: 0 });
  const games = totals.w + totals.l + totals.d;

  return (
    <main class="battle-select">
      <header class="battle-select__header">
        <button type="button" class="chip-btn" onClick={() => (view.value = 'title')}>
          ◀ {B.menu}
        </button>
        <h1 class="battle-select__title">{B.title}</h1>
        <div class="battle-select__totals">
          {B.totals}: {B.record(totals.w, totals.l, totals.d)}
          {games > 0 && ` · ${B.winRate} ${Math.round((totals.w / games) * 100)}%`}
        </div>
      </header>

      <div class="battle-select__controls">
        <label class="field">
          <span class="field__label">{B.event}</span>
          <select
            value={event}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (isEventId(v)) onEvent(v);
            }}
          >
            {EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {eventName(ev.id)}
              </option>
            ))}
          </select>
        </label>
        <p class="battle-select__hint">{B.chooseOpponent}</p>
      </div>

      <ul class="tier-grid">
        {TIERS.map((tier, i) => {
          const rec = records[tier.id]!;
          const unlocked = isUnlocked(records, i);
          return (
            <li key={tier.id}>
              <button
                type="button"
                class={`tier-card${unlocked ? '' : ' is-locked'}${rec.wins > 0 ? ' is-cleared' : ''}`}
                style={{ '--tier-color': tier.color }}
                disabled={!unlocked}
                onClick={() => onPick(i)}
                aria-label={`${tier.name[lang]} ${unlocked ? '' : B.locked}`}
              >
                <span class="tier-card__rank">#{i + 1}</span>
                <span class="tier-card__icon" aria-hidden="true">
                  {unlocked ? tier.icon : '🔒'}
                </span>
                <span class="tier-card__name">{tier.name[lang]}</span>
                <span class="tier-card__title">{unlocked ? tier.title[lang] : B.locked}</span>
                <span class="tier-card__avg">
                  {B.avg} {formatMs(tierAverage(tier, event), 2)}
                </span>
                <span class="tier-card__record">{B.record(rec.wins, rec.losses, rec.draws)}</span>
                {rec.best !== null && (
                  <span class="tier-card__best">
                    {B.best} {formatMs(rec.best, 2)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" class="link-btn battle-select__settings" onClick={() => (dialog.value = 'settings')}>
        ⚙ {T.header.settings}
      </button>
    </main>
  );
}

// ---------------------------------------------------------------- 対戦

type RacePhase = 'loading' | 'waiting' | 'racing' | 'done';

function Race({
  active,
  tierIndex,
  event,
  records,
  onFinish,
  onRematch,
  onNext,
  onChange,
}: {
  active: boolean;
  tierIndex: number;
  event: EventId;
  records: BattleRecords;
  onFinish(tier: Tier, outcome: Outcome, playerMs: number): BattleRecords;
  onRematch(): void;
  onNext(): void;
  onChange(): void;
}) {
  const T = t.value;
  const B = T.battle;
  const lang = settings.value.lang;
  const tier = TIERS[tierIndex]!;
  const s = settings.value;
  const inspection = s.inspection && getEvent(event).inspection;

  const [phase, setPhase] = useState<RacePhase>('loading');
  const [scr, setScr] = useState<string | null>(null);
  const [scrError, setScrError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const cpuClock = useSignal('0.00');
  const cpuProgress = useSignal(0);
  const cpuTarget = useRef(0);
  const cpuStartAt = useRef<number | null>(null);
  const cpuDoneRef = useRef(false);
  const [cpuDone, setCpuDone] = useState(false);
  const cubeHost = useRef<HTMLDivElement>(null);
  const cpuPlayer = useRef<TwistyPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);

  // 対戦の準備: スクランブル生成・CPU タイム決定・CPU キューブ用意
  useEffect(() => {
    let cancelled = false;
    cpuTarget.current = rollCpuTime(tier, event);
    void (async () => {
      let scramble: string;
      try {
        scramble = await nextScramble(event);
      } catch (e) {
        console.error(e);
        if (!cancelled) setScrError(true);
        return;
      }
      if (cancelled) return;
      setScr(scramble);
      try {
        const [{ TwistyPlayer }, { Alg }] = await Promise.all([import('cubing/twisty'), import('cubing/alg')]);
        if (cancelled || !cubeHost.current) return;
        const alg = new Alg(scramble);
        const nodes = [...alg.childAlgNodes()].filter((n) => n.toString().trim() !== '');
        const solution = [...alg.invert().childAlgNodes()].map((n) => n.toString()).filter((x) => x.trim() !== '');
        const vocabulary = nodes.map((n) => ({ move: n.toString(), inverse: n.invert().toString() }));
        const moves = planCpuMoves(solution, vocabulary, cpuTarget.current, tier.tps);
        const p = new TwistyPlayer({
          puzzle: getEvent(event).puzzle as never,
          experimentalSetupAlg: scramble,
          alg: moves.join(' '),
          background: 'none',
          colorScheme: 'dark',
          controlPanel: 'none',
          hintFacelets: 'none',
        });
        p.classList.add('twisty');
        cubeHost.current.replaceChildren(p);
        cpuPlayer.current = p;
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) {
        setPhase('waiting');
        // 混ぜ方に慣れていなくても対戦できるよう、最初に手順ガイドを開く
        if (settings.value.battleGuide) setGuideOpen(true);
      }
    })();
    return () => {
      cancelled = true;
      cpuPlayer.current?.remove();
      cpuPlayer.current = null;
    };
  }, [tier, event]);

  const startCpu = () => {
    if (cpuStartAt.current !== null) return;
    cpuStartAt.current = performance.now();
    setPhase('racing');
    const p = cpuPlayer.current;
    if (p) {
      // アニメーション全体の長さが CPU のタイムに合うよう再生速度を調整する
      void (async () => {
        try {
          const model = (p as unknown as { experimentalModel: { timeRange: { get(): Promise<{ start: number; end: number }> } } }).experimentalModel;
          const range = await model.timeRange.get();
          p.tempoScale = Math.max(0.05, (range.end - range.start) / cpuTarget.current);
        } catch {
          p.tempoScale = 1;
        }
        if (!finished.current) p.play();
      })();
    }
  };

  // CPU の時計
  useEffect(() => {
    if (phase !== 'racing') return;
    let id = 0;
    const loop = () => {
      const start = cpuStartAt.current;
      if (start !== null) {
        const elapsed = performance.now() - start;
        const target = cpuTarget.current;
        if (elapsed >= target) {
          cpuClock.value = formatMs(target, 2);
          cpuProgress.value = 100;
          if (!cpuDoneRef.current) {
            cpuDoneRef.current = true;
            setCpuDone(true);
            cpuPlayer.current?.jumpToEnd({ flash: false });
          }
          return;
        }
        cpuClock.value = formatMs(elapsed, 2);
        cpuProgress.value = (elapsed / target) * 100;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [phase, cpuClock, cpuProgress]);

  const conclude = (player: { time: number; penalty: Penalty } | null) => {
    if (finished.current) return;
    finished.current = true;
    const cpuMs = cpuTarget.current;
    const playerMs = player ? effectiveMs(player.time, player.penalty) : Infinity;
    const outcome = judge(playerMs, cpuMs);
    const before = isUnlocked(records, tierIndex + 1);
    const next = onFinish(tier, outcome, playerMs);
    const nextTier = TIERS[tierIndex + 1];
    const unlocked = !before && nextTier && isUnlocked(next, tierIndex + 1) ? nextTier : null;
    cpuPlayer.current?.pause();
    cpuPlayer.current?.jumpToEnd({ flash: false });
    cpuClock.value = formatMs(cpuMs, 2);
    cpuProgress.value = 100;
    setPhase('done');
    setResult({ outcome, player, cpuMs, unlocked });
    if (s.sound) playSound(outcome === 'win' ? 'win' : outcome === 'lose' ? 'lose' : 'stop');
    if (outcome === 'win' && s.celebrate) celebrate();
  };

  const timer = useTimer({
    enabled: active && (phase === 'waiting' || phase === 'racing') && !finished.current,
    inspection,
    onStart: () => startCpu(),
    onStop: (r) => conclude(r),
    onInspectionDnf: () => conclude(null),
    onCancel: () => {
      // 計測開始後の中断はギブアップ扱い（CPU は既に走っている）
      if (cpuStartAt.current !== null) conclude(null);
    },
  });

  const tp = timer.phase;
  useEffect(() => {
    timing.value = tp === 'inspection' || tp === 'running' || tp === 'ready';
    return () => {
      timing.value = false;
    };
  }, [tp]);

  // 自分を映すカメラ（録画はしない）
  useEffect(() => {
    if (!cameraOn) return;
    let stopped = false;
    camera
      .startCamera()
      .then((stream) => {
        if (!stopped && videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraOn(false));
    return () => {
      stopped = true;
      camera.stopCamera();
    };
  }, [cameraOn]);

  const giveUp = () => {
    if (window.confirm(B.giveUpConfirm)) {
      timer.cancel();
      conclude(null);
    }
  };

  const rec = records[tier.id]!;
  const inRace = tp === 'inspection' || tp === 'running' || tp === 'holding' || tp === 'ready';
  const instruction =
    phase === 'loading'
      ? B.waiting
      : tp === 'inspection'
        ? T.timer.inspection
        : tp === 'running'
          ? T.timer.running
          : tp === 'ready'
            ? T.timer.ready
            : tp === 'holding'
              ? T.timer.holding
              : B.getReady;

  return (
    <main class={`race${s.focusMode && timing.value ? ' is-focus' : ''}`} style={{ '--tier-color': tier.color }}>
      <header class="race__bar">
        <button type="button" class="chip-btn" onClick={onChange} disabled={inRace}>
          ◀ {B.change}
        </button>
        <div class="race__vs">
          <span class="race__you">{B.you}</span>
          <span class="race__vs-mark">{B.vs}</span>
          <span class="race__cpu">
            {tier.icon} {tier.name[lang]}
          </span>
        </div>
        <div class="race__record">{B.record(rec.wins, rec.losses, rec.draws)}</div>
        {(tp === 'inspection' || tp === 'running') && phase !== 'done' ? (
          <button type="button" class="chip-btn chip-btn--danger" onClick={giveUp}>
            {B.giveUp}
          </button>
        ) : (
          <button type="button" class="chip-btn" onClick={() => (view.value = 'title')} disabled={inRace}>
            {B.menu}
          </button>
        )}
      </header>

      <section class="race__scramble">
        <div class="scramble-bar">
          <div class="scramble-bar__label">{T.scramble.label}</div>
          <div class={`scramble-bar__text${scr && scr.length > 120 ? ' scramble-bar__text--long' : ''}`}>
            {scrError ? (
              <span class="scramble-bar__error">
                {T.scramble.error}{' '}
                <button type="button" class="link-btn" onClick={onRematch}>
                  {T.scramble.retry}
                </button>
              </span>
            ) : (
              (scr ?? (
                <span class="scramble-bar__loading">
                  <span class="spinner" aria-hidden="true" /> {T.scramble.generating}
                </span>
              ))
            )}
          </div>
          <div class="scramble-bar__actions">
            <button
              type="button"
              class="chip-btn chip-btn--guide"
              onClick={() => setGuideOpen(true)}
              disabled={!scr || inRace || phase !== 'waiting'}
              title={T.guide.open}
            >
              📖 <span class="hide-sm">{T.guide.open}</span>
            </button>
          </div>
        </div>
        <Dialog open={guideOpen && !!scr && phase === 'waiting'} title={`📖 ${T.guide.title}`} onClose={() => setGuideOpen(false)} wide>
          {scr && <ScrambleGuide event={event} scramble={scr} battle onDone={() => setGuideOpen(false)} onSkip={() => setGuideOpen(false)} />}
        </Dialog>
      </section>

      <div class="race__arena">
        <section class="race__side race__side--player">
          <header class="race__side-header">
            <span>{B.you}</span>
            {camera.cameraSupported() && (
              <button type="button" class={`chip-btn${cameraOn ? ' chip-btn--on' : ''}`} onClick={() => setCameraOn(!cameraOn)} aria-pressed={cameraOn}>
                📷 {B.camera}
              </button>
            )}
          </header>
          {cameraOn && <video ref={videoRef} class="camera-video" autoplay playsInline muted />}
          <div class={`timer-area phase-${tp}`} {...timer.pointerHandlers} role="button" tabIndex={-1} aria-label={instruction}>
            {timer.inInspection ? (
              <div class={`inspection inspection--lv${timer.inspectionLevel.value}`}>{timer.inspectionText}</div>
            ) : (
              <div class="timer-display">{timer.display}</div>
            )}
            <div class="timer-instruction">{instruction}</div>
            {phase === 'waiting' && tp === 'idle' && <div class="timer-esc">{B.cpuStarts}</div>}
          </div>
        </section>

        <section class="race__side race__side--cpu">
          <header class="race__side-header">
            <span>
              {tier.icon} {tier.name[lang]}
            </span>
            <span class={`race__status${cpuDone ? ' is-done' : ''}`}>{cpuDone ? B.cpuDone : phase === 'racing' ? B.cpuSolving : ''}</span>
          </header>
          <div ref={cubeHost} class="cube-preview race__cube" />
          <div class="race__cpu-clock">{cpuClock}</div>
          <div class="progress" role="progressbar" aria-label={B.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cpuProgress.value)}>
            <span style={{ width: `${cpuProgress.value}%` }} />
          </div>
        </section>
      </div>

      <Dialog
        open={!!result}
        title={result ? (result.outcome === 'win' ? `🏆 ${B.win}` : result.outcome === 'lose' ? `💀 ${B.lose}` : `🤝 ${B.draw}`) : ''}
        onClose={onChange}
      >
        {result && (
          <div class={`result result--${result.outcome}`}>
            <div class="result__grid">
              <div>
                <span>{B.you}</span>
                <b>{result.player ? formatSolve(result.player.time, result.player.penalty, s.precision) : 'DNF'}</b>
              </div>
              <div>
                <span>
                  {tier.icon} {tier.name[lang]}
                </span>
                <b>{formatMs(result.cpuMs, s.precision)}</b>
              </div>
            </div>
            {result.player && result.player.penalty !== 'dnf' && (
              <p class="result__diff">
                {B.diff}: {diffText(effectiveMs(result.player.time, result.player.penalty) - result.cpuMs, s.precision)}
              </p>
            )}
            {result.unlocked && <p class="result__unlock">{B.unlocked(result.unlocked.name[lang])}</p>}
            <p class="result__overall">
              {B.overall}: {B.record(records[tier.id]!.wins, records[tier.id]!.losses, records[tier.id]!.draws)}
            </p>
            <div class="button-row">
              <button type="button" class="btn btn--primary" onClick={onRematch} autoFocus>
                ↻ {B.rematch}
              </button>
              {tierIndex < TIERS.length - 1 && isUnlocked(records, tierIndex + 1) && (
                <button type="button" class="btn btn--accent" onClick={onNext}>
                  {B.next} ▶
                </button>
              )}
              <button type="button" class="btn" onClick={onChange}>
                {B.change}
              </button>
              <button type="button" class="btn" onClick={() => (view.value = 'title')}>
                {B.menu}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}

function diffText(ms: number, precision: 2 | 3): string {
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : '±';
  return `${sign}${formatMs(Math.abs(ms), precision)}`;
}
