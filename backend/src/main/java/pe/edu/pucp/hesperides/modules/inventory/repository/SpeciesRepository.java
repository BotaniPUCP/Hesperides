package pe.edu.pucp.hesperides.modules.inventory.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.inventory.dto.SpeciesQuery;
import pe.edu.pucp.hesperides.modules.inventory.dto.VegetationTypeCount;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Lectura del catálogo de especies con SQL nativo: el inventario solo se lee, y
 * las búsquedas sin tildes y los conteos son más claros en SQL que en JPQL.
 */
@Repository
@RequiredArgsConstructor
public class SpeciesRepository {

    private static final RowMapper<SpeciesRow> ROW = (rs, i) -> new SpeciesRow(
            rs.getString("slug"), rs.getString("scientific_name"), rs.getString("common_name"),
            splitNames(rs.getString("other_names")), rs.getString("family"), rs.getString("type_code"),
            rs.getString("type_label"), rs.getLong("specimen_count"), rs.getString("photo_url"),
            rs.getObject("species_photo_id", Long.class), rs.getObject("specimen_photo_id", Long.class));

    private final NamedParameterJdbcTemplate jdbc;

    public List<SpeciesRow> page(SpeciesQuery query) {
        return jdbc.query(InventoryQueries.SPECIES_PAGE, filter(query)
                .addValue("limit", query.size())
                .addValue("offset", (long) query.page() * query.size()), ROW);
    }

    public long count(SpeciesQuery query) {
        Long total = jdbc.queryForObject(InventoryQueries.SPECIES_COUNT, filter(query), Long.class);
        return total == null ? 0 : total;
    }

    public Optional<SpeciesRow> bySlug(String slug) {
        return jdbc.query(InventoryQueries.SPECIES_BY_SLUG, new MapSqlParameterSource("slug", slug), ROW)
                .stream().findFirst();
    }

    /** [especies, ejemplares] vigentes. */
    public long[] totals() {
        return jdbc.queryForObject(InventoryQueries.TOTALS, new MapSqlParameterSource(),
                (rs, i) -> new long[] {rs.getLong("species"), rs.getLong("specimens")});
    }

    public List<VegetationTypeCount> typeCounts() {
        return jdbc.query(InventoryQueries.TYPE_COUNTS, new MapSqlParameterSource(),
                (rs, i) -> new VegetationTypeCount(rs.getString("code"), rs.getString("label"), rs.getLong("total")));
    }

    private static MapSqlParameterSource filter(SpeciesQuery query) {
        return new MapSqlParameterSource()
                .addValue("type", query.vegetationType())
                .addValue("search", LikePattern.contains(query.search()));
    }

    private static List<String> splitNames(String joined) {
        return joined == null ? List.of() : Arrays.asList(joined.split("\\|"));
    }
}
