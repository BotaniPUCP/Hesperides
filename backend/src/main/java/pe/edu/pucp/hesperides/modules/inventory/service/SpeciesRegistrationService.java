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

    @Transactional
    public SpeciesResponse register(SpeciesForm form, UploadedPhoto photo, String userEmail) {
        String scientificName = form.scientificName() != null ? form.scientificName().trim() : "";
        if (scientificName.length() < 2) {
            throw new ValidationException("El nombre científico debe tener al menos 2 caracteres");
        }

        // Verificar unicidad de nombre científico activo
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM species WHERE lower(scientific_name) = lower(?) AND deleted_at IS NULL)",
                Boolean.class, scientificName);
        if (Boolean.TRUE.equals(exists)) {
            throw new DuplicateResourceException("La especie «" + scientificName + "» ya está registrada en el catálogo");
        }

        String baseSlug = toSlug(scientificName);
        String slug = resolveUniqueSlug(baseSlug);

        // Resolver tipo de vegetación obligatorio desde el catálogo SPECIES_TYPE
        Long vegetationTypeId = jdbc.query(
                """
                SELECT ci.id FROM catalog_items ci
                  JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = 'SPECIES_TYPE' AND ci.code = ? AND ci.is_active
                """,
                (rs, i) -> rs.getLong(1),
                form.vegetationTypeCode().trim()
        ).stream().findFirst().orElseThrow(() ->
                new ValidationException("Tipo de vegetación no válido: " + form.vegetationTypeCode()));

        // Resolver procedencia / origen opcional desde el catálogo SPECIES_ORIGIN
        Long originId = null;
        if (form.originCode() != null && !form.originCode().isBlank()) {
            originId = jdbc.query(
                    """
                    SELECT ci.id FROM catalog_items ci
                      JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                     WHERE ct.code = 'SPECIES_ORIGIN' AND ci.code = ? AND ci.is_active
                    """,
                    (rs, i) -> rs.getLong(1),
                    form.originCode().trim()
            ).stream().findFirst().orElse(null);
        }

        String commonName = form.commonName() != null && !form.commonName().isBlank() ? form.commonName().trim() : null;
        String family = form.family() != null && !form.family().isBlank() ? form.family().trim() : null;
        String description = form.description() != null && !form.description().isBlank() ? form.description().trim() : null;
        String careNotes = form.careNotes() != null && !form.careNotes().isBlank() ? form.careNotes().trim() : null;

        Long speciesId = jdbc.queryForObject(
                """
                INSERT INTO species (scientific_name, slug, common_name, family, species_type_item_id, origin_item_id, description, care_notes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
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
                careNotes
        );

        if (speciesId == null) {
            throw new IllegalStateException("No se pudo obtener el ID de la especie creada");
        }

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
