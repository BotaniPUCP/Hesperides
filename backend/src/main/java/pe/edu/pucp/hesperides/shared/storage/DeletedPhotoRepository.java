package pe.edu.pucp.hesperides.shared.storage;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Las fotos dadas de baja cuyos archivos siguen guardados. */
@Repository
@RequiredArgsConstructor
public class DeletedPhotoRepository {

    /** Las tablas cuyas fotos se dan de baja con borrado lógico. Lista cerrada: el nombre va al SQL. */
    public enum PhotoTable {
        PLACE("place_photos"),
        SPECIES("species_photos");

        private final String table;

        PhotoTable(String table) {
            this.table = table;
        }
    }

    public record DuePhoto(long id, String fullKey, String thumbnailKey) {
    }

    /** Una clave que todavía usa una foto vigente, en cualquier tabla, no se borra. */
    private static final String IN_USE = """
            EXISTS (SELECT 1 FROM place_photos a WHERE a.deleted_at IS NULL AND ? IN (a.storage_key, a.thumbnail_storage_key))
            OR EXISTS (SELECT 1 FROM species_photos a WHERE a.deleted_at IS NULL AND ? IN (a.storage_key, a.thumbnail_storage_key))""";

    private final JdbcTemplate jdbc;

    public List<DuePhoto> due(PhotoTable table, LocalDateTime cutoff, int limit) {
        return jdbc.query("SELECT id, storage_key, thumbnail_storage_key FROM " + table.table
                        + " WHERE deleted_at < ? AND files_purged_at IS NULL ORDER BY deleted_at LIMIT ?",
                (rs, i) -> new DuePhoto(rs.getLong(1), rs.getString(2), rs.getString(3)), cutoff, limit);
    }

    public boolean inUse(String key) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT " + IN_USE, Boolean.class, key, key));
    }

    public void markPurged(PhotoTable table, long id, LocalDateTime when) {
        jdbc.update("UPDATE " + table.table + " SET files_purged_at = ? WHERE id = ?", when, id);
    }
}
