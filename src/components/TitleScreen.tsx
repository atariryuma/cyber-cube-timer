import { useEffect } from 'preact/hooks';
import { t } from '../i18n';
import { settings } from '../lib/settings';
import { playSound, unlockAudio } from '../lib/sound';
import { dialog, view, type View } from '../state';

function go(next: View) {
  unlockAudio();
  if (settings.value.sound) playSound('select');
  view.value = next;
}

/** タイトル画面 */
export function TitleScreen() {
  const T = t.value;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]') || e.repeat) return;
      // フォーカス中のボタンでの Enter はそのボタン自身に任せる
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        go('timer');
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        go('battle');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main class="title-screen">
      <div class="title-cubes" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div class="title-main">
        <h1 class="title-logo" data-text="CYBER CUBE">
          CYBER CUBE
        </h1>
        <p class="title-subtitle">{T.title.subtitle}</p>
        <p class="title-version">{T.title.version}</p>
      </div>

      <nav class="title-menu">
        <button type="button" class="mode-btn" onClick={() => go('timer')}>
          <span class="mode-btn__icon" aria-hidden="true">
            ⏱
          </span>
          <span class="mode-btn__text">
            <span class="mode-btn__title">{T.title.timeAttack}</span>
            <span class="mode-btn__desc">{T.title.timeAttackDesc}</span>
          </span>
        </button>
        <button type="button" class="mode-btn mode-btn--battle" onClick={() => go('battle')}>
          <span class="mode-btn__icon" aria-hidden="true">
            ⚔
          </span>
          <span class="mode-btn__text">
            <span class="mode-btn__title">{T.title.battle}</span>
            <span class="mode-btn__desc">{T.title.battleDesc}</span>
          </span>
        </button>
      </nav>

      <p class="title-keys hide-touch">{T.title.keys}</p>

      <footer class="title-footer">
        <div class="title-footer__links">
          <button type="button" class="link-btn" onClick={() => (dialog.value = 'settings')}>
            ⚙ {T.header.settings}
          </button>
          <button type="button" class="link-btn" onClick={() => (dialog.value = 'help')}>
            ? {T.header.help}
          </button>
        </div>
        <small>🔒 {T.title.footer}</small>
      </footer>
    </main>
  );
}
