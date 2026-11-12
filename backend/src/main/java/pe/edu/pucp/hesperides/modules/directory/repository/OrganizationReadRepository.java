package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactCard;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSummary;

/** Lecturas de organizaciones: lista paginada, parecidos y contactos de una ficha. */
@Repository
@RequiredArgsConstructor
public class OrganizationReadRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** @param search patrón LIKE ya armado, o null */
    public List<OrganizationSummary> page(String search, String typeCode, int page, int size) {
        MapSqlParameterSource params = filter(search, typeCode).addValue("size", size).addValue("offset", page * size);
        return jdbc.query(DirectoryQueries.ORGANIZATION_PAGE, params, (rs, i) -> new OrganizationSummary(
                rs.getString("code"), rs.getString("name"),
                new CodeLabel(rs.getString("type_code"), rs.getString("type_label")),
                rs.getString("phone"), rs.getInt("contacts")));
    }

    public long count(String search, String typeCode) {
        return jdbc.queryForObject("SELECT count(*) " + DirectoryQueries.ORGANIZATION_FILTER, filter(search, typeCode),
                Long.class);
    }

    public List<OrganizationSuggestion> similar(String text, double threshold, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource("text", text).addValue("threshold", threshold)
                .addValue("limit", limit);
        return jdbc.query(DirectoryQueries.ORGANIZATION_SIMILAR, params,
                (rs, i) -> new OrganizationSuggestion(rs.getString("code"), rs.getString("name")));
    }

    public List<ContactCard> contacts(long organizationId) {
        return jdbc.query(DirectoryQueries.CONTACTS_OF_ORGANIZATION, new MapSqlParameterSource("id", organizationId),
                (rs, i) -> new ContactCard(rs.getString("code"), rs.getString("full_name"), rs.getString("extension"),
                        rs.getString("mobile"), rs.getString("email"), rs.getString("role")));
    }

    private static MapSqlParameterSource filter(String search, String typeCode) {
        return new MapSqlParameterSource("search", search).addValue("type", typeCode);
    }
}
