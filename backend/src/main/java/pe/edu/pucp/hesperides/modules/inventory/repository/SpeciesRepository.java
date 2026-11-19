package pe.edu.pucp.hesperides.modules.inventory.repository;


import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
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
            rs.getString("type_label"), rs.getString("origin_code"), rs.getString("origin_label"),
            rs.getString("description"), rs.getString("care_notes"), rs.getLong("specimen_count"),
            rs.getString("photo_url"), rs.getBoolean("is_active"), rs.getObject("species_photo_id", Long.class),
            rs.getObject("specimen_photo_id", Long.class), rs.getBoolean("is_critical"),
            rs.getBigDecimal("reference_height_m"), rs.getString("height_source_code"),
            rs.getString("height_source_label"), rs.getBigDecimal("reference_crown_radius_m"),
            rs.getString("crown_source_code"), rs.getString("crown_source_label"),
            rs.getBoolean("uses_trunk_height"), rs.getBoolean("uses_dbh"), rs.getLong("unmeasured_specimen_count"),
            rs.getString("search_key"));

    private final NamedParameterJdbcTemplate jdbc;

    /** Activas y en proceso de retiro, para buscarlas y filtrarlas en el navegador (SPEC-119). */
    public List<SpeciesRow> all() {
        return jdbc.query(InventoryQueries.SPECIES_ALL, ROW);
    }

    public Optional<SpeciesRow> bySlug(String slug) {
        return jdbc.query(InventoryQueries.SPECIES_BY_SLUG, new MapSqlParameterSource("slug", slug), ROW)
                .stream().findFirst();
    }

    public Optional<SpeciesRow> bySlugIncludeDeleted(String slug) {
        return jdbc.query(InventoryQueries.SPECIES_BY_SLUG_ANY, new MapSqlParameterSource("slug", slug), ROW)
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

    private static List<String> splitNames(String joined) {
        return joined == null ? List.of() : Arrays.asList(joined.split("\\|"));
    }
}
