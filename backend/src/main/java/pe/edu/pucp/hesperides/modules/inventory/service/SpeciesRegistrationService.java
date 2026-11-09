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

    private static final java.util.regex.Pattern INVALID_BOTANICAL_CHARS =
            java.util.regex.Pattern.compile("[0-9/\\\\@#$%^&*()_+=\\[\\]{}|<>?!;:~`\"“”«»]");

    public static void validateScientificName(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) {
            throw new ValidationException("El nombre científico es obligatorio");
        }
        String cleaned = scientificName.trim().replaceAll("\\s+", " ");
        if (cleaned.length() < 2) {
            throw new ValidationException("El nombre científico debe tener al menos 2 caracteres");
        }
        if (cleaned.length() > 150) {
            throw new ValidationException("El nombre científico no puede exceder 150 caracteres");
        }
        if (INVALID_BOTANICAL_CHARS.matcher(cleaned).find()) {
            throw new ValidationException("El nombre científico no debe contener números, barras (/) ni caracteres especiales no botánicos");
        }
        String[] words = cleaned.split(" ");
        if (words.length < 2) {
            throw new ValidationException("El nombre científico debe incluir al menos género y epíteto específico (ej. «Jacaranda mimosifolia» o «Ficus sp.»)");
        }
    }

    /** Sin espacios de más y con el género en mayúscula, como se escribe un binomio. */
    static String normalizeScientificName(String input) {
        String raw = input != null ? input.trim().replaceAll("\\s+", " ") : "";
        validateScientificName(raw);
        return raw.substring(0, 1).toUpperCase(Locale.ROOT) + raw.substring(1);
    }

    @Transactional
    public SpeciesResponse register(SpeciesForm form, UploadedPhoto photo, String userEmail, boolean manager) {
        String scientificName = normalizeScientificName(form.scientificName());

        // Verificar unicidad de nombre científico activo
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM species WHERE lower(scientific_name) = lower(?) AND deleted_at IS NULL)",
                Boolean.class, scientificName);
        if (Boolean.TRUE.equals(exists)) {
            throw new DuplicateResourceException("La especie «" + scientificName + "» ya está registrada en el catálogo");
        }

        String baseSlug = toSlug(scientificName);
        String slug = resolveUniqueSlug(baseSlug);

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

    private String resolveUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int count = 1;
        while (Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM species WHERE slug = ? AND deleted_at IS NULL)",
                Boolean.class, slug))) {
            count++;
            slug = baseSlug + "-" + count;
        }
        return slug;
    }
}
