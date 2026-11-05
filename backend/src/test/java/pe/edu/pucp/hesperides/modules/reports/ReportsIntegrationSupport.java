package pe.edu.pucp.hesperides.modules.reports;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

/**
 * One database and one Spring context for every reports test class: the
 * container starts once and the identical configuration lets Spring reuse the
 * context. Data accumulates between tests, so each test creates its own sectors
 * and asserts through its own filters, never through campus-wide totals.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ReportsIntegrationSupport.FixedClock.class)
abstract class ReportsIntegrationSupport {

    /** Wednesday 4 Nov 2026, 10:00 in Lima: the current week starts on Monday 2 Nov. */
    static final Instant NOW = Instant.parse("2026-11-04T15:00:00Z");

    static final PostgreSQLContainer<?> POSTGRES = TestDatabase.newContainer();

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedReportsClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    protected ReportFixtures fx;

    @BeforeEach
    void createFixtures() {
        fx = new ReportFixtures(jdbc);
    }

    protected static RequestPostProcessor as(ReportFixtures.Account account) {
        return user(account.email()).authorities(new SimpleGrantedAuthority(account.role()));
    }
}
