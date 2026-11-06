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
import java.util.List;
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
    @Autowired tools.jackson.databind.ObjectMapper mapper;
    @Autowired pe.edu.pucp.hesperides.modules.interventions.service.InterventionsService workService;
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

    <T> T asActor(String email, java.util.function.Supplier<T> operation) {
        var previous=org.springframework.security.core.context.SecurityContextHolder.getContext();
        var context=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(email,"unused",List.of()));
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);
        try { return operation.get(); } finally { org.springframework.security.core.context.SecurityContextHolder.setContext(previous); }
    }
    DetailResponse resolve(long id,String email) {
        var current=service.getById(id,email);
        return service.resolve(id,new ResolutionRequest(current.incident().version(),"Se retiró la rama, se revisó el área y quedó libre el acceso."),email);
    }
    long planWork(long incidentId,String purpose) {
        long type=jdbc.queryForObject("SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INTERVENTION_TYPE' AND ci.parent_item_id IS NOT NULL AND ci.is_active LIMIT 1",Long.class);
        long group=jdbc.queryForObject("SELECT parent_item_id FROM catalog_items WHERE id=?",Long.class,type);
        var point=new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Point(-12.07,-77.08);
        var location=new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Location(null,UUID.randomUUID(),null,null,point,List.of(),"Lugar comprobado",null,null,List.of());
        var request=new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Planning(group,type,java.time.LocalDate.now(),"Acción ejecutada de prueba",null,null,null,null,List.of(location),null,null);
        var work=asActor(coordinator,() -> workService.create(request,UUID.randomUUID()).intervention());
        var current=service.getById(incidentId,coordinator);
        service.linkIntervention(incidentId,new LinkInterventionRequest(current.incident().version(),work.getId(),work.getVersion(),purpose),coordinator);
        return work.getId();
    }
    pe.edu.pucp.hesperides.modules.interventions.dto.InterventionDetailResponse finishWork(long id) {
        var work=asActor(coordinator,() -> workService.findById(id));
        work=asActor(coordinator,() -> workService.assign(id,new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Assignment(
                asActor(coordinator,() -> workService.findById(id)).getVersion(),teamId,foremanId)));
        long locationId=((Number)work.getLocations().getFirst().get("id")).longValue();
        var started=asActor(foreman,() -> workService.start(id,locationId,new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Start(
                asActor(foreman,() -> workService.findById(id)).getVersion())));
        var photo=asActor(foreman,() -> workService.announceEvidence(id,
                new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Evidence(started.getVersion(),locationId,UUID.randomUUID(),"AFTER",null,null,null,"Evidencia real de prueba"),UUID.randomUUID()));
        byte[] image;
        try {
            var out=new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(4,4,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",out);
            image=out.toByteArray();
        } catch (java.io.IOException ex) { throw new java.io.UncheckedIOException(ex); }
        asActor(foreman,() -> workService.uploadEvidence(id,photo.evidence().id(),new MockMultipartFile("file","evidence.png","image/png",image)));
        var received=asActor(foreman,() -> workService.findById(id));
        return asActor(foreman,() -> workService.complete(id,locationId,new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Completion(received.getVersion(),null,"Trabajo ejecutado y área revisada")));
    }
    void validateWork(long id) {
        var work=asActor(coordinator,() -> workService.findById(id));
        long location=((Number)work.getLocations().getFirst().get("id")).longValue();
        asActor(coordinator,() -> workService.validateLocation(id,location,new pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Review(work.getVersion())));
    }

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
        assertThatThrownBy(() -> resolve(id, foreman)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> resolve(id, coordinator)).isInstanceOf(BusinessRuleException.class);
        long first=planWork(id,"MITIGATION"), second=planWork(id,"PREVENTION");
        service.start(id,foreman);
        finishWork(first); validateWork(first);
        finishWork(second);
        assertThatThrownBy(() -> resolve(id,coordinator)).isInstanceOf(BusinessRuleException.class);
        validateWork(second);
        var resolved = resolve(id, coordinator);
        assertThat(resolved.incident().status().code()).isEqualTo("RESOLVED");
        assertThat(resolve(id, coordinator).history()).hasSize(4);
        assertThat(resolved.incident().resolutionSummary()).isNotBlank();
        assertThat(resolved.incident().resolvedBy().id()).isNotEqualTo(foremanId);
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
        assertThatThrownBy(() -> service.update(id, review, coordinator)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.approve(id, sent.incident().version(), coordinator)).isInstanceOf(ConflictException.class);
        assertThat(approve(edited).incident().approvedBy().fullName()).isEqualTo("Persona Prueba");
    }

    @Test void resourcesAndMutationsAreScopedToTheActualTeamLeader() {
        var sent = approve(create()); long id = sent.incident().id();
        assertThat(service.getAll(outsider, null, null, 0, 20).getContent()).noneMatch(i -> i.id() == id);
        assertThatThrownBy(() -> service.getById(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> resolve(id, outsider)).isInstanceOf(ResourceNotFoundException.class);
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
                .isInstanceOf(ConflictException.class);
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
            assertThat(approvalA.get().incident().officialCode()).isEqualTo(approvalB.get().incident().officialCode()).startsWith("OSG-");
        }
    }

    MatrixRequest assessment(String preventiveAction) {
        return new MatrixRequest("AV-01", "NONE", "GSG-02", "GREEN_OPERATIONS", "HIGH",
                List.of("SAFETY", "IMAGE"), foremanId, "Retirar rama", "AV-02", "Inspección confirma sobrecrecimiento",
                preventiveAction, "Gestión operativa de áreas verdes", "Seguimiento dentro de la plataforma");
    }

    DetailResponse reviewMatrix(DetailResponse detail, MatrixRequest matrix) {
        var i = detail.incident();
        return service.update(i.id(), new ReviewIncidentRequest(i.version(), i.description(), i.locationReference(),
                i.latitude(), i.longitude(), null, null, teamId, matrix), coordinator);
    }

    @Test void matrixKeepsSeverityServiceRootCauseAndMultipleImpactsDistinct() {
        var sent = create();
        assertThat(sent.incident().officialCode()).isNull();
        var reviewed = reviewMatrix(sent, assessment(null));
        var matrix = reviewed.incident().matrix();
        assertThat(matrix.service().code()).isEqualTo("AV-01");
        assertThat(matrix.rootCauseItem().code()).isEqualTo("AV-02");
        assertThat(matrix.severity().code()).isEqualTo("HIGH");
        assertThat(reviewed.incident().urgency()).isNull();
        assertThat(matrix.impacts()).extracting(OptionResponse::code).containsExactly("SAFETY", "IMAGE");
        assertThat(matrix.responsible().id()).isEqualTo(foremanId);
        assertThat(reviewed.incident().originalDescription()).isEqualTo(capture().description());
        assertThat(reviewed.updates()).hasSize(1);
        assertThat(reviewed.updates().getFirst().kind().code()).isEqualTo("REVIEW");
        assertThat(approve(reviewed).incident().officialCode()).startsWith("OSG-");
    }

    @Test void reporterCanCaptureAndReviseTheOsgTemplateWithoutOfficialRegistration() {
        var a=assessment("Revisar árboles adyacentes");
        var detail=service.create(new CreateIncidentRequest("Ejemplo OSG: rama inclinada junto al aula",null,null,null,a),UUID.randomUUID(),foreman).detail();
        assertThat(detail.incident().approvedAt()).isNull();
        assertThat(detail.incident().matrix().rootCauseItem().label()).contains("falta de poda/competencia por la luz");
        assertThat(detail.incident().matrix().impacts()).hasSize(2);
        assertThat(detail.canEdit()).isTrue();
        var i=detail.incident();
        var revised=service.update(i.id(),new ReviewIncidentRequest(i.version(),"Precisado por el capataz",null,null,null,null,null,teamId,a),foreman);
        assertThat(revised.incident().originalDescription()).isEqualTo(i.originalDescription());
        assertThat(revised.incident().matrix().preventiveAction()).isEqualTo(a.preventiveAction());
        assertThatThrownBy(() -> service.update(i.id(),new ReviewIncidentRequest(revised.incident().version(),"Intrusión",null,null,null,null,null,teamId,a),outsider)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void intakeChannelAndReportedPersonAreNotTheAuthenticatedCaptureIdentity() {
        var a=assessment(null);
        long zone=service.options(foreman).matrix().zones().getFirst().id();
        var data=new MatrixRequest(a.serviceCode(),a.companyCode(),a.processCode(),a.subprocessCode(),a.severityCode(),a.impactCodes(),
                a.responsibleUserId(),a.immediateAction(),a.rootCauseCode(),a.rootCause(),null,a.impactedProcess(),a.observations(),
                "COMPLAINT","EMAIL","Persona que envió el correo",zone);
        var report=service.create(new CreateIncidentRequest("Reporte recibido por correo",null,null,null,data),UUID.randomUUID(),foreman).detail();
        assertThat(report.incident().channel()).isEqualTo("WEB");
        assertThat(report.incident().reportedBy().id()).isEqualTo(foremanId);
        assertThat(report.incident().matrix().intakeChannel().label()).isEqualTo("Correo institucional");
        assertThat(report.incident().matrix().event().label()).isEqualTo("Reclamo");
        assertThat(report.incident().matrix().zone().id()).isEqualTo(zone);
        approve(report);
        assertThat(service.export(coordinator).content()).contains("Persona que envió el correo","Correo institucional");
    }

    @Test void catalogsAndExportHeadersMatchTheSuppliedWorkbookReference() throws Exception {
        var path=java.nio.file.Path.of(System.getProperty("basedir","."),"..","shared","fixtures","osg-incidents.json");
        var reference=mapper.readTree(java.nio.file.Files.readString(path));
        var options=service.options(foreman).matrix();
        assertThat(options.rootCauses()).hasSize(15);
        for(int n=0;n<15;n++)assertThat(options.rootCauses().get(n).description()).isEqualTo(reference.get("rootCauses").get(n).asString());
        assertThat(options.events()).extracting(MatrixOptionResponse::label).containsExactlyElementsOf(reference.get("events").valueStream().map(v -> v.asString()).toList());
        assertThat(options.intakeChannels()).extracting(MatrixOptionResponse::label).containsExactlyElementsOf(reference.get("channels").valueStream().map(v -> v.asString()).toList());
        assertThat(options.services()).extracting(MatrixOptionResponse::label).containsExactlyElementsOf(reference.get("services").valueStream().map(v -> v.asString()).toList());
        String expected=reference.get("columns").valueStream().map(v -> "\""+v.asString()+"\"").collect(java.util.stream.Collectors.joining(","));
        assertThat(service.export(coordinator).content().lines().findFirst().orElseThrow()).isEqualTo("\uFEFF"+expected);
    }

    @Test void myReportsExcludeOtherPeoplesReportsEvenWhenTheForemanCanReadThem() {
        var own=create();
        var other=service.create(capture(),UUID.randomUUID(),coordinator).detail();
        var i=other.incident();
        service.update(i.id(),new ReviewIncidentRequest(i.version(),i.description(),null,null,null,null,null,teamId),coordinator);
        assertThat(service.getAll(foreman,null,null,0,50).getContent()).extracting(IncidentResponse::id).contains(own.incident().id(),i.id());
        assertThat(service.myReports(foreman).recent()).extracting(IncidentResponse::id).contains(own.incident().id()).doesNotContain(i.id());
    }

    @Test void foremanLinksOnlyVisibleRealWorkAndCannotPlanThroughTheIncident() {
        var first=create();long work=planWork(first.incident().id(),"MITIGATION");finishWork(work);
        var other=create();var real=asActor(coordinator,() -> workService.findById(work));
        var linked=service.linkIntervention(other.incident().id(),new LinkInterventionRequest(other.incident().version(),work,real.getVersion(),"MITIGATION"),foreman);
        assertThat(linked.linkedInterventions()).hasSize(1);
        assertThat(linked.canCreateIntervention()).isFalse();
        assertThat(linked.incident().approvedAt()).isNull();
        var privateReport=service.create(capture(),UUID.randomUUID(),outsider).detail();
        long hidden=planWork(privateReport.incident().id(),"MITIGATION");var privateWork=asActor(coordinator,() -> workService.findById(hidden));
        assertThatThrownBy(() -> service.linkIntervention(linked.incident().id(),new LinkInterventionRequest(linked.incident().version(),hidden,privateWork.getVersion(),"MITIGATION"),foreman)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.availableInterventions("",0,foreman).getContent()).extracting(LinkedInterventionResponse::id).doesNotContain(hidden);
    }

    @Test void dashboardIncludesPendingReportsAndFiltersDoNotChangeItsPopulation() {
        long before=service.summary(coordinator).dashboard().total();
        var sent=service.create(new CreateIncidentRequest("Detalle para resumen y filtros",null,null,null,assessment(null)),UUID.randomUUID(),foreman).detail();
        var summary=service.summary(coordinator);
        assertThat(summary.dashboard().total()).isEqualTo(before+1);
        assertThat(summary.matrix().rootCauses()).anyMatch(r -> r.label().equals("AV-02") && r.count()>0);
        var filtered=service.getAll(coordinator,"Detalle para resumen y filtros",null,0,20,new ListFilter("HIGH",null,"AV-01",null,"PENDING"));
        assertThat(filtered.getContent()).extracting(IncidentResponse::id).containsExactly(sent.incident().id());
        assertThat(service.getAll(coordinator,"Detalle para resumen y filtros",null,0,20,new ListFilter("LOW",null,null,null,null))).isEmpty();
        assertThat(service.summary(coordinator).dashboard().total()).isEqualTo(before+1);
    }

    @Test void rejectsSubprocessFromAnotherProcessAndCrossCatalogSelections() {
        var sent = create(); var a = assessment(null);
        var invalid = new MatrixRequest(a.serviceCode(), a.companyCode(), "GSG-01", a.subprocessCode(), a.severityCode(),
                a.impactCodes(), a.responsibleUserId(), null, null, null, null, null, null);
        assertThatThrownBy(() -> reviewMatrix(sent, invalid)).isInstanceOf(ValidationException.class);
    }

    @Test void removingImpactsUsesSoftDeleteAndInvalidatesTheCommonVersion() {
        var reviewed = reviewMatrix(create(), assessment(null));
        var a = assessment(null);
        var fewer = new MatrixRequest(a.serviceCode(), a.companyCode(), a.processCode(), a.subprocessCode(), a.severityCode(),
                List.of("SAFETY"), a.responsibleUserId(), a.immediateAction(), a.rootCauseCode(), a.rootCause(), null, a.impactedProcess(), a.observations());
        var changed = reviewMatrix(reviewed, fewer);
        assertThat(changed.incident().version()).isGreaterThan(reviewed.incident().version());
        assertThat(changed.incident().matrix().impacts()).extracting(OptionResponse::code).containsExactly("SAFETY");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM incident_impacts WHERE incident_id=? AND deleted_at IS NOT NULL",
                Long.class, reviewed.incident().id())).isEqualTo(1);
    }

    @Test void unchangedRetiredMatrixChoicesRemainReadableAndSaveable() {
        var reviewed = reviewMatrix(create(), assessment(null));
        jdbc.update("UPDATE catalog_items SET is_active=false WHERE id=?", reviewed.incident().matrix().service().id());
        var saved = reviewMatrix(reviewed, assessment(null));
        assertThat(saved.incident().matrix().service().code()).isEqualTo("AV-01");
    }

    @Test void preventionTextAndCommentsDoNotCountAsCompletedPreventionWork() {
        var approved = approve(reviewMatrix(create(), assessment("Revisar árboles adyacentes")));
        long id = approved.incident().id();
        long first=planWork(id,"MITIGATION"), second=planWork(id,"PREVENTION");
        finishWork(first); validateWork(first);
        service.addComment(id, new CommentRequest(UUID.randomUUID(), "Se está coordinando la inspección"), foreman);
        assertThatThrownBy(() -> resolve(id, coordinator)).isInstanceOf(BusinessRuleException.class);
        finishWork(second);
        assertThatThrownBy(() -> resolve(id, coordinator)).isInstanceOf(BusinessRuleException.class);
        validateWork(second);
        assertThat(service.getById(id, foreman).incident().resolvedAt()).isNull();
        var closed = resolve(id, coordinator);
        assertThat(closed.incident().closureBusinessDays()).isNotNull().isGreaterThanOrEqualTo(0);
        assertThat(resolve(id, coordinator).incident().closureBusinessDays()).isEqualTo(closed.incident().closureBusinessDays());
    }

    @Test void commentsAreAuthorizedIdempotentAndPreserveTheOriginal() {
        var sent = create(); long id = sent.incident().id();
        var comment = new CommentRequest(UUID.randomUUID(), "Precisión de ubicación: frente a la puerta");
        assertThat(service.addComment(id, comment, foreman).updates()).hasSize(1);
        assertThat(service.addComment(id, comment, foreman).updates()).hasSize(1);
        assertThatThrownBy(() -> service.addComment(id, new CommentRequest(comment.clientReference(), "Otro texto"), foreman))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.addComment(id, comment, outsider)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.getById(id, foreman).incident().originalDescription()).isEqualTo(capture().description());
    }

    @Test void initialRegistrationAllowsNoWorkAndOptionalCorrectionRoundTrips() {
        var sent=create(); long id=sent.incident().id();
        var returned=service.requestCorrection(id,new ReasonRequest(sent.incident().version(),"Precisar el lugar y el problema"),coordinator);
        assertThat(returned.canCorrectReport()).isFalse();
        assertThat(returned.incident().officialCode()).isNull();
        assertThatThrownBy(() -> approve(returned)).isInstanceOf(BusinessRuleException.class);
        var reporter=service.getById(id,foreman);
        assertThat(reporter.canCorrectReport()).isTrue();
        var correction=new CorrectionRequest(reporter.incident().version(),new CreateIncidentRequest("Rama caída frente a Biblioteca","Acceso norte",null,null));
        var resent=service.resubmit(id,correction,foreman);
        assertThat(service.resubmit(id,correction,foreman).updates()).hasSize(resent.updates().size());
        assertThat(resent.incident().createdAt()).isEqualTo(sent.incident().createdAt());
        assertThat(resent.incident().originalDescription()).isEqualTo(sent.incident().originalDescription());
        assertThat(resent.incident().description()).isEqualTo(correction.report().description());
        var returnedAgain=service.requestCorrection(id,new ReasonRequest(resent.incident().version(),"Agregar referencia más precisa"),coordinator);
        var second=service.resubmit(id,new CorrectionRequest(returnedAgain.incident().version(),new CreateIncidentRequest("Rama caída frente a Biblioteca","Frente a la puerta norte",null,null)),foreman);
        var approved=approve(second);
        assertThat(approved.incident().officialCode()).isNotBlank();
        assertThat(approved.linkedInterventions()).isEmpty();
        assertThat(approved.canResolve()).isFalse();
        assertThatThrownBy(() -> service.resubmit(id,correction,foreman)).isInstanceOf(BusinessRuleException.class);
    }

    @Test void sharedWorkIsValidatedOnceAndEachIncidentClosesIndependently() {
        var first=approve(create()); var second=approve(create());
        long shared=planWork(first.incident().id(),"MITIGATION");
        long extra=planWork(first.incident().id(),"PREVENTION");
        var work=asActor(coordinator,() -> workService.findById(shared));
        var request=new LinkInterventionRequest(second.incident().version(),shared,work.getVersion(),"MITIGATION");
        var linked=service.linkIntervention(second.incident().id(),request,coordinator);
        assertThat(service.linkIntervention(second.incident().id(),request,coordinator).linkedInterventions()).hasSize(1);
        assertThat(asActor(coordinator,() -> workService.findById(shared)).getSourceIncidents()).hasSize(2);
        finishWork(shared);
        assertThat(service.getById(second.incident().id(),coordinator).canResolve()).isFalse();
        validateWork(shared);
        assertThat(service.summary(coordinator).validatedInterventions()).isEqualTo(1);
        assertThat(service.summary(coordinator).completedInterventions()).isEqualTo(1);
        assertThat(resolve(second.incident().id(),coordinator).incident().resolvedAt()).isNotNull();
        assertThatThrownBy(() -> resolve(first.incident().id(),coordinator)).isInstanceOf(BusinessRuleException.class);
        finishWork(extra); validateWork(extra);
        assertThat(resolve(first.incident().id(),coordinator).incident().resolvedAt()).isNotNull();
        assertThat(linked.requiredInterventionCount()).isEqualTo(1);
    }

    @Test void closureNeedsSummaryAndCoordinatorAndObservationDoesNotInvalidateSharedWork() {
        var approved=approve(create()); long id=approved.incident().id();
        long work=planWork(id,"MITIGATION"); finishWork(work); validateWork(work);
        var ready=service.getById(id,coordinator);
        assertThatThrownBy(() -> service.resolve(id,new ResolutionRequest(ready.incident().version(),"  "),coordinator)).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.resolve(id,new ResolutionRequest(ready.incident().version(),"Resuelto"),foreman)).isInstanceOf(AccessDeniedException.class);
        var closed=resolve(id,coordinator);
        var reopened=service.observeResolution(id,new ReasonRequest(closed.incident().version(),"El acceso sigue presentando otro obstáculo"),coordinator);
        assertThat(reopened.incident().officialCode()).isEqualTo(closed.incident().officialCode());
        assertThat(reopened.incident().resolvedAt()).isNull();
        assertThat(reopened.incident().closureBusinessDays()).isNull();
        assertThat(asActor(coordinator,() -> workService.findById(work)).getStatusCode()).isEqualTo("VALIDATED");
        assertThat(reopened.updates().getLast().body()).contains(closed.incident().resolutionSummary());
        long extra=planWork(id,"MITIGATION");
        assertThatThrownBy(() -> resolve(id,coordinator)).isInstanceOf(BusinessRuleException.class);
        finishWork(extra);validateWork(extra);resolve(id,coordinator);
    }

    @Test void sharedWorkDoesNotExposeAnotherReportOutsideIncidentScope() {
        var first=approve(create());
        var privateReport=approve(service.create(capture(),UUID.randomUUID(),outsider).detail());
        long work=planWork(first.incident().id(),"MITIGATION");
        var real=asActor(coordinator,() -> workService.findById(work));
        service.linkIntervention(privateReport.incident().id(),new LinkInterventionRequest(privateReport.incident().version(),work,real.getVersion(),"MITIGATION"),coordinator);
        finishWork(work);
        assertThat(asActor(foreman,() -> workService.findById(work)).getSourceIncidents()).hasSize(1);
        assertThat(asActor(foreman,() -> workService.findById(work)).getHistory().stream().filter(e -> e.get("actionCode").equals("INCIDENT_LINKED"))).hasSize(1);
        assertThat(asActor(coordinator,() -> workService.findById(work)).getSourceIncidents()).hasSize(2);
        assertThatThrownBy(() -> service.getById(privateReport.incident().id(),foreman)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void removesOnlyUnstartedLinksWithReasonWithoutDeletingSharedWork() {
        var first=approve(create());var second=approve(create());
        long work=planWork(first.incident().id(),"MITIGATION");
        var real=asActor(coordinator,() -> workService.findById(work));
        var other=service.linkIntervention(second.incident().id(),new LinkInterventionRequest(second.incident().version(),work,real.getVersion(),"MITIGATION"),coordinator);
        var current=service.getById(first.incident().id(),coordinator);
        service.unlinkIntervention(first.incident().id(),current.linkedInterventions().getFirst().linkId(),new ReasonRequest(current.incident().version(),"Se seleccionó un trabajo que no corresponde"),coordinator);
        assertThat(service.getById(first.incident().id(),coordinator).linkedInterventions()).isEmpty();
        assertThat(service.getById(second.incident().id(),coordinator).linkedInterventions()).hasSize(1);
        assertThat(asActor(coordinator,() -> workService.findById(work))).isNotNull();
        assertThatThrownBy(() -> resolve(first.incident().id(),coordinator)).isInstanceOf(BusinessRuleException.class);
        finishWork(work);
        var fresh=service.getById(second.incident().id(),coordinator);
        assertThatThrownBy(() -> service.unlinkIntervention(second.incident().id(),other.linkedInterventions().getFirst().linkId(),new ReasonRequest(fresh.incident().version(),"Intento de omitir revisión"),coordinator)).isInstanceOf(BusinessRuleException.class);
    }

    @Test void workCanBeRelatedBeforeOfficialRegistrationWithoutGrantingPlanningPermission() {
        var pending=create();
        assertThat(service.getById(pending.incident().id(),foreman).canCreateIntervention()).isFalse();
        assertThat(pending.canCreateIntervention()).isFalse();
        long work=planWork(pending.incident().id(),"MITIGATION");
        var result=service.interventionOptions(pending.incident().id(),"Acción ejecutada",0,coordinator);
        assertThat(result.getContent()).extracting(LinkedInterventionResponse::id).containsExactly(work);
        assertThat(service.interventionOptions(pending.incident().id(),"",0,foreman)).isEmpty();
        finishWork(work);
        assertThat(service.interventionOptions(pending.incident().id(),"",0,foreman).getContent()).extracting(LinkedInterventionResponse::id).containsExactly(work);
        assertThat(service.getById(pending.incident().id(),foreman).incident().approvedAt()).isNull();
    }

    @Test void prototypeWorkModelIsRemoved() {
        assertThat(jdbc.queryForObject("SELECT to_regclass('public.incident_interventions') IS NULL",Boolean.class)).isTrue();
    }

    @Test void exportsOnlyApprovedRecordsWithTwentyThreeColumnsAndNoFormulas() {
        var sent = service.create(new CreateIncidentRequest("=HYPERLINK(\"invalid\")", null, null, null), UUID.randomUUID(), foreman).detail();
        assertThat(service.export(coordinator).content()).doesNotContain("HYPERLINK");
        var approved = approve(reviewMatrix(sent, assessment(null)));
        long work=planWork(approved.incident().id(),"MITIGATION"); finishWork(work); validateWork(work);
        var exported = service.export(coordinator);
        assertThat(exported.content()).contains(approved.incident().officialCode(), "'=HYPERLINK");
        assertThat(exported.content().lines().findFirst().orElseThrow().split(",")).hasSize(23);
        assertThat(exported.content()).contains("Seguridad, Imagen institucional");
        assertThat(exported.content()).contains("Acción ejecutada de prueba");
        assertThatThrownBy(() -> service.export(foreman)).isInstanceOf(AccessDeniedException.class);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void simultaneousApprovalsOfDifferentIncidentsReceiveDistinctNumbers() throws Exception {
        var a = create(); var b = create();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> approve(a)); var second = executor.submit(() -> approve(b));
            assertThat(first.get(20, TimeUnit.SECONDS).incident().officialCode())
                    .isNotEqualTo(second.get(20, TimeUnit.SECONDS).incident().officialCode());
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
