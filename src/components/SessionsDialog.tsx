import { useEffect, useState } from 'preact/hooks';
import { eventName, t } from '../i18n';
import { EVENTS, isEventId, type EventId } from '../lib/events';
import * as db from '../lib/db';
import { buildBackup, csvToSolves, downloadText, parseBackup } from '../lib/backup';
import {
  createSession,
  currentEvent,
  currentSessionId,
  deleteSession,
  dialog,
  reloadSessions,
  renameSession,
  selectSession,
  sessions,
  showToast,
  solves,
} from '../state';
import { Dialog } from './Dialog';

export function SessionsDialog() {
  const T = t.value;
  const S = T.sessions;
  const [name, setName] = useState('');
  const [event, setEvent] = useState<EventId>(currentEvent.value);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const open = dialog.value === 'sessions';

  // 開いたときに各セッションの件数を数える
  const loadCounts = async () => {
    const all = await db.listAllSolves();
    const c: Record<number, number> = {};
    for (const s of all) c[s.sessionId] = (c[s.sessionId] ?? 0) + 1;
    setCounts(c);
  };
  useEffect(() => {
    if (open) {
      setEvent(currentEvent.value);
      void loadCounts();
    }
  }, [open]);

  const close = () => {
    dialog.value = null;
  };

  const exportAll = async () => {
    const [allSessions, allSolves] = await Promise.all([db.listSessions(), db.listAllSolves()]);
    const json = JSON.stringify(buildBackup(allSessions, allSolves), null, 1);
    downloadText(`cyber-cube-timer_backup_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      let imported = 0;
      if (file.name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{')) {
        const parsed = parseBackup(text);
        for (const s of parsed.sessions) {
          const created = await db.createSession(s.name, s.event);
          const items = parsed.solves.filter((x) => x.oldSessionId === s.oldId).map(({ oldSessionId: _o, ...rest }) => ({ ...rest, sessionId: created.id }));
          await db.addSolves(items);
          imported += items.length;
        }
      } else {
        const sessionId = currentSessionId.value;
        if (sessionId === null) return;
        const items = csvToSolves(text).map((s) => ({ ...s, sessionId }));
        await db.addSolves(items);
        imported = items.length;
      }
      await reloadSessions();
      await loadCounts();
      showToast('info', S.imported(imported));
    } catch (e) {
      console.error(e);
      showToast('error', S.importFailed);
    }
  };

  return (
    <Dialog open={open} title={`☰ ${S.title}`} onClose={close} wide>
      <ul class="session-list">
        {sessions.value.map((s) => {
          const isCurrent = s.id === currentSessionId.value;
          return (
            <li key={s.id} class={isCurrent ? 'is-current' : ''}>
              <button
                type="button"
                class="session-list__main"
                onClick={() => {
                  void selectSession(s.id);
                  close();
                }}
              >
                <span class="session-list__name">{s.name}</span>
                <span class="session-list__meta">
                  {eventName(s.event)} · {S.solves(isCurrent ? solves.value.length : (counts[s.id] ?? 0))}
                  {isCurrent && <span class="badge">{S.current}</span>}
                </span>
              </button>
              <button
                type="button"
                class="icon-btn"
                aria-label={T.common.rename}
                title={T.common.rename}
                onClick={() => {
                  const next = window.prompt(T.common.rename, s.name);
                  if (next) void renameSession(s.id, next);
                }}
              >
                ✎
              </button>
              <button
                type="button"
                class="icon-btn icon-btn--danger"
                aria-label={T.common.delete}
                title={T.common.delete}
                onClick={() => {
                  if (window.confirm(S.deleteConfirm(s.name))) void deleteSession(s.id, eventName('333'));
                }}
              >
                🗑
              </button>
            </li>
          );
        })}
      </ul>

      <h3 class="dialog__section">{S.create}</h3>
      <form
        class="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void createSession(name || eventName(event), event).then(() => {
            setName('');
            close();
          });
        }}
      >
        <input value={name} placeholder={S.namePlaceholder} maxLength={60} onInput={(e) => setName((e.target as HTMLInputElement).value)} aria-label={S.namePlaceholder} />
        <select
          value={event}
          aria-label={T.header.event}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (isEventId(v)) setEvent(v);
          }}
        >
          {EVENTS.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {eventName(ev.id)}
            </option>
          ))}
        </select>
        <button type="submit" class="btn btn--primary">
          ＋
        </button>
      </form>

      <h3 class="dialog__section">{S.backup}</h3>
      <div class="button-row">
        <button type="button" class="btn" onClick={() => void exportAll()}>
          ⇩ {S.exportJson}
        </button>
        <label class="btn">
          ⇧ {S.importFile}
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              const file = input.files?.[0];
              if (file) void importFile(file);
              input.value = '';
            }}
          />
        </label>
      </div>
      <p class="dialog__note">{S.importNote}</p>
    </Dialog>
  );
}
