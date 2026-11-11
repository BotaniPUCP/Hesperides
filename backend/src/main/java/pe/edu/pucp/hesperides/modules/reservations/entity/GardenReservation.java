package pe.edu.pucp.hesperides.modules.reservations.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Una reserva de un jardín prestable (SPEC-107). No guarda su estado: se calcula
 * con {@code ReservationPeriod} a partir de las horas y de la anulación.
 *
 * <p>El lugar, la organización y el contacto se referencian por id: son datos del
 * catálogo de lugares y del Directorio, y una reserva no los posee.
 */
@Entity
@Table(name = "garden_reservations")
@Getter
@Setter
@NoArgsConstructor
public class GardenReservation extends BaseEntity {

    @Column(name = "code", insertable = false, updatable = false)
    private String code;

    @Column(name = "place_id", nullable = false)
    private Long placeId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "contact_id")
    private Long contactId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "purpose")
    private String purpose;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "import_batch_id")
    private Long importBatchId;

    /** Versión para detectar ediciones simultáneas (409), igual que el resto del sistema. */
    @Column(name = "version", nullable = false)
    private Long version;
}
