package pe.edu.pucp.hesperides.modules.irrigation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurnSection;

public interface IrrigationTurnSectionsRepository extends JpaRepository<IrrigationTurnSection, Long> {
}
