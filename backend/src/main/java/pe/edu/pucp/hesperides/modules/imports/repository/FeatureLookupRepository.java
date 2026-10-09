package pe.edu.pucp.hesperides.modules.imports.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureVocabulary;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureVocabulary.Item;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Lo que la vista previa de tachos y bebederos consulta: códigos, vecinos y catálogos. */
@Repository
@RequiredArgsConstructor
public class FeatureLookupRepository {

    private static final String OF_TYPE = """
            FROM campus_features f JOIN catalog_items t ON t.id = f.feature_type_item_id
            WHERE t.code = ? AND f.deleted_at IS NULL""";

    private final JdbcTemplate jdbc;

    public Set<String> codes(String typeCode) {
        return new HashSet<>(jdbc.queryForList("SELECT f.code " + OF_TYPE + " AND f.code IS NOT NULL", String.class, typeCode));
    }

    /** Los ya registrados de ese tipo; la «especie» no aplica y va vacía. */
    public List<Nearby> registered(String typeCode) {
        return jdbc.query("SELECT f.code, ST_Y(ST_PointOnSurface(f.geom)), ST_X(ST_PointOnSurface(f.geom)) " + OF_TYPE,
                (rs, i) -> new Nearby(rs.getString(1), "", rs.getDouble(2), rs.getDouble(3)), typeCode);
    }

    public FeatureVocabulary vocabulary() {
        return new FeatureVocabulary(items("WASTE_STREAM"), items("FOUNTAIN_KIND"), items("FOUNTAIN_STATUS"));
    }

    private List<Item> items(String catalog) {
        return jdbc.query("""
                SELECT ci.code, ci.label FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                 WHERE ct.code = ? AND ci.is_active AND ci.deleted_at IS NULL ORDER BY ci.sort_order""",
                (rs, i) -> new Item(rs.getString(1), rs.getString(2)), catalog);
    }
}
