import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { currentEvent, refreshScramble, scramble, scrambleError, setCustomScramble, showToast } from '../state';
import { Dialog } from './Dialog';
import { ScrambleGuide } from './ScrambleGuide';

interface Props {
  disabled?: boolean;
}

/** スクランブル文字列と操作ボタン */
export function ScrambleBar({ disabled }: Props) {
  const T = t.value;
  const text = scramble.value;
  const [guideOpen, setGuideOpen] = useState(false);

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('info', T.scramble.copied);
    } catch {
      // クリップボード非対応環境では何もしない
    }
  };

  const edit = () => {
    const input = window.prompt(T.scramble.editPrompt, text ?? '');
    if (input && input.trim()) setCustomScramble(input);
  };

  return (
    <section class="scramble-bar" aria-live="polite">
      <div class="scramble-bar__label">{T.scramble.label}</div>
      <div class={`scramble-bar__text${text && text.length > 120 ? ' scramble-bar__text--long' : ''}`}>
        {scrambleError.value ? (
          <span class="scramble-bar__error">
            {T.scramble.error}{' '}
            <button type="button" class="link-btn" onClick={() => void refreshScramble()}>
              {T.scramble.retry}
            </button>
          </span>
        ) : text === null ? (
          <span class="scramble-bar__loading">
            <span class="spinner" aria-hidden="true" /> {T.scramble.generating}
            <small>{T.scramble.firstTime}</small>
          </span>
        ) : (
          text
        )}
      </div>
      <div class="scramble-bar__actions">
        <button
          type="button"
          class="chip-btn chip-btn--guide"
          onClick={() => setGuideOpen(true)}
          disabled={!text || disabled}
          title={T.guide.open}
        >
          📖 <span class="hide-sm">{T.guide.open}</span>
        </button>
        <button type="button" class="chip-btn" onClick={copy} disabled={!text} title={T.scramble.copy}>
          ⧉ <span class="hide-sm">{T.scramble.copy}</span>
        </button>
        <button type="button" class="chip-btn" onClick={edit} disabled={disabled} title={T.scramble.edit}>
          ✎ <span class="hide-sm">{T.scramble.edit}</span>
        </button>
        <button
          type="button"
          class="chip-btn chip-btn--accent"
          onClick={() => void refreshScramble()}
          disabled={disabled}
          title={`${T.scramble.next} (N)`}
        >
          ↻ <span class="hide-sm">{T.scramble.next}</span>
        </button>
      </div>
      <Dialog open={guideOpen && !!text} title={`📖 ${T.guide.title}`} onClose={() => setGuideOpen(false)} wide>
        {text && <ScrambleGuide event={currentEvent.value} scramble={text} onDone={() => setGuideOpen(false)} />}
      </Dialog>
    </section>
  );
}
