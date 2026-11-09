package pe.edu.pucp.hesperides.modules.inventory.dto;

/** Búsqueda, tipo de vegetación y página del catálogo de especies, ya validados. */
public record SpeciesQuery(String search, String vegetationType, int page, int size) {

    public static SpeciesQuery of(String search, String vegetationType, int page, int size) {
        SpecimenQuery.PageRequestCheck.check(page, size);
        return new SpeciesQuery(SpecimenQuery.blankToNull(search), SpecimenQuery.typeOrNull(vegetationType), page, size);
    }
}
