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

/** Lecturas de contactos: la lista completa y las organizaciones de cada uno. */
@Repository
@RequiredArgsConstructor
public class ContactReadRepository {

    private record Link(long contactId, OrganizationRef organization) {
    }

    private record Listed(ContactRow row, String searchKey) {
    }

    private static final RowMapper<Listed> ROW = (rs, i) -> new Listed(new ContactRow(rs.getLong("id"),
            rs.getString("code"), rs.getString("full_name"), rs.getString("extension"), rs.getString("mobile"),
            rs.getString("email"), true), rs.getString("search_key"));

    private final NamedParameterJdbcTemplate jdbc;

    public List<ContactSummary> all() {
        List<Listed> listed = jdbc.query(DirectoryQueries.CONTACT_ALL, ROW);
        Map<Long, List<OrganizationRef>> links = linksOf(listed.stream().map(l -> l.row().id()).toList());
        return listed.stream().map(l -> summary(l, links.getOrDefault(l.row().id(), List.of()))).toList();
    }

    /** Vigentes primero; las dadas de baja siguen, marcadas, para que coordinación sepa qué reasignar. */
    public List<OrganizationRef> organizations(long contactId) {
        return linksOf(List.of(contactId)).getOrDefault(contactId, List.of());
    }

    private static ContactSummary summary(Listed listed, List<OrganizationRef> organizations) {
        ContactRow c = listed.row();
        return new ContactSummary(c.code(), c.fullName(), c.extension(), c.mobile(), c.email(), organizations,
                listed.searchKey());
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
}
