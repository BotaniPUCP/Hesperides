package pe.edu.pucp.hesperides.modules.places.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

/** Fotos de un lugar: la principal, las de cada perspectiva y las de un interior. */
@Repository
@RequiredArgsConstructor
public class PlacePhotoRepository {

    /** {@code perspectiveId} y {@code interiorViewItemId} son excluyentes; sin ninguno, es foto principal. */
    public record NewPhoto(long placeId, Long perspectiveId, Long interiorViewItemId, StoredPhoto stored, String author,
            LocalDate takenOn, long userId) {
    }

    public record PhotoRow(long id, Long perspectiveId, String viewCode, String viewLabel, String author,
            LocalDate takenOn) {
    }

    public record FileKeys(String full, String thumbnail, String contentType) {
    }

    private final JdbcTemplate jdbc;

    /** Al final de su grupo (principal, perspectiva o interior): el orden es el de subida. */
    public long append(NewPhoto p) {
        Integer last = jdbc.queryForObject("""
                SELECT max(sort_order) FROM place_photos
                 WHERE place_id = ? AND perspective_id IS NOT DISTINCT FROM ? AND deleted_at IS NULL""",
                Integer.class, p.placeId(), p.perspectiveId());
        return jdbc.queryForObject("""
                INSERT INTO place_photos (place_id, perspective_id, interior_view_item_id, storage_key,
                    thumbnail_storage_key, content_type, size_bytes, sort_order, author, taken_on, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class, p.placeId(), p.perspectiveId(),
                p.interiorViewItemId(), p.stored().storageKey(), p.stored().thumbnailKey(), p.stored().contentType(),
                p.stored().sizeBytes(), last == null ? 1 : last + 1, p.author(), p.takenOn(), p.userId());
    }

    public List<PhotoRow> byPlace(long placeId) {
        return jdbc.query("""
                SELECT f.id, f.perspective_id, v.code, v.label, f.author, f.taken_on FROM place_photos f
                  LEFT JOIN catalog_items v ON v.id = f.interior_view_item_id
                 WHERE f.place_id = ? AND f.deleted_at IS NULL ORDER BY v.sort_order NULLS FIRST, f.sort_order""",
                (rs, i) -> new PhotoRow(rs.getLong(1), rs.getObject(2, Long.class), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getObject(6, LocalDate.class)), placeId);
    }

    /** @return false si la foto no es de ese lugar o ya no está */
    public boolean softDelete(long placeId, long photoId) {
        return jdbc.update("""
                UPDATE place_photos SET deleted_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND place_id = ? AND deleted_at IS NULL""", photoId, placeId) == 1;
    }

    public Optional<FileKeys> keys(long photoId) {
        return jdbc.query("""
                SELECT storage_key, thumbnail_storage_key, content_type FROM place_photos
                 WHERE id = ? AND deleted_at IS NULL""",
                (rs, i) -> new FileKeys(rs.getString(1), rs.getString(2), rs.getString(3)), photoId).stream().findFirst();
    }
}
