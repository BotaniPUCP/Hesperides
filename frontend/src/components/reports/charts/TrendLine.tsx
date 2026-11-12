'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatMonth, formatMonthShort, formatPercent } from '../reportFormat';
import { CHART_TEXTS } from '../reportTexts';

export interface TrendPoint {
  month: string;
  percent: number | null;
}

export interface TrendLineProps {
  title: string;
  points: TrendPoint[];
  target: number | null;
}

const W = 640;
const H = 240;
const PAD = { left: 44, right: 64, top: 18, bottom: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICKS = [0, 25, 50, 75, 100];

const x = (index: number, count: number) => PAD.left + (count === 1 ? PLOT_W / 2 : (index * PLOT_W) / (count - 1));
const y = (percent: number) => PAD.top + PLOT_H - (Math.min(Math.max(percent, 0), 100) / 100) * PLOT_H;

/** Consecutive recorded months; a month without records breaks the line (§3.6). */
function runs(points: TrendPoint[]): { index: number; percent: number }[][] {
  const result: { index: number; percent: number }[][] = [];
  let current: { index: number; percent: number }[] = [];
  points.forEach((point, index) => {
    if (point.percent === null) {
      if (current.length) result.push(current);
      current = [];
    } else current.push({ index, percent: point.percent });
  });
  if (current.length) result.push(current);
  return result;
}

/**
 * Coverage of the last months with the target as a dashed line (SPEC-202 §7.5).
 * A month without records is a gap, never a fall to 0 %. Only the last value is
 * labelled; the others are in the tooltip, the description and a hidden table.
 */
export function TrendLine({ title, points, target }: TrendLineProps) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const count = points.length;
  const lines = runs(points);
  const last = [...points].map((p, i) => ({ ...p, i })).reverse().find((p) => p.percent !== null);
  const valueOf = (p: TrendPoint) => formatPercent(p.percent) ?? CHART_TEXTS.noRecords;
  const description = points.map((p) => `${formatMonth(p.month)}: ${valueOf(p)}`).join('; ')
    + (target === null ? '' : `; ${CHART_TEXTS.target(formatPercent(target) ?? '')}`);
  const hovered = hover === null ? null : points[hover];

  return (
    <figure className="space-y-3">
      <figcaption className="text-lg font-semibold text-neutral-900">{title}</figcaption>
      <div className="relative">
        <svg role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full"
          onMouseLeave={() => setHover(null)}>
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{description}</desc>
          {TICKS.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} strokeWidth={1} className="stroke-neutral-200" />
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-neutral-500 text-[11px]">{tick} %</text>
            </g>
          ))}
          {points.map((p, i) => (
            <text key={p.month} x={x(i, count)} y={H - 10} textAnchor="middle"
              className={cn('text-[12px]', hover === i ? 'fill-neutral-900 font-semibold' : 'fill-neutral-600')}>
              {formatMonthShort(p.month)}
            </text>
          ))}
          {target !== null && (
            <g>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} strokeWidth={1.5} strokeDasharray="6 5"
                className="stroke-neutral-500" />
              <text x={W - PAD.right + 6} y={y(target) + 4} className="fill-neutral-700 text-[11px] font-medium">
                {CHART_TEXTS.targetShort}
              </text>
            </g>
          )}
          {lines.map((run) => (
            <g key={run[0].index}>
              {run.length > 1 && (
                <path className="fill-brand-600/10"
                  d={`M${x(run[0].index, count)},${y(0)} ${run.map((p) => `L${x(p.index, count)},${y(p.percent)}`).join(' ')} L${x(run[run.length - 1].index, count)},${y(0)}Z`} />
              )}
              <path fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-brand-600"
                d={run.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.index, count)},${y(p.percent)}`).join(' ')} />
            </g>
          ))}
          {hover !== null && (
            <line x1={x(hover, count)} x2={x(hover, count)} y1={PAD.top} y2={y(0)} strokeWidth={1} className="stroke-neutral-400" />
          )}
          {points.map((p, i) => p.percent !== null && (
            <circle key={p.month} cx={x(i, count)} cy={y(p.percent)} r={hover === i ? 6 : 4.5} strokeWidth={2}
              className="fill-brand-600 stroke-neutral-0" />
          ))}
          {last && last.percent !== null && (
            <text x={x(last.i, count) + 10} y={y(last.percent) - 10} className="fill-neutral-900 text-[14px] font-semibold">
              {formatPercent(last.percent)}
            </text>
          )}
          {points.map((p, i) => (
            <rect key={p.month} x={x(i, count) - PLOT_W / (2 * Math.max(count - 1, 1))} y={PAD.top}
              width={PLOT_W / Math.max(count - 1, 1)} height={PLOT_H} fill="transparent"
              onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {hovered && hover !== null && (
          <div aria-hidden="true" style={{ left: `${(x(hover, count) / W) * 100}%` }}
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm shadow-md">
            <p className="font-medium text-neutral-700">{formatMonth(hovered.month)}</p>
            <p className="font-semibold text-neutral-900">{valueOf(hovered)}</p>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th scope="col">{CHART_TEXTS.monthColumn}</th><th scope="col">{CHART_TEXTS.percentColumn}</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.month}><th scope="row">{formatMonth(p.month)}</th><td>{valueOf(p)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
