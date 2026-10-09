package pe.edu.pucp.hesperides.modules.imports.features;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Los valores válidos de las columnas con lista (residuos, tipo y estado de
 * bebedero), tomados de sus catálogos. Se acepta la etiqueta o el código, sin
 * importar mayúsculas ni tildes, y se guarda lo que ya guardan los datos
 * cargados: la etiqueta en los residuos, el código en el bebedero.
 */
public final class FeatureVocabulary {

    /** Un ítem de catálogo: código y etiqueta. */
    public record Item(String code, String label) {
    }

    private final Map<String, Map<String, String>> byColumn = new HashMap<>();
    private final Map<String, List<Item>> items = new HashMap<>();

    public FeatureVocabulary(List<Item> wasteStreams, List<Item> fountainKinds, List<Item> fountainStatuses) {
        add("residuos", wasteStreams, true);
        add("tipo", fountainKinds, false);
        add("estado", fountainStatuses, false);
    }

    private void add(String column, List<Item> list, boolean storeLabel) {
        Map<String, String> m = new HashMap<>();
        for (Item i : list) {
            String stored = storeLabel ? i.label() : i.code();
            m.put(key(i.code()), stored);
            m.put(key(i.label()), stored);
        }
        byColumn.put(column, m);
        items.put(column, list);
    }

    public boolean governs(String column) {
        return byColumn.containsKey(column);
    }

    public Optional<String> resolve(String column, String value) {
        return Optional.ofNullable(byColumn.get(column).get(key(value)));
    }

    /** Las etiquetas válidas, para decirlas en el mensaje de error. */
    public String allowed(String column) {
        return String.join(", ", items.get(column).stream().map(Item::label).toList());
    }

    static String key(String text) {
        String plain = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return plain.replace('_', ' ').trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
