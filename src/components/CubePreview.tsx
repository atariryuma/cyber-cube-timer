import { useEffect, useRef, useState } from 'preact/hooks';
import type { TwistyPlayer } from 'cubing/twisty';
import { getEvent, type EventId } from '../lib/events';
import { t } from '../i18n';

interface Props {
  event: EventId;
  scramble: string | null;
  visualization: '3D' | '2D';
  /** 再生コントロール（1手ずつ確認）を表示するか */
  controls?: boolean;
  class?: string;
}

let twistyModule: Promise<typeof import('cubing/twisty')> | null = null;
function loadTwisty() {
  twistyModule ??= import('cubing/twisty');
  return twistyModule;
}

/**
 * cubing.js の TwistyPlayer でスクランブル後の状態を表示する。
 * 全種目（NxN・ピラミンクス・メガミンクス・スクエア1・クロック等）に対応。
 */
export function CubePreview({ event, scramble, visualization, controls = true, class: cls }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<TwistyPlayer | null>(null);
  const [failed, setFailed] = useState(false);
  // 非同期読み込み完了時に最新のスクランブルを反映するため ref でも保持する
  const latest = useRef(scramble);
  latest.current = scramble;

  // プレイヤーの生成と破棄（種目・表示形式が変わったら作り直す）
  useEffect(() => {
    let disposed = false;
    loadTwisty()
      .then(({ TwistyPlayer }) => {
        if (disposed || !host.current) return;
        const p = new TwistyPlayer({
          puzzle: getEvent(event).puzzle as never,
          visualization,
          background: 'none',
          colorScheme: 'dark',
          controlPanel: controls ? 'bottom-row' : 'none',
          hintFacelets: 'none',
          experimentalSetupAnchor: 'start',
          tempoScale: 2,
        });
        p.classList.add('twisty');
        host.current.replaceChildren(p);
        player.current = p;
        if (latest.current) {
          p.alg = latest.current;
          p.jumpToEnd({ flash: false });
        }
      })
      .catch((e) => {
        console.error(e);
        setFailed(true);
      });
    return () => {
      disposed = true;
      player.current?.remove();
      player.current = null;
    };
    // scramble は下の effect で反映するため依存に含めない
  }, [event, visualization, controls]);

  // スクランブル変更時は完成形（最後の手まで進めた状態）を表示
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    p.alg = scramble ?? '';
    p.jumpToEnd({ flash: false });
  }, [scramble]);

  if (failed) return <div class={`cube-preview cube-preview--error ${cls ?? ''}`}>{t.value.scramble.error}</div>;
  return <div ref={host} class={`cube-preview ${cls ?? ''}`} aria-label={t.value.scramble.preview} role="img" />;
}
