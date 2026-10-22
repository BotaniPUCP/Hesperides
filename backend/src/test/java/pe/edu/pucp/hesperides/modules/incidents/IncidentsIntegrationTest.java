package pe.edu.pucp.hesperides.modules.incidents;

import pe.edu.pucp.hesperides.support.TestDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentsService;
import pe.edu.pucp.hesperides.shared.exception.*;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers @Transactional
class IncidentsIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    @Autowired IncidentsService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    String foreman, coordinator, outsider;
    long foremanId, teamId;

    @BeforeEach void people() {
        String suffix = UUID.randomUUID().toString();
        foreman = "foreman-" + suffix + "@test.invalid";
        coordinator = "coordinator-" + suffix + "@test.invalid";
        outsider = "outsider-" + suffix + "@test.invalid";
        foremanId = person(foreman, "SUPERVISOR");
        person(coordinator, "COORDINADOR"); person(outsider, "SUPERVISOR");
        // Deliberately no team_members row: authority comes from leading the team.
        teamId = jdbc.queryForObject("INSERT INTO teams(code,name,supervisor_user_id) VALUES (?,?,?) RETURNING id",
                Long.class, suffix, "Cuadrilla de prueba", foremanId);
    }

    long person(String email, String role) {
        return jdbc.queryForObject("""
            INSERT INTO users(email,password_hash,first_name,last_name,role_item_id)
            VALUES (?, 'unused', 'Persona', 'Prueba',
              (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='ROLE' AND ci.code=?))
            RETURNING id
            """, Long.class, email, role);
    }
    CreateIncidentRequest capture() { return new CreateIncidentRequest("Rama caída en puerta principal", null, null, null); }
    DetailResponse create() { return service.create(capture(), UUID.randomUUID(), foreman).detail(); }
    DetailResponse approve(DetailResponse detail) { return service.approve(detail.incident().id(), detail.incident().version(), coordinator); }

    @Test void minimalCaptureApprovalPartialWorkResolutionAndSummary() {
        var before = service.summary(coordinator);
        var sent = create(); long id = sent.incident().id();
        assertThat(sent.incident().status().code()).isEqualTo("PENDING_APPROVAL");
        assertThat(sent.incident().latitude()).isNull();
        assertThat(sent.incident().type()).isNull();
        assertThat(sent.suggestedType().code()).isEqualTo("FALLEN_BRANCH");
        assertThat(sent.incident().team().id()).isEqualTo(teamId);
        assertThat(service.getAll(foreman, null, null, 0, 20).getContent()).extracting(IncidentResponse::id).contains(id);
        assertThatThrownBy(() -> service.approve(id, sent.incident().version(), foreman)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.start(id, foreman)).isInstanceOf(BusinessRuleException.class);
        var approved = approve(sent);
        assertThat(approved.incident().status().code()).isEqualTo("OPEN");
        assertThat(service.approve(id, sent.incident().version(), coordinator).history()).hasSize(2);
        assertThatThrownBy(() -> service.resolve(id, foreman)).isInstanceOf(BusinessRuleException.class);
        var planned = service.addIntervention(id, new CreateInterventionRequest(UUID.randomUUID(), "Retirar rama", null, false), coordinator);
        long first = planned.interventions().getFirst().id();
        var second = new CreateInterventionRequest(UUID.randomUUID(), "Recoger residuos", null, false);
        var two = service.addIntervention(id, second, coordinator);
        assertThat(service.addIntervention(id, second, coordinator).interventions()).hasSize(2);
        service.completeIntervention(id, first, foreman);
        assertThatThrownBy(() -> service.resolve(id, foreman)).isInstanceOf(BusinessRuleException.class);
        service.completeIntervention(id, two.interventions().getLast().id(), foreman);
        var resolved = service.resolve(id, foreman);
        assertThat(resolved.incident().status().code()).isEqualTo("RESOLVED");
        assertThat(service.resolve(id, foreman).history()).hasSize(4);
        var after = service.summary(coordinator);
        assertThat(after.resolved()).isEqualTo(before.resolved() + 1);
        assertThat(after.completedInterventions()).isEqualTo(before.completedInterventions() + 2);
        assertThat(after.pendingApproval()).isEqualTo(before.pendingApproval());
    }

    @Test void originalSurvivesReviewAndStaleEditsFail() {
        var sent = create(); long id = sent.incident().id();
        var review = new ReviewIncidentRequest(sent.incident().version(), "Rama caída junto a la puerta", "Entrada norte",
                -12.07, -77.08, "FALLEN_BRANCH", "HIGH", teamId);
        var edited = service.update(id, review, coordinator);
        assertThat(edited.incident().originalDescription()).isEqualTo(capture().description());
        assertThat(edited.incident().description()).isEqualTo(review.description());
        assertThatThrownBy(() -> service.update(id, review, coordinator)).isInstanceOf(DuplicateResourceException.class);
        assertThatThrownBy(() -> service.approve(id, sent.incident().version(), coordinator)).isInstanceOf(DuplicateResourceException.class);
        assertThat(approve(edited).incident().approvedBy().fullName()).isEqualTo("Persona Prueba");
    }

    @Test void resourcesAndMutationsAreScopedToTheActualTeamLeader() {
        var sent = approve(create()); long id = sent.incident().id();
        assertThat(service.getAll(outsider, null, null, 0, 20).getContent()).noneMatch(i -> i.id() == id);
        assertThatThrownBy(() -> service.getById(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.resolve(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.summary(foreman)).isInstanceOf(AccessDeniedException.class);
        long outsiderId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, outsider);
        jdbc.update("INSERT INTO team_members(team_id,user_id) VALUES (?,?)", teamId, outsiderId);
        assertThatThrownBy(() -> service.start(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void retriesAreIdempotentAndDifferentPayloadIsRejected() {
        UUID reference = UUID.randomUUID();
        var first = service.create(capture(), reference, foreman);
        var retry = service.create(capture(), reference, foreman);
        assertThat(first.created()).isTrue(); assertThat(retry.created()).isFalse();
        assertThat(retry.detail().incident().id()).isEqualTo(first.detail().incident().id());
        assertThat(retry.detail().history()).hasSize(1);
        assertThatThrownBy(() -> service.create(new CreateIncidentRequest("Otro problema", null, null, null), reference, foreman))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentRetriesCreateOneIncidentAndOneApproval() throws Exception {
        UUID reference = UUID.randomUUID();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<DetailResponse> create = () -> { start.await(); return service.create(capture(), reference, foreman).detail(); };
            var a = executor.submit(create); var b = executor.submit(create); start.countDown();
            var first = a.get(20, TimeUnit.SECONDS); var second = b.get(20, TimeUnit.SECONDS);
            assertThat(first.incident().id()).isEqualTo(second.incident().id());
            var approvalA = executor.submit(() -> approve(first));
            var approvalB = executor.submit(() -> approve(second));
            assertThat(approvalA.get(20, TimeUnit.SECONDS).history()).hasSize(2);
            assertThat(approvalB.get(20, TimeUnit.SECONDS).history()).hasSize(2);
        }
    }

    @Test void photosAreStoredReadAuthorizedAndRetriedWithoutDuplication() {
        long id = create().incident().id(); UUID reference = UUID.randomUUID();
        byte[] png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==");
        var file = new MockMultipartFile("file", "photo.png", "image/png", png);
        var photo = service.addPhoto(id, reference, file, foreman);
        assertThat(service.addPhoto(id, reference, file, foreman).id()).isEqualTo(photo.id());
        assertThat(Base64.getDecoder().decode(service.getPhoto(id, photo.id(), coordinator).base64())).isEqualTo(png);
        assertThatThrownBy(() -> service.getPhoto(id, photo.id(), outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.addPhoto(id, UUID.randomUUID(), file, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.addPhoto(id, UUID.randomUUID(), new MockMultipartFile("file", "bad.png", "image/png", "not an image".getBytes()), foreman))
                .isInstanceOf(ValidationException.class);
    }

    @Test void httpContractsValidateInputAndCorsAllowsIdempotency() throws Exception {
        var principal = user(foreman).authorities(() -> "SUPERVISOR");
        mvc.perform(post("/api/v1/incidents").with(principal).contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID()).content("{\"description\":\"Rama caída\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.incident.status.code").value("PENDING_APPROVAL"));
        mvc.perform(post("/api/v1/incidents").with(principal).contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", UUID.randomUUID()).content("{\"description\":\"  \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/incidents").with(principal).contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", "invalid").content("{\"description\":\"Rama\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/incidents/1/approve").with(principal).contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isForbidden());
        mvc.perform(options("/api/v1/incidents").header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "Idempotency-Key,Content-Type,Authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
