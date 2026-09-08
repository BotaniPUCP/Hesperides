package pe.edu.pucp.hesperides.shared.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.entity.AuditLog;
import pe.edu.pucp.hesperides.shared.audit.repository.AuditLogRepository;

import java.util.Map;

/**
 * Resuelve quién y desde dónde se ejecuta la acción y persiste la fila.
 *
 * user_id puede quedar NULL deliberadamente: LOGIN_FAILED_LOCKOUT ocurre antes
 * de que exista sesión, y en jobs o arranques no hay Authentication válida —
 * NULL significa "el sistema, no una persona" (SPEC-004 §5.2).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UsersRepository usersRepository;

    @Override
    @Transactional
    public void record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes) {
        AuditLog entry = new AuditLog();
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setUserId(currentUserId());
        entry.setIpAddress(currentIpAddress());
        entry.setChanges(changes);
        auditLogRepository.save(entry);
        log.debug("Auditoria registrada: {} sobre {} {}", action, entityType, entityId);
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return null;
        }
        // Un actor dado de baja después de actuar debe seguir resolviendo a su
        // id en audit_log; por eso este lookup no filtra por deleted_at.
        return usersRepository.findByEmail(userDetails.getUsername())
                .map(user -> user.getId())
                .orElse(null);
    }

    private String currentIpAddress() {
        try {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
                return attributes.getRequest().getRemoteAddr();
            }
        } catch (IllegalStateException ex) {
            // No hay request en curso (job, arranque): ip_address NULL.
        }
        return null;
    }
}