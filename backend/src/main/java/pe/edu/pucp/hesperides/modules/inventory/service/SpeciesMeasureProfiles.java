package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Reglas de la criticidad y los promedios de una especie (SPEC-105 §5.1 y §5.2).
 * Solo ADMIN y COORDINADOR se apartan de la criticidad vigente o preseleccionada:
 * es una decisión de seguridad.
 */
@Component
@RequiredArgsConstructor
class SpeciesMeasureProfiles {

    private static final Set<String> CRITICAL_BY_DEFAULT = Set.of("TREE", "PALM");

    private final SpeciesCatalogs catalogs;

    record Profile(boolean critical, BigDecimal referenceHeightM, Long referenceHeightSourceId,
                   BigDecimal referenceCrownRadiusM, Long referenceCrownRadiusSourceId,
                   boolean usesTrunkHeight, boolean usesDbh) {
    }

    Profile forNew(SpeciesForm form, boolean manager) {
        boolean byDefault = CRITICAL_BY_DEFAULT.contains(form.vegetationTypeCode().trim());
        return build(form, resolve(form.critical(), byDefault, manager), true, true);
    }

    Profile forEdit(SpeciesForm form, boolean currentCritical, boolean currentTrunk, boolean currentDbh, boolean manager) {
        return build(form, resolve(form.critical(), currentCritical, manager), currentTrunk, currentDbh);
    }

    private static boolean resolve(Boolean requested, boolean baseline, boolean manager) {
        boolean critical = requested != null ? requested : baseline;
        if (critical != baseline && !manager) {
            throw new AccessDeniedException("Only ADMIN or COORDINADOR can change the criticality of a species");
        }
        return critical;
    }

    private Profile build(SpeciesForm form, boolean critical, boolean defaultTrunk, boolean defaultDbh) {
        requireSource(form.referenceHeightM(), form.referenceHeightSourceCode(), "altura promedio");
        requireSource(form.referenceCrownRadiusM(), form.referenceCrownRadiusSourceCode(), "radio de copa promedio");
        if (!critical && (form.referenceHeightM() == null || form.referenceCrownRadiusM() == null)) {
            throw new ValidationException("Una especie no crítica necesita altura y radio de copa promedio");
        }
        return new Profile(critical, form.referenceHeightM(), catalogs.referenceSource(form.referenceHeightSourceCode()),
                form.referenceCrownRadiusM(), catalogs.referenceSource(form.referenceCrownRadiusSourceCode()),
                form.usesTrunkHeight() != null ? form.usesTrunkHeight() : defaultTrunk,
                form.usesDbh() != null ? form.usesDbh() : defaultDbh);
    }

    private static void requireSource(BigDecimal value, String sourceCode, String label) {
        boolean hasSource = sourceCode != null && !sourceCode.isBlank();
        if ((value != null) != hasSource) {
            throw new ValidationException("Indica el valor y la fuente de: " + label);
        }
    }
}
