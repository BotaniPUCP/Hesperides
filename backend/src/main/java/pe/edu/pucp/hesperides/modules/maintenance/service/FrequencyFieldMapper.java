package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;

import java.time.LocalDate;

/**
 * Traslada los campos de un request a la entidad.
 *
 * <p>Son quince asignaciones sin ninguna decision: separarlas deja el servicio
 * mostrando lo que si decide — validar, detectar duplicados, versionar — en vez
 * de esconderlo entre setters.
 */
final class FrequencyFieldMapper {

    private FrequencyFieldMapper() {
    }

    static MaintenanceFrequency toNewEntity(CreateMaintenanceFrequencyRequest r,
                                            CatalogItem activity, CatalogItem ruleType) {
        MaintenanceFrequency f = new MaintenanceFrequency();
        f.setActivityTypeItem(activity);
        f.setFrequencyRuleTypeItem(ruleType);
        f.setRegime(r.regime());
        f.setScope(r.scope());
        f.setZoneId(r.zoneId());
        f.setTargetDaysInterval(r.targetDaysInterval());
        f.setMinDaysInterval(r.minDaysInterval());
        f.setMaxDaysInterval(r.maxDaysInterval());
        f.setAnnualTargetCount(r.annualTargetCount());
        f.setCoverageTargetDays(r.coverageTargetDays());
        f.setEstimatedDurationDays(r.estimatedDurationDays());
        f.setSeasonStartMonth(toShort(r.seasonStartMonth()));
        f.setSeasonEndMonth(toShort(r.seasonEndMonth()));
        f.setNotes(r.notes());
        f.setValidFrom(LocalDate.now());
        FrequencyVersioning.replaceSeasons(f, r.seasons());
        return f;
    }

    /** Los valores ya resueltos de una edicion, mezclados con lo que no cambia. */
    record ResolvedFields(
            CatalogItem ruleType,
            String regime,
            String scope,
            Long zoneId,
            Integer targetDays,
            Integer minDays,
            Integer maxDays,
            Integer annualCount,
            Integer coverageDays,
            Integer estimatedDuration,
            Integer windowStart,
            Integer windowEnd
    ) {
    }

    static void apply(MaintenanceFrequency target, ResolvedFields v) {
        target.setFrequencyRuleTypeItem(v.ruleType());
        target.setRegime(v.regime());
        target.setScope(v.scope());
        target.setZoneId(v.zoneId());
        target.setTargetDaysInterval(v.targetDays());
        target.setMinDaysInterval(v.minDays());
        target.setMaxDaysInterval(v.maxDays());
        target.setAnnualTargetCount(v.annualCount());
        target.setCoverageTargetDays(v.coverageDays());
        target.setEstimatedDurationDays(v.estimatedDuration());
        target.setSeasonStartMonth(toShort(v.windowStart()));
        target.setSeasonEndMonth(toShort(v.windowEnd()));
    }

    static Short toShort(Integer v) {
        return v == null ? null : v.shortValue();
    }

    static Integer toInt(Short v) {
        return v == null ? null : v.intValue();
    }
}
