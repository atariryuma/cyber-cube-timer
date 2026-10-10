import { signal } from '@preact/signals';
import { toasts } from '../state';

const burst = signal(0);

/** 紙吹雪を出す（prefers-reduced-motion のときは CSS 側で無効化） */
export function celebrate(): void {
  burst.value++;
}

const COLORS = ['#00f5ff', '#ff2bd6', '#ffe84d', '#39ff88', '#7c5cff'];

export function Confetti() {
  const key = burst.value;
  if (key === 0) return null;
  return (
    <div class="confetti" key={key} aria-hidden="true">
      {Array.from({ length: 48 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 12) * 40}ms`,
            animationDuration: `${1400 + ((i * 53) % 900)}ms`,
            transform: `rotate(${(i * 47) % 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function Toasts() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast toast--${t.kind}`}>
          <div class="toast__title">
            {t.kind === 'record' ? '🏆 ' : ''}
            {t.title}
          </div>
          {t.body && <div class="toast__body">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
