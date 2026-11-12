package pe.edu.pucp.hesperides.modules.incidents.service;

import java.text.Normalizer;
import java.util.Locale;

/** Conservative, provisional suggestions; never assigns risk or a geographic point. */
public final class IncidentSuggestions {
    private IncidentSuggestions() {}

    public static String typeCode(String description) {
        String text = Normalizer.normalize(description.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        if (text.matches("(?s).*\\b(no|sin|nunca|tampoco|retirada|retirado|resuelto|resuelta)\\b.*")) return null;
        if (text.matches("(?s).*\\bramas? caidas?\\b.*")) return "FALLEN_BRANCH";
        if (text.matches("(?s).*\\bfuga de agua\\b.*")) return "WATER_LEAK";
        if (text.matches("(?s).*\\bhojarasca\\b.*")) return "LEAF_LITTER";
        return null;
    }
}
