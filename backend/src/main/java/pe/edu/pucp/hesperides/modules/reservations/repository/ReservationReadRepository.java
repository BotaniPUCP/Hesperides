package pe.edu.pucp.hesperides.modules.reservations.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/**
 * Lecturas de reservas: agenda, selectores, cruces y cercanía (SPEC-107 §3, §5).
 * La cercanía es PostGIS puro: {@code ST_Distance} sobre geografía devuelve
 * metros reales y no grados.
 */
@Repository
@RequiredArgsConstructor
public class ReservationReadRepository {

    public record ReservationRow(String code, long placeId, String placeCode, String placeName,
            String requestedByCode, String requestedByName, String requestedForCode, String requestedForName,
            String requesterCode, String requesterName, String requesterRole, String requesterMobile,
            String requesterExtension, String responsibleCode, String responsibleName, String responsibleRole,
            String responsibleMobile, String responsibleExtension, Instant startsAt, Instant endsAt,
            String purpose, Instant cancelledAt, String cancelReason, long version) {
    }

    public record ResponsibleRow(String contactCode, String contactName, String contactRole,
            Instant assignedAt, String assignedBy) {
    }

    public record GardenRow(long id, String code, String name, List<String> aliases) {
    }

    public record OrganizationRow(long id, String code, String name) {
    }

    public record PlaceRow(long id, String code, String name) {
    }

    public record ContactRow(long id, String code, String fullName, String mobile, String extension) {
    }

    public record OverlapRow(String code, Instant startsAt, Instant endsAt, String organizationName) {
    }

    public record WorkRow(long interventionId, String interventionCode, LocalDate scheduledDate,
            Instant startedAt, String locationName, boolean here, Double distanceMeters) {
    }

    public record NearbyRow(String code, String placeName, String organizationName, Instant startsAt,
            Instant endsAt, boolean here, Double distanceMeters) {
    }

    /**
     * El rol del responsable es el de su vínculo con «Para» si está vinculado a
     * ella, si no con «Pedido de», si no ninguno (D-08b).
     */
    private static final String RESPONSIBLE_ROLE = """
            COALESCE(
                (SELECT l.role FROM contact_organizations l
                  WHERE l.contact_id = rs.id AND l.organization_id = rf.id AND l.deleted_at IS NULL),
                (SELECT l.role FROM contact_organizations l
                  WHERE l.contact_id = rs.id AND l.organization_id = rb.id AND l.deleted_at IS NULL))""";

    private static final String SELECT_RESERVATION = """
            SELECT r.code, r.place_id, p.code AS place_code, p.name AS place_name,
                   rb.code AS requested_by_code, rb.name AS requested_by_name,
                   rf.code AS requested_for_code, rf.name AS requested_for_name,
                   rq.code AS requester_code, rq.full_name AS requester_name,
                   (SELECT l.role FROM contact_organizations l
                     WHERE l.contact_id = rq.id AND l.organization_id = rb.id AND l.deleted_at IS NULL)
                       AS requester_role,
                   rq.mobile AS requester_mobile, rq.extension AS requester_extension,
                   rs.code AS responsible_code, rs.full_name AS responsible_name,
            """ + RESPONSIBLE_ROLE + " AS responsible_role,\n"
            + """
                   rs.mobile AS responsible_mobile, rs.extension AS responsible_extension,
                   r.starts_at, r.ends_at, r.purpose, r.cancelled_at, r.cancel_reason, r.version
              FROM garden_reservations r
              JOIN places p ON p.id = r.place_id
              JOIN organizations rb ON rb.id = r.requested_by_organization_id
              LEFT JOIN organizations rf ON rf.id = r.requested_for_organization_id
              JOIN contacts rq ON rq.id = r.requester_contact_id
              JOIN contacts rs ON rs.id = r.responsible_contact_id""";

    private static final String FILTERS = """
             WHERE r.deleted_at IS NULL
               AND (:includeCancelled OR r.cancelled_at IS NULL)
               AND r.ends_at > :from
               AND r.starts_at < :to
               AND (CAST(:placeId AS BIGINT) IS NULL OR r.place_id = CAST(:placeId AS BIGINT))
               AND (CAST(:organizationCode AS TEXT) IS NULL
                    OR rb.code = CAST(:organizationCode AS TEXT)
                    OR rf.code = CAST(:organizationCode AS TEXT))""";

    private static final RowMapper<ReservationRow> RESERVATION = (rs, i) -> new ReservationRow(
            rs.getString("code"), rs.getLong("place_id"), rs.getString("place_code"), rs.getString("place_name"),
            rs.getString("requested_by_code"), rs.getString("requested_by_name"),
            rs.getString("requested_for_code"), rs.getString("requested_for_name"),
            rs.getString("requester_code"), rs.getString("requester_name"), rs.getString("requester_role"),
            rs.getString("requester_mobile"), rs.getString("requester_extension"),
            rs.getString("responsible_code"), rs.getString("responsible_name"), rs.getString("responsible_role"),
            rs.getString("responsible_mobile"), rs.getString("responsible_extension"),
            rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
            rs.getObject("ends_at", OffsetDateTime.class).toInstant(), rs.getString("purpose"),
            instant(rs, "cancelled_at"), rs.getString("cancel_reason"), rs.getLong("version"));

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    public List<ReservationRow> page(OffsetDateTime from, OffsetDateTime to, boolean includeCancelled, Long placeId,
            String organizationCode, int size, int offset) {
        MapSqlParameterSource params = filterParams(from, to, includeCancelled, placeId, organizationCode)
                .addValue("size", size)
                .addValue("offset", offset);
        return named.query(SELECT_RESERVATION + " " + FILTERS
                + " ORDER BY r.starts_at, r.code LIMIT :size OFFSET :offset", params, RESERVATION);
    }

    public long count(OffsetDateTime from, OffsetDateTime to, boolean includeCancelled, Long placeId,
            String organizationCode) {
        MapSqlParameterSource params = filterParams(from, to, includeCancelled, placeId, organizationCode);
        Long total = named.queryForObject("SELECT count(*) FROM garden_reservations r"
                + " JOIN places p ON p.id = r.place_id"
                + " JOIN organizations rb ON rb.id = r.requested_by_organization_id"
                + " LEFT JOIN organizations rf ON rf.id = r.requested_for_organization_id " + FILTERS,
                params, Long.class);
        return total == null ? 0 : total;
    }

    public ReservationRow byCode(String code) {
        return jdbc.query(SELECT_RESERVATION + " WHERE r.deleted_at IS NULL AND r.code = ?", RESERVATION, code)
                .stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + code));
    }

    /** El historial de responsables de la ficha (D-02b), del primero al vigente. */
    public List<ResponsibleRow> responsibleHistory(String code) {
        return jdbc.query("""
                SELECT c.code, c.full_name,
                       (SELECT l.role FROM contact_organizations l
                         WHERE l.contact_id = c.id AND l.organization_id = r.requested_by_organization_id
                           AND l.deleted_at IS NULL) AS role,
                       h.assigned_at, u.email AS assigned_by
                  FROM garden_reservation_responsibles h
                  JOIN garden_reservations r ON r.id = h.reservation_id
                  JOIN contacts c ON c.id = h.contact_id
                  JOIN users u ON u.id = h.assigned_by_user_id
                 WHERE r.code = ?
                 ORDER BY h.assigned_at""", (rs, i) -> new ResponsibleRow(rs.getString("code"),
                rs.getString("full_name"), rs.getString("role"),
                rs.getObject("assigned_at", OffsetDateTime.class).toInstant(), rs.getString("assigned_by")), code);
    }

    /**
     * Los jardines prestables que se ofrecen: lugares de primer nivel con una
     * sección prestable propia o en sus hijos. Se excluyen los hijos de Palmeras,
     * que son sus dos lados y no dos jardines distintos (V035, SPEC-107 §2.1).
     */
    public List<GardenRow> gardens(String search) {
        return jdbc.query("""
                SELECT p.id, p.code, p.name,
                       COALESCE((SELECT array_agg(a.alias ORDER BY lower(a.alias)) FROM place_aliases a
                                  WHERE a.place_id = p.id AND a.deleted_at IS NULL), '{}') AS aliases
                  FROM places p
                 WHERE p.deleted_at IS NULL AND p.parent_place_id IS NULL
                   AND EXISTS (SELECT 1 FROM zones z
                                WHERE z.deleted_at IS NULL AND z.is_reservable
                                  AND (z.id = p.zone_id OR z.id IN (SELECT c.zone_id FROM places c
                                         WHERE c.parent_place_id = p.id AND c.deleted_at IS NULL)))
                   AND (CAST(? AS TEXT) IS NULL OR directory_key(concat_ws(' ', p.code, p.name,
                        (SELECT string_agg(a.alias, ' ') FROM place_aliases a
                          WHERE a.place_id = p.id AND a.deleted_at IS NULL))) LIKE directory_key(?))
                 ORDER BY lower(p.name)""", (rs, i) -> new GardenRow(rs.getLong("id"), rs.getString("code"),
                rs.getString("name"), strings(rs.getArray("aliases"))), search, search);
    }

    public PlaceRow place(long id) {
        return jdbc.query("""
                SELECT p.id, p.code, p.name FROM places p
                 WHERE p.id = ? AND p.deleted_at IS NULL
                   AND EXISTS (SELECT 1 FROM zones z WHERE z.deleted_at IS NULL AND z.is_reservable
                                AND (z.id = p.zone_id OR z.id IN (SELECT c.zone_id FROM places c
                                       WHERE c.parent_place_id = p.id AND c.deleted_at IS NULL)))""",
                (rs, i) -> new PlaceRow(rs.getLong("id"), rs.getString("code"), rs.getString("name")), id)
                .stream().findFirst().orElse(null);
    }

    public OrganizationRow organization(String code) {
        return jdbc.query("SELECT id, code, name FROM organizations WHERE code = ? AND deleted_at IS NULL",
                (rs, i) -> new OrganizationRow(rs.getLong("id"), rs.getString("code"), rs.getString("name")), code)
                .stream().findFirst().orElse(null);
    }

    /** La organización de una reserva ya guardada: puede estar dada de baja y se sigue mostrando. */
    public OrganizationRow organizationById(long id) {
        return jdbc.query("SELECT id, code, name FROM organizations WHERE id = ?",
                (rs, i) -> new OrganizationRow(rs.getLong("id"), rs.getString("code"), rs.getString("name")), id)
                .stream().findFirst().orElse(null);
    }

    /** El responsable puede ser cualquier contacto vigente del Directorio (SPEC-107 D-02). */
    public ContactRow contactById(long id) {
        return jdbc.query(
                "SELECT id, code, full_name, mobile, extension FROM contacts WHERE id = ? AND deleted_at IS NULL",
                (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"), rs.getString("full_name"),
                        rs.getString("mobile"), rs.getString("extension")), id)
                .stream().findFirst().orElse(null);
    }

    /** El responsable del formulario llega por código, exacto (SPEC-107 §3.2). */
    public ContactRow contactByCode(String code) {
        String value = code == null ? null : code.strip();
        if (value == null || value.isEmpty()) {
            return null;
        }
        return jdbc.query("SELECT id, code, full_name, mobile, extension FROM contacts "
                        + "WHERE deleted_at IS NULL AND code = upper(?)",
                (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"), rs.getString("full_name"),
                        rs.getString("mobile"), rs.getString("extension")), value)
                .stream().findFirst().orElse(null);
    }

    /** El registro masivo acepta código o nombre; el nombre ambiguo devuelve dos y la fila falla. */
    public List<ContactRow> contactsByCodeOrName(String text) {
        String value = text == null ? null : text.strip();
        if (value == null || value.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT c.id, c.code, c.full_name, c.mobile, c.extension FROM contacts c
                 WHERE c.deleted_at IS NULL
                   AND (c.code = upper(btrim(?)) OR directory_key(c.full_name) = directory_key(?))""",
                (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"), rs.getString("full_name"),
                        rs.getString("mobile"), rs.getString("extension")), value, value);
    }

    /**
     * Resuelve el jardín de una fila del registro masivo (SPEC-107 §5.4): por el
     * nombre del lugar, uno de sus alias o el código de una de sus secciones.
     * Devuelve también los lugares no prestables para poder explicar el error.
     */
    public PlaceRow gardenMatching(String text, boolean onlyReservable) {
        return jdbc.query("""
                SELECT p.id, p.code, p.name FROM places p
                 WHERE p.deleted_at IS NULL AND p.parent_place_id IS NULL
                   AND (p.code = upper(btrim(?))
                        OR directory_key(p.name) = directory_key(?)
                        OR EXISTS (SELECT 1 FROM place_aliases a WHERE a.place_id = p.id
                                    AND a.deleted_at IS NULL AND directory_key(a.alias) = directory_key(?))
                        OR EXISTS (SELECT 1 FROM zones z WHERE z.code = upper(btrim(?)) AND z.deleted_at IS NULL
                                    AND (z.id = p.zone_id OR z.id IN (SELECT c.zone_id FROM places c
                                           WHERE c.parent_place_id = p.id AND c.deleted_at IS NULL))))
                   AND (NOT ? OR EXISTS (SELECT 1 FROM zones z WHERE z.deleted_at IS NULL AND z.is_reservable
                                          AND (z.id = p.zone_id OR z.id IN (SELECT c.zone_id FROM places c
                                                 WHERE c.parent_place_id = p.id AND c.deleted_at IS NULL))))
                 ORDER BY directory_key(p.name) = directory_key(?) DESC, p.code = upper(btrim(?)) DESC, p.id
                 LIMIT 1""",
                (rs, i) -> new PlaceRow(rs.getLong("id"), rs.getString("code"), rs.getString("name")),
                text, text, text, text, onlyReservable, text, text)
                .stream().findFirst().orElse(null);
    }

    /** El contacto debe estar vigente y vinculado a esa organización (SPEC-107 D-02). */
    public ContactRow contact(String code, long organizationId) {
        return jdbc.query("""
                SELECT c.id, c.code, c.full_name, c.mobile, c.extension FROM contacts c
                 WHERE c.code = ? AND c.deleted_at IS NULL
                   AND EXISTS (SELECT 1 FROM contact_organizations co
                                WHERE co.contact_id = c.id AND co.organization_id = ?
                                  AND co.deleted_at IS NULL)""",
                (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"), rs.getString("full_name"),
                        rs.getString("mobile"), rs.getString("extension")), code, organizationId)
                .stream().findFirst().orElse(null);
    }

    /** Un contacto del registro masivo, por código o por nombre (SPEC-107 §5.4). */
    public ContactRow contactMatching(String text, long organizationId) {
        return jdbc.query("""
                SELECT c.id, c.code, c.full_name, c.mobile, c.extension FROM contacts c
                 WHERE c.deleted_at IS NULL
                   AND (c.code = upper(btrim(?)) OR directory_key(c.full_name) = directory_key(?))
                   AND EXISTS (SELECT 1 FROM contact_organizations co
                                WHERE co.contact_id = c.id AND co.organization_id = ?
                                  AND co.deleted_at IS NULL)
                 ORDER BY c.code = upper(btrim(?)) DESC, c.id LIMIT 1""",
                (rs, i) -> new ContactRow(rs.getLong("id"), rs.getString("code"), rs.getString("full_name"),
                        rs.getString("mobile"), rs.getString("extension")), text, text, organizationId, text)
                .stream().findFirst().orElse(null);
    }

    /** Solo las organizaciones que ya piden o reciben alguna reserva (SPEC-107 D-08). */
    public List<OrganizationRow> organizations() {
        return jdbc.query("""
                SELECT id, code, name FROM (
                    SELECT o.id, o.code, o.name FROM garden_reservations r
                      JOIN organizations o ON o.id = r.requested_by_organization_id
                     WHERE r.deleted_at IS NULL
                    UNION
                    SELECT o.id, o.code, o.name FROM garden_reservations r
                      JOIN organizations o ON o.id = r.requested_for_organization_id
                     WHERE r.deleted_at IS NULL AND r.requested_for_organization_id IS NOT NULL) u
                 ORDER BY lower(name)""",
                (rs, i) -> new OrganizationRow(rs.getLong("id"), rs.getString("code"), rs.getString("name")));
    }

    public List<OverlapRow> overlaps(long placeId, Instant startsAt, Instant endsAt, String excludeCode) {
        return jdbc.query("""
                SELECT r.code, r.starts_at, r.ends_at, o.name AS organization_name
                  FROM garden_reservations r JOIN organizations o ON o.id = r.requested_by_organization_id
                 WHERE r.place_id = ? AND r.deleted_at IS NULL AND r.cancelled_at IS NULL
                   AND r.starts_at < ? AND r.ends_at > ?
                   AND (CAST(? AS TEXT) IS NULL OR r.code <> ?)
                 ORDER BY r.starts_at""",
                (rs, i) -> new OverlapRow(rs.getString("code"),
                        rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                        rs.getObject("ends_at", OffsetDateTime.class).toInstant(),
                        rs.getString("organization_name")),
                placeId, OffsetDateTime.ofInstant(endsAt, java.time.ZoneOffset.UTC),
                OffsetDateTime.ofInstant(startsAt, java.time.ZoneOffset.UTC), excludeCode, excludeCode);
    }

    /**
     * Trabajo que puede estar ocurriendo en el jardín reservado o a su alrededor
     * (SPEC-107 D-03b, D-06): intervención no cancelada, ubicación con trabajo
     * pendiente, programada hasta el último día de la reserva y no completada
     * antes de que esta empiece. La geometría de la ubicación sigue el mismo
     * orden que la operación real: sección, lugar, coordenadas, primer ejemplar.
     */
    public List<WorkRow> pendingWork(long placeId, Instant startsAt, LocalDate lastDay, int meters, String timeZone) {
        return named.query("""
                WITH reserved_zones AS (
                    SELECT z.id FROM zones z WHERE z.deleted_at IS NULL
                       AND (z.id = (SELECT zone_id FROM places WHERE id = :placeId)
                            OR z.id IN (SELECT c.zone_id FROM places c
                                         WHERE c.parent_place_id = :placeId AND c.deleted_at IS NULL))
                ), reserved_places AS (
                    SELECT :placeId AS id
                    UNION SELECT c.id FROM places c WHERE c.parent_place_id = :placeId AND c.deleted_at IS NULL
                ), outline AS (
                    SELECT (SELECT geom FROM place_outlines WHERE place_id = :placeId) AS geom
                ), candidates AS (
                    SELECT i.id AS intervention_id, i.code, i.scheduled_date, l.id AS location_id,
                           l.started_at, l.zone_id, l.place_id,
                           COALESCE((SELECT p.name FROM places p WHERE p.id = l.place_id),
                                    (SELECT z.name FROM zones z WHERE z.id = l.zone_id)) AS location_name,
                           CASE WHEN l.zone_id IS NOT NULL THEN z.boundary
                                WHEN l.place_id IS NOT NULL THEN po.geom
                                WHEN l.location IS NOT NULL THEN l.location
                                ELSE (SELECT COALESCE(ge.location, ge.area) FROM intervention_elements ie
                                        JOIN green_elements ge ON ge.id = ie.green_element_id
                                       WHERE ie.intervention_location_id = l.id AND ie.deleted_at IS NULL
                                       ORDER BY ie.id LIMIT 1) END AS geom
                      FROM interventions i
                      JOIN catalog_items ps ON ps.id = i.planning_status_item_id AND ps.code <> 'CANCELLED'
                      JOIN intervention_locations l ON l.intervention_id = i.id AND l.deleted_at IS NULL
                      JOIN catalog_items st ON st.id = l.status_item_id
                        AND st.code NOT IN ('COMPLETED', 'VALIDATED', 'CANCELLED')
                      LEFT JOIN zones z ON z.id = l.zone_id
                      LEFT JOIN place_outlines po ON po.place_id = l.place_id
                     WHERE i.deleted_at IS NULL
                       AND i.scheduled_date <= :lastDay
                       AND (l.completed_at IS NULL
                            OR (l.completed_at AT TIME ZONE 'UTC') > :startsAt)
                ), scored AS (
                    SELECT c.*,
                           (c.zone_id IN (SELECT id FROM reserved_zones)
                            OR c.place_id IN (SELECT id FROM reserved_places)) AS here,
                           CASE WHEN c.geom IS NULL OR o.geom IS NULL THEN NULL
                                ELSE ST_Distance(c.geom::geography, o.geom::geography) END AS distance_m
                      FROM candidates c CROSS JOIN outline o
                )
                SELECT intervention_id, code, scheduled_date, min(started_at) AS started_at,
                       (array_agg(location_name ORDER BY distance_m NULLS LAST))[1] AS location_name,
                       bool_or(here) AS here, min(distance_m) AS distance_m
                  FROM scored
                 GROUP BY intervention_id, code, scheduled_date
                HAVING bool_or(here) OR min(distance_m) <= :meters
                 ORDER BY bool_or(here) DESC, min(distance_m) NULLS LAST, scheduled_date""",
                new MapSqlParameterSource()
                        .addValue("placeId", placeId)
                        .addValue("lastDay", lastDay)
                        .addValue("startsAt", OffsetDateTime.ofInstant(startsAt, java.time.ZoneOffset.UTC))
                        .addValue("meters", meters),
                (rs, i) -> new WorkRow(rs.getLong("intervention_id"), rs.getString("code"),
                        rs.getObject("scheduled_date", LocalDate.class),
                        wallInstant(rs, "started_at"), rs.getString("location_name"),
                        rs.getBoolean("here"), nullable(rs, "distance_m")));
    }

    /**
     * Reservas activas que tocan la ventana de una intervención que se está
     * registrando (SPEC-107 D-06, D-07). Cada entrada de {@code zoneIds},
     * {@code placeIds}, {@code points} o {@code elementIds} es una ubicación
     * posible; basta una del mismo jardín para que el aviso sea crítico.
     */
    public List<NearbyRow> nearbyReservations(OffsetDateTime windowStart, OffsetDateTime windowEnd,
            List<Long> zoneIds, List<Long> placeIds, String pointsWkt, List<Long> elementIds, int meters) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("windowStart", windowStart)
                .addValue("windowEnd", windowEnd)
                .addValue("zoneIds", zoneIds.toArray(Long[]::new))
                .addValue("placeIds", placeIds.toArray(Long[]::new))
                .addValue("elementIds", elementIds.toArray(Long[]::new))
                .addValue("points", pointsWkt)
                .addValue("meters", meters);
        return named.query("""
                WITH reservations AS (
                    SELECT r.code, r.place_id, p.name AS place_name, o.name AS organization_name,
                           r.starts_at, r.ends_at, po.geom AS outline,
                           (SELECT z.id FROM zones z WHERE z.id = p.zone_id) AS own_zone_id
                      FROM garden_reservations r
                      JOIN places p ON p.id = r.place_id
                      JOIN organizations o ON o.id = r.requested_by_organization_id
                      LEFT JOIN place_outlines po ON po.place_id = r.place_id
                     WHERE r.deleted_at IS NULL AND r.cancelled_at IS NULL
                       AND r.starts_at < :windowEnd AND r.ends_at > :windowStart
                ), reserved_zones AS (
                    SELECT r.code, z.id FROM reservations r JOIN zones z ON z.deleted_at IS NULL
                       AND (z.id = r.own_zone_id OR z.id IN (SELECT c.zone_id FROM places c
                              WHERE c.parent_place_id = r.place_id AND c.deleted_at IS NULL))
                ), reserved_places AS (
                    SELECT r.code, r.place_id AS id FROM reservations r
                    UNION SELECT r.code, c.id FROM reservations r JOIN places c
                      ON c.parent_place_id = r.place_id AND c.deleted_at IS NULL
                ), inputs AS (
                    SELECT z.id AS zone_id, NULL::bigint AS place_id, z.boundary AS geom
                      FROM zones z WHERE z.id = ANY(CAST(:zoneIds AS bigint[]))
                    UNION ALL
                    SELECT NULL, p.id, po.geom FROM places p
                      LEFT JOIN place_outlines po ON po.place_id = p.id
                     WHERE p.id = ANY(CAST(:placeIds AS bigint[]))
                    UNION ALL
                    SELECT NULL, NULL, COALESCE(ge.location, ge.area) FROM green_elements ge
                     WHERE ge.id = ANY(CAST(:elementIds AS bigint[]))
                    UNION ALL
                    SELECT NULL, NULL, ST_GeomFromText(CAST(:points AS TEXT), 4326)
                     WHERE CAST(:points AS TEXT) IS NOT NULL
                ), scored AS (
                    SELECT r.code, r.place_name, r.organization_name, r.starts_at, r.ends_at,
                           (COALESCE(i.zone_id IN (SELECT id FROM reserved_zones rz WHERE rz.code = r.code), false)
                            OR COALESCE(i.place_id = r.place_id, false)
                            OR COALESCE(i.place_id IN (SELECT id FROM reserved_places rp WHERE rp.code = r.code), false))
                               AS here,
                           CASE WHEN i.geom IS NULL OR r.outline IS NULL THEN NULL
                                ELSE ST_Distance(i.geom::geography, r.outline::geography) END AS distance_m
                      FROM reservations r CROSS JOIN inputs i
                )
                SELECT code, place_name, organization_name, starts_at, ends_at,
                       bool_or(here) AS here, min(distance_m) AS distance_m
                  FROM scored
                 GROUP BY code, place_name, organization_name, starts_at, ends_at
                HAVING bool_or(here) OR min(distance_m) <= :meters
                 ORDER BY bool_or(here) DESC, min(distance_m) NULLS LAST, starts_at""", params,
                (rs, i) -> new NearbyRow(rs.getString("code"), rs.getString("place_name"),
                        rs.getString("organization_name"),
                        rs.getObject("starts_at", OffsetDateTime.class).toInstant(),
                        rs.getObject("ends_at", OffsetDateTime.class).toInstant(),
                        rs.getBoolean("here"), nullable(rs, "distance_m")));
    }

    /** Resuelve códigos de ejemplar que el formulario conoce antes de guardar (SPEC-107 §5.3). */
    public List<Long> elementIdsByCodes(List<String> codes) {
        if (codes.isEmpty()) {
            return List.of();
        }
        return jdbc.query("SELECT id FROM green_elements WHERE code = ANY(?) AND deleted_at IS NULL",
                ps -> ps.setArray(1, ps.getConnection().createArrayOf("text", codes.toArray())),
                (rs, i) -> rs.getLong(1));
    }

    private static MapSqlParameterSource filterParams(OffsetDateTime from, OffsetDateTime to,
            boolean includeCancelled, Long placeId, String organizationCode) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to)
                .addValue("includeCancelled", includeCancelled)
                .addValue("placeId", placeId)
                .addValue("organizationCode", organizationCode);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    /**
     * {@code started_at} es TIMESTAMP sin zona y se guarda como hora de pared UTC,
     * igual que {@code completed_at} (SPEC-200). Se interpreta así para no
     * desplazar la fecha local que ve el capataz.
     */
    private static Instant wallInstant(ResultSet rs, String column) throws SQLException {
        java.time.LocalDateTime value = rs.getObject(column, java.time.LocalDateTime.class);
        return value == null ? null : value.toInstant(java.time.ZoneOffset.UTC);
    }

    private static Double nullable(ResultSet rs, String column) throws SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    private static List<String> strings(java.sql.Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        return List.of((String[]) array.getArray());
    }
}
