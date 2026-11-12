/**
 * Color of a chart mark by the job it does (SPEC-202 §7.5): only token classes,
 * written out in full so Tailwind generates them and the dark theme needs no
 * code. Text never wears these colors: identity comes from the swatch next to it.
 */
export type ChartTone = 'brand' | 'info' | 'warning' | 'danger' | 'neutral';

export const FILL: Record<ChartTone, string> = {
  brand: 'fill-brand-600',
  info: 'fill-info-600',
  warning: 'fill-warning-600',
  danger: 'fill-action-danger',
  neutral: 'fill-neutral-400',
};

export const STROKE: Record<ChartTone, string> = {
  brand: 'stroke-brand-600',
  info: 'stroke-info-600',
  warning: 'stroke-warning-600',
  danger: 'stroke-action-danger',
  neutral: 'stroke-neutral-400',
};

export const SWATCH: Record<ChartTone, string> = {
  brand: 'bg-brand-600',
  info: 'bg-info-600',
  warning: 'bg-warning-600',
  danger: 'bg-action-danger',
  neutral: 'bg-neutral-400',
};

/**
 * Identity (categories without order), in a fixed order and never cycled. The
 * three hues passed the colorblind check; a fourth and later category folds into
 * a gray «Otros» instead of inventing a hue.
 */
export const CATEGORICAL: readonly ChartTone[] = ['brand', 'info', 'warning'];

export interface CategoryValue {
  key: string;
  label: string;
  value: number;
}

/** Keeps the first categories with their fixed hue and folds the rest into «Otros». */
export function categorical(rows: CategoryValue[], othersLabel: string) {
  const head = rows.slice(0, CATEGORICAL.length).map((row, index) => ({ ...row, tone: CATEGORICAL[index] }));
  const tail = rows.slice(CATEGORICAL.length);
  if (tail.length === 0) return head;
  const others = tail.reduce((sum, row) => sum + row.value, 0);
  return [...head, { key: 'others', label: othersLabel, value: others, tone: 'neutral' as ChartTone }];
}
