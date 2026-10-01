package pe.edu.pucp.hesperides.modules.inventory.dto;

/** Búsqueda, tipo de vegetación y página del catálogo de especies, ya validados. */
public record SpeciesQuery(String search, String vegetationType, int page, int size) {

    /** «ALL» es lo que envía el filtro de la pantalla cuando no hay tipo elegido. */
    private static final String ALL_TYPES = "ALL";

    public static SpeciesQuery of(String search, String vegetationType, int page, int size) {
        SpecimenQuery.PageRequestCheck.check(page, size);
        String type = SpecimenQuery.blankToNull(vegetationType);
        return new SpeciesQuery(SpecimenQuery.blankToNull(search),
                ALL_TYPES.equalsIgnoreCase(type) ? null : type, page, size);
    }
}
