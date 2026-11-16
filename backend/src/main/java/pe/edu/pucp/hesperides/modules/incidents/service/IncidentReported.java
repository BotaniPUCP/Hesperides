package pe.edu.pucp.hesperides.modules.incidents.service;

/** Se publica al guardar un reporte nuevo; el prellenado lo atiende después del commit. */
public record IncidentReported(Long incidentId) {
}
