import { useMemo } from 'preact/hooks';
import { eventName, t } from '../i18n';
import { settings } from '../lib/settings';
import { effectiveMs, formatAverage, formatMs } from '../lib/time';
import { currentEvent, currentSession, dialog, solves, stats } from '../state';
import { Dialog } from './Dialog';
import { TrendChart } from './TrendChart';

/** 詳細統計（全平均・分布ヒストグラム） */
export function StatsDialog() {
  const T = t.value;
  const p = settings.value.precision;
  const s = stats.value;
  const open = dialog.value === 'stats';

  const histogram = useMemo(() => {
    const values = solves.value.map((x) => effectiveMs(x.time, x.penalty)).filter(Number.isFinite);
    if (values.length < 3) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const lo = sorted[0]!;
    const hi = sorted[Math.floor(sorted.length * 0.98)] ?? sorted[sorted.length - 1]!;
    const span = Math.max(hi - lo, 1000);
    // 見やすい区切り幅（0.25 / 0.5 / 1 / 2 / 5 / 10 秒…）を選ぶ
    const steps = [250, 500, 1000, 2000, 5000, 10000, 30000, 60000];
    const step = steps.find((st) => span / st <= 14) ?? 60000;
    const start = Math.floor(lo / step) * step;
    const buckets: { from: number; count: number }[] = [];
    for (let b = start; b <= hi; b += step) buckets.push({ from: b, count: 0 });
    for (const v of values) {
      const i = Math.min(buckets.length - 1, Math.floor((v - start) / step));
      buckets[i]!.count++;
    }
    return { buckets, step, max: Math.max(...buckets.map((b) => b.count)) };
  }, [solves.value]);

  return (
    <Dialog
      open={open}
      title={`📊 ${currentSession.value?.name ?? ''} — ${eventName(currentEvent.value)}`}
      onClose={() => (dialog.value = null)}
      wide
    >
      {s.count === 0 ? (
        <p class="empty">{T.stats.noData}</p>
      ) : (
        <>
          <div class="stat-cards">
            <Card label={T.stats.best} value={s.best === null ? '-' : formatMs(s.best, p)} accent />
            <Card label={T.stats.worst} value={s.worst === null ? '-' : formatMs(s.worst, p)} />
            <Card label={T.stats.mean} value={formatAverage(s.mean, p)} />
            <Card label={T.stats.stdDev} value={s.stdDev === null ? '-' : (s.stdDev / 1000).toFixed(2)} />
            <Card label={T.stats.count} value={`${s.solvedCount} / ${s.count}`} />
            <Card label={T.stats.dnfRate} value={`${((s.dnfCount / s.count) * 100).toFixed(1)}%`} />
          </div>

          <table class="stats-table stats-table--wide">
            <thead>
              <tr>
                <th />
                <th>{T.stats.current}</th>
                <th>{T.stats.bestAvg}</th>
              </tr>
            </thead>
            <tbody>
              {s.averages.map((a) => (
                <tr key={a.n}>
                  <th scope="row">{a.n === 3 ? 'Mo3' : `Ao${a.n}`}</th>
                  <td>{formatAverage(a.current, p)}</td>
                  <td class="stats-table__best">{formatAverage(a.best, p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="dialog__note">{T.stats.avgHelp}</p>

          <h3 class="dialog__section">{T.stats.trend}</h3>
          <TrendChart solves={solves.value} precision={p} limit={1000} />

          {histogram && (
            <>
              <h3 class="dialog__section">{T.stats.distribution}</h3>
              <div class="histogram">
                {histogram.buckets.map((b) => (
                  <div class="histogram__row" key={b.from}>
                    <span class="histogram__label">{formatMs(b.from, 2)}+</span>
                    <span class="histogram__bar" style={{ width: `${(b.count / histogram.max) * 100}%` }} />
                    <span class="histogram__count">{b.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div class={`stat-card${accent ? ' stat-card--accent' : ''}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
