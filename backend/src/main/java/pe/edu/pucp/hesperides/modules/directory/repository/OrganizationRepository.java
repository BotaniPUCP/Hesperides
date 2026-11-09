package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Altas, cambios y bajas de organizaciones y sus alias. */
@Repository
@RequiredArgsConstructor
public class OrganizationRepository {

    public record OrganizationRow(long id, String code, String name, String typeCode, String typeLabel, String ruc,
            String phone, boolean active) {
    }

    public record OrganizationValues(String name, long typeItemId, String ruc, String phone) {
    }

    private static final String SELECT_ROW = """
            SELECT o.id, o.code, o.name, t.code, t.label, o.ruc, o.phone, o.deleted_at IS NULL FROM organizations o
              JOIN catalog_items t ON t.id = o.type_item_id WHERE\s""";

    private static final RowMapper<OrganizationRow> ROW = (rs, i) -> new OrganizationRow(rs.getLong(1), rs.getString(2),
            rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getBoolean(8));

    private final JdbcTemplate jdbc;

    /** Incluye las dadas de baja: su ficha sigue accesible por código. */
    public OrganizationRow byCode(String code) {
        return jdbc.query(SELECT_ROW + "o.code = ?", ROW, code).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + code));
    }

    public Created insert(OrganizationValues v) {
        return jdbc.queryForObject("INSERT INTO organizations (name, type_item_id, ruc, phone) VALUES (?, ?, ?, ?) "
                + "RETURNING id, code", (rs, i) -> new Created(rs.getLong(1), rs.getString(2)),
                v.name(), v.typeItemId(), v.ruc(), v.phone());
    }

    public void update(long id, OrganizationValues v) {
        jdbc.update("""
                UPDATE organizations SET name = ?, type_item_id = ?, ruc = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?""", v.name(), v.typeItemId(), v.ruc(), v.phone(), id);
    }

    /** Sus contactos no se dan de baja: pueden pertenecer a otras organizaciones. */
    public void softDelete(long id) {
        jdbc.update("UPDATE organization_aliases SET deleted_at = CURRENT_TIMESTAMP WHERE organization_id = ? "
                + "AND deleted_at IS NULL", id);
        jdbc.update("UPDATE organizations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    public List<String> aliases(long id) {
        return jdbc.queryForList("SELECT alias FROM organization_aliases WHERE organization_id = ? AND deleted_at IS NULL "
                + "ORDER BY lower(alias)", String.class, id);
    }

    public void replaceAliases(long id, List<String> aliases) {
        jdbc.update("UPDATE organization_aliases SET deleted_at = CURRENT_TIMESTAMP WHERE organization_id = ? "
                + "AND deleted_at IS NULL", id);
        aliases.forEach(alias -> jdbc.update("INSERT INTO organization_aliases (organization_id, alias) VALUES (?, ?)",
                id, alias));
    }

    /** La primera organización vigente, distinta de {@code exceptId}, cuyo nombre o alias coincide con un texto. */
    public Optional<String> nameTakenBy(List<String> texts, Long exceptId) {
        String sql = """
                SELECT o.name FROM organizations o
                 WHERE o.deleted_at IS NULL AND o.id <> COALESCE(?, 0)
                   AND (directory_key(o.name) = directory_key(?)
                        OR EXISTS (SELECT 1 FROM organization_aliases a WHERE a.organization_id = o.id
                                    AND a.deleted_at IS NULL AND directory_key(a.alias) = directory_key(?)))
                 LIMIT 1""";
        return texts.stream()
                .flatMap(text -> jdbc.queryForList(sql, String.class, exceptId, text, text).stream())
                .findFirst();
    }

    public boolean rucTaken(String ruc, Long exceptId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM organizations WHERE ruc = ? AND deleted_at IS NULL AND id <> COALESCE(?, 0))""",
                Boolean.class, ruc, exceptId));
    }

    public long typeItemId(String typeCode) {
        return jdbc.query("""
                SELECT ci.id FROM catalog_items ci JOIN catalog_types t ON t.id = ci.catalog_type_id
                 WHERE t.code = 'ORGANIZATION_TYPE' AND ci.code = ? AND ci.deleted_at IS NULL AND ci.is_active""",
                (rs, i) -> rs.getLong(1), typeCode).stream().findFirst()
                .orElseThrow(() -> new ValidationException("Unknown organization type: " + typeCode));
    }
}
