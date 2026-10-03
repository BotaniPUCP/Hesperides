package pe.edu.pucp.hesperides.engine.places;

/**
 * El nombre estándar de una perspectiva: «Frente de CIA», «Al lado de CIA ·
 * oeste, hacia Gelarti». Lo arma el sistema para que nadie lo escriba a mano y
 * el mismo sitio se llame siempre igual.
 */
public final class PerspectiveName {

    private PerspectiveName() {
    }

    /**
     * El rumbo y el hito solo se añaden a los lados: el frente y la espalda ya
     * son únicos en su lugar, y un nombre corto se lee mejor en un reporte.
     */
    public static String of(PerspectiveSide side, String placeName, String parentName, CompassPoint compass,
            String landmarkName) {
        if (placeName == null || placeName.isBlank()) {
            throw new IllegalArgumentException("Una perspectiva necesita el nombre de su lugar");
        }
        StringBuilder name = new StringBuilder(side.prefix()).append(' ').append(placeName.strip());
        if (parentName != null && !parentName.isBlank()) {
            name.append(" · ").append(parentName.strip());
        }
        if (side == PerspectiveSide.SIDE) {
            if (compass != null) {
                name.append(" · ").append(compass.label());
            }
            if (landmarkName != null && !landmarkName.isBlank()) {
                name.append(", hacia ").append(landmarkName.strip());
            }
        }
        return name.toString();
    }
}
