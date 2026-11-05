import { useId } from 'react';
import { CHART_TEXTS } from '../reportTexts';
import { formatPercent } from '../reportFormat';

export interface SectorBar {
  key: string;
  label: string;
  percent: number | null;
  /** Visible detail next to the percent, e.g. «1000 de 4000 m²». */
  detail: string;
}

export interface SectorBarsProps {
  title: string;
  rows: SectorBar[];
}

/** Each row is 56 px: the label on top and the bar below it, at any width (§7.3). */
const ROW = 56;
const BAR_Y = 34;
const BAR_HEIGHT = 14;

function percentText(row: SectorBar): string {
  return formatPercent(row.percent) ?? CHART_TEXTS.noData;
}

/**
 * Horizontal bars per sector (SPEC-202 D-17, §7.5). The SVG stretches to the
 * container through its viewBox, and only token classes paint it, so the dark
 * theme needs no code. The figures are always visible as text; a screen reader
 * gets them from the title, the generated description and a hidden table.
 */
export function SectorBars({ title, rows }: SectorBarsProps) {
  const id = useId();
  const height = rows.length * ROW;
  const description = rows.map((row) => `${row.label}: ${percentText(row)}, ${row.detail}`).join('. ');

  return (
    <figure className="space-y-2">
      <figcaption className="text-lg font-semibold text-neutral-900">{title}</figcaption>
      <div className="relative">
        <svg role="img" aria-labelledby={`${id}-title ${id}-desc`} viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none" width="100%" height={height} className="absolute inset-x-0 top-0">
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{description}</desc>
          {rows.map((row, index) => (
            <g key={row.key}>
              <rect x={0} y={index * ROW + BAR_Y} width={100} height={BAR_HEIGHT} className="fill-neutral-200" />
              <rect x={0} y={index * ROW + BAR_Y} height={BAR_HEIGHT} className="fill-brand-600"
                width={Math.min(Math.max(row.percent ?? 0, 0), 100)} />
            </g>
          ))}
        </svg>
        <ul aria-hidden="true" className="relative">
          {rows.map((row) => (
            <li key={row.key} className="flex h-14 items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-neutral-900">{row.label}</span>
              <span className="shrink-0 text-neutral-700">
                <span className="font-semibold text-neutral-900">{percentText(row)}</span> · {row.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{CHART_TEXTS.sectorColumn}</th>
            <th scope="col">{CHART_TEXTS.percentColumn}</th>
            <th scope="col">{CHART_TEXTS.detailColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{percentText(row)}</td>
              <td>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
