package pe.edu.pucp.hesperides.modules.reservations.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** Cuerpos de SPEC-107 §3. Las fechas viajan con el desfase de Lima (-05:00). */
public final class ReservationDtos {

    private ReservationDtos() {
    }

    public record GardenRef(long id, String code, String name) {
    }

    public record OrganizationRef(String code, String name) {
    }

    public record ContactRef(String code, String fullName, String mobile, String extension) {
    }

    /**
     * {@code warnings} solo viene lleno al crear y editar; en las lecturas es una
     * lista vacía para que el frontend no tenga que distinguir la forma.
     */
    public record ReservationResponse(
            String code,
            GardenRef place,
            OrganizationRef organization,
            ContactRef contact,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            String purpose,
            String state,
            String cancelReason,
            long version,
            List<Warning> warnings) {
    }

    public record ReservationRequest(
            Long placeId,
            String organizationCode,
            String contactCode,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            String purpose,
            Long version) {
    }

    public record CancelRequest(String reason, Long version) {
    }

    /**
     * Un aviso que nunca bloquea (SPEC-107 D-04, D-07). El texto lo arma el backend
     * porque lleva nombres, fechas y distancias; el frontend lo muestra tal cual.
     */
    public record Warning(
            String kind,
            String severity,
            String text,
            String reservationCode,
            Long interventionId) {
    }

    public record Page<T>(int page, int size, long total, List<T> items) {
    }

    /** Un jardín prestable para el selector: el lugar y sus alias del calendario de la OSG. */
    public record GardenOption(long id, String code, String name, List<String> aliases) {
    }

    /** Una organización con al menos una reserva, para el filtro (D-08). */
    public record OrganizationOption(String code, String name) {
    }
}
