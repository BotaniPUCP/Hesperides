package pe.edu.pucp.hesperides.modules.reservations.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.CancelRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.GardenOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.OrganizationOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Page;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationResponse;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Warning;

/** Reservas de jardines prestables (SPEC-107). */
public interface ReservationsService {

    Page<ReservationResponse> list(LocalDate from, LocalDate to, Long placeId, String organizationCode,
            boolean includeCancelled, int page, int size);

    ReservationResponse get(String code);

    ReservationResponse create(ReservationRequest request, String userEmail);

    ReservationResponse update(String code, ReservationRequest request, String userEmail);

    ReservationResponse cancel(String code, CancelRequest request, String userEmail);

    /** Crea una reserva desde el registro masivo, con su lote y la auditoría de siempre. */
    String createForImport(ReservationRequest request, long userId, long importBatchId);

    List<Warning> check(Long placeId, OffsetDateTime startsAt, OffsetDateTime endsAt, String excludeCode);

    List<Warning> nearby(LocalDate date, List<Long> zoneIds, List<Long> placeIds, String points,
            List<Long> elementIds, List<String> elementCodes);

    List<GardenOption> gardens(String search);

    List<OrganizationOption> organizations();
}
