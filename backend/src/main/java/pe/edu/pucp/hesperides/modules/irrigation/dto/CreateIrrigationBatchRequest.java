package pe.edu.pucp.hesperides.modules.irrigation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** D-01 extensión UX: un pedido, un turno independiente por sector. */
public record CreateIrrigationBatchRequest(
    @NotEmpty @Size(max = 20) List<@NotNull @Valid CreateIrrigationTurnRequest> turns
) {}
