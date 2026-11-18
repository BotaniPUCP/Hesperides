package pe.edu.pucp.hesperides.modules.reservations.balloons;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Reservas en curso (SPEC-107: entre su inicio y su fin, sin anular), con un punto dentro
 * del contorno del jardín reservado. Solo nombres de organización: la ficha corta nunca
 * lleva contactos (SPEC-113 §9).
 */
@Repository
@RequiredArgsConstructor
public class ReservationBalloonQueries {

    public record InProgress(String code, String placeName, String requestedBy, Instant startsAt, Instant endsAt,
                             boolean spaceUsed, double latitude, double longitude) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public List<InProgress> inProgress(Instant now) {
        return jdbc.query("""
                SELECT r.code, p.name AS place_name, o.name AS requested_by, r.starts_at, r.ends_at, r.space_used,
                       ST_Y(ST_PointOnSurface(po.geom)) AS lat, ST_X(ST_PointOnSurface(po.geom)) AS lon
                  FROM garden_reservations r
                  JOIN places p ON p.id = r.place_id
                  JOIN organizations o ON o.id = r.requested_by_organization_id
                  JOIN place_outlines po ON po.place_id = r.place_id
                 WHERE r.deleted_at IS NULL AND r.cancelled_at IS NULL
                   AND r.starts_at <= :now AND r.ends_at > :now AND po.geom IS NOT NULL
                 ORDER BY r.code""", new MapSqlParameterSource("now", Timestamp.from(now)), (rs, n) -> new InProgress(
                rs.getString("code"), rs.getString("place_name"), rs.getString("requested_by"),
                rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                rs.getObject("ends_at", OffsetDateTime.class).toInstant(), rs.getBoolean("space_used"),
                rs.getDouble("lat"), rs.getDouble("lon")));
    }
}
