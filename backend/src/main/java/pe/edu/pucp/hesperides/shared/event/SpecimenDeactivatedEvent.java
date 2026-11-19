package pe.edu.pucp.hesperides.shared.event;

import java.time.Instant;

/**
 * Evento de dominio emitido cuando un ejemplar (árbol, arbusto, etc.) es dado de baja
 * lógicamente del inventario verde.
 *
 * Permite que módulos desacoplados como Intervenciones e Incidencias reaccionen
 * automáticamente dando por terminadas o canceladas las tareas pendientes asociadas
 * a este ejemplar con la justificación "RETIRADO".
 *
 * @param specimenId     Identificador único del ejemplar en green_elements
 * @param specimenCode   Código de inventario permanente del ejemplar (ej. AR-000001)
 * @param speciesId      Identificador de la especie botánica asociada (o null si no aplica)
 * @param reason         Motivo de la baja registrado por el usuario
 * @param deactivatedAt  Instante en el que se confirmó la baja lógica
 */
public record SpecimenDeactivatedEvent(
        Long specimenId,
        String specimenCode,
        Long speciesId,
        String reason,
        Instant deactivatedAt
) {
}
