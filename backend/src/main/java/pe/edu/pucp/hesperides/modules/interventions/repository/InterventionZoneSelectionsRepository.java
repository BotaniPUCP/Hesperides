package pe.edu.pucp.hesperides.modules.interventions.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionZoneSelections.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Point;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class InterventionZoneSelectionsRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public record ReviewRow(long id, long version, String revision, long actor, Instant at) { }

    public void lockInventory() {
        // Serialize review replacement and keep master geometries stable until the plan commits.
        jdbc.execute("SELECT pg_advisory_xact_lock(hashtextextended('interventions:zone-selection',0))");
        jdbc.execute("LOCK TABLE places, zones, place_buildings, campus_buildings, campus_features IN SHARE MODE");
    }

    public List<Place> places() {
        return jdbc.query("""
            SELECT p.id,p.code,p.name,COALESCE(ST_IsValid(COALESCE(o.geom,po.geom))
                AND NOT ST_IsEmpty(COALESCE(o.geom,po.geom))
                AND GeometryType(COALESCE(o.geom,po.geom)) IN ('POLYGON','MULTIPOLYGON'),FALSE) valid,
                ST_AsGeoJSON(COALESCE(o.geom,po.geom),15) geometry
            FROM places p LEFT JOIN place_outlines o ON o.place_id=p.id
            LEFT JOIN places pp ON pp.id=p.parent_place_id AND pp.deleted_at IS NULL
            LEFT JOIN place_outlines po ON po.place_id=pp.id
            WHERE p.deleted_at IS NULL ORDER BY p.id
            """,(rs,n)->new Place(rs.getLong("id"),rs.getString("code"),rs.getString("name"),
                rs.getBoolean("valid"),rs.getString("geometry")==null?null:json.readTree(rs.getString("geometry"))));
    }

    public List<Zone> zones() {
        return jdbc.query("""
            WITH source AS (
                SELECT z.*,COALESCE(ST_IsValid(z.boundary) AND NOT ST_IsEmpty(z.boundary),FALSE) valid
                FROM zones z JOIN catalog_items t ON t.id=z.zone_type_item_id
                JOIN catalog_types ct ON ct.id=t.catalog_type_id
                JOIN catalog_items l ON l.id=z.landscape_type_item_id
                WHERE z.deleted_at IS NULL AND z.is_active AND ct.code='ZONE_TYPE' AND t.code='SECTION'
                  AND t.is_active AND t.deleted_at IS NULL AND ct.deleted_at IS NULL
                  AND l.is_active AND l.deleted_at IS NULL AND l.code IN ('GREEN_AREA','XEROPHYTIC')
            ) SELECT id,code,name,valid,ST_AsGeoJSON(boundary,15) geometry,
                CASE WHEN valid THEN round(ST_Area(boundary::geography)::numeric,2) END area,
                CASE WHEN valid THEN ST_Y(ST_PointOnSurface(boundary)) END lat,
                CASE WHEN valid THEN ST_X(ST_PointOnSurface(boundary)) END lon,
                CASE WHEN valid THEN ST_NumGeometries(boundary) ELSE 0 END parts
            FROM source ORDER BY id
            """,(rs,n)->new Zone(rs.getLong("id"),rs.getString("code"),rs.getString("name"),
                rs.getBoolean("valid"),rs.getString("geometry")==null?null:json.readTree(rs.getString("geometry")),
                rs.getBigDecimal("area"),rs.getBoolean("valid")?new Point(rs.getDouble("lat"),rs.getDouble("lon")):null,
                rs.getInt("parts")));
    }

    public Optional<ReviewRow> review(long place) {
        return jdbc.query("""
            SELECT id,version,dataset_revision,reviewed_by_user_id,created_at
            FROM intervention_place_zone_reviews WHERE place_id=? AND deleted_at IS NULL
            """,(rs,n)->new ReviewRow(rs.getLong(1),rs.getLong(2),rs.getString(3),rs.getLong(4),
                rs.getTimestamp(5).toInstant()),place).stream().findFirst();
    }
    public Set<Long> associated(long review) {
        return new TreeSet<>(jdbc.query("SELECT zone_id FROM intervention_place_zone_links WHERE review_id=? AND deleted_at IS NULL ORDER BY zone_id",
            (rs,n)->rs.getLong(1),review));
    }
    public void replace(long place,long version,String revision,long actor,String reason,Collection<Long> zones,Set<Long> multipart) {
        jdbc.update("UPDATE intervention_place_zone_reviews SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE place_id=? AND deleted_at IS NULL",place);
        long id=jdbc.queryForObject("""
            INSERT INTO intervention_place_zone_reviews(place_id,version,dataset_revision,reviewed_by_user_id,reason)
            VALUES (?,?,?,?,?) RETURNING id
            """,Long.class,place,version,revision,actor,reason);
        for(long zone:zones) jdbc.update("INSERT INTO intervention_place_zone_links(review_id,zone_id,multipart_acknowledged) VALUES (?,?,?)",id,zone,multipart.contains(zone));
    }
    public BigDecimal plannedSurface(long intervention) {
        return jdbc.queryForObject("""
            SELECT round(ST_Area(ST_UnaryUnion(ST_Collect(ST_SetSRID(
                ST_GeomFromGeoJSON(zone_boundary_snapshot::text),4326)))::geography)::numeric,2)
            FROM intervention_locations WHERE intervention_id=? AND deleted_at IS NULL
              AND zone_selection_revision IS NOT NULL
            """,BigDecimal.class,intervention);
    }
    public BigDecimal currentSurface(Collection<Long> ids) {
        return new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc).queryForObject("""
            SELECT round(ST_Area(ST_UnaryUnion(ST_Collect(boundary))::geography)::numeric,2)
            FROM zones WHERE id IN (:ids)
            """,Map.of("ids",ids),BigDecimal.class);
    }
}
