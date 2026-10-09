package pe.edu.pucp.hesperides.modules.inventory.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Las fotos genéricas de una especie: varias, en orden y con su crédito (SPEC-104). */
@Repository
@RequiredArgsConstructor
public class SpeciesPhotoRepository {

    /** Una foto lista para guardar con su crédito. Todo menos {@code stored} es opcional. */
    public record NewPhoto(StoredPhoto stored, String sourceUrl, String author, String license, String sourcePage) {
    }

    /** Una foto vigente, para mostrarla. */
    public record SpeciesPhoto(long id, String author, String license, String sourcePage) {
    }

    private final JdbcTemplate jdbc;

    public List<SpeciesPhoto> active(String slug) {
        return jdbc.query("""
                SELECT p.id, p.author, p.license, p.source_page_url FROM species_photos p
                  JOIN species s ON s.id = p.species_id
                 WHERE s.slug = ? AND p.deleted_at IS NULL ORDER BY p.sort_order""",
                (rs, i) -> new SpeciesPhoto(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4)), slug);
    }

    /** Cuántas fotos vigentes tiene cada especie; las que no tienen ninguna no aparecen. */
    public Map<Long, Integer> activeCounts() {
        Map<Long, Integer> counts = new HashMap<>();
        jdbc.query("SELECT species_id, count(*) FROM species_photos WHERE deleted_at IS NULL GROUP BY species_id",
                rs -> {
                    counts.put(rs.getLong(1), rs.getInt(2));
                });
        return counts;
    }

    /** El conjunto nuevo reemplaza al vigente (SPEC-104 D-02): las anteriores se dan de baja. */
    public void replaceSet(long speciesId, List<NewPhoto> photos, long userId) {
        jdbc.update("UPDATE species_photos SET deleted_at = CURRENT_TIMESTAMP WHERE species_id = ? AND deleted_at IS NULL",
                speciesId);
        for (int i = 0; i < photos.size(); i++) {
            insert(speciesId, photos.get(i), i + 1, userId);
        }
    }

    /** El formulario agrega al final (SPEC-104 D-03). */
    public long append(long speciesId, NewPhoto photo, long userId) {
        Integer last = jdbc.queryForObject(
                "SELECT max(sort_order) FROM species_photos WHERE species_id = ? AND deleted_at IS NULL", Integer.class,
                speciesId);
        return insert(speciesId, photo, last == null ? 1 : last + 1, userId);
    }

    private long insert(long speciesId, NewPhoto p, int order, long userId) {
        return jdbc.queryForObject("""
                INSERT INTO species_photos (species_id, storage_key, thumbnail_storage_key, content_type, size_bytes,
                    source_url, sort_order, author, license, source_page_url, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class, speciesId,
                p.stored().storageKey(), p.stored().thumbnailKey(), p.stored().contentType(), p.stored().sizeBytes(),
                p.sourceUrl(), order, p.author(), p.license(), p.sourcePage(), userId);
    }
}
