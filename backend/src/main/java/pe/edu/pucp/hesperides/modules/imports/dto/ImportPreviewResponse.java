package pe.edu.pucp.hesperides.modules.imports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lo que la persona revisa antes de confirmar una carga (SPEC-103 §5.2).
 * Mientras {@code issues} tenga algo, {@code canConfirm} es falso.
 */
public record ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                    List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates,
                                    List<Issue> issues, boolean decimalComma, boolean canConfirm,
                                    LocalDateTime expiresAt, List<PhotoSet> photoSets,
                                     @JsonInclude(JsonInclude.Include.NON_EMPTY) List<SpeciesBinding> speciesBindings,
                                     @JsonInclude(JsonInclude.Include.NON_EMPTY) List<SpecimenSpeciesChange> speciesChanges,
                                     @JsonInclude(JsonInclude.Include.NON_NULL) String planFingerprint,
                                     @JsonInclude(JsonInclude.Include.NON_EMPTY) List<SkippedInactiveSpecies> skippedInactiveSpecies) {

    public ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                 List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates, List<Issue> issues,
                                 boolean decimalComma, boolean canConfirm, LocalDateTime expiresAt, List<PhotoSet> photoSets,
                                 List<SpeciesBinding> speciesBindings, List<SpecimenSpeciesChange> speciesChanges,
                                 String planFingerprint) {
        this(batchId, kind, totalRows, toCreate, toUpdate, unknownSpecies, duplicates, issues, decimalComma,
                canConfirm, expiresAt, photoSets, speciesBindings, speciesChanges, planFingerprint, List.of());
    }

    public ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                 List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates,
                                 List<Issue> issues, boolean decimalComma, boolean canConfirm,
                                 LocalDateTime expiresAt, List<PhotoSet> photoSets,
                                 List<SpeciesBinding> speciesBindings, List<SpecimenSpeciesChange> speciesChanges) {
        this(batchId, kind, totalRows, toCreate, toUpdate, unknownSpecies, duplicates, issues, decimalComma,
                canConfirm, expiresAt, photoSets, speciesBindings, speciesChanges, null, List.of());
    }

    public ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                 List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates,
                                 List<Issue> issues, boolean decimalComma, boolean canConfirm,
                                 LocalDateTime expiresAt, List<PhotoSet> photoSets,
                                 List<SpeciesBinding> speciesBindings) {
        this(batchId, kind, totalRows, toCreate, toUpdate, unknownSpecies, duplicates, issues,
                decimalComma, canConfirm, expiresAt, photoSets, speciesBindings, List.of(), null, List.of());
    }

    public ImportPreviewResponse(long batchId, String kind, int totalRows, int toCreate, int toUpdate,
                                 List<UnknownSpecies> unknownSpecies, List<Duplicate> duplicates,
                                 List<Issue> issues, boolean decimalComma, boolean canConfirm,
                                 LocalDateTime expiresAt, List<PhotoSet> photoSets) {
        this(batchId, kind, totalRows, toCreate, toUpdate, unknownSpecies, duplicates, issues,
                decimalComma, canConfirm, expiresAt, photoSets, List.of(), List.of(), null, List.of());
    }

    /**
     * Fotos de especie (SPEC-104 D-02): el archivo reemplaza el conjunto de cada
     * especie, y la persona ve cuántas tiene hoy y cuántas quedarán. Vacío en
     * los demás tipos de carga.
     */
    public record PhotoSet(String species, int current, int incoming) {
    }

    public record UnknownSpecies(String name, int rows,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String sourceKey,
                                @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {
        public UnknownSpecies(String name, int rows) {
            this(name, rows, null, null);
        }
    }

    /** How a source name in the specimen CSV will be linked in this preview batch. */
    public record SpeciesBinding(String sourceKey, String sourceName, int rows, String speciesSlug,
                                 String scientificName, boolean active, String resolution) {
    }

    /** Previous and planned species for an existing specimen whose association changes. */
    public record SpecimenSpeciesChange(String code, String previousScientificName, String nextScientificName) {
    }

    /** Exported inactive species are visible but deliberately not editable by CSV. */
    public record SkippedInactiveSpecies(int line, String scientificName) {
    }

    /**
     * Una fila nueva que podría ser algo ya registrado: hay que decidir si entra.
     * {@code label} es la especie o el lugar; {@code speciesSlug}, solo para ejemplares.
     */
    public record Duplicate(int line, String label, String speciesSlug, String duplicateOf, double distanceM) {
    }

    public record Issue(int line, String column, String message) {
    }
}
