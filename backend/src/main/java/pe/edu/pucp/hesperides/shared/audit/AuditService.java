package pe.edu.pucp.hesperides.shared.audit;

import java.util.Map;

/**
 * Registra una acción sensible en {@code audit_log}. La implementación usa la
 * transacción del servicio de dominio: si falla la escritura o la auditoría,
 * ambas se revierten.
 */
public interface AuditService {

    void record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes);
}
