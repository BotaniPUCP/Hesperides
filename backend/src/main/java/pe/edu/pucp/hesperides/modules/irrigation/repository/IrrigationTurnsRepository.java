package pe.edu.pucp.hesperides.modules.irrigation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurn;
import java.time.LocalDate;
import java.util.List;

public interface IrrigationTurnsRepository extends JpaRepository<IrrigationTurn, Long> {
    List<IrrigationTurn> findByIrrigationDateBetweenAndDeletedAtIsNullOrderByIrrigationDateDescIdDesc(
        LocalDate from, LocalDate to);
}
