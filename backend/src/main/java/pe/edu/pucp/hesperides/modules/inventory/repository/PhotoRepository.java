package pe.edu.pucp.hesperides.modules.inventory.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.List;
import java.util.Optional;

/** Las fotos guardadas del inventario: ejemplares y especies. */
@Repository
@RequiredArgsConstructor
public class PhotoRepository {

    /** Un ejemplar del catastro con su enlace de origen y sin foto guardada todavía. */
    public record PendingPhoto(long elementId, String code, String sourceUrl) {
    }

    /** Las claves de una foto, para servirla. */
    public record PhotoKeys(String full, String thumbnail, String contentType) {
    }

    private final JdbcTemplate jdbc;

    public long userId(String email) {
        return jdbc.query("SELECT id FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL", (rs, i) -> rs.getLong(1), email)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    public long elementId(String code) {
        return jdbc.query("SELECT id FROM green_elements WHERE code = ? AND deleted_at IS NULL", (rs, i) -> rs.getLong(1), code)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Specimen not found: " + code));
    }

    public long speciesId(String slug) {
        return jdbc.query("SELECT id FROM species WHERE slug = ? AND deleted_at IS NULL", (rs, i) -> rs.getLong(1), slug)
                .stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Species not found: " + slug));
    }

    public long insertElementPhoto(long elementId, StoredPhoto photo, String fileName, String sourceUrl, long userId) {
        return jdbc.queryForObject("""
                INSERT INTO green_element_attachments (green_element_id, storage_key, thumbnail_storage_key, original_filename,
                    content_type, size_bytes, source_url, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class, elementId, photo.storageKey(),
                photo.thumbnailKey(), fileName, photo.contentType(), photo.sizeBytes(), sourceUrl, userId);
    }

    /** Una sola foto genérica vigente por especie: la anterior se da de baja. */
    public long replaceSpeciesPhoto(long speciesId, StoredPhoto photo, String sourceUrl, long userId) {
        jdbc.update("UPDATE species_photos SET deleted_at = CURRENT_TIMESTAMP WHERE species_id = ? AND deleted_at IS NULL", speciesId);
        return jdbc.queryForObject("""
                INSERT INTO species_photos (species_id, storage_key, thumbnail_storage_key, content_type, size_bytes,
                    source_url, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class, speciesId, photo.storageKey(),
                photo.thumbnailKey(), photo.contentType(), photo.sizeBytes(), sourceUrl, userId);
    }

    public Optional<PhotoKeys> elementPhoto(long attachmentId) {
        return keys("green_element_attachments", attachmentId);
    }

    public Optional<PhotoKeys> speciesPhoto(long photoId) {
        return keys("species_photos", photoId);
    }

    /** Del catastro original: tienen enlace de Drive y ninguna foto guardada. */
    public List<PendingPhoto> pending(int limit) {
        return jdbc.query(PENDING + " ORDER BY e.code LIMIT ?",
                (rs, i) -> new PendingPhoto(rs.getLong("id"), rs.getString("code"), rs.getString("photo_url")), limit);
    }

    public long countPending() {
        Long n = jdbc.queryForObject("SELECT count(*) FROM (" + PENDING + ") x", Long.class);
        return n == null ? 0 : n;
    }

    private static final String PENDING = """
            SELECT e.id, e.code, e.photo_url FROM green_elements e
             WHERE e.deleted_at IS NULL AND e.photo_url IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM green_element_attachments a WHERE a.green_element_id = e.id AND a.deleted_at IS NULL)""";

    // Solo dos tablas fijas: el nombre nunca viene del cliente.
    private Optional<PhotoKeys> keys(String table, long id) {
        return jdbc.query("SELECT storage_key, thumbnail_storage_key, content_type FROM " + table
                        + " WHERE id = ? AND deleted_at IS NULL",
                (rs, i) -> new PhotoKeys(rs.getString(1), rs.getString(2), rs.getString(3)), id).stream().findFirst();
    }
}
