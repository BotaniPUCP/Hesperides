package pe.edu.pucp.hesperides.modules.irrigation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationPumpReading;

import java.time.LocalDate;
import java.util.List;

public interface IrrigationPumpReadingsRepository extends JpaRepository<IrrigationPumpReading, Long> {
    List<IrrigationPumpReading> findTop30ByDeletedAtIsNullOrderByReadingDateDesc();
    boolean existsByReadingDateAndDeletedAtIsNull(LocalDate readingDate);
}
