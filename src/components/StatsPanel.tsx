import { t } from '../i18n';
import { settings } from '../lib/settings';
import { effectiveMs, formatAverage, formatMs } from '../lib/time';
import { dialog, solves, stats } from '../state';
import { TrendChart } from './TrendChart';

/** 右パネル: 主要統計とグラフ */
export function StatsPanel() {
  const T = t.value;
  const s = stats.value;
  const p = settings.value.precision;
  const avg = (n: number) => s.averages.find((a) => a.n === n);
  const last = solves.value[solves.value.length - 1];

  const rows: { label: string; current: string; best: string }[] = [
    { label: T.stats.single, current: last ? formatMs(effectiveMs(last.time, last.penalty), p) : '-', best: s.best === null ? '-' : formatMs(s.best, p) },
    ...[3, 5, 12, 50, 100].map((n) => {
      const a = avg(n);
      return {
        label: n === 3 ? 'Mo3' : `Ao${n}`,
        current: formatAverage(a?.current ?? null, p),
        best: formatAverage(a?.best ?? null, p),
      };
    }),
  ];

  return (
    <section class="panel stats-panel" aria-label={T.stats.title}>
      <header class="panel__header">
        <span class="panel__title">{T.stats.title}</span>
        <button type="button" class="chip-btn" onClick={() => (dialog.value = 'stats')}>
          {T.stats.more} →
        </button>
      </header>
      <table class="stats-table">
        <thead>
          <tr>
            <th />
            <th>{T.stats.current}</th>
            <th>{T.stats.bestAvg}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.current}</td>
              <td class="stats-table__best">{r.best}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="stats-summary">
        <span>
          {T.stats.count} <b>{s.count}</b>
        </span>
        <span>
          {T.stats.mean} <b>{formatAverage(s.mean, p)}</b>
        </span>
        <span>
          σ <b>{s.stdDev === null ? '-' : (s.stdDev / 1000).toFixed(2)}</b>
        </span>
      </div>
      <TrendChart solves={solves.value} precision={p} limit={100} />
    </section>
  );
}
