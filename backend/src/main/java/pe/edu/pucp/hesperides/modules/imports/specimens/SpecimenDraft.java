package pe.edu.pucp.hesperides.modules.imports.specimens;

import java.time.LocalDate;

/**
 * Un ejemplar leído del CSV o del formulario, ya validado en su formato. Lo que
 * depende de la base (especie, código, campus, duplicados, foto) se resuelve
 * después, en la vista previa.
 */
public record SpecimenDraft(int line, String code, String scientificName, double lat, double lon, int quantity,
                            String sourceReference, String legacyCode, String sourceLocation,
                            Measurement measurement, Assessment assessment, String photo, String notes) {

    /** Una medición: la fecha decide cuál es la vigente. */
    public record Measurement(LocalDate date, Double heightM, Double trunkHeightM, Double dbhCm, Double crownRadiusM,
                              Boolean banded) {
    }

    /** Una evaluación (SPEC-103 D-06). Nulo en cada campo es «no se evaluó». */
    public record Assessment(LocalDate date, Boolean hasDisease, Boolean hasPests, Boolean hasMechanicalDamage,
                             Boolean isLeaning, Boolean hasDeadBranches, Boolean hasCavitiesOrRot,
                             Boolean hasExposedRoots, Boolean interferesWithInfrastructure,
                             String recommendedManagement, String observation) {
    }
}
