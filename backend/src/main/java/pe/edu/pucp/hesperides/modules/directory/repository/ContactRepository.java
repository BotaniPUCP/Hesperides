package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/** Altas, cambios y bajas de contactos y sus vínculos con organizaciones. */
@Repository
@RequiredArgsConstructor
public class ContactRepository {

    public record ContactRow(long id, String code, String fullName, String extension, String mobile, String email,
            boolean active) {
    }

    public record ContactValues(String fullName, String extension, String mobile, String email) {
    }

    private static final String SELECT_ROW = "SELECT id, code, full_name, extension, mobile, email, deleted_at IS NULL "
            + "FROM contacts WHERE ";

    private static final RowMapper<ContactRow> ROW = (rs, i) -> new ContactRow(rs.getLong(1), rs.getString(2),
            rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getBoolean(7));

    private final JdbcTemplate jdbc;

    /** Incluye los dados de baja: su ficha sigue accesible por código. */
    public ContactRow byCode(String code) {
        return jdbc.query(SELECT_ROW + "code = ?", ROW, code).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found: " + code));
    }

    public Created insert(ContactValues v) {
        return jdbc.queryForObject("INSERT INTO contacts (full_name, extension, mobile, email) VALUES (?, ?, ?, ?) "
                + "RETURNING id, code", (rs, i) -> new Created(rs.getLong(1), rs.getString(2)),
                v.fullName(), v.extension(), v.mobile(), v.email());
    }

    public void update(long id, ContactValues v) {
        jdbc.update("""
                UPDATE contacts SET full_name = ?, extension = ?, mobile = ?, email = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?""", v.fullName(), v.extension(), v.mobile(), v.email(), id);
    }

    /** Sus vínculos quedan: los registros que ya lo usaban lo siguen mostrando. */
    public void softDelete(long id) {
        jdbc.update("UPDATE contacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    public List<Long> organizationIds(long contactId) {
        return jdbc.queryForList("SELECT organization_id FROM contact_organizations WHERE contact_id = ? "
                + "AND deleted_at IS NULL ORDER BY organization_id", Long.class, contactId);
    }

    public void link(long contactId, long organizationId) {
        jdbc.update("INSERT INTO contact_organizations (contact_id, organization_id) VALUES (?, ?)", contactId,
                organizationId);
    }

    public void replaceLinks(long contactId, List<Long> organizationIds) {
        jdbc.update("UPDATE contact_organizations SET deleted_at = CURRENT_TIMESTAMP WHERE contact_id = ? "
                + "AND deleted_at IS NULL", contactId);
        organizationIds.forEach(organizationId -> link(contactId, organizationId));
    }
}
