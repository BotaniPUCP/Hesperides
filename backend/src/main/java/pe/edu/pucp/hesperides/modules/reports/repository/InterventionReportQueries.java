package pe.edu.pucp.hesperides.modules.reports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.ClassOption;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse.TypeOption;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Intervention taxonomy and counts for the reports. Parameterized native SQL only. */
@Repository
@RequiredArgsConstructor
public class InterventionReportQueries {

    private final NamedParameterJdbcTemplate jdbc;

    /** Active classes with their active types (SPEC-200 §2.4). A type under an inactive class is not offered. */
    public List<ClassOption> activeClassesWithTypes() {
        var classes = new LinkedHashMap<Long, ClassOption>();
        jdbc.query("""
            select c.id, c.code, c.label, t.id type_id, t.code type_code, t.label type_label
            from catalog_items c
            join catalog_types ct on ct.id=c.catalog_type_id and ct.code='INTERVENTION_CLASS'
            left join catalog_items t on t.parent_item_id=c.id and t.is_active and t.deleted_at is null
                and t.catalog_type_id=(select id from catalog_types where code='INTERVENTION_TYPE')
            where c.is_active and c.deleted_at is null
            order by c.sort_order, c.label, t.sort_order, t.label
            """, Map.of(), rs -> {
            long classId = rs.getLong("id");
            String code = rs.getString("code");
            String label = rs.getString("label");
            ClassOption option = classes.computeIfAbsent(classId,
                    id -> new ClassOption(id, code, label, new ArrayList<>()));
            long typeId = rs.getLong("type_id");
            if (!rs.wasNull()) {
                option.types().add(new TypeOption(typeId, rs.getString("type_code"), rs.getString("type_label")));
            }
        });
        return List.copyOf(classes.values());
    }
}
