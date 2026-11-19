package pe.edu.pucp.hesperides.shared.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * Persists audit events in the append-only SPEC-004 table. Since this bean joins
 * the caller's transaction, a failed domain write cannot leave a misleading log
 * entry and a failed audit insert rolls the domain change back.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoggingAuditService implements AuditService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void record(AuditActionCode action, String entityType, Long entityId,
                       Map<String, Object> changes) {
        String actor = authenticatedUsername();
        Long userId = actor == null ? null : userId(actor);
        String json = serialize(changes);
        jdbc.update("""
                INSERT INTO audit_log (action, entity_type, entity_id, user_id, ip_address, changes)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, action.name(), entityType, entityId, userId, remoteAddress(), json);
        log.info("AUDIT action={} entityType={} entityId={} changes={}",
                action, entityType, entityId, changes);
    }

    private Long userId(String username) {
        List<Long> matches = jdbc.query("SELECT id FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL",
                (rs, row) -> rs.getLong(1), username);
        if (matches.size() != 1) {
            throw new IllegalStateException("Authenticated audit actor was not found: " + username);
        }
        return matches.getFirst();
    }

    private static String authenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }

    private static String remoteAddress() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            return request.getRemoteAddr();
        }
        return null;
    }

    private String serialize(Map<String, Object> changes) {
        if (changes == null) return null;
        return objectMapper.writeValueAsString(changes);
    }
}
