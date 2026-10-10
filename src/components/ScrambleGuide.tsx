import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TwistyPlayer } from 'cubing/twisty';
import { t } from '../i18n';
import { getEvent, type EventId } from '../lib/events';
import { settings } from '../lib/settings';
import { describeMove, holdInstruction, splitScramble, FACE_COLORS, type CubeMove } from '../lib/notation';
import { CubePreview } from './CubePreview';

interface Props {
  event: EventId;
  scramble: string;
  /** 完了時の「準備 OK」。省略時はボタンを出さない */
  onDone?(): void;
  /** 「手順を使わず自分で混ぜる」。バトル用 */
  onSkip?(): void;
  /** バトル中の注意書きを出すか */
  battle?: boolean;
}

/**
 * スクランブル手順ガイド
 * 1 手ずつ「どの面を・どちらへ・どれだけ」回すかを言葉・色・矢印と 3D アニメーションで示し、
 * 最後に WCA 公式と同じく混ぜ終わりの展開図と見比べて確認させる。
 */
export function ScrambleGuide({ event, scramble, onDone, onSkip, battle }: Props) {
  const T = t.value;
  const G = T.guide;
  const lang = settings.value.lang;
  const tokens = useMemo(() => splitScramble(scramble), [scramble]);
  const n = tokens.length;
  // index = 適用済みの手数。tokens[index] がこれから回す手
  const [index, setIndex] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwistyPlayer | null>(null);
  const chips = useRef<HTMLOListElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  // 3D プレイヤー（ガイド専用。隠れた面も見えるヒント表示付き）
  useEffect(() => {
    let disposed = false;
    void import('cubing/twisty').then(({ TwistyPlayer }) => {
      if (disposed || !host.current) return;
      const p = new TwistyPlayer({
        puzzle: getEvent(event).puzzle as never,
        background: 'none',
        controlPanel: 'none',
        hintFacelets: 'floating',
        tempoScale: 1.2,
      });
      p.classList.add('twisty');
      host.current.replaceChildren(p);
      player.current = p;
      // 読み込みを待つ間に進められていても、その位置を表示する
      show(p, indexRef.current, false);
    });
    return () => {
      disposed = true;
      player.current?.remove();
      player.current = null;
    };
    // スクランブルが変わったらプレイヤーごと作り直す
  }, [event, scramble]);

  useEffect(() => setIndex(0), [scramble, event]);

  /** to 手目まで適用した状態を表示する。animate なら最後の 1 手を回して見せる */
  function show(p: TwistyPlayer, to: number, animate: boolean) {
    if (animate && to > 0) {
      p.experimentalSetupAlg = tokens.slice(0, to - 1).join(' ');
      p.alg = tokens[to - 1]!;
      p.jumpToStart({ flash: false });
      p.play();
    } else {
      p.alg = '';
      p.experimentalSetupAlg = tokens.slice(0, to).join(' ');
      p.jumpToEnd({ flash: false });
    }
  }

  const go = (to: number) => {
    const next = Math.max(0, Math.min(n, to));
    if (player.current) show(player.current, next, next === index + 1);
    setIndex(next);
  };

  // キーボード操作（← → Enter）。ボタンにフォーカスがあるときの Enter はボタンに任せる
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault();
        goRef.current(indexRef.current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goRef.current(indexRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 現在の手が見えるように記号の列をスクロール
  useEffect(() => {
    chips.current?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  const done = index >= n;
  const current = done ? null : describeMove(event, tokens[index]!, lang);

  return (
    <div class="guide">
      <p class="guide__hold">
        🧭 <b>{G.hold}:</b> {holdInstruction(event, lang)}
      </p>
      {battle && <p class="guide__note">⚔ {G.battleNote}</p>}

      <div class="guide__progress">
        <span>{G.step(Math.min(index + 1, n), n)}</span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${(index / Math.max(1, n)) * 100}%` }} />
        </div>
      </div>

      <ol class="guide__chips" ref={chips} aria-label={T.scramble.label}>
        {tokens.map((tok, i) => (
          <li key={i}>
            <button
              type="button"
              class={`guide__chip${i < index ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => go(i)}
            >
              {tok}
            </button>
          </li>
        ))}
      </ol>

      <div class="guide__main">
        <div class="guide__cube">
          <div ref={host} class="cube-preview guide__player" />
        </div>

        <div class="guide__side">
          {current ? (
            <div class="move-card" aria-live="polite">
              <div class="move-card__label">{G.nowTurn}</div>
              <div class="move-card__row">
                {current.move && <MoveIcon move={current.move} />}
                <span class="move-card__symbol">{tokens[index]}</span>
              </div>
              <p class="move-card__title">{current.title}</p>
              {current.hint && <p class="move-card__hint">👉 {current.hint}</p>}
            </div>
          ) : (
            <div class="move-card move-card--done" aria-live="polite">
              <div class="move-card__symbol">✅</div>
              <p class="move-card__title">{G.doneTitle}</p>
              <p class="move-card__hint">{G.doneBody}</p>
            </div>
          )}

          <div class="guide__nav">
            <button type="button" class="btn" onClick={() => go(0)} disabled={index === 0}>
              ⏮ {G.restart}
            </button>
            <button type="button" class="btn" onClick={() => go(index - 1)} disabled={index === 0}>
              ◀ {G.prev}
            </button>
            {done ? (
              onDone && (
                <button type="button" class="btn btn--primary guide__next" onClick={onDone} autoFocus>
                  {G.ready} ✔
                </button>
              )
            ) : (
              <button type="button" class="btn btn--primary guide__next" onClick={() => go(index + 1)} autoFocus>
                {G.next} ▶
              </button>
            )}
          </div>
          <p class="guide__keys hide-touch">{G.keys}</p>

          <figure class="guide__target">
            <figcaption>🎯 {G.target}</figcaption>
            <CubePreview event={event} scramble={scramble} visualization="2D" controls={false} class="guide__net" />
            <p class="dialog__note">{G.targetNote}</p>
          </figure>
        </div>
      </div>

      {onSkip && (
        <div class="guide__skip">
          <button type="button" class="link-btn" onClick={onSkip}>
            {G.skip}
          </button>
          <span>{G.skipNote}</span>
        </div>
      )}
    </div>
  );
}

/** 回す面の色と回転方向のアイコン */
function MoveIcon({ move }: { move: CubeMove }) {
  const color = FACE_COLORS[move.face];
  // 反時計回りは左右反転して表す
  const arrow = move.amount === -1 ? 'translate(64 0) scale(-1 1)' : undefined;
  return (
    <svg class="move-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="8" fill={color} stroke="#0b1024" stroke-width="3" />
      {/* 3x3 の線 */}
      <path d="M22.7 4v56M41.3 4v56M4 22.7h56M4 41.3h56" stroke="rgba(11,16,36,0.35)" stroke-width="2" />
      {/* 中心 (32,32)・半径 18 の円弧を真上から時計回りに 300° 描き、終点の接線方向に矢じりを付ける */}
      <g transform={arrow}>
        <path d="M32 14A18 18 0 1 1 16.4 23" fill="none" stroke="#0b1024" stroke-width="7" stroke-linecap="round" />
        <path d="M32 14A18 18 0 1 1 16.4 23" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" />
        <path d="M19.9 16.9L10.3 20.6L21.5 27.2Z" fill="#fff" stroke="#0b1024" stroke-width="2" stroke-linejoin="round" />
      </g>
      {move.amount === 2 && (
        <text x="32" y="38" text-anchor="middle" font-size="16" font-weight="900" fill="#0b1024" stroke="#fff" stroke-width="3" paint-order="stroke">
          180°
        </text>
      )}
      {move.layers > 1 && (
        <text x="56" y="60" text-anchor="end" font-size="14" font-weight="900" fill="#fff" stroke="#0b1024" stroke-width="3" paint-order="stroke">
          ×{move.layers}
        </text>
      )}
    </svg>
  );
}
