package pe.edu.pucp.hesperides.modules.maintenance.dto;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;

import java.time.Instant;

public record MaintenanceFrequencyResponse(
        Long id,
        ActivityTypeSummary activityType,
        String regime,
        FrequencyRuleTypeSummary frequencyRuleType,
        String scope,
        Long zoneId,
        Integer targetDaysInterval,
        Integer minDaysInterval,
        Integer maxDaysInterval,
        Integer annualTargetCount,
        String seasonModifier,
        Integer coverageTargetDays,
        Integer estimatedDurationDays,
        String notes,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public record ActivityTypeSummary(
            Long id,
            String code,
            String label,
            String parentCode
    ) {
        public static ActivityTypeSummary from(CatalogItem item) {
            if (item == null) return null;
            String parent = item.getParentItem() != null ? item.getParentItem().getLabel() : null;
            return new ActivityTypeSummary(
                    item.getId(),
                    item.getCode(),
                    item.getLabel(),
                    parent
            );
        }
    }

    public record FrequencyRuleTypeSummary(
            Long id,
            String code,
            String label
    ) {
        public static FrequencyRuleTypeSummary from(CatalogItem item) {
            if (item == null) return null;
            return new FrequencyRuleTypeSummary(
                    item.getId(),
                    item.getCode(),
                    item.getLabel()
            );
        }
    }

    public static MaintenanceFrequencyResponse from(MaintenanceFrequency entity) {
        return new MaintenanceFrequencyResponse(
                entity.getId(),
                ActivityTypeSummary.from(entity.getActivityTypeItem()),
                entity.getRegime(),
                FrequencyRuleTypeSummary.from(entity.getFrequencyRuleTypeItem()),
                entity.getScope(),
                entity.getZoneId(),
                entity.getTargetDaysInterval(),
                entity.getMinDaysInterval(),
                entity.getMaxDaysInterval(),
                entity.getAnnualTargetCount(),
                entity.getSeasonModifier(),
                entity.getCoverageTargetDays(),
                entity.getEstimatedDurationDays(),
                entity.getNotes(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
