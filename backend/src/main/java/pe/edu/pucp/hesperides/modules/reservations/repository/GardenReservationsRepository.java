package pe.edu.pucp.hesperides.modules.reservations.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.reservations.entity.GardenReservation;

/** Persistencia de las reservas. Las consultas de agenda y cercanía viven en JDBC. */
public interface GardenReservationsRepository extends JpaRepository<GardenReservation, Long> {

    Optional<GardenReservation> findByCodeAndDeletedAtIsNull(String code);

    /** El código lo genera la secuencia de la base, así que se relee tras el INSERT. */
    @Query(value = "SELECT code FROM garden_reservations WHERE id = :id", nativeQuery = true)
    String codeById(@Param("id") Long id);

    /** D-02b: una fila por cada responsable, incluido el primero al crear. */
    @Modifying
    @Query(value = "INSERT INTO garden_reservation_responsibles (reservation_id, contact_id, assigned_by_user_id) "
            + "VALUES (:reservationId, :contactId, :assignedBy)", nativeQuery = true)
    void addResponsible(@Param("reservationId") long reservationId, @Param("contactId") long contactId,
            @Param("assignedBy") long assignedBy);
}
