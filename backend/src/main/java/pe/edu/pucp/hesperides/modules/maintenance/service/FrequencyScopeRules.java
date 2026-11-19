package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;

import java.util.List;

/**
 * A qué se aplica una frecuencia (SPEC-203): todo el campus o conjuntos. Una
 * frecuencia para conjuntos no nombra ninguno: se asigna en Planificación.
 */
final class FrequencyScopeRules {

    private static final String CAMPUS_WIDE = "CAMPUS_WIDE";

    private FrequencyScopeRules() {
    }

    /** De todo el campus, una vigente por actividad y modalidad; para conjuntos puede haber varias. */
    static void requireNoCurrentDuplicate(MaintenanceFrequenciesRepository frequenciesRepository, Long activityId, String regime,
                                          String scope, Long excludeId) {
        if (!CAMPUS_WIDE.equals(scope)) return;
        frequenciesRepository.findDuplicateCampusWide(activityId, regime, excludeId)
                .ifPresent(f -> {
                    throw new DuplicateResourceException(
                            "Ya existe una frecuencia vigente de todo el campus para esta actividad y modalidad");
                });
    }

    /** Una regla tercerizada no planifica (D-10): si estaba asignada, sus tarjetas quedan sin frecuencia. */
    static List<String> regimeWarnings(String regime, int assignedSets) {
        if (!"OUTSOURCED".equals(regime) || assignedSets == 0) return List.of();
        String plannings = assignedSets == 1 ? "1 planificación" : assignedSets + " planificaciones";
        return List.of("Se usa en " + plannings + ": al ser tercerizada, quedan «Sin frecuencia configurada»");
    }
}
