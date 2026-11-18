package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactCard;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSummary;

/** Lecturas de organizaciones: la lista completa y los contactos de una ficha. */
@Repository
@RequiredArgsConstructor
public class OrganizationReadRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public List<OrganizationSummary> all() {
        return jdbc.query(DirectoryQueries.ORGANIZATION_ALL, (rs, i) -> new OrganizationSummary(
                rs.getString("code"), rs.getString("name"),
                new CodeLabel(rs.getString("type_code"), rs.getString("type_label")),
                rs.getString("phone"), rs.getInt("contacts"),
                Arrays.asList((String[]) rs.getArray("aliases").getArray()), rs.getString("search_key")));
    }

    public List<ContactCard> contacts(long organizationId) {
        return jdbc.query(DirectoryQueries.CONTACTS_OF_ORGANIZATION, new MapSqlParameterSource("id", organizationId),
                (rs, i) -> new ContactCard(rs.getString("code"), rs.getString("full_name"), rs.getString("extension"),
                        rs.getString("mobile"), rs.getString("email"), rs.getString("role")));
    }
}
