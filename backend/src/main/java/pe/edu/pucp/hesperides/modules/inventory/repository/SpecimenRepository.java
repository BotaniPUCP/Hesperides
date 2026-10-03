package pe.edu.pucp.hesperides.modules.inventory.repository;

import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SectionRef;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;

import java.util.List;
import java.util.Optional;

/** Lectura de los ejemplares del catastro. */
@Repository
@RequiredArgsConstructor
public class SpecimenRepository {

    private static final RowMapper<SpecimenRow> ROW = (rs, i) -> new SpecimenRow(
            rs.getString("code"), rs.getString("source_reference"), rs.getString("source_location"),
            rs.getString("legacy_code"), rs.getObject("lat", Double.class), rs.getObject("lon", Double.class),
            rs.getString("photo_url"), rs.getInt("quantity"), rs.getString("notes"), rs.getBigDecimal("height_m"),
            rs.getBigDecimal("trunk_height_m"), rs.getBigDecimal("dbh_cm"), rs.getBigDecimal("crown_radius_m"),
            rs.getObject("is_banded", Boolean.class), rs.getString("data_source"),
            rs.getString("element_type_code"), rs.getString("element_type_label"), rs.getString("slug"),
            rs.getObject("attachment_id", Long.class));

    private final NamedParameterJdbcTemplate jdbc;

    public List<SpecimenRow> page(String speciesSlug, SpecimenQuery query) {
        // Las columnas de orden salen de un mapa cerrado, nunca del texto del cliente.
        String direction = query.descending() ? " DESC" : " ASC";
        String order = String.join(direction + ", ", InventoryQueries.SPECIMEN_ORDER.get(query.sort())) + direction;
        String sql = InventoryQueries.SPECIMEN_COLUMNS + InventoryQueries.SPECIMEN_FILTER
                + " ORDER BY " + order + ", e.code LIMIT :limit OFFSET :offset";
        return jdbc.query(sql, filter(speciesSlug, query)
                .addValue("limit", query.size())
                .addValue("offset", (long) query.page() * query.size()), ROW);
    }

    public long count(String speciesSlug, SpecimenQuery query) {
        Long total = jdbc.queryForObject(InventoryQueries.SPECIMEN_COUNT, filter(speciesSlug, query), Long.class);
        return total == null ? 0 : total;
    }

    public Optional<SpecimenRow> byCode(String code) {
        return jdbc.query(InventoryQueries.SPECIMEN_BY_CODE, new MapSqlParameterSource("code", code), ROW)
                .stream().findFirst();
    }

    public List<LocationCountResponse> locations(String speciesSlug) {
        return jdbc.query(InventoryQueries.LOCATIONS, new MapSqlParameterSource("slug", speciesSlug),
                (rs, i) -> new LocationCountResponse(rs.getString("location"), rs.getLong("total")));
    }

    public Optional<SectionRef> sectionOf(String code) {
        return jdbc.query(InventoryQueries.SECTION_AT, new MapSqlParameterSource("code", code),
                (rs, i) -> new SectionRef(rs.getString("code"), rs.getString("name"))).stream().findFirst();
    }

    private static MapSqlParameterSource filter(String speciesSlug, SpecimenQuery query) {
        return new MapSqlParameterSource()
                .addValue("slug", speciesSlug)
                .addValue("location", query.location())
                .addValue("search", LikePattern.contains(query.search()));
    }
}
