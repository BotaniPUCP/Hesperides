package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Optional;

/** Lotes de carga: la vista previa guardada y, al confirmar, su resumen (SPEC-103 §4.4). */
@Repository
@RequiredArgsConstructor
public class ImportBatchRepository {

    public record Batch(long id, String kind, String status, long createdBy, String report, LocalDateTime expiresAt) {
    }

    private final JdbcTemplate jdbc;

    public long create(String kind, String fileName, long userId, String reportJson, LocalDateTime expiresAt) {
        return jdbc.queryForObject("""
                INSERT INTO import_batches (kind, file_name, created_by_user_id, report, expires_at)
                VALUES (?, ?, ?, CAST(? AS jsonb), ?) RETURNING id""",
                Long.class, kind, fileName, userId, reportJson, Timestamp.valueOf(expiresAt));
    }

    public Optional<Batch> find(long id) {
        return jdbc.query("""
                SELECT id, kind, status, created_by_user_id, report::text, expires_at FROM import_batches
                 WHERE id = ? AND deleted_at IS NULL""",
                (rs, i) -> new Batch(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getLong(4),
                        rs.getString(5), rs.getTimestamp(6).toLocalDateTime()), id).stream().findFirst();
    }

    public void confirm(long id, String resultJson) {
        jdbc.update("""
                UPDATE import_batches SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP, report = report || jsonb_build_object('result', CAST(? AS jsonb))
                 WHERE id = ?""", resultJson, id);
    }

    public void expire(long id) {
        jdbc.update("UPDATE import_batches SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }
}
