package pe.edu.pucp.hesperides.shared.audit.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.entity.AuditLog;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifica que el changes JSONB hace round-trip con Jackson 3 en Hibernate 7. */
@Testcontainers
@SpringBootTest
@Transactional
class AuditLogRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void persistsAndReloadsTheJsonbChangesAndTheCreatedAt() {
        // La FK exige un user_id existente: usa el admin de la semilla V004.
        Long adminId = jdbcTemplate.queryForObject(
                "SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        Map<String, Object> changes = Map.of(
                "isActive", Map.of("before", true, "after", false));

        AuditLog entry = new AuditLog();
        entry.setAction(AuditActionCode.USER_DEACTIVATED);
        entry.setEntityType("User");
        entry.setEntityId(5L);
        entry.setUserId(adminId);
        entry.setIpAddress("127.0.0.1");
        entry.setChanges(changes);
        auditLogRepository.save(entry);

        AuditLog reloaded = auditLogRepository.findById(entry.getId()).orElseThrow();

        assertThat(reloaded.getAction()).isEqualTo(AuditActionCode.USER_DEACTIVATED);
        assertThat(reloaded.getEntityId()).isEqualTo(5L);
        assertThat(reloaded.getChanges().get("isActive")).isEqualTo(changes.get("isActive"));
        assertThat(reloaded.getCreatedAt()).isNotNull();
    }

    @Test
    void changesMayBeNull() {
        AuditLog entry = new AuditLog();
        entry.setAction(AuditActionCode.LOGIN_FAILED_LOCKOUT);
        entry.setEntityType("User");
        auditLogRepository.save(entry);

        AuditLog reloaded = auditLogRepository.findById(entry.getId()).orElseThrow();

        assertThat(reloaded.getChanges()).isNull();
        assertThat(reloaded.getUserId()).isNull();
    }
}