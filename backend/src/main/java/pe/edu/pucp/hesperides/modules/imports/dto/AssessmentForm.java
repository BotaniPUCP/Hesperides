package pe.edu.pucp.hesperides.modules.imports.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenDraft;

import java.time.LocalDate;

/** Una evaluación del formulario de campo (SPEC-103 §4.2). Nulo es «no se evaluó». */
public record AssessmentForm(@NotNull @PastOrPresent LocalDate date, Boolean hasDisease, Boolean hasPests,
                             Boolean hasMechanicalDamage, Boolean isLeaning, Boolean hasDeadBranches,
                             Boolean hasCavitiesOrRot, Boolean hasExposedRoots, Boolean interferesWithInfrastructure,
                             @Size(max = 200) String recommendedManagement, @Size(max = 2000) String observation) {

    public SpecimenDraft.Assessment toDraft() {
        return new SpecimenDraft.Assessment(date, hasDisease, hasPests, hasMechanicalDamage, isLeaning, hasDeadBranches,
                hasCavitiesOrRot, hasExposedRoots, interferesWithInfrastructure, blankToNull(recommendedManagement),
                blankToNull(observation));
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
