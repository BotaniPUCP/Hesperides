package pe.edu.pucp.hesperides.modules.incidents.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Correlativo anual del código INC-AAAA-NNNN; el UPSERT lo hace seguro ante capturas simultáneas. */
@Repository @RequiredArgsConstructor
public class IncidentCodeCounters {
    private final JdbcTemplate jdbc;

    public long next(int year) {
        return jdbc.queryForObject("""
            INSERT INTO incident_code_counters(year,last_number) VALUES (?,1)
            ON CONFLICT (year) DO UPDATE SET last_number = incident_code_counters.last_number + 1
            RETURNING last_number
            """, Long.class, year);
    }
}
