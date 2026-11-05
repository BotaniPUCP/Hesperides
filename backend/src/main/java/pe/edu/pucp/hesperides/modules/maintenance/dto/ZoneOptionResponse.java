package pe.edu.pucp.hesperides.modules.maintenance.dto;

/** Una sección del campus que una frecuencia puede tomar como ámbito, con su sector. */
public record ZoneOptionResponse(
        Long id,
        String code,
        String name,
        Long sectorId,
        String sectorName
) {
}
