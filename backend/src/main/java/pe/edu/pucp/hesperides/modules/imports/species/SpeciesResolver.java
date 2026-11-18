package pe.edu.pucp.hesperides.modules.imports.species;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository.ExistingSpecies;
import pe.edu.pucp.hesperides.modules.imports.service.ImportPhotos;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview.PlannedRow;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Cruza los borradores de especies con el catálogo en base de datos:
 * determina si cada fila crea o actualiza una especie, valida las reglas
 * de criticidad y promedios (SPEC-105 §5.1) y comprueba las fotos del ZIP.
 */
@Component
@RequiredArgsConstructor
public class SpeciesResolver {

    private static final Set<String> CRITICAL_BY_DEFAULT = Set.of("TREE", "PALM");

    private final SpeciesImportRepository repository;

    public SpeciesPreview resolve(SpeciesCsvSchema.Parsed parsed, Set<String> zipFiles) {
        Map<String, ExistingSpecies> existingByKey = repository.existingByKey();
        Set<String> seenKeys = new HashSet<>();
        List<Issue> issues = new ArrayList<>(parsed.issues());
        List<PlannedRow> rows = new ArrayList<>();
        List<SpeciesPreview.SkippedInactiveSpecies> skippedInactiveSpecies = new ArrayList<>();

        for (SpeciesDraft d : parsed.drafts()) {
            String key = d.scientificName() != null ? SpeciesNameKey.key(d.scientificName()) : null;
            if (key != null && !seenKeys.add(key)) {
                issues.add(new Issue(d.line(), "nombre_cientifico",
                        "Species «" + d.scientificName() + "» is repeated in the file"));
                continue;
            }
            ExistingSpecies existing = key != null ? existingByKey.get(key) : null;
            if (existing != null && !existing.active()) {
                skippedInactiveSpecies.add(new SpeciesPreview.SkippedInactiveSpecies(d.line(), d.scientificName()));
                continue;
            }
            int before = issues.size();
            PhotoReference.check(d.line(), d.photo(), zipFiles).ifPresent(issues::add);

            PlannedRow planned = existing == null
                    ? planCreate(d, issues)
                    : planUpdate(d, existing, issues);

            if (d.valid() && issues.size() == before && planned != null) {
                rows.add(planned);
            }
        }
        return new SpeciesPreview(parsed.totalRows(), parsed.decimalComma(), rows, issues, skippedInactiveSpecies);
    }

    private PlannedRow planCreate(SpeciesDraft d, List<Issue> issues) {
        String typeCode = d.vegetationTypeCode();
        if (typeCode == null) {
            // Si la celda estaba vacía (no falló por valor desconocido en el esquema), se reporta aquí.
            if (issues.stream().noneMatch(i -> i.line() == d.line() && "tipo_vegetacion".equals(i.column()))) {
                issues.add(new Issue(d.line(), "tipo_vegetacion", "Required value is empty"));
            }
            boolean critical = d.critical() != null ? d.critical() : true;
            validateProfile(d.line(), critical, d.referenceHeightM(), d.referenceHeightSourceCode(),
                    d.referenceCrownRadiusM(), d.referenceCrownRadiusSourceCode(), issues);
            return null;
        }
        boolean defaultCritical = CRITICAL_BY_DEFAULT.contains(typeCode);
        boolean critical = d.critical() != null ? d.critical() : defaultCritical;
        boolean usesTrunk = d.usesTrunkHeight() != null ? d.usesTrunkHeight() : critical;
        boolean usesDbh = d.usesDbh() != null ? d.usesDbh() : critical;

        validateProfile(d.line(), critical, d.referenceHeightM(), d.referenceHeightSourceCode(),
                d.referenceCrownRadiusM(), d.referenceCrownRadiusSourceCode(), issues);

        return new PlannedRow(
                d, ImportAction.CREATE, null, null, null,
                null, null,
                null, null, null,
                typeCode, d.originCode(), critical,
                d.referenceHeightM(), d.referenceHeightSourceCode(),
                d.referenceCrownRadiusM(), d.referenceCrownRadiusSourceCode(),
                usesTrunk, usesDbh, false);
    }

    private PlannedRow planUpdate(SpeciesDraft d, ExistingSpecies existing, List<Issue> issues) {
        String typeCode = d.vegetationTypeCode() != null ? d.vegetationTypeCode() : existing.vegetationTypeCode();
        String originCode = d.originCode() != null ? d.originCode() : existing.originCode();
        boolean critical = d.critical() != null ? d.critical() : existing.critical();
        BigDecimal heightM = d.referenceHeightM() != null ? d.referenceHeightM() : existing.referenceHeightM();
        String heightSource = d.referenceHeightSourceCode() != null
                ? d.referenceHeightSourceCode()
                : existing.referenceHeightSourceCode();
        BigDecimal crownM = d.referenceCrownRadiusM() != null
                ? d.referenceCrownRadiusM()
                : existing.referenceCrownRadiusM();
        String crownSource = d.referenceCrownRadiusSourceCode() != null
                ? d.referenceCrownRadiusSourceCode()
                : existing.referenceCrownRadiusSourceCode();
        boolean usesTrunk = d.usesTrunkHeight() != null ? d.usesTrunkHeight() : existing.usesTrunkHeight();
        boolean usesDbh = d.usesDbh() != null ? d.usesDbh() : existing.usesDbh();

        validateProfile(d.line(), critical, heightM, heightSource, crownM, crownSource, issues);

        String link = ImportPhotos.sourceLink(d.photo());
        boolean skipPhoto = link != null && existing.photoSourceUrls().contains(link);

        return new PlannedRow(
                d, ImportAction.UPDATE, existing.id(), existing.slug(), existing.scientificName(),
                existing.active(), existing.dataFingerprint(),
                existing.critical(), existing.referenceHeightM(), existing.referenceCrownRadiusM(),
                typeCode, originCode, critical,
                heightM, heightSource, crownM, crownSource,
                usesTrunk, usesDbh, skipPhoto);
    }

    private static void validateProfile(
            int line,
            boolean critical,
            BigDecimal heightM,
            String heightSource,
            BigDecimal crownM,
            String crownSource,
            List<Issue> issues
    ) {
        if ((heightM != null) != (heightSource != null)) {
            String col = heightM == null ? "altura_promedio_m" : "fuente_altura";
            String message = heightM == null
                    ? "Indica la altura promedio"
                    : "Indica la fuente de la altura promedio";
            issues.add(new Issue(line, col, message));
        } else if (!critical && heightM == null) {
            issues.add(new Issue(line, "altura_promedio_m",
                    "Una especie no crítica necesita altura y radio de copa promedio"));
        }
        if ((crownM != null) != (crownSource != null)) {
            String col = crownM == null ? "radio_copa_promedio_m" : "fuente_radio_copa";
            String message = crownM == null
                    ? "Indica el radio de copa promedio"
                    : "Indica la fuente del radio de copa promedio";
            issues.add(new Issue(line, col, message));
        } else if (!critical && crownM == null) {
            issues.add(new Issue(line, "radio_copa_promedio_m",
                    "Una especie no crítica necesita altura y radio de copa promedio"));
        }
    }
}
