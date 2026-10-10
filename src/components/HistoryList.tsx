import { useMemo, useState } from 'preact/hooks';
import { t } from '../i18n';
import { settings } from '../lib/settings';
import { effectiveMs, formatAverage, formatSolve } from '../lib/time';
import { rollingAverages } from '../lib/stats';
import { downloadText, solvesToCsv } from '../lib/backup';
import { clearCurrentSession, currentSession, openSolveId, solves } from '../state';

const PAGE = 50;

/** 記録一覧（新しい順） */
export function HistoryList() {
  const T = t.value;
  const p = settings.value.precision;
  const list = solves.value;
  const [limit, setLimit] = useState(PAGE);

  const ao5 = useMemo(() => rollingAverages(list.map((s) => effectiveMs(s.time, s.penalty)), 5), [list]);
  const best = useMemo(() => {
    const vals = list.map((s) => effectiveMs(s.time, s.penalty)).filter(Number.isFinite);
    return vals.length ? Math.min(...vals) : null;
  }, [list]);

  const exportCsv = () => {
    const name = (currentSession.value?.name ?? 'session').replace(/[\\/:*?"<>|]/g, '_');
    downloadText(`cyber-cube-timer_${name}_${new Date().toISOString().slice(0, 10)}.csv`, solvesToCsv(list), 'text/csv');
  };

  const clear = async () => {
    if (window.confirm(T.history.clearConfirm)) await clearCurrentSession();
  };

  const rows = [];
  for (let i = list.length - 1; i >= Math.max(0, list.length - limit); i--) {
    const s = list[i]!;
    const v = effectiveMs(s.time, s.penalty);
    rows.push(
      <li key={s.id}>
        <button type="button" class={`history__row${v === best ? ' is-pb' : ''}`} onClick={() => (openSolveId.value = s.id)}>
          <span class="history__no">{i + 1}</span>
          <span class={`history__time${s.penalty === 'dnf' ? ' is-dnf' : ''}`}>{formatSolve(s.time, s.penalty, p)}</span>
          <span class="history__ao">{formatAverage(ao5[i] ?? null, p)}</span>
          <span class="history__icons">
            {v === best && <span title="PB">🏆</span>}
            {s.hasVideo && <span title={T.history.video}>🎥</span>}
            {s.comment && <span title={s.comment}>💬</span>}
          </span>
        </button>
      </li>,
    );
  }

  return (
    <section class="panel history" aria-label={T.history.title}>
      <header class="panel__header">
        <span class="panel__title">{T.history.title}</span>
        <div class="panel__actions">
          <button type="button" class="icon-btn" onClick={exportCsv} disabled={!list.length} title={T.history.exportCsv} aria-label={T.history.exportCsv}>
            ⇩
          </button>
          <button type="button" class="icon-btn icon-btn--danger" onClick={clear} disabled={!list.length} title={T.history.clear} aria-label={T.history.clear}>
            🗑
          </button>
        </div>
      </header>
      {list.length === 0 ? (
        <div class="empty">
          <p>{T.history.empty}</p>
          <p class="empty__hint">{T.history.emptyHint}</p>
        </div>
      ) : (
        <>
          <div class="history__head" aria-hidden="true">
            <span>#</span>
            <span>Time</span>
            <span>Ao5</span>
            <span />
          </div>
          <ol class="history__list">{rows}</ol>
          {list.length > limit && (
            <button type="button" class="link-btn history__more" onClick={() => setLimit(limit + PAGE * 4)}>
              {T.history.showAll} ({list.length - limit})
            </button>
          )}
        </>
      )}
    </section>
  );
}
