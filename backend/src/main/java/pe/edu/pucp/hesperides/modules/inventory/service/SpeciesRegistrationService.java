package pe.edu.pucp.hesperides.modules.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.imports.dto.UploadedPhoto;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesForm;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesResponse;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

/**
 * Registro de especies botánicas en el catálogo del inventario verde.
 */
@Service
@RequiredArgsConstructor
public class SpeciesRegistrationService {

    private final JdbcTemplate jdbc;
    private final GreenInventoryService inventoryService;
    private final InventoryPhotoService photoService;
    private final AuditService auditService;
    private final SpeciesCatalogs catalogs;
    private final SpeciesMeasureProfiles profiles;
    private final SpeciesExtraMeasures extraMeasures;
    private final SpeciesSlugAllocator slugAllocator;

    public static void validateScientificName(String scientificName) {
        ScientificNameNormalizer.validate(scientificName);
    }

    /** NFC, espacios canónicos, capitalización y validación de formato científico. */
    public static String normalizeScientificName(String input) {
        return ScientificNameNormalizer.normalize(input);
    }

    @Transactional
    public SpeciesResponse register(SpeciesForm form, UploadedPhoto photo, String userEmail, boolean manager) {
        String scientificName = normalizeScientificName(form.scientificName());

        // Verificar unicidad de nombre científico activo
        String nameKey = SpeciesNameKey.key(scientificName);
        boolean exists = jdbc.queryForList(
                        "SELECT scientific_name FROM species WHERE deleted_at IS NULL", String.class)
                .stream().anyMatch(existing -> SpeciesNameKey.key(existing).equals(nameKey));
        if (exists) {
            throw new DuplicateResourceException("La especie «" + scientificName + "» ya está registrada en el catálogo");
        }

        String slug = slugAllocator.allocate(toSlug(scientificName));

        long vegetationTypeId = catalogs.type(form.vegetationTypeCode());
        Long originId = catalogs.origin(form.originCode());
        SpeciesMeasureProfiles.Profile profile = profiles.forNew(form, manager);

        String commonName = form.commonName() != null && !form.commonName().isBlank() ? form.commonName().trim() : null;
        String family = form.family() != null && !form.family().isBlank() ? form.family().trim() : null;
        String description = form.description() != null && !form.description().isBlank() ? form.description().trim() : null;
        String careNotes = form.careNotes() != null && !form.careNotes().isBlank() ? form.careNotes().trim() : null;

        Long speciesId = jdbc.queryForObject(
                """
                INSERT INTO species (scientific_name, slug, common_name, family, species_type_item_id, origin_item_id,
                    description, care_notes, is_active, is_critical, reference_height_m, reference_height_source_item_id,
                    reference_crown_radius_m, reference_crown_radius_source_item_id, uses_trunk_height, uses_dbh)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """,
                Long.class,
                scientificName,
                slug,
                commonName,
                family,
                vegetationTypeId,
                originId,
                description,
                careNotes,
                profile.critical(),
                profile.referenceHeightM(),
                profile.referenceHeightSourceId(),
                profile.referenceCrownRadiusM(),
                profile.referenceCrownRadiusSourceId(),
                profile.usesTrunkHeight(),
                profile.usesDbh()
        );

        if (speciesId == null) {
            throw new IllegalStateException("No se pudo obtener el ID de la especie creada");
        }

        extraMeasures.assign(speciesId, form.extraMeasures());

        // Otros nombres comunes
        if (form.otherNames() != null) {
            for (String otherName : form.otherNames()) {
                if (otherName != null && !otherName.isBlank()) {
                    jdbc.update("INSERT INTO species_common_names (species_id, name) VALUES (?, ?)",
                            speciesId, otherName.trim());
                }
            }
        }

        // Subir foto genérica si se adjuntó
        if (photo != null && photo.content() != null && photo.content().length > 0) {
            photoService.addSpeciesPhoto(slug, photo.content(), userEmail);
        }

        auditService.record(AuditActionCode.SPECIES_CREATED, "Species", speciesId,
                Map.of("slug", slug, "scientificName", scientificName));

        return inventoryService.speciesBySlug(slug);
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            throw new ValidationException("El nombre científico no puede estar vacío");
        }
        String normalized = Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('×', 'x')
                .replace('\'', '-')
                .replace('‘', '-')
                .replace('’', '-');
        String slug = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.isBlank()) {
            throw new ValidationException("No se pudo generar un identificador legible para la especie");
        }
        return slug;
    }

}
