package pe.edu.pucp.hesperides.modules.imports.specimens;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateDetector;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateMatch;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpecimenSpecies;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesNameIndex;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpecimenSnapshot;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Cruza los borradores con la base (SPEC-103 D-04): especie, código, campus,
 * foto y duplicados. No escribe nada.
 */
@Component
@RequiredArgsConstructor
public class SpecimenResolver {

    private final SpecimenLookupRepository lookup;

    /** @param zipFiles nombres de archivo (en minúsculas) del ZIP de fotos; vacío si no se subió */
    public SpecimenPreview resolve(SpecimenCsvSchema.Parsed parsed, Set<String> zipFiles) {
        return resolve(parsed, zipFiles, Map.of());
    }

    /** Re-resolve a preview while preserving the user's per-source-name bindings. */
    public SpecimenPreview resolve(SpecimenCsvSchema.Parsed parsed, Set<String> zipFiles,
                                   Map<String, String> requestedBindings) {
        SpeciesNameIndex species = lookup.speciesNameIndexForSpecimens();
        Map<String, String> bindings = normalizeBindings(requestedBindings);
        Set<String> codes = lookup.existingCodes();
        Set<String> updateCodes = parsed.drafts().stream().map(SpecimenDraft::code).filter(code -> code != null)
                .collect(java.util.stream.Collectors.toSet());
        Map<String, SpecimenSnapshot> specimenSnapshots = lookup.specimenSnapshots(updateCodes);
        Set<String> seenCodes = new HashSet<>();
        List<Nearby> registered = new ArrayList<>(lookup.registeredPlants());
        List<Issue> issues = new ArrayList<>(parsed.issues());
        Map<String, UnknownGroup> unknown = new LinkedHashMap<>();
        Set<String> sourceKeys = new HashSet<>();
        List<PlannedRow> rows = new ArrayList<>();

        for (SpecimenDraft d : parsed.drafts()) {
            int before = issues.size();
            check(d, codes, seenCodes, zipFiles, issues);
            if (issues.size() > before) {
                continue;
            }

            String sourceKey = SpeciesNameKey.key(d.scientificName());
            sourceKeys.add(sourceKey);
            Resolution resolution = resolveSpecies(sourceKey, species, bindings);
            if (resolution.invalidBinding()) {
                issues.add(new Issue(d.line(), "nombre_cientifico", "The selected species is no longer available. Re-analyze the file"));
                continue;
            }
            SpecimenSpecies ref = resolution.species();
            if (ref == null) {
                UnknownGroup group = unknown.computeIfAbsent(sourceKey,
                        ignored -> new UnknownGroup(d.scientificName().trim(), resolution.reason()));
                group.rows++;
                continue;
            }
            ImportAction action = d.code() == null ? ImportAction.CREATE : ImportAction.UPDATE;
            SpecimenSnapshot specimenSnapshot = action == ImportAction.UPDATE ? specimenSnapshots.get(d.code()) : null;
            if (!ref.active() && (action == ImportAction.CREATE || specimenSnapshot == null
                    || !java.util.Objects.equals(specimenSnapshot.speciesId(), ref.id()))) {
                if (action == ImportAction.CREATE) {
                    UnknownGroup group = unknown.computeIfAbsent(sourceKey,
                            ignored -> new UnknownGroup(d.scientificName().trim(), "INACTIVE"));
                    group.rows++;
                } else {
                    issues.add(new Issue(d.line(), "nombre_cientifico",
                            "A new specimen relationship must use an active species"));
                }
                continue;
            }
            Optional<DuplicateMatch> dup = action == ImportAction.CREATE
                    ? DuplicateDetector.find(d.lat(), d.lon(), ref.slug(), ref.typeCode(), registered)
                    : Optional.empty();
            rows.add(new PlannedRow(d, action, ref.id(), ref.slug(), ref.scientificName(), ref.active(),
                    ref.typeCode(), ref.dataFingerprint(),
                    specimenSnapshot == null ? null : specimenSnapshot.dataFingerprint(),
                    resolution.matchedBy(),
                    specimenSnapshot == null ? null : specimenSnapshot.speciesId(),
                    specimenSnapshot == null ? null : specimenSnapshot.scientificName(),
                    dup.map(DuplicateMatch::code).orElse(null), dup.map(DuplicateMatch::distanceM).orElse(null)));
            if (action == ImportAction.UPDATE) {
                registered.removeIf(nearby -> d.code().equals(nearby.code()));
            }
            // Dos filas del mismo archivo también pueden ser la misma planta;
            // las actualizaciones sustituyen su posición actual para las filas siguientes.
            registered.add(new Nearby(d.code() == null ? "fila " + d.line() : d.code(),
                    ref.slug(), d.lat(), d.lon()));
        }

        bindings.keySet().stream().filter(key -> !sourceKeys.contains(key)).forEach(key ->
                issues.add(new Issue(1, "nombre_cientifico", "A species selection no longer matches a name in the file")));

        List<SpeciesCount> unknownSpecies = unknown.entrySet().stream()
                .map(e -> new SpeciesCount(e.getValue().name, e.getValue().rows, e.getKey(), e.getValue().reason))
                .toList();
        List<SpecimenPreview.SpeciesBinding> summaries = summarizeBindings(rows);
        return new SpecimenPreview(parsed.totalRows(), parsed.decimalComma(), rows, unknownSpecies, issues,
                bindings, summaries);
    }

    private static Map<String, String> normalizeBindings(Map<String, String> requested) {
        Map<String, String> normalized = new LinkedHashMap<>();
        if (requested == null) return normalized;
        requested.forEach((sourceName, slug) -> {
            if (sourceName == null || sourceName.isBlank()) return;
            String key = SpeciesNameKey.key(sourceName);
            String target = slug == null ? "" : slug.trim();
            String previous = normalized.putIfAbsent(key, target);
            if (previous != null && !previous.equals(target)) {
                throw new ValidationException("Conflicting species choices for the same CSV name");
            }
        });
        return normalized;
    }

    private static Resolution resolveSpecies(String key, SpeciesNameIndex index, Map<String, String> bindings) {
        if (bindings.containsKey(key)) {
            String slug = bindings.get(key);
            if (slug.isBlank()) return new Resolution(null, "USER_UNRESOLVED", "USER_SELECTED", false);
            SpecimenSpecies selected = index.bySlug().get(slug);
            return selected == null
                    ? new Resolution(null, "STALE_SELECTION", "USER_SELECTED", true)
                    : new Resolution(selected, null, "USER_SELECTED", false);
        }

        List<SpecimenSpecies> scientific = distinct(index.scientificNames().getOrDefault(key, List.of()));
        if (!scientific.isEmpty()) {
            if (scientific.size() == 1) {
                return new Resolution(scientific.get(0), null, "SCIENTIFIC_NAME", false);
            }
            return new Resolution(null, "AMBIGUOUS", "SCIENTIFIC_NAME", false);
        }

        List<SpecimenSpecies> alternatives = distinct(index.alternativeNames().getOrDefault(key, List.of()));
        if (alternatives.size() == 1) {
            return new Resolution(alternatives.get(0), null, "ALTERNATIVE_NAME", false);
        }
        if (!alternatives.isEmpty()) {
            return new Resolution(null, "AMBIGUOUS", "ALTERNATIVE_NAME", false);
        }
        return new Resolution(null, "NOT_FOUND", null, false);
    }

    private static List<SpecimenSpecies> distinct(List<SpecimenSpecies> species) {
        Map<Long, SpecimenSpecies> byId = new LinkedHashMap<>();
        species.forEach(s -> byId.putIfAbsent(s.id(), s));
        return List.copyOf(byId.values());
    }

    private static List<SpecimenPreview.SpeciesBinding> summarizeBindings(List<PlannedRow> rows) {
        Map<String, BindingAccumulator> groups = new LinkedHashMap<>();
        for (PlannedRow row : rows) {
            String key = SpeciesNameKey.key(row.draft().scientificName());
            BindingAccumulator group = groups.computeIfAbsent(key, ignored -> new BindingAccumulator(
                    row.draft().scientificName().trim(), row.speciesSlug(), row.speciesScientificName(),
                    row.speciesActive(), row.resolution()));
            group.rows++;
        }
        return groups.entrySet().stream()
                .map(e -> new SpecimenPreview.SpeciesBinding(e.getKey(), e.getValue().sourceName, e.getValue().rows,
                        e.getValue().slug, e.getValue().scientificName, e.getValue().active, e.getValue().resolution))
                .toList();
    }

    private record Resolution(SpecimenSpecies species, String reason, String matchedBy, boolean invalidBinding) {
    }

    private static final class UnknownGroup {
        private final String name;
        private final String reason;
        private int rows;

        private UnknownGroup(String name, String reason) {
            this.name = name;
            this.reason = reason;
        }
    }

    private static final class BindingAccumulator {
        private final String sourceName;
        private final String slug;
        private final String scientificName;
        private final boolean active;
        private final String resolution;
        private int rows;

        private BindingAccumulator(String sourceName, String slug, String scientificName, boolean active, String resolution) {
            this.sourceName = sourceName;
            this.slug = slug;
            this.scientificName = scientificName;
            this.active = active;
            this.resolution = resolution;
        }
    }

    /** Reject a confirmation when the nearby-plant set changed after the preview. */
    public void verifyDuplicatePlanCurrent(List<PlannedRow> rows) {
        List<Nearby> registered = new ArrayList<>(lookup.registeredPlants());
        for (PlannedRow row : rows) {
            SpecimenDraft draft = row.draft();
            if (row.action() == ImportAction.UPDATE) {
                registered.removeIf(nearby -> draft.code().equals(nearby.code()));
                registered.add(new Nearby(draft.code(), row.speciesSlug(), draft.lat(), draft.lon()));
                continue;
            }

            Optional<DuplicateMatch> current = DuplicateDetector.find(draft.lat(), draft.lon(), row.speciesSlug(),
                    row.speciesTypeCode(), registered);
            String currentCode = current.map(DuplicateMatch::code).orElse(null);
            boolean sameDistance = current.isEmpty() || row.duplicateDistanceM() != null
                    && Math.round(current.get().distanceM() * 100) == Math.round(row.duplicateDistanceM() * 100);
            if (!java.util.Objects.equals(currentCode, row.duplicateOf()) || !sameDistance) {
                throw new BusinessRuleException("Nearby plants changed after the preview. Re-analyze the file");
            }
            registered.add(new Nearby("fila " + row.line(), row.speciesSlug(), draft.lat(), draft.lon()));
        }
    }

    private void check(SpecimenDraft d, Set<String> codes, Set<String> seenCodes, Set<String> zipFiles, List<Issue> issues) {
        if (d.code() != null) {
            if (!codes.contains(d.code())) {
                issues.add(new Issue(d.line(), "codigo", "Code does not exist. Leave it empty to create a new specimen"));
            } else if (!seenCodes.add(d.code())) {
                issues.add(new Issue(d.line(), "codigo", "Code «" + d.code() + "» is repeated in the file"));
            }
        }
        if (!lookup.nearCampus(d.lat(), d.lon(), ImportRules.CAMPUS_MARGIN_M)) {
            issues.add(new Issue(d.line(), "latitud", "The point is outside the campus"));
        }
        if (d.measurement() != null && d.measurement().heightM() != null
                && d.measurement().trunkHeightM() != null
                && d.measurement().trunkHeightM() > d.measurement().heightM()) {
            issues.add(new Issue(d.line(), "altura_fuste_m", "Trunk height cannot exceed total height"));
        }
        PhotoReference.check(d.line(), d.photo(), zipFiles).ifPresent(issues::add);
    }
}
