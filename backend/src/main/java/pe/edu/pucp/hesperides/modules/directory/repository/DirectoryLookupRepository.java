package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;

/** Búsquedas exactas que necesita el registro masivo para decidir cada fila. */
@Repository
@RequiredArgsConstructor
public class DirectoryLookupRepository {

    private final JdbcTemplate jdbc;

    /** Una organización vigente con ese mismo nombre (sin tildes ni mayúsculas): la fila ya existe. */
    public boolean organizationNamed(String name) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM organizations
                                WHERE deleted_at IS NULL AND directory_key(name) = directory_key(?))""",
                Boolean.class, name));
    }

    /** La organización vigente que el texto nombra: por código, por nombre o por alias. */
    public Optional<OrganizationSuggestion> organizationMatching(String text) {
        return jdbc.query("""
                SELECT o.code, o.name FROM organizations o
                 WHERE o.deleted_at IS NULL
                   AND (o.code = upper(btrim(?)) OR directory_key(o.name) = directory_key(?)
                        OR EXISTS (SELECT 1 FROM organization_aliases a WHERE a.organization_id = o.id
                                    AND a.deleted_at IS NULL AND directory_key(a.alias) = directory_key(?)))
                 ORDER BY directory_key(o.name) = directory_key(?) DESC LIMIT 1""",
                (rs, i) -> new OrganizationSuggestion(rs.getString(1), rs.getString(2)), text, text, text, text)
                .stream().findFirst();
    }

    /** Un contacto vigente con ese nombre ya vinculado a esa organización: la fila ya existe. */
    public boolean contactNamedIn(String fullName, String organizationCode) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM contacts c
                  JOIN contact_organizations co ON co.contact_id = c.id AND co.deleted_at IS NULL
                  JOIN organizations o ON o.id = co.organization_id
                 WHERE c.deleted_at IS NULL AND o.code = ? AND directory_key(c.full_name) = directory_key(?))""",
                Boolean.class, organizationCode, fullName));
    }
}
