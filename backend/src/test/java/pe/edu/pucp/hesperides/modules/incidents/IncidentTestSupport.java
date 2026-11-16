package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests;
import pe.edu.pucp.hesperides.modules.interventions.service.InterventionsService;
import pe.edu.pucp.hesperides.support.TestDatabase;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

/** Personas, cuadrilla e intervenciones reales para las pruebas de integración de SPEC-201. */
abstract class IncidentTestSupport {

    /** La regla de fecha de Intervenciones compara con el día civil del campus. */
    static final ZoneId CAMPUS_ZONE = ZoneId.of("America/Lima");
    /**
     * Un solo contenedor para todas las subclases: comparten la configuración de Spring, así que
     * comparten también el contexto en caché, y ese contexto debe seguir apuntando a una base viva.
     */
    static final PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    /** El agente real llama a Ollama Cloud; cada prueba decide qué responde. */
    @MockitoBean IncidentPrefillAgent agent;
    @Autowired JdbcTemplate jdbc;
    @Autowired IncidentCaptureService capture;
    @Autowired IncidentReviewService review;
    @Autowired IncidentLinksService links;
    @Autowired IncidentClosureService closure;
    @Autowired IncidentQueryService queries;
    @Autowired InterventionsService workService;
    String foreman, coordinator, admin, operator, outsider;
    long foremanId, operatorId, teamId;

    @BeforeEach
    void people() {
        String suffix = UUID.randomUUID().toString();
        foreman = "foreman-" + suffix + "@test.invalid";
        coordinator = "coordinator-" + suffix + "@test.invalid";
        admin = "admin-" + suffix + "@test.invalid";
        operator = "operator-" + suffix + "@test.invalid";
        outsider = "outsider-" + suffix + "@test.invalid";
        foremanId = person(foreman, "SUPERVISOR");
        person(coordinator, "COORDINADOR");
        person(admin, "ADMIN");
        operatorId = person(operator, "OPERARIO");
        person(outsider, "SUPERVISOR");
        teamId = jdbc.queryForObject("INSERT INTO teams(code,name,supervisor_user_id) VALUES (?,?,?) RETURNING id",
                Long.class, suffix, "Cuadrilla de prueba", foremanId);
    }

    long person(String email, String role) {
        return jdbc.queryForObject("""
            INSERT INTO users(email,password_hash,first_name,last_name,role_item_id)
            VALUES (?, 'unused', 'Persona', 'Prueba',
              (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
               WHERE ct.code='ROLE' AND ci.code=?))
            RETURNING id
            """, Long.class, email, role);
    }

    long anyZoneId() {
        return jdbc.queryForObject("SELECT id FROM zones WHERE boundary IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1", Long.class);
    }

    static CreateIncidentRequest report(String description, String severity) {
        return new CreateIncidentRequest(description, severity, null, null, null, null, null, null, null, null, null, null);
    }

    DetailResponse reportAs(String email) {
        return capture.create(report("Rama rajada sobre el Pontódromo", "MEDIUM"), UUID.randomUUID(), email).detail();
    }

    ReviewIncidentRequest completeReview(DetailResponse current) {
        var i = current.incident();
        return new ReviewIncidentRequest(i.version(), "Rama en riesgo", i.description(), "MEDIUM", "BRANCH_AT_RISK",
                anyZoneId(), i.locationReference(), i.latitude(), i.longitude(), teamId, false, null, null, "UNDER_5M",
                i.requestedBy().organizationId(), i.requestedBy().name(), null, null, null, null);
    }

    DetailResponse activeIncident() {
        var sent = reportAs(foreman);
        var reviewed = review.update(sent.incident().id(), completeReview(sent), coordinator);
        return review.activate(sent.incident().id(), new VersionRequest(reviewed.incident().version()), coordinator);
    }

    DetailResponse current(long id) {
        return queries.get(id, coordinator);
    }

    <T> T asActor(String email, Supplier<T> operation) {
        var previous = SecurityContextHolder.getContext();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(email, "unused", List.of()));
        SecurityContextHolder.setContext(context);
        try {
            return operation.get();
        } finally {
            SecurityContextHolder.setContext(previous);
        }
    }

    long planWork() {
        long type = jdbc.queryForObject("""
            SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INTERVENTION_TYPE' AND ci.parent_item_id IS NOT NULL AND ci.is_active LIMIT 1
            """, Long.class);
        long group = jdbc.queryForObject("SELECT parent_item_id FROM catalog_items WHERE id=?", Long.class, type);
        var point = new InterventionRequests.Point(-12.07, -77.08);
        var location = new InterventionRequests.Location(null, UUID.randomUUID(), null, null, point, List.of(),
                "Lugar comprobado", null, null, List.of());
        var request = new InterventionRequests.Planning(group, type, LocalDate.now(CAMPUS_ZONE), "Poda de prueba",
                null, null, null, null, List.of(location), null, null);
        return asActor(coordinator, () -> workService.create(request, UUID.randomUUID()).intervention()).getId();
    }

    DetailResponse link(long incidentId, long workId) {
        return links.link(incidentId, new LinkRequest(current(incidentId).incident().version(), workId), coordinator);
    }

    void finishWork(long id) {
        var work = asActor(coordinator, () -> workService.findById(id));
        work = asActor(coordinator, () -> workService.assign(id, new InterventionRequests.Assignment(
                asActor(coordinator, () -> workService.findById(id)).getVersion(), teamId, foremanId)));
        long locationId = ((Number) work.getLocations().getFirst().get("id")).longValue();
        var started = asActor(foreman, () -> workService.start(id, locationId, new InterventionRequests.Start(
                asActor(foreman, () -> workService.findById(id)).getVersion())));
        var photo = asActor(foreman, () -> workService.announceEvidence(id, new InterventionRequests.Evidence(
                started.getVersion(), locationId, UUID.randomUUID(), "AFTER", null, null, null, "Evidencia de prueba"),
                UUID.randomUUID()));
        asActor(foreman, () -> workService.uploadEvidence(id, photo.evidence().id(),
                new MockMultipartFile("file", "evidence.png", "image/png", png())));
        var received = asActor(foreman, () -> workService.findById(id));
        asActor(foreman, () -> workService.complete(id, locationId, new InterventionRequests.Completion(
                received.getVersion(), null, "Trabajo ejecutado", null)));
    }

    void validateWork(long id) {
        var work = asActor(coordinator, () -> workService.findById(id));
        long location = ((Number) work.getLocations().getFirst().get("id")).longValue();
        asActor(coordinator, () -> workService.validateLocation(id, location,
                new InterventionRequests.Review(work.getVersion())));
    }

    void cancelWork(long id) {
        var work = asActor(coordinator, () -> workService.findById(id));
        asActor(coordinator, () -> workService.cancel(id,
                new InterventionRequests.Cancellation(work.getVersion(), "Pasa al tercero")));
    }

    static byte[] png() {
        try {
            var out = new ByteArrayOutputStream();
            javax.imageio.ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
