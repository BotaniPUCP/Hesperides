package pe.edu.pucp.hesperides.modules.inventory.dto;

/** Una ubicación de la fuente con cuántos ejemplares de la especie tiene. */
public record LocationCountResponse(String location, long count) {
}
