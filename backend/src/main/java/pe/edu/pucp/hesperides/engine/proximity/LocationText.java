package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Texto de la descripción: «{sección} · {relación con el edificio}». Es lo que
 * se guarda en una incidencia, así que su forma no debe cambiar sin migrar el
 * histórico (SPEC-102 D-05).
 */
final class LocationText {

    static final String OUTSIDE_GREEN_AREAS = "Fuera de las áreas verdes";

    private LocationText() {
    }

    static String sectionOnly(SectionCandidate section) {
        return section == null ? OUTSIDE_GREEN_AREAS : section.name();
    }

    static String of(SectionCandidate section, String buildingName, BuildingRelation relation, double distanceM) {
        return sectionOnly(section) + " · " + buildingPart(buildingName, relation, distanceM);
    }

    private static String buildingPart(String name, BuildingRelation relation, double distanceM) {
        long metres = Math.round(distanceM);
        return switch (relation) {
            case INSIDE -> "dentro de " + name;
            case ADJACENT_TO_SECTION -> "junto a " + name + " (a " + metres + " m)";
            case NEAREST -> "cerca de " + name + " (a " + metres + " m)";
        };
    }
}
