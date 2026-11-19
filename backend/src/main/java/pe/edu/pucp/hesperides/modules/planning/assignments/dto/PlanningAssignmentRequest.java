package pe.edu.pucp.hesperides.modules.planning.assignments.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Asignar una frecuencia a un conjunto (SPEC-203 §3.4). La actividad sale de la
 * frecuencia; al cambiar una asignación, {@code setId} se ignora.
 */
public record PlanningAssignmentRequest(
        Long setId,
        @NotNull(message = "Elige la frecuencia") Long frequencyId) {
}
