package pe.edu.pucp.hesperides.modules.directory.repository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.ContactSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationRef;
import pe.edu.pucp.hesperides.modules.directory.repository.ContactRepository.ContactRow;

/** Lecturas de contactos: lista paginada, parecidos y las organizaciones de cada uno. */
@Repository
@RequiredArgsConstructor
public class ContactReadRepository {

    private record Link(long contactId, OrganizationRef organization) {
    }

    private static final RowMapper<ContactRow> ROW = (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"),
            rs.getString("full_name"), rs.getString("extension"), rs.getString("mobile"), rs.getString("email"), true);

    private final NamedParameterJdbcTemplate jdbc;

    public List<ContactSummary> page(ContactFilter filter, int page, int size) {
        MapSqlParameterSource params = params(filter).addValue("size", size).addValue("offset", page * size);
        return withOrganizations(jdbc.query(DirectoryQueries.CONTACT_PAGE, params, ROW));
    }

    public long count(ContactFilter filter) {
        return jdbc.queryForObject("SELECT count(*) " + DirectoryQueries.CONTACT_FILTER, params(filter), Long.class);
    }

    public List<ContactSummary> similar(String text, double threshold, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource("text", text).addValue("threshold", threshold)
                .addValue("limit", limit);
        return withOrganizations(jdbc.query(DirectoryQueries.CONTACT_SIMILAR, params, ROW));
    }

    /** Vigentes primero; las dadas de baja siguen, marcadas, para que coordinación sepa qué reasignar. */
    public List<OrganizationRef> organizations(long contactId) {
        return linksOf(List.of(contactId)).getOrDefault(contactId, List.of());
    }

    private List<ContactSummary> withOrganizations(List<ContactRow> rows) {
        Map<Long, List<OrganizationRef>> links = linksOf(rows.stream().map(ContactRow::id).toList());
        return rows.stream().map(c -> new ContactSummary(c.code(), c.fullName(), c.extension(), c.mobile(), c.email(),
                links.getOrDefault(c.id(), List.of()))).toList();
    }

    private Map<Long, List<OrganizationRef>> linksOf(List<Long> contactIds) {
        if (contactIds.isEmpty()) {
            return Map.of();
        }
        return jdbc.query(DirectoryQueries.ORGANIZATIONS_OF_CONTACTS, new MapSqlParameterSource("ids", contactIds),
                (rs, i) -> new Link(rs.getLong("contact_id"), new OrganizationRef(rs.getString("code"),
                        rs.getString("name"), rs.getBoolean("active"), rs.getString("role"))))
                .stream().collect(Collectors.groupingBy(Link::contactId,
                        Collectors.mapping(Link::organization, Collectors.toList())));
    }

    private static MapSqlParameterSource params(ContactFilter filter) {
        return new MapSqlParameterSource("search", filter.search()).addValue("organization", filter.organizationCode())
                .addValue("withoutOrganization", filter.withoutOrganization());
    }
}
