package pe.edu.pucp.hesperides.modules.imports.repository;

import java.util.Locale;

/**
 * Cómo se compara un nombre científico escrito a mano con el del catálogo: sin
 * mayúsculas, espacios dobles, punto final ni comillas tipográficas. Son los
 * mismos descuidos que se limpiaron del catastro (README del inventario §3).
 */
public final class SpeciesNames {

    private SpeciesNames() {
    }

    public static String key(String name) {
        return name.trim()
                .replace('‘', '\'').replace('’', '\'')
                .replaceAll("\\s+", " ")
                .replaceAll("\\.$", "")
                .toLowerCase(Locale.ROOT);
    }
}
