import React from 'react';
import type { FrequencyRuleTypeCode } from '@shared/types';
import { Badge, type BadgeColor } from '@/components/ui/Badge';

interface Props {
  ruleCode: FrequencyRuleTypeCode;
  label?: string;
}

export function FrequencyRuleBadge({ ruleCode, label }: Props) {
  const getBadgeProps = (): { color: BadgeColor; text: string } => {
    switch (ruleCode) {
      case 'INTERVAL_DAYS':
        return { color: 'info', text: label || 'Intervalo por días' };
      case 'SEASONAL_PERIOD':
        return { color: 'success', text: label || 'Estacional' };
      case 'ANNUAL_WINDOW':
        return { color: 'warning', text: label || 'Ventana anual' };
      case 'COVERAGE_CYCLE':
        return { color: 'brand', text: label || 'Ciclo de cobertura' };
      case 'ON_DEMAND':
        return { color: 'neutral', text: label || 'A demanda' };
      default:
        return { color: 'neutral', text: label || ruleCode };
    }
  };

  const { color, text } = getBadgeProps();

  return <Badge color={color} label={text} />;
}

