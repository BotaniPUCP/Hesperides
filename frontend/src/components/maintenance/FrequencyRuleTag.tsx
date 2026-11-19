import type { FrequencyRuleTypeCode } from '@shared/types';

/** El color de cada tipo, como punto: acompaña al dato sin competir con él. */
const DOT: Record<FrequencyRuleTypeCode, string> = {
  INTERVAL_DAYS: 'bg-info-600',
  SEASONAL_PERIOD: 'bg-success-600',
  ANNUAL_WINDOW: 'bg-status-in-review-fg',
  COVERAGE_CYCLE: 'bg-brand-600',
  ON_DEMAND: 'bg-neutral-400',
};

/** El tipo de frecuencia en pequeño, bajo el «cada cuánto» de la tabla. */
export function FrequencyRuleTag({ ruleCode, label }: { ruleCode: FrequencyRuleTypeCode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[ruleCode] ?? 'bg-neutral-400'}`} />
      {label}
    </span>
  );
}
