package pe.edu.pucp.hesperides.modules.imports.dto;

import java.time.LocalDate;

/** Una evaluación del historial de un ejemplar; la primera de la lista es la vigente. */
public record AssessmentResponse(long id, LocalDate date, Boolean hasDisease, Boolean hasPests,
                                 Boolean hasMechanicalDamage, Boolean isLeaning, Boolean hasDeadBranches,
                                 Boolean hasCavitiesOrRot, Boolean hasExposedRoots,
                                 Boolean interferesWithInfrastructure, String recommendedManagement,
                                 String observation, String assessedBy) {
}
