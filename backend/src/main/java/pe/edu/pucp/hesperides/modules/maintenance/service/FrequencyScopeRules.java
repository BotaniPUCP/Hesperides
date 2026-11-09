package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.GreenAreaSetLookup;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

/** A qué se aplica una frecuencia: todo el campus o un conjunto (SPEC-203 D-07). */
final class FrequencyScopeRules {

    private static final String BY_SET = "BY_SET";

    private FrequencyScopeRules() {
    }

    /**
     * Quien deja de ser propia de un conjunto suelta el conjunto: si no, la
     * versión nueva heredaría un conjunto que ya no es su alcance.
     */
    static Long resolveSetId(UpdateMaintenanceFrequencyRequest r, MaintenanceFrequency current) {
        if (r.greenAreaSetId() != null) return r.greenAreaSetId();
        if (r.scope() != null && !BY_SET.equals(r.scope())) return null;
        return current.getGreenAreaSetId();
    }

    static void validate(String scope, Long setId, GreenAreaSetLookup setLookup) {
        if (BY_SET.equals(scope)) {
            if (setId == null) {
                throw new BusinessRuleException("Elige el conjunto al que se aplica esta frecuencia");
            }
            if (!setLookup.isActiveSet(setId)) {
                throw new BusinessRuleException("El conjunto no existe o fue dado de baja");
            }
        } else if (setId != null) {
            throw new BusinessRuleException("Solo una frecuencia propia de un conjunto lleva conjunto");
        }
    }

    static void requireNoCurrentDuplicate(MaintenanceFrequenciesRepository frequenciesRepository, Long activityId, String regime, String scope,
                                           Long setId, Long excludeId) {
        frequenciesRepository.findDuplicateCurrent(activityId, regime, scope, setId, excludeId)
                .ifPresent(f -> {
                    throw new DuplicateResourceException(
                            "Ya existe una frecuencia vigente para esta actividad, modalidad y ámbito");
                });
    }
}
