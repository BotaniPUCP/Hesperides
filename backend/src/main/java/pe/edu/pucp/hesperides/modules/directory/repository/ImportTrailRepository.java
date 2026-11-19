package pe.edu.pucp.hesperides.modules.directory.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** De qué lote vino cada organización o contacto creado por registro masivo (V037). */
@Repository
@RequiredArgsConstructor
public class ImportTrailRepository {

    private final JdbcTemplate jdbc;

    public void markOrganization(String code, long batchId) {
        jdbc.update("UPDATE organizations SET import_batch_id = ? WHERE code = ?", batchId, code);
    }

    public void markContact(String code, long batchId) {
        jdbc.update("UPDATE contacts SET import_batch_id = ? WHERE code = ?", batchId, code);
    }
}
