package pe.edu.pucp.hesperides.modules.irrigation.service;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.time.LocalTime;
import java.util.List;
import java.util.HashSet;

/** Decisiones mínimas de integridad de D-01, sin decidir todavía cobertura D-02. */
public final class IrrigationTurnRules {
    private IrrigationTurnRules() {}

    public static void check(LocalTime startedAt, LocalTime finishedAt, List<Long> sectionIds) {
        if (startedAt != null && finishedAt != null && !finishedAt.isAfter(startedAt)) {
            throw new ValidationException("La hora de fin debe ser posterior a la de inicio");
        }
        if (sectionIds == null || sectionIds.isEmpty()) {
            throw new ValidationException("Selecciona al menos una sección regada");
        }
        if (sectionIds.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new ValidationException("Identificador de sección inválido");
        }
        if (new HashSet<>(sectionIds).size() != sectionIds.size()) {
            throw new ValidationException("No repitas secciones en un mismo turno");
        }
    }
}
