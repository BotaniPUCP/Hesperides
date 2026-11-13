import type { DirectionIndicator, DirectionReport } from '@shared/types';
import { ProgressMeter } from '../charts/ProgressMeter';
import { ReportBadge, VariationBadge } from '../charts/ReportBadge';
import { formatCount, formatDelta, formatMonthName, formatPercent } from '../reportFormat';
import { DIRECTION_TEXTS, INDICATOR_TEXTS, TARGET_REASON_TEXTS, UNAVAILABLE_TEXTS } from './directionTexts';

function valueText(indicator: DirectionIndicator, value: number | null): string {
  if (value === null) return '—';
  return indicator.unit === 'PERCENT' ? formatPercent(value) ?? '—' : formatCount(value);
}

function Row({ indicator, previousMonth }: { indicator: DirectionIndicator; previousMonth: string }) {
  const texts = INDICATOR_TEXTS[indicator.code];
  if (!indicator.available) {
    return (
      <li className="grid gap-2 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
        <div>
          <p className="font-semibold text-neutral-900">{texts.label}</p>
          <p className="text-sm text-neutral-700">{texts.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportBadge kind="NO_DATA" />
          <span className="text-sm text-neutral-700">
            {indicator.unavailableReason ? UNAVAILABLE_TEXTS[indicator.unavailableReason] : null}
          </span>
        </div>
      </li>
    );
  }
  const month = formatMonthName(previousMonth);
  const variation = indicator.delta === null ? DIRECTION_TEXTS.noPrevious
    : DIRECTION_TEXTS.versus(formatDelta(indicator.delta, indicator.unit), indicator.unit, month);
  const target = indicator.target === null ? null : DIRECTION_TEXTS.target(valueText(indicator, indicator.target));
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
      <div>
        <p className="flex flex-wrap items-center gap-2 font-semibold text-neutral-900">
          {texts.label}{indicator.provisional && <ReportBadge kind="PROVISIONAL" />}
        </p>
        <p className="text-sm text-neutral-700">{texts.description}</p>
      </div>
      <div className="space-y-2">
        {indicator.progress !== null ? (
          <ProgressMeter label={target ?? texts.label} percent={indicator.progress}
            headline={valueText(indicator, indicator.value)}
            valueText={indicator.previousValue === null ? DIRECTION_TEXTS.noPrevious
              : DIRECTION_TEXTS.previous(valueText(indicator, indicator.previousValue), month)} />
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-neutral-700">
              {indicator.targetReason ? TARGET_REASON_TEXTS[indicator.targetReason] : null}
            </span>
            <span className="text-2xl font-semibold text-neutral-900">{valueText(indicator, indicator.value)}</span>
          </div>
        )}
        {indicator.trend === null
          ? <p className="text-sm text-neutral-700">{variation}</p>
          : <VariationBadge trend={indicator.trend} higherIsBetter={indicator.higherIsBetter} label={variation} />}
      </div>
    </li>
  );
}

/** One row per indicator: name, value, target, progress and variation (§7.1). */
export function IndicatorList({ report }: { report: DirectionReport }) {
  return (
    <section aria-labelledby="direction-indicators" className="space-y-2">
      <h3 id="direction-indicators" className="text-lg font-semibold text-neutral-900">{DIRECTION_TEXTS.indicatorsHeading}</h3>
      <ul className="divide-y divide-neutral-200">
        {report.indicators.map((indicator) => (
          <Row key={indicator.code} indicator={indicator} previousMonth={report.previousMonth} />
        ))}
      </ul>
    </section>
  );
}
