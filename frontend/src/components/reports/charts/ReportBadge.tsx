import { Badge, type BadgeColor } from '@/components/ui';
import { BADGE_TEXTS } from '../reportTexts';

export type ReportBadgeKind = keyof typeof BADGE_TEXTS;

/** SPEC-C01 §3.1 as amended by SPEC-202: neutral → amber → red, over the existing Badge. */
const COLORS: Record<ReportBadgeKind, BadgeColor> = {
  ON_TARGET: 'success',
  WITHIN_TOLERANCE: 'warning',
  OVERDUE: 'danger',
  NOT_APPLICABLE: 'neutral',
  NOT_EVALUABLE: 'neutral',
  NO_DATA: 'neutral',
  PROVISIONAL: 'info',
};

export interface ReportBadgeProps {
  kind: ReportBadgeKind;
  /** Overrides the default label, e.g. to add a count. */
  label?: string;
}

/** The color follows the code, never the label: a translated label keeps its color. */
export function ReportBadge({ kind, label }: ReportBadgeProps) {
  return <Badge label={label ?? BADGE_TEXTS[kind]} color={COLORS[kind]} />;
}
