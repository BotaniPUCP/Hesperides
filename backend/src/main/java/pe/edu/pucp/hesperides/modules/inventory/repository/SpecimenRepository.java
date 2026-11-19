package pe.edu.pucp.hesperides.modules.inventory.repository;

import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.inventory.dto.LocationCountResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.RetiredSpecimenResponse;
import pe.edu.pucp.hesperides.modules.inventory.dto.SectionRef;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpecimenSearchResultResponse;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Lectura de los ejemplares del catastro. */
@Repository
@RequiredArgsConstructor
public class SpecimenRepository {

    private static final RowMapper<SpecimenRow> ROW = (rs, i) -> new SpecimenRow(
            rs.getLong("id"), rs.getString("code"), rs.getString("source_reference"), rs.getString("source_location"),
            rs.getString("legacy_code"), rs.getObject("lat", Double.class), rs.getObject("lon", Double.class),
            rs.getString("photo_url"), rs.getInt("quantity"), rs.getString("notes"), rs.getBigDecimal("height_m"),
            rs.getBigDecimal("trunk_height_m"), rs.getBigDecimal("dbh_cm"), rs.getBigDecimal("crown_radius_m"),
            rs.getObject("is_banded", Boolean.class), rs.getString("data_source"),
            rs.getString("element_type_code"), rs.getString("element_type_label"), rs.getString("slug"),
            rs.getObject("attachment_id", Long.class),
            rs.getString("species_common_name"), rs.getString("species_scientific_name"),
            rs.getObject("measured_at", LocalDate.class), rs.getBoolean("species_critical"),
            rs.getBigDecimal("reference_height_m"), rs.getBigDecimal("reference_crown_radius_m"),
            rs.getString("height_source_label"), rs.getString("crown_source_label"));

    private static final RowMapper<RetiredSpecimenResponse> RETIRED_ROW = (rs, i) -> {
        Timestamp retiredAtTs = rs.getTimestamp("retired_at");
        Instant retiredAt = retiredAtTs == null ? null : retiredAtTs.toInstant();
        return new RetiredSpecimenResponse(
                rs.getLong("id"),
                rs.getString("code"),
                rs.getString("scientific_name"),
                rs.getString("common_name"),
                rs.getString("species_slug"),
                rs.getString("vegetation_type"),
                rs.getString("source_location"),
                rs.getString("source_reference"),
                rs.getString("notes"),
                rs.getObject("lat", Double.class),
                rs.getObject("lon", Double.class),
                retiredAt,
                rs.getString("reason"),
                rs.getString("retired_by_name"),
                rs.getString("retired_by_email"),
                rs.getInt("interventions_count")
        );
    };

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

    public Optional<LocalDate> lastPruningDate(long specimenId) {
        return Optional.ofNullable(jdbc.queryForObject(InventoryQueries.LAST_PRUNING,
                new MapSqlParameterSource("id", specimenId), LocalDate.class));
    }

    public List<SpecimenSearchResultResponse> search(String query, int limit) {
        String trimmed = query != null ? query.trim() : "";
        if (trimmed.isEmpty()) {
            return List.of();
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("search", LikePattern.contains(trimmed))
                .addValue("rawSearch", trimmed)
                .addValue("prefixSearch", trimmed + "%")
                .addValue("limit", Math.min(Math.max(limit, 1), 50));
        return jdbc.query(InventoryQueries.SPECIMEN_SEARCH, params, (rs, i) -> new SpecimenSearchResultResponse(
                rs.getString("code"),
                rs.getString("source_reference"),
                rs.getString("source_location"),
                rs.getString("legacy_code"),
                rs.getString("species_slug"),
                rs.getString("species_common_name"),
                rs.getString("species_scientific_name")
        ));
    }

    public List<RetiredSpecimenResponse> retiredPage(String search, int page, int size) {
        String trimmed = (search == null || search.isBlank()) ? null : search.trim();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("search", LikePattern.contains(trimmed))
                .addValue("limit", size)
                .addValue("offset", (long) page * size);
        return jdbc.query(InventoryQueries.RETIRED_SPECIMEN_PAGE, params, RETIRED_ROW);
    }

    public long retiredCount(String search) {
        String trimmed = (search == null || search.isBlank()) ? null : search.trim();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("search", LikePattern.contains(trimmed));
        Long total = jdbc.queryForObject(InventoryQueries.RETIRED_SPECIMEN_COUNT, params, Long.class);
        return total == null ? 0 : total;
    }

    public Optional<RetiredSpecimenResponse> retiredByCode(String code) {
        return jdbc.query(InventoryQueries.RETIRED_SPECIMEN_BY_CODE, new MapSqlParameterSource("code", code), RETIRED_ROW)
                .stream().findFirst();
    }

    public Optional<SpecimenRow> retiredSpecimenRowByCode(String code) {
        return jdbc.query(InventoryQueries.RETIRED_SPECIMEN_ROW_BY_CODE, new MapSqlParameterSource("code", code), ROW)
                .stream().findFirst();
    }

    private static MapSqlParameterSource filter(String speciesSlug, SpecimenQuery query) {
        return new MapSqlParameterSource()
                .addValue("slug", speciesSlug)
                .addValue("location", query.location())
                .addValue("type", query.vegetationType())
                .addValue("critical", query.critical(), java.sql.Types.BOOLEAN)
                .addValue("measured", query.measured(), java.sql.Types.BOOLEAN)
                .addValue("search", LikePattern.contains(query.search()));
    }
}
