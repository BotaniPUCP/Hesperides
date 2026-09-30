package pe.edu.pucp.hesperides.modules.maintenance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * El intervalo que rige durante una estacion concreta de una version.
 *
 * <p>No hereda de BaseEntity ni lleva borrado logico: pertenece por completo a
 * su frecuencia y desaparece con ella. Conservar una estacion huerfana no
 * aportaria trazabilidad, porque el historico lo guarda la version padre, que
 * si sobrevive con su valid_to.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "maintenance_frequency_seasons")
public class MaintenanceFrequencySeason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "maintenance_frequency_id", nullable = false)
    private MaintenanceFrequency maintenanceFrequency;

    /** VERANO, OTONO, INVIERNO o PRIMAVERA. */
    @Column(nullable = false, length = 20)
    private String season;

    /**
     * Meses que abarca. Explicitos en vez de derivados del nombre: permite
     * ajustarlos si el cliente define sus periodos de otra forma, y el evaluador
     * no necesita una tabla de conversion en codigo.
     */
    @Column(name = "start_month", nullable = false)
    private short startMonth;

    @Column(name = "end_month", nullable = false)
    private short endMonth;

    @Column(name = "min_days_interval", nullable = false)
    private Integer minDaysInterval;

    @Column(name = "max_days_interval", nullable = false)
    private Integer maxDaysInterval;

    /**
     * El intervalo de manual, que suele diferir del operativo: el cesped tiene
     * teorico de 21 dias y en la practica se corta cada 30-45. Guardarlo permite
     * mostrar la brecha entre norma y realidad.
     */
    @Column(name = "target_days_interval")
    private Integer targetDaysInterval;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
