package pe.edu.pucp.hesperides.modules.imports;

/** Reglas comunes a toda carga del catastro (SPEC-103). */
public final class ImportRules {

    /**
     * El límite del campus viene de OpenStreetMap y no es exacto: plantas reales
     * de la Pista de Salud caen hasta 10 m fuera. El chequeo busca coordenadas
     * erradas (invertidas o con un dígito de más), que caen mucho más lejos.
     */
    public static final double CAMPUS_MARGIN_M = 15.0;

    /** Una vista previa vieja ya no describe la base: se confirma dentro de la hora. */
    public static final long PREVIEW_MINUTES = 60;

    private ImportRules() {
    }
}
