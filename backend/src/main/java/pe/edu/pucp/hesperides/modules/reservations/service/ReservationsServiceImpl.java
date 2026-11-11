package pe.edu.pucp.hesperides.modules.reservations.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.reservations.ReservationPeriod;
import pe.edu.pucp.hesperides.engine.reservations.ReservationState;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.CancelRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ContactRef;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.GardenOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.GardenRef;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.OrganizationOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.OrganizationRef;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Page;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationResponse;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Warning;
import pe.edu.pucp.hesperides.modules.reservations.entity.GardenReservation;
import pe.edu.pucp.hesperides.modules.reservations.repository.GardenReservationsRepository;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.ContactRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.NearbyRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.OrganizationRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.OverlapRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.PlaceRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.ReservationRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.WorkRow;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.persistence.UserIds;

/**
 * Reglas y avisos de las reservas (SPEC-107). Nada aquí bloquea por un cruce o
 * por trabajo cercano: las coincidencias se devuelven como avisos y el usuario
 * decide (D-04, D-07). Sí se rechazan las reservas imposibles: jardín no
 * prestable, fechas invertidas, más de siete días, versión vieja.
 */
@Service
@RequiredArgsConstructor
public class ReservationsServiceImpl implements ReservationsService {

    private static final int MAX_PURPOSE = 300;
    private static final int MAX_CANCEL_REASON = 500;
    private static final int DEFAULT_ALLOWED_PAGE = 50;
    private static final int DEFAULT_DAYS_AHEAD = 30;
    private static final int NEARBY_DAYS = 7;

    private static final Locale SPANISH = Locale.forLanguageTag("es-PE");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", SPANISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", SPANISH);

    private final GardenReservationsRepository reservations;
    private final ReservationReadRepository reads;
    private final SystemParameterReader parameters;
    private final AuditService audit;
    private final UserIds users;

    @Value("${hesperides.maintenance.time-zone:America/Lima}")
    private String timeZone;

    private ZoneId zone() {
        return ZoneId.of(timeZone);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> list(LocalDate from, LocalDate to, Long placeId, String organizationCode,
            boolean includeCancelled, int page, int size) {
        checkPage(page, size);
        LocalDate first = from == null ? LocalDate.now(zone()) : from;
        LocalDate last = to == null ? first.plusDays(DEFAULT_DAYS_AHEAD) : to;
        if (last.isBefore(first)) {
            throw new ValidationException("The date range ends before it starts");
        }
        OffsetDateTime fromInstant = first.atStartOfDay(zone()).toOffsetDateTime();
        OffsetDateTime toInstant = last.plusDays(1).atStartOfDay(zone()).toOffsetDateTime();
        List<ReservationRow> rows = reads.page(fromInstant, toInstant, includeCancelled, placeId,
                blankToNull(organizationCode), size, page * size);
        return new Page<>(page, size,
                reads.count(fromInstant, toInstant, includeCancelled, placeId, blankToNull(organizationCode)),
                rows.stream().map(row -> response(row, List.of())).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse get(String code) {
        return response(reads.byCode(code), List.of());
    }

    @Override
    @Transactional
    public ReservationResponse create(ReservationRequest request, String userEmail) {
        Validated values = validate(request);
        String code = persist(values, users.of(userEmail), null);
        List<Warning> warnings = check(values.place().id(), toOffset(values.startsAt()), toOffset(values.endsAt()), code);
        return response(reads.byCode(code), warnings);
    }

    @Override
    @Transactional
    public String createForImport(ReservationRequest request, long userId, long importBatchId) {
        return persist(validate(request), userId, importBatchId);
    }

    private String persist(Validated values, long userId, Long importBatchId) {
        GardenReservation reservation = new GardenReservation();
        reservation.setPlaceId(values.place().id());
        reservation.setOrganizationId(values.organization().id());
        reservation.setContactId(values.contact() == null ? null : values.contact().id());
        reservation.setStartsAt(values.startsAt());
        reservation.setEndsAt(values.endsAt());
        reservation.setPurpose(values.purpose());
        reservation.setCreatedByUserId(userId);
        reservation.setImportBatchId(importBatchId);
        reservation.setVersion(0L);
        reservations.saveAndFlush(reservation);
        String code = reservations.codeById(reservation.getId());

        audit.record(AuditActionCode.GARDEN_RESERVATION_CREATED, "GardenReservation", reservation.getId(),
                java.util.Map.of("code", code, "place", values.place().code()));
        return code;
    }

    @Override
    @Transactional
    public ReservationResponse update(String code, ReservationRequest request, String userEmail) {
        GardenReservation reservation = require(code);
        requireEditable(reservation);
        Validated values = validate(request);
        requireVersion(reservation, request.version());

        reservation.setPlaceId(values.place().id());
        reservation.setOrganizationId(values.organization().id());
        reservation.setContactId(values.contact() == null ? null : values.contact().id());
        reservation.setStartsAt(values.startsAt());
        reservation.setEndsAt(values.endsAt());
        reservation.setPurpose(values.purpose());
        reservation.setVersion(reservation.getVersion() + 1);
        reservations.saveAndFlush(reservation);

        audit.record(AuditActionCode.GARDEN_RESERVATION_UPDATED, "GardenReservation", reservation.getId(),
                java.util.Map.of("code", code, "place", values.place().code()));
        List<Warning> warnings = check(values.place().id(), toOffset(values.startsAt()), toOffset(values.endsAt()), code);
        return response(reads.byCode(code), warnings);
    }

    @Override
    @Transactional
    public ReservationResponse cancel(String code, CancelRequest request, String userEmail) {
        GardenReservation reservation = require(code);
        requireEditable(reservation);
        requireVersion(reservation, request.version());
        String reason = request.reason() == null ? null : request.reason().strip();
        if (reason == null || reason.isEmpty()) {
            throw new BusinessRuleException("A cancellation reason is required");
        }
        if (reason.length() > MAX_CANCEL_REASON) {
            throw new BusinessRuleException("The cancellation reason cannot exceed 500 characters");
        }
        reservation.setCancelledAt(Instant.now());
        reservation.setCancelReason(reason);
        reservation.setVersion(reservation.getVersion() + 1);
        reservations.saveAndFlush(reservation);

        PlaceRow place = reads.place(reservation.getPlaceId());
        audit.record(AuditActionCode.GARDEN_RESERVATION_CANCELLED, "GardenReservation", reservation.getId(),
                java.util.Map.of("code", code, "place", place == null ? "" : place.code()));
        return response(reads.byCode(code), List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Warning> check(Long placeId, OffsetDateTime startsAt, OffsetDateTime endsAt, String excludeCode) {
        if (placeId == null || startsAt == null || endsAt == null) {
            throw new ValidationException("The garden, start and end are required");
        }
        Instant start = startsAt.toInstant();
        Instant end = endsAt.toInstant();
        validatePeriod(start, end);
        PlaceRow place = requirePlace(placeId);

        List<Warning> warnings = new ArrayList<>();
        for (OverlapRow overlap : reads.overlaps(place.id(), start, end, blankToNull(excludeCode))) {
            warnings.add(new Warning("OVERLAPPING_RESERVATION", "WARNING",
                    place.name() + " ya tiene otra reserva de " + time(overlap.startsAt()) + " a "
                            + time(overlap.endsAt()) + " (" + overlap.organizationName() + ")",
                    overlap.code(), null));
        }
        for (WorkRow work : reads.pendingWork(place.id(), start,
                ReservationPeriod.lastDay(start, end, zone()), nearbyMeters(), timeZone)) {
            boolean here = work.here();
            String where = here ? place.name()
                    : work.locationName() == null ? place.name() : work.locationName();
            String when = work.startedAt() == null
                    ? "programada el " + day(work.scheduledDate())
                    : "empezó el " + day(work.startedAt());
            String text = here
                    ? where + " tiene trabajo por hacer de " + work.interventionCode() + " (" + when
                            + "): pueden estar trabajando durante la reserva"
                    : "A " + meters(work.distanceMeters()) + " m, " + where + " tiene trabajo por hacer de "
                            + work.interventionCode() + " (" + when + ")";
            warnings.add(new Warning(here ? "WORK_HERE" : "NEARBY_WORK", here ? "CRITICAL" : "WARNING", text,
                    null, work.interventionId()));
        }
        return sorted(warnings);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Warning> nearby(LocalDate date, List<Long> zoneIds, List<Long> placeIds, String points,
            List<Long> elementIds, List<String> elementCodes) {
        if (date == null) {
            throw new ValidationException("The scheduled date is required");
        }
        List<Long> zones = ids(zoneIds);
        List<Long> places = ids(placeIds);
        List<Long> elements = new ArrayList<>(ids(elementIds));
        if (elementCodes != null && !elementCodes.isEmpty()) {
            elements.addAll(reads.elementIdsByCodes(elementCodes.stream().filter(c -> c != null && !c.isBlank())
                    .map(String::strip).toList()));
        }
        String wkt = pointsWkt(points);
        if (zones.isEmpty() && places.isEmpty() && elements.isEmpty() && wkt == null) {
            return List.of();
        }
        OffsetDateTime start = date.atStartOfDay(zone()).toOffsetDateTime();
        OffsetDateTime end = date.plusDays(NEARBY_DAYS + 1).atStartOfDay(zone()).toOffsetDateTime();
        List<Warning> warnings = new ArrayList<>();
        for (NearbyRow row : reads.nearbyReservations(start, end, zones, places, wkt, elements, nearbyMeters())) {
            boolean here = row.here();
            String range = range(row.startsAt(), row.endsAt());
            String text = here
                    ? row.placeName() + " está reservado " + range + " (" + row.organizationName() + ")"
                    : "A " + meters(row.distanceMeters()) + " m, " + row.placeName() + " está reservado "
                            + range + " (" + row.organizationName() + ")";
            warnings.add(new Warning(here ? "RESERVED_HERE" : "RESERVED_NEARBY",
                    here ? "CRITICAL" : "WARNING", text, row.code(), null));
        }
        return sorted(warnings);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GardenOption> gardens(String search) {
        return reads.gardens(blankToNull(search)).stream()
                .map(g -> new GardenOption(g.id(), g.code(), g.name(), g.aliases()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationOption> organizations() {
        return reads.organizations().stream()
                .map(o -> new OrganizationOption(o.code(), o.name()))
                .toList();
    }

    private Validated validate(ReservationRequest request) {
        if (request == null || request.placeId() == null || request.startsAt() == null
                || request.endsAt() == null || request.organizationCode() == null) {
            throw new BusinessRuleException("The garden, organization, start and end are required");
        }
        Instant start = request.startsAt().toInstant();
        Instant end = request.endsAt().toInstant();
        validatePeriod(start, end);
        PlaceRow place = requirePlace(request.placeId());
        OrganizationRow organization = reads.organization(request.organizationCode().strip());
        if (organization == null) {
            throw new BusinessRuleException("That organization is not active in the Directory");
        }
        ContactRow contact = null;
        if (request.contactCode() != null && !request.contactCode().isBlank()) {
            contact = reads.contact(request.contactCode().strip(), organization.id());
            if (contact == null) {
                throw new BusinessRuleException("The contact does not belong to that organization");
            }
        }
        String purpose = request.purpose() == null ? null : request.purpose().strip();
        if (purpose != null && purpose.isEmpty()) {
            purpose = null;
        }
        if (purpose != null && purpose.length() > MAX_PURPOSE) {
            throw new BusinessRuleException("The purpose cannot exceed 300 characters");
        }
        return new Validated(place, organization, contact, start, end, purpose);
    }

    private void validatePeriod(Instant start, Instant end) {
        if (!end.isAfter(start)) {
            throw new BusinessRuleException("The reservation must end after it starts");
        }
        if (!ReservationPeriod.withinMaximumDuration(start, end)) {
            throw new BusinessRuleException("A reservation cannot last more than 7 days");
        }
    }

    private PlaceRow requirePlace(long placeId) {
        PlaceRow place = reads.place(placeId);
        if (place == null) {
            throw new BusinessRuleException("That garden cannot be reserved");
        }
        return place;
    }

    private GardenReservation require(String code) {
        return reservations.findByCodeAndDeletedAtIsNull(code)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + code));
    }

    private void requireEditable(GardenReservation reservation) {
        ReservationState state = ReservationPeriod.state(reservation.getStartsAt(), reservation.getEndsAt(),
                reservation.getCancelledAt(), Instant.now());
        if (state == ReservationState.FINISHED || state == ReservationState.CANCELLED) {
            throw new BusinessRuleException("This reservation already finished or was cancelled");
        }
    }

    private void requireVersion(GardenReservation reservation, Long version) {
        if (version == null || !version.equals(reservation.getVersion())) {
            throw new ConflictException("Someone else changed this reservation. Reload to see its version.");
        }
    }

    private ReservationResponse response(ReservationRow row, List<Warning> warnings) {
        return new ReservationResponse(
                row.code(),
                new GardenRef(row.placeId(), row.placeCode(), row.placeName()),
                new OrganizationRef(row.organizationCode(), row.organizationName()),
                row.contactCode() == null ? null : new ContactRef(row.contactCode(), row.contactName(),
                        row.contactMobile(), row.contactExtension()),
                toOffset(row.startsAt()),
                toOffset(row.endsAt()),
                row.purpose(),
                ReservationPeriod.state(row.startsAt(), row.endsAt(), row.cancelledAt(), Instant.now()).name(),
                row.cancelReason(),
                row.version(),
                warnings);
    }

    private int nearbyMeters() {
        return Math.max(0, Math.min(100, parameters.readInt(
                SystemParameterCodes.RESERVATION_NEARBY_METERS, 10)));
    }

    private OffsetDateTime toOffset(Instant instant) {
        return instant.atZone(zone()).toOffsetDateTime();
    }

    private String day(Instant instant) {
        return DAY.format(instant.atZone(zone()));
    }

    private String day(LocalDate date) {
        return DAY.format(date);
    }

    private String time(Instant instant) {
        return TIME.format(instant.atZone(zone()));
    }

    private String range(Instant start, Instant end) {
        LocalDate first = start.atZone(zone()).toLocalDate();
        LocalDate last = end.minusNanos(1).atZone(zone()).toLocalDate();
        if (first.equals(last)) {
            return "el " + day(first) + " de " + time(start) + " a " + time(end);
        }
        return "del " + day(first) + " al " + day(last);
    }

    private static long meters(Double distance) {
        return distance == null ? 0 : Math.round(distance);
    }

    private static List<Warning> sorted(List<Warning> warnings) {
        return warnings.stream()
                .sorted(Comparator.comparing((Warning w) -> !"CRITICAL".equals(w.severity())))
                .toList();
    }

    private static void checkPage(int page, int size) {
        if (page < 0 || size < 1 || size > DEFAULT_ALLOWED_PAGE) {
            throw new ValidationException("page must be >= 0 and size between 1 and " + DEFAULT_ALLOWED_PAGE);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static List<Long> ids(List<Long> values) {
        return values == null ? List.of() : values.stream().filter(java.util.Objects::nonNull).toList();
    }

    /** Convierte «lat,lon;lat,lon» en un MULTIPOINT de PostGIS. */
    private static String pointsWkt(String points) {
        if (points == null || points.isBlank()) {
            return null;
        }
        List<String> coordinates = new ArrayList<>();
        for (String pair : points.split(";")) {
            if (pair.isBlank()) {
                continue;
            }
            String[] parts = pair.split(",");
            if (parts.length != 2) {
                throw new ValidationException("Each point must be lat,lon");
            }
            try {
                double lat = Double.parseDouble(parts[0].strip());
                double lon = Double.parseDouble(parts[1].strip());
                if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    throw new ValidationException("A point is outside the valid latitude or longitude");
                }
                coordinates.add("(" + lon + " " + lat + ")");
            } catch (NumberFormatException ex) {
                throw new ValidationException("Each point must be lat,lon");
            }
        }
        if (coordinates.isEmpty()) {
            return null;
        }
        return "MULTIPOINT(" + String.join(",", coordinates) + ")";
    }

    private record Validated(PlaceRow place, OrganizationRow organization, ContactRow contact, Instant startsAt,
            Instant endsAt, String purpose) {
    }
}
