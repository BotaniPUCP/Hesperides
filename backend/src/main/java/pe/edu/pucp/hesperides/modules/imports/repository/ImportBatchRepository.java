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

    /** Saved result used to safely retry a completed specimen/species confirmation. */
    public Optional<String> confirmedResultJson(long id, long userId) {
        return jdbc.query("""
                SELECT (report -> 'result')::text FROM import_batches
                 WHERE id = ? AND created_by_user_id = ? AND status = 'CONFIRMED' AND deleted_at IS NULL
                   AND (report -> 'result') IS NOT NULL
                """, (rs, i) -> rs.getString(1), id, userId).stream().findFirst();
    }

    /** Lock a batch row for the duration of the caller's transaction. */
    public Optional<Batch> findForUpdate(long id) {
        return jdbc.query("""
                SELECT id, kind, status, created_by_user_id, report::text, expires_at FROM import_batches
                 WHERE id = ? AND deleted_at IS NULL FOR UPDATE""",
                (rs, i) -> new Batch(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getLong(4),
                        rs.getString(5), rs.getTimestamp(6).toLocalDateTime()), id).stream().findFirst();
    }

    /** Replace a still-pending preview without changing its batch identity. */
    public boolean replacePreview(long id, long userId, String expectedReport, String reportJson) {
        return jdbc.update("""
                UPDATE import_batches SET report = CAST(? AS jsonb), updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND created_by_user_id = ? AND status = 'PREVIEWED'
                   AND expires_at >= CURRENT_TIMESTAMP AND deleted_at IS NULL
                   AND report = CAST(? AS jsonb)
                """, reportJson, id, userId, expectedReport) == 1;
    }

    public void confirm(long id, String resultJson) {
        jdbc.update("""
                UPDATE import_batches SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP, report = report || jsonb_build_object('result', CAST(? AS jsonb))
                 WHERE id = ?""", resultJson, id);
    }

    public boolean confirmExclusive(long id, String resultJson) {
        return jdbc.update("""
                UPDATE import_batches SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP, report = report || jsonb_build_object('result', CAST(? AS jsonb))
                 WHERE id = ? AND status = 'PREVIEWED' AND deleted_at IS NULL
                """, resultJson, id) == 1;
    }

    public void expire(long id) {
        jdbc.update("UPDATE import_batches SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }
}
