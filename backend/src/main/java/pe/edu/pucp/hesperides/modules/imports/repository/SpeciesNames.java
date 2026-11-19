package pe.edu.pucp.hesperides.modules.imports.repository;

import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

/**
 * Compatibility facade. New matching code uses the shared punctuation-preserving key.
 */
@Deprecated
public final class SpeciesNames {

    private SpeciesNames() {
    }

    public static String key(String name) {
        return SpeciesNameKey.key(name);
    }
}
