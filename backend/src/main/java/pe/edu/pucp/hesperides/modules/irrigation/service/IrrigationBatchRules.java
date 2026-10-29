package pe.edu.pucp.hesperides.modules.irrigation.service;

import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** No se permite mezclar ni duplicar sectores en un pedido masivo. */
public final class IrrigationBatchRules {
    private IrrigationBatchRules() {}

    public static void check(List<CreateIrrigationTurnRequest> requests) {
        if (requests == null || requests.isEmpty() || requests.size() > 20) {
            throw new ValidationException("Selecciona entre 1 y 20 sectores para registrar");
        }
        Set<Long> seen = new HashSet<>();
        for (CreateIrrigationTurnRequest request : requests) {
            if (request == null || request.sectorZoneId() == null || request.sectorZoneId() <= 0) {
                throw new ValidationException("Cada turno debe indicar un sector valido");
            }
            if (request.irrigationDate() == null) {
                throw new ValidationException("Cada turno debe indicar la fecha de riego");
            }
            if (request.notes() != null && request.notes().length() > 500) {
                throw new ValidationException("Las observaciones no pueden superar 500 caracteres");
            }
            if (!seen.add(request.sectorZoneId())) {
                throw new ValidationException("No repitas el mismo sector en un registro masivo");
            }
            IrrigationTurnRules.check(request.startedAt(), request.finishedAt(), request.sectionZoneIds());
        }
    }
}
