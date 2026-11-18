package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesBinding;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Safely translates source-name selections stored by pre-unification previews. */
public final class SpecimenBindingKeyCompatibility {

    private SpecimenBindingKeyCompatibility() {
    }

    public static Map<String, String> recover(SpecimenPreview previous, List<SpecimenDraft> drafts,
                                              Map<String, String> requestedBindings) {
        if (requestedBindings == null || requestedBindings.isEmpty()) return Map.of();
        if (previous != null && Integer.valueOf(SpecimenPreview.CURRENT_BINDING_KEY_VERSION)
                .equals(previous.bindingKeyVersion())) {
            return requestedBindings;
        }

        Map<String, Integer> canonicalCounts = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> legacyGroups = new LinkedHashMap<>();
        for (SpecimenDraft draft : drafts) {
            if (draft.scientificName() == null || draft.scientificName().isBlank()) continue;
            String canonicalKey = SpeciesNameKey.key(draft.scientificName());
            canonicalCounts.merge(canonicalKey, 1, Integer::sum);
            String legacyKey = legacyPendingPreviewKey(draft.scientificName());
            legacyGroups.computeIfAbsent(legacyKey, ignored -> new LinkedHashMap<>())
                    .merge(canonicalKey, 1, Integer::sum);
        }

        Map<String, List<PreviousGroup>> previousGroups = previousGroups(previous);
        Map<String, String> recovered = new LinkedHashMap<>();
        requestedBindings.forEach((oldKey, slug) -> {
            List<PreviousGroup> groups = previousGroups.getOrDefault(oldKey, List.of());
            if (groups.size() == 1) {
                PreviousGroup group = groups.getFirst();
                String canonicalNameKey = SpeciesNameKey.key(group.sourceName());
                int canonicalCount = canonicalCounts.getOrDefault(canonicalNameKey, 0);

                // Unversioned previews produced by the already-deployed canonical-key
                // implementation are identifiable by their source key and row count.
                if (group.sourceKey().equals(canonicalNameKey) && canonicalCount == group.rows()
                        && canonicalCount > 0) {
                    merge(recovered, canonicalNameKey, slug);
                    return;
                }

                Map<String, Integer> candidates = legacyGroups.getOrDefault(group.sourceKey(), Map.of());
                int candidateRows = candidates.values().stream().mapToInt(Integer::intValue).sum();
                if (candidates.size() == 1 && candidateRows == group.rows()
                        && candidates.containsKey(canonicalNameKey)) {
                    merge(recovered, canonicalNameKey, slug);
                } else {
                    candidates.keySet().forEach(key -> merge(recovered, key, ""));
                }
                return;
            }

            // Without a unique group in the stored report, do not guess which source
            // group the selection described. Keep every possible group unresolved.
            Map<String, Integer> candidates = legacyGroups.getOrDefault(oldKey, Map.of());
            candidates.keySet().forEach(key -> merge(recovered, key, ""));
            String canonicalRequestKey = SpeciesNameKey.key(oldKey);
            if (candidates.isEmpty() && canonicalCounts.containsKey(canonicalRequestKey)) {
                merge(recovered, canonicalRequestKey, "");
            }
        });
        return Map.copyOf(recovered);
    }

    private static Map<String, List<PreviousGroup>> previousGroups(SpecimenPreview preview) {
        Map<String, List<PreviousGroup>> groups = new LinkedHashMap<>();
        if (preview == null) return groups;
        if (preview.speciesBindingSummary() != null) {
            for (SpeciesBinding binding : preview.speciesBindingSummary()) {
                if (binding != null && binding.sourceKey() != null && binding.sourceName() != null) {
                    add(groups, new PreviousGroup(binding.sourceKey(), binding.sourceName(), binding.rows()));
                }
            }
        }
        if (preview.unknownSpecies() != null) {
            for (SpeciesCount unknown : preview.unknownSpecies()) {
                if (unknown == null || unknown.name() == null) continue;
                String sourceName = unknown.name();
                String sourceKey = unknown.sourceKey() == null
                        ? legacyPendingPreviewKey(sourceName)
                        : unknown.sourceKey();
                add(groups, new PreviousGroup(sourceKey, sourceName, unknown.rows()));
            }
        }
        return groups;
    }

    private static void add(Map<String, List<PreviousGroup>> groups, PreviousGroup group) {
        List<PreviousGroup> existing = groups.computeIfAbsent(group.sourceKey(), ignored -> new ArrayList<>());
        if (!existing.contains(group)) existing.add(group);
    }

    private static void merge(Map<String, String> result, String key, String slug) {
        String current = result.putIfAbsent(key, slug);
        if (current != null && !current.equals(slug)) result.put(key, "");
    }

    /** Historical transform used only to decode keys stored in pending legacy reports. */
    private static String legacyPendingPreviewKey(String name) {
        if (name == null) return "";
        return name.trim()
                .replace('×', 'x')
                .replace('‘', '\'').replace('’', '\'')
                .replaceAll("\\s+", " ")
                .replaceAll("\\.$", "")
                .toLowerCase(java.util.Locale.ROOT);
    }

    private record PreviousGroup(String sourceKey, String sourceName, int rows) {
    }
}
