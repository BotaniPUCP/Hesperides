package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;
import pe.edu.pucp.hesperides.modules.incidents.entity.IncidentIntervention;
import pe.edu.pucp.hesperides.modules.incidents.repository.IncidentInterventionsRepository;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Matrix-specific rules; approval, scope and transaction boundaries remain in the incident service. */
@Component @RequiredArgsConstructor
public class IncidentMatrix {
    private final CatalogItemsRepository catalogs;
    private final UsersRepository users;
    private final JdbcTemplate jdbc;
    private final IncidentBusinessCalendar calendar;
    private final IncidentInterventionsRepository interventions;
    private final IncidentWorkLinks workLinks;

    public void initialize(Incident incident) {
        incident.setEvent(item("INCIDENT_EVENT", "INCIDENT"));
        incident.setServiceGroup(item("INCIDENT_SERVICE_GROUP", "GREEN_AREAS"));
    }

    public void number(Incident incident) {
        if (incident.getOfficialNumber() == null)
            incident.setOfficialNumber(jdbc.queryForObject("SELECT nextval('incident_official_number_seq')", Long.class));
    }

    public String code(Incident incident) {
        return incident.getOfficialNumber() == null ? null : "OSG-%04d".formatted(incident.getOfficialNumber());
    }

    public Long duration(Incident incident) {
        if (incident.getResolvedAt() == null) return null;
        return incident.getClosureBusinessDays() != null ? incident.getClosureBusinessDays()
                : calendar.count(incident.getCreatedAt(), incident.getResolvedAt());
    }

    public void apply(Incident incident, MatrixRequest request) {
        if (request == null) return;
        incident.setService(retainedItem("INCIDENT_SERVICE", request.serviceCode(), incident.getService()));
        incident.setCompany(retainedItem("INCIDENT_COMPANY", request.companyCode(), incident.getCompany()));
        CatalogItem process = retainedItem("INCIDENT_PROCESS", request.processCode(), incident.getProcess());
        CatalogItem subprocess = retainedItem("INCIDENT_SUBPROCESS", request.subprocessCode(), incident.getSubprocess());
        if (subprocess != null && (process == null || subprocess.getParentItem() == null
                || !subprocess.getParentItem().getId().equals(process.getId())))
            throw new ValidationException("Subprocess does not belong to process");
        incident.setProcess(process); incident.setSubprocess(subprocess);
        incident.setSeverity(retainedItem("INCIDENT_SEVERITY", request.severityCode(), incident.getSeverity()));
        Set<CatalogItem> impacts = new LinkedHashSet<>();
        if (request.impactCodes() != null) request.impactCodes().forEach(c -> impacts.add(retainedItem("INCIDENT_IMPACT", c,
                incident.getImpacts().stream().filter(i -> i.getCode().equals(c)).findFirst().orElse(null))));
        if (impacts.contains(null)) throw new ValidationException("Invalid catalog item");
        incident.replaceImpacts(impacts);
        if (incident.getResponsible() == null || !Objects.equals(incident.getResponsible().getId(), request.responsibleUserId()))
            incident.setResponsible(request.responsibleUserId() == null ? null : users.findById(request.responsibleUserId())
                    .filter(this::availablePerson).orElseThrow(() -> new ValidationException("Invalid responsible person")));
        incident.setImmediateAction(clean(request.immediateAction()));
        incident.setRootCauseItem(retainedItem("INCIDENT_ROOT_CAUSE", request.rootCauseCode(), incident.getRootCauseItem()));
        incident.setRootCause(clean(request.rootCause()));
        incident.setPreventiveAction(clean(request.preventiveAction()));
        incident.setImpactedProcess(clean(request.impactedProcess()));
        incident.setObservations(clean(request.observations()));
    }

    public MatrixResponse response(Incident i) {
        return new MatrixResponse(option(i.getEvent()), option(i.getServiceGroup()), option(i.getService()),
                option(i.getCompany()), option(i.getProcess()), option(i.getSubprocess()), option(i.getSeverity()),
                i.getImpacts().stream().sorted(Comparator.comparingInt(CatalogItem::getSortOrder)).map(this::option).toList(),
                person(i.getResponsible()), i.getImmediateAction(), option(i.getRootCauseItem()), i.getRootCause(),
                i.getPreventiveAction(), i.getImpactedProcess(), i.getObservations());
    }

    public MatrixOptionsResponse options(boolean coordinator) {
        return new MatrixOptionsResponse(options("INCIDENT_SERVICE"), options("INCIDENT_COMPANY"),
                options("INCIDENT_PROCESS"), options("INCIDENT_SUBPROCESS"), options("INCIDENT_SEVERITY"),
                options("INCIDENT_IMPACT"), options("INCIDENT_ROOT_CAUSE"), options("INCIDENT_ACTION_PURPOSE"),
                coordinator ? users.findAll().stream().filter(this::availablePerson)
                        .sorted(Comparator.comparing(User::getFullName)).map(this::person).toList() : List.of());
    }

    public MatrixSummaryResponse summary(List<Incident> records) {
        List<Incident> approved = records.stream().filter(i -> i.getApprovedAt() != null).toList();
        var durations = approved.stream().map(this::duration).filter(Objects::nonNull).toList();
        long pending = workLinks.countWork(false,true);
        return new MatrixSummaryResponse(pending, durations.size(), durations.isEmpty() ? null :
                durations.stream().mapToLong(Long::longValue).average().orElseThrow(),
                distribution(approved, i -> Stream.of(label(i.getSeverity()))),
                distribution(approved, i -> i.getImpacts().isEmpty() ? Stream.of("Sin evaluar")
                        : i.getImpacts().stream().map(CatalogItem::getLabel)),
                distribution(approved, i -> Stream.of(label(i.getService()))),
                distribution(approved.stream().filter(i -> i.getResolvedAt() == null).toList(),
                        i -> Stream.of(i.getResponsible() == null ? "Sin asignar" : i.getResponsible().getFullName())));
    }

    private List<DistributionResponse> distribution(List<Incident> records, Function<Incident, Stream<String>> values) {
        return records.stream().flatMap(values).collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String,Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
                .map(e -> new DistributionResponse(e.getKey(), e.getValue())).toList();
    }

    public ExportResponse export(List<Incident> records) {
        List<String> lines = new ArrayList<>();
        lines.add(csv(List.of("N°", "Fecha de recepción/registro", "Tipo de evento", "Tipo de servicio", "Servicio",
                "Empresa", "Código Proceso (N2)", "Subproceso", "Descripción del evento", "Canal de ingreso",
                "Reportado por", "Severidad", "Impacto", "Responsable de atención",
                "Acción inmediata// Acción correctiva", "Causa Raíz C", "Causa raíz",
                "Acción preventiva/ Oportunidad de mejora", "Proceso impactado para mejora", "Estado",
                "Fecha de cierre", "Tiempo de cierre", "Observaciones")));
        records.stream().filter(i -> i.getApprovedAt() != null).forEach(i -> {
            var work = interventions.findByIncidentIdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(i.getId());
            var linked = workLinks.all(i.getId());
            lines.add(csv(Arrays.asList(
                code(i), calendar.date(i.getCreatedAt()).toString(), text(i.getEvent()), text(i.getServiceGroup()),
                text(i.getService()), text(i.getCompany()), text(i.getProcess()), text(i.getSubprocess()),
                i.getDescription(), i.getChannel(), i.getReportedBy().getFullName(), text(i.getSeverity()),
                i.getImpacts().stream().sorted(Comparator.comparingInt(CatalogItem::getSortOrder))
                        .map(CatalogItem::getLabel).collect(Collectors.joining(", ")),
                i.getResponsible() == null ? "" : i.getResponsible().getFullName(), actionText(i.getImmediateAction(), work, linked, "MITIGATION"),
                causeText(i.getRootCauseItem()), i.getRootCause(), actionText(i.getPreventiveAction(), work, linked, "PREVENTION"), i.getImpactedProcess(),
                i.getResolvedAt() != null ? "Cerrado" : Set.of("IN_PROGRESS","RESOLUTION_OBSERVED").contains(i.getStatus().getCode()) ? "En proceso" : "Abierto",
                i.getResolvedAt() == null ? "" : calendar.date(i.getResolvedAt()).toString(),
                duration(i) == null ? "" : duration(i).toString(), Stream.of(i.getObservations(),
                        i.getResolvedAt()==null && i.getResolutionObservation()!=null ? "Resolución observada: "+i.getResolutionObservation() : null,
                        i.getResolutionSummary()==null ? null : "Resolución validada: "+i.getResolutionSummary())
                        .filter(Objects::nonNull).collect(Collectors.joining("\n")))));
        });
        return new ExportResponse("matriz-incidencias-osg.csv", "text/csv;charset=utf-8", "\uFEFF" + String.join("\r\n", lines) + "\r\n");
    }

    private String actionText(String declared, List<IncidentIntervention> work, List<LinkedInterventionResponse> linked, String purpose) {
        List<String> descriptions = new ArrayList<>();
        if (declared != null) descriptions.add(declared);
        work.stream().filter(w -> w.getReplacementInterventionId()==null
                        && (w.getPurpose() == null ? "MITIGATION" : w.getPurpose().getCode()).equals(purpose))
                .forEach(w -> descriptions.add("[Registro anterior: " + w.getStatus().getLabel() + "] " + w.getDescription()));
        linked.stream().filter(w -> w.purpose().code().equals(purpose)).forEach(w -> descriptions.add(
                "["+catalogs.findByTypeCodeAndCode("INTERVENTION_STATUS",w.statusCode()).map(CatalogItem::getLabel).orElse(w.statusCode())+"] "
                        +Objects.toString(w.code(),"No disponible")+" · "+Objects.toString(w.description(),"")));
        return String.join("\n", descriptions);
    }

    public static String csv(List<String> cells) {
        return cells.stream().map(value -> {
            String text = value == null ? "" : value;
            String stripped = text.stripLeading();
            if ((!stripped.isEmpty() && "=+-@".indexOf(stripped.charAt(0)) >= 0)
                    || text.startsWith("\t") || text.startsWith("\r") || text.startsWith("\n")) text = "'" + text;
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }).collect(Collectors.joining(","));
    }

    private CatalogItem item(String type, String code) {
        return code == null || code.isBlank() ? null : catalogs.findActiveItemByTypeAndCode(type, code)
                .orElseThrow(() -> new ValidationException("Invalid catalog item"));
    }
    private CatalogItem retainedItem(String type, String code, CatalogItem current) {
        return current != null && current.getCode().equals(code) ? current : item(type, code);
    }
    private boolean availablePerson(User user) {
        return user.isActive() && !user.isDeleted() && IncidentRoles.participates(user.getRoleCode());
    }
    private List<MatrixOptionResponse> options(String type) {
        return catalogs.findActiveByTypeCode(type).stream().map(i -> new MatrixOptionResponse(i.getId(), i.getCode(),
                i.getLabel(), i.getParentItem() == null ? null : i.getParentItem().getCode(), description(i))).toList();
    }
    private String description(CatalogItem item) {
        return item.getMetadata() == null ? null : Objects.toString(item.getMetadata().get("description"), null);
    }
    private String causeText(CatalogItem item) {
        return item == null ? "" : item.getCode() + " — " + Objects.toString(description(item), item.getLabel());
    }
    private String clean(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private String text(CatalogItem i) { return i == null ? "" : i.getLabel(); }
    private String label(CatalogItem i) { return i == null ? "Sin evaluar" : i.getLabel(); }
    private OptionResponse option(CatalogItem i) { return i == null ? null : new OptionResponse(i.getId(), i.getCode(), i.getLabel()); }
    private PersonResponse person(User u) { return u == null ? null : new PersonResponse(u.getId(), u.getFullName()); }
}
