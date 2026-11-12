package pe.edu.pucp.hesperides.modules.irrigation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurnSection;
import java.util.List;

public interface IrrigationTurnSectionsRepository extends JpaRepository<IrrigationTurnSection, Long> {
    List<IrrigationTurnSection> findByTurnIdAndDeletedAtIsNullOrderById(Long turnId);
}
