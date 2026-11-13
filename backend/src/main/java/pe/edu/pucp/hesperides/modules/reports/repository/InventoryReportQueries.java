package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;

/** Catalog and team figures of the direction summary (SPEC-202 §2.6 rows 26 and 28). */
@Repository
@RequiredArgsConstructor
public class InventoryReportQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /**
     * Active INDIVIDUAL specimens of TREE or PALM species registered up to
     * {@code upTo}, inclusive (§3.6). Specimens retired later are excluded from
     * every month: a declared limit, since the retirement date is not kept.
     */
    public long treesRegisteredBy(LocalDate upTo, ZoneId zone) {
        Long count = jdbc.queryForObject("""
            select count(*) from green_elements g
            join catalog_items et on et.id=g.element_type_item_id and et.code='INDIVIDUAL'
            join catalog_types ett on ett.id=et.catalog_type_id and ett.code='GREEN_ELEMENT_TYPE'
            join species sp on sp.id=g.species_id
            join catalog_items st on st.id=sp.species_type_item_id and st.code in ('TREE','PALM')
            join catalog_types stt on stt.id=st.catalog_type_id and stt.code='SPECIES_TYPE'
            where g.is_active and g.deleted_at is null
              and ((g.created_at at time zone 'UTC') at time zone :tz)::date <= :upTo
            """, new MapSqlParameterSource().addValue("tz", zone.getId()).addValue("upTo", upTo), Long.class);
        return count == null ? 0 : count;
    }

    public long activeTeams() {
        Long count = jdbc.queryForObject(
                "select count(*) from teams t where t.is_active and t.deleted_at is null",
                new MapSqlParameterSource(), Long.class);
        return count == null ? 0 : count;
    }
}
