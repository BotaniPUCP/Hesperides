export type FrequencyRuleTypeCode =
  | 'INTERVAL_DAYS'
  | 'SEASONAL_PERIOD'
  | 'ANNUAL_WINDOW'
  | 'COVERAGE_CYCLE'
  | 'ON_DEMAND';

export type MaintenanceRegime = 'IN_HOUSE' | 'OUTSOURCED';

export type MaintenanceScope = 'CAMPUS_WIDE' | 'BY_SECTOR' | 'BY_ZONE';

export interface ActivityTypeSummary {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

export interface FrequencyRuleTypeSummary {
  id: number;
  code: FrequencyRuleTypeCode;
  label: string;
}

export interface MaintenanceFrequency {
  id: number;
  activityType: ActivityTypeSummary;
  regime: MaintenanceRegime;
  frequencyRuleType: FrequencyRuleTypeSummary;
  scope: MaintenanceScope;
  zoneId: number | null;
  targetDaysInterval: number | null;
  minDaysInterval: number | null;
  maxDaysInterval: number | null;
  annualTargetCount: number | null;
  seasonModifier: string | null;
  coverageTargetDays: number | null;
  estimatedDurationDays: number | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceFrequencyRequest {
  activityTypeItemId: number;
  regime: MaintenanceRegime;
  frequencyRuleTypeCode: FrequencyRuleTypeCode;
  scope: MaintenanceScope;
  zoneId?: number | null;
  targetDaysInterval?: number | null;
  minDaysInterval?: number | null;
  maxDaysInterval?: number | null;
  annualTargetCount?: number | null;
  seasonModifier?: string | null;
  coverageTargetDays?: number | null;
  estimatedDurationDays?: number | null;
  notes?: string | null;
}

export interface UpdateMaintenanceFrequencyRequest {
  regime?: MaintenanceRegime;
  frequencyRuleTypeCode?: FrequencyRuleTypeCode;
  scope?: MaintenanceScope;
  zoneId?: number | null;
  targetDaysInterval?: number | null;
  minDaysInterval?: number | null;
  maxDaysInterval?: number | null;
  annualTargetCount?: number | null;
  seasonModifier?: string | null;
  coverageTargetDays?: number | null;
  estimatedDurationDays?: number | null;
  notes?: string | null;
  active?: boolean;
}
