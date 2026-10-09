package pe.edu.pucp.hesperides.modules.imports.features;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview.PlannedFeature;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Escribe un tacho o bebedero: lo crea o lo corrige. Quien llama abre la
 * transacción. Corregir mezcla los atributos: lo que la fila no menciona se
 * conserva.
 */
@Component
@RequiredArgsConstructor
public class FeatureWriter {

    private static final String TYPE = "(SELECT ci.id FROM catalog_items ci JOIN catalog_types ct "
            + "ON ct.id = ci.catalog_type_id WHERE ct.code = 'FEATURE_TYPE' AND ci.code = ?)";
    /** Serializa la numeración de códigos nuevos entre cargas simultáneas. */
    private static final String CODE_LOCK = "SELECT pg_advisory_xact_lock(hashtext('campus_feature_code'))";

    public record Written(long id, String code) {
    }

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public Written write(FeatureKind kind, PlannedFeature row, Long batchId) {
        FeatureDraft d = row.draft();
        String attributes = json.writeValueAsString(withPhotoLink(d));
        if (row.action() == ImportAction.UPDATE) {
            return jdbc.queryForObject("""
                    UPDATE campus_features SET name = COALESCE(?, name), geom = ST_SetSRID(ST_MakePoint(?, ?), 4326),
                           attributes = COALESCE(attributes, '{}'::jsonb) || CAST(? AS jsonb), updated_at = CURRENT_TIMESTAMP
                     WHERE code = ? AND feature_type_item_id = %s AND deleted_at IS NULL
                    RETURNING id, code""".formatted(TYPE),
                    (rs, i) -> new Written(rs.getLong(1), rs.getString(2)), d.name(), d.lon(), d.lat(), attributes,
                    d.code(), kind.typeCode());
        }
        jdbc.execute(CODE_LOCK);
        return jdbc.queryForObject("""
                INSERT INTO campus_features (code, feature_type_item_id, name, geom, attributes, import_batch_id)
                VALUES (? || '-' || LPAD((SELECT COALESCE(MAX(substring(code FROM '[0-9]+$')::int), 0) + 1
                                            FROM campus_features WHERE code ~ ?)::text, 6, '0'),
                        %s, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), CAST(? AS jsonb), ?)
                RETURNING id, code""".formatted(TYPE),
                (rs, i) -> new Written(rs.getLong(1), rs.getString(2)), kind.codePrefix(),
                "^" + kind.codePrefix() + "-[0-9]+$", kind.typeCode(), d.name(), d.lon(), d.lat(), attributes, batchId);
    }

    public void attachPhoto(long featureId, StoredPhoto photo, String fileName, String sourceUrl, long userId) {
        jdbc.update("""
                INSERT INTO campus_feature_attachments (campus_feature_id, storage_key, thumbnail_storage_key,
                    original_filename, content_type, size_bytes, source_url, uploaded_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                featureId, photo.storageKey(), photo.thumbnailKey(), fileName, photo.contentType(), photo.sizeBytes(),
                sourceUrl, userId);
    }

    /** Los datos cargados guardan el enlace de Drive en {@code foto}: se sigue igual. */
    private static Map<String, Object> withPhotoLink(FeatureDraft d) {
        Map<String, Object> out = new LinkedHashMap<>(d.attributes());
        if (d.photo() != null && d.photo().startsWith("http")) {
            out.put("foto", d.photo());
        }
        return out;
    }
}
