package pe.edu.pucp.hesperides.shared.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Implementación provisional: deja la acción en el log hasta que SPEC-004 aporte
 * la persistencia en audit_log.
 *
 * Es deliberadamente insuficiente y así consta: un log rotado a las pocas
 * semanas no responde "¿quién desactivó esta cuenta en marzo?", que es justo lo
 * que SPEC-004 existe para resolver.
 */
@Slf4j
@Service
public class LoggingAuditService implements AuditService {

    @Override
    public void record(AuditActionCode action, String entityType, Long entityId,
                       Map<String, Object> changes) {
        log.info("AUDIT action={} entityType={} entityId={} changes={}",
                action, entityType, entityId, changes);
    }
}
