package pe.edu.pucp.hesperides.modules.imports.species;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Los valores válidos de las columnas de catálogo del estándar de especies
 * (tipo de vegetación, origen y fuente de valores promedio). Acepta código o
 * etiqueta sin importar mayúsculas ni tildes y devuelve siempre el código.
 */
public final class SpeciesVocabulary {

    public record Item(String code, String label) {
    }

    private final Map<String, Map<String, String>> byColumn = new HashMap<>();
    private final Map<String, List<Item>> items = new HashMap<>();

    public SpeciesVocabulary(List<Item> vegetationTypes, List<Item> origins, List<Item> referenceSources) {
        add("tipo_vegetacion", vegetationTypes);
        add("origen", origins);
        add("fuente_altura", referenceSources);
        add("fuente_radio_copa", referenceSources);
    }

    private void add(String column, List<Item> list) {
        Map<String, String> m = new HashMap<>();
        for (Item i : list) {
            m.put(key(i.code()), i.code());
            m.put(key(i.label()), i.code());
        }
        byColumn.put(column, m);
        items.put(column, list);
    }

    public Optional<String> resolve(String column, String value) {
        return Optional.ofNullable(byColumn.get(column).get(key(value)));
    }

    public String allowed(String column) {
        return String.join(", ", items.get(column).stream().map(Item::label).toList());
    }

    static String key(String text) {
        String plain = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return plain.replace('_', ' ').trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
