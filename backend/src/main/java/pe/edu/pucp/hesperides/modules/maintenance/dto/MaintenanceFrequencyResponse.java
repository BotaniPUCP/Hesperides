package pe.edu.pucp.hesperides.modules.maintenance.dto;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequencySeason;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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
        Integer coverageTargetDays,
        Integer estimatedDurationDays,
        Integer seasonStartMonth,
        Integer seasonEndMonth,
        List<SeasonalIntervalPayload> seasons,
        String notes,
        LocalDate validFrom,
        LocalDate validTo,
        /** Falso en las versiones historicas. La UI las muestra atenuadas. */
        boolean current,
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
            return new ActivityTypeSummary(item.getId(), item.getCode(), item.getLabel(), parent);
        }
    }

    public record FrequencyRuleTypeSummary(
            Long id,
            String code,
            String label
    ) {
        public static FrequencyRuleTypeSummary from(CatalogItem item) {
            if (item == null) return null;
            return new FrequencyRuleTypeSummary(item.getId(), item.getCode(), item.getLabel());
        }
    }

    private static SeasonalIntervalPayload toPayload(MaintenanceFrequencySeason s) {
        return new SeasonalIntervalPayload(
                s.getSeason(),
                (int) s.getStartMonth(),
                (int) s.getEndMonth(),
                s.getMinDaysInterval(),
                s.getMaxDaysInterval(),
                s.getTargetDaysInterval());
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
                entity.getCoverageTargetDays(),
                entity.getEstimatedDurationDays(),
                entity.getSeasonStartMonth() == null ? null : entity.getSeasonStartMonth().intValue(),
                entity.getSeasonEndMonth() == null ? null : entity.getSeasonEndMonth().intValue(),
                entity.getSeasons().stream().map(MaintenanceFrequencyResponse::toPayload).toList(),
                entity.getNotes(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.isCurrent(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
