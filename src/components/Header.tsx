import { eventName, t } from '../i18n';
import { EVENTS, isEventId } from '../lib/events';
import { currentEvent, currentSessionId, dialog, selectSession, sessions, switchEvent, timing, view } from '../state';

/** タイムアタック画面のヘッダー（種目・セッション切替） */
export function Header() {
  const T = t.value;
  const ev = currentEvent.value;
  const sameEvent = sessions.value.filter((s) => s.event === ev);

  return (
    <header class={`app-header${timing.value ? ' is-dimmed' : ''}`}>
      <button type="button" class="logo" onClick={() => (view.value = 'title')} title={T.header.home}>
        <img class="logo__mark" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={26} height={26} />
        <span class="logo__text">CYBER CUBE</span>
      </button>

      <div class="app-header__controls">
        <label class="field">
          <span class="field__label">{T.header.event}</span>
          <select
            value={ev}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              if (isEventId(v)) void switchEvent(v, eventName(v));
              (e.target as HTMLSelectElement).blur();
            }}
          >
            {EVENTS.map((e) => (
              <option key={e.id} value={e.id}>
                {eventName(e.id)}
              </option>
            ))}
          </select>
        </label>

        <label class="field">
          <span class="field__label">{T.header.session}</span>
          <select
            value={String(currentSessionId.value ?? '')}
            onChange={(e) => {
              void selectSession(Number((e.target as HTMLSelectElement).value));
              (e.target as HTMLSelectElement).blur();
            }}
          >
            {sameEvent.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" class="icon-btn" onClick={() => (dialog.value = 'sessions')} title={T.header.manageSessions} aria-label={T.header.manageSessions}>
          ☰
        </button>
        <button type="button" class="icon-btn" onClick={() => (dialog.value = 'help')} title={T.header.help} aria-label={T.header.help}>
          ?
        </button>
        <button type="button" class="icon-btn" onClick={() => (dialog.value = 'settings')} title={T.header.settings} aria-label={T.header.settings}>
          ⚙
        </button>
      </div>
    </header>
  );
}
