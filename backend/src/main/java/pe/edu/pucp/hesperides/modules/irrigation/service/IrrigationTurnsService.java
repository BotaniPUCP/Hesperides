package pe.edu.pucp.hesperides.modules.irrigation.service;

import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationTurnResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import java.time.LocalDate;
import java.util.List;

public interface IrrigationTurnsService {
    List<IrrigationZoneResponse> sectors(String email);
    List<IrrigationZoneResponse> sections(Long sectorId, String email);
    List<IrrigationTurnResponse> list(LocalDate from, LocalDate to, Long sectorId, String email);
    IrrigationTurnResponse findOne(Long id, String email);
    IrrigationTurnResponse create(CreateIrrigationTurnRequest request, String email);
    List<IrrigationTurnResponse> createBatch(List<CreateIrrigationTurnRequest> requests, String email);
}
