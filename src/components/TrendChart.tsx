import { useMemo, useState } from 'preact/hooks';
import { effectiveMs, formatAverage, formatMs, type Precision } from '../lib/time';
import { rollingAverages, type SolveLike } from '../lib/stats';

interface Props {
  solves: readonly SolveLike[];
  precision: Precision;
  /** 表示する最大件数 */
  limit?: number;
}

const W = 600;
const H = 220;
const PAD = { l: 44, r: 10, t: 12, b: 22 };

/** タイム推移（シングル・Ao5・Ao12）の SVG 折れ線グラフ */
export function TrendChart({ solves, precision, limit = 100 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    const values = solves.map((s) => effectiveMs(s.time, s.penalty));
    const ao5 = rollingAverages(values, 5);
    const ao12 = rollingAverages(values, 12);
    const start = Math.max(0, values.length - limit);
    return {
      offset: start,
      single: values.slice(start),
      ao5: ao5.slice(start),
      ao12: ao12.slice(start),
    };
  }, [solves, limit]);

  const finite = [...data.single, ...data.ao5, ...data.ao12].filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (data.single.length < 2 || finite.length < 2) {
    return null;
  }

  // 外れ値でグラフが潰れないよう、上限はおおむね 95 パーセンタイルに抑える
  const sorted = [...finite].sort((a, b) => a - b);
  const min = sorted[0]!;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  const max = Math.max(p95 * 1.05, min + 1000);
  const lo = Math.max(0, min - (max - min) * 0.08);

  const n = data.single.length;
  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (Math.min(v, max) - lo) / (max - lo)) * (H - PAD.t - PAD.b);

  const path = (arr: readonly (number | null)[]) => {
    let d = '';
    let pen = false;
    arr.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const ticks = 4;
  const gridValues = Array.from({ length: ticks + 1 }, (_, i) => lo + ((max - lo) * i) / ticks);
  const hv = hover !== null ? data.single[hover] : undefined;

  return (
    <div class="chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="trend"
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
          setHover(i >= 0 && i < n ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line class="chart__grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            <text class="chart__label" x={PAD.l - 6} y={y(v) + 4} text-anchor="end">
              {axisLabel(v, max - lo)}
            </text>
          </g>
        ))}
        <path class="chart__line chart__line--single" d={path(data.single)} />
        <path class="chart__line chart__line--ao5" d={path(data.ao5)} />
        <path class="chart__line chart__line--ao12" d={path(data.ao12)} />
        {data.single.map((v, i) =>
          Number.isFinite(v) ? (
            v > max ? null : <circle key={i} class="chart__dot" cx={x(i)} cy={y(v)} r={n > 60 ? 1.6 : 2.6} />
          ) : (
            <text key={i} class="chart__dnf" x={x(i)} y={PAD.t + 8} text-anchor="middle">
              ×
            </text>
          ),
        )}
        {hover !== null && <line class="chart__cursor" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} />}
      </svg>
      <div class="chart__legend">
        <span class="lg lg--single">Single</span>
        <span class="lg lg--ao5">Ao5</span>
        <span class="lg lg--ao12">Ao12</span>
        {hover !== null && hv !== undefined && (
          <span class="chart__readout">
            #{data.offset + hover + 1} {formatMs(hv, precision)} / Ao5 {formatAverage(data.ao5[hover] ?? null, precision)} / Ao12{' '}
            {formatAverage(data.ao12[hover] ?? null, precision)}
          </span>
        )}
      </div>
    </div>
  );
}

/** 目盛りの表示。範囲が狭いときは 1/10 秒まで出して同じ値が並ばないようにする */
function axisLabel(ms: number, span: number): string {
  const text = formatMs(ms, 2);
  return span < 5000 ? text.replace(/\d$/, '') : text.replace(/\.\d+$/, '');
}
