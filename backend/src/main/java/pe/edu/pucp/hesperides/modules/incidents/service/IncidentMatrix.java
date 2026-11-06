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
    private final IncidentWorkLinks workLinks;

    public void initialize(Incident incident) {
        incident.setEvent(item("INCIDENT_EVENT", "INCIDENT"));
        incident.setServiceGroup(item("INCIDENT_SERVICE_GROUP", "GREEN_AREAS"));
        incident.setIntakeChannel(item("INCIDENT_INTAKE_CHANNEL", "FORM"));
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
        incident.setEvent(retainedItem("INCIDENT_EVENT",request.eventCode()==null ? "INCIDENT" : request.eventCode(),incident.getEvent()));
        incident.setIntakeChannel(retainedItem("INCIDENT_INTAKE_CHANNEL",request.intakeChannelCode()==null ? "FORM" : request.intakeChannelCode(),incident.getIntakeChannel()));
        incident.setReporterName(clean(request.reporterName()));
        if (request.zoneId()!=null && !Objects.equals(request.zoneId(),incident.getZoneId()) && zones().stream().noneMatch(z -> z.id().equals(request.zoneId())))
            throw new ValidationException("Invalid incident section");
        incident.setZoneId(request.zoneId());
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
                person(i.getResponsible()), i.getImmediateAction(), causeOption(i.getRootCauseItem()), i.getRootCause(),
                i.getPreventiveAction(), i.getImpactedProcess(), i.getObservations(),option(i.getIntakeChannel()),i.getReporterName(),zone(i.getZoneId()));
    }

    public MatrixOptionsResponse options(boolean coordinator) {
        return new MatrixOptionsResponse(options("INCIDENT_SERVICE"), options("INCIDENT_COMPANY"),
                options("INCIDENT_PROCESS"), options("INCIDENT_SUBPROCESS"), options("INCIDENT_SEVERITY"),
                options("INCIDENT_IMPACT"), options("INCIDENT_ROOT_CAUSE"), options("INCIDENT_ACTION_PURPOSE"),
                users.findAll().stream().filter(this::availablePerson)
                        .sorted(Comparator.comparing(User::getFullName)).map(this::person).toList(),
                options("INCIDENT_EVENT"),options("INCIDENT_INTAKE_CHANNEL"),zones());
    }

    private static final String ZONES = """
        SELECT z.id,z.code,z.name,coalesce(s.name,ps.name) AS sector FROM zones z
        JOIN catalog_items t ON t.id=z.zone_type_item_id
        LEFT JOIN zones p ON p.id=z.parent_zone_id AND p.deleted_at IS NULL
        LEFT JOIN catalog_items pt ON pt.id=p.zone_type_item_id
        LEFT JOIN zones s ON s.id=p.id AND pt.code='SECTOR'
        LEFT JOIN zones ps ON ps.id=p.parent_zone_id AND ps.deleted_at IS NULL
        WHERE t.code IN ('SECTION','SUBSECTION')
        """;
    public List<ZoneOptionResponse> zones() {
        return jdbc.query(ZONES+" AND z.is_active AND z.deleted_at IS NULL ORDER BY z.name,z.id",
                (r,n) -> new ZoneOptionResponse(r.getLong("id"),r.getString("code"),r.getString("name"),r.getString("sector")));
    }
    private ZoneOptionResponse zone(Long id) {
        if (id==null) return null;
        return jdbc.query(ZONES+" AND z.id=?",(r,n) -> new ZoneOptionResponse(r.getLong("id"),r.getString("code"),r.getString("name"),r.getString("sector")),id)
                .stream().findFirst().orElse(null);
    }

    public MatrixSummaryResponse summary(List<Incident> records) {
        List<Incident> approved = records.stream().filter(i -> i.getApprovedAt() != null).toList();
        var durations = approved.stream().map(this::duration).filter(Objects::nonNull).toList();
        long pending = workLinks.countWork(false,true);
        return new MatrixSummaryResponse(pending, durations.size(), durations.isEmpty() ? null :
                durations.stream().mapToLong(Long::longValue).average().orElseThrow(),
                distribution(records, i -> Stream.of(label(i.getSeverity()))),
                distribution(records, i -> i.getImpacts().isEmpty() ? Stream.of("Sin evaluar")
                        : i.getImpacts().stream().map(CatalogItem::getLabel)),
                distribution(records, i -> Stream.of(label(i.getService()))),
                distribution(records.stream().filter(i -> i.getResolvedAt() == null).toList(),
                         i -> Stream.of(i.getResponsible() == null ? "Sin asignar" : i.getResponsible().getFullName())),
                distribution(records,i -> Stream.of(label(i.getStatus()))),
                distribution(records.stream().filter(i -> i.getResolvedAt()==null).toList(),i -> Stream.of(label(i.getUrgency()))),
                distribution(records,i -> Stream.of(i.getRootCauseItem()==null ? "Sin determinar" : i.getRootCauseItem().getCode())),
                distribution(records,i -> Stream.of(label(i.getCompany()))),
                distribution(records.stream().filter(i -> i.getResolvedAt()==null).toList(),i -> {
                    var z=zone(i.getZoneId());return Stream.of(z==null || z.sectorLabel()==null ? "Sin sector identificado" : z.sectorLabel());
                }),
                distribution(records,i -> {var z=zone(i.getZoneId());return Stream.of(z==null ? "Sin sección identificada" : z.label());}),
                distribution(records,i -> Stream.of(label(i.getEvent()))),
                distribution(records,i -> Stream.of(label(i.getIntakeChannel()))));
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
            var linked = workLinks.all(i.getId());
            lines.add(csv(Arrays.asList(
                code(i), calendar.date(i.getCreatedAt()).toString(), text(i.getEvent()), text(i.getServiceGroup()),
                text(i.getService()), text(i.getCompany()), text(i.getProcess()), text(i.getSubprocess()),
                i.getDescription(), text(i.getIntakeChannel()), i.getReporterName()==null ? i.getReportedBy().getFullName() : i.getReporterName(), text(i.getSeverity()),
                i.getImpacts().stream().sorted(Comparator.comparingInt(CatalogItem::getSortOrder))
                        .map(CatalogItem::getLabel).collect(Collectors.joining(", ")),
                i.getResponsible() == null ? "" : i.getResponsible().getFullName(), actionText(i.getImmediateAction(), linked, "MITIGATION"),
                causeText(i.getRootCauseItem()), i.getRootCause(), actionText(i.getPreventiveAction(), linked, "PREVENTION"), i.getImpactedProcess(),
                i.getResolvedAt() != null ? "Cerrado" : Set.of("IN_PROGRESS","RESOLUTION_OBSERVED").contains(i.getStatus().getCode()) ? "En proceso" : "Abierto",
                i.getResolvedAt() == null ? "" : calendar.date(i.getResolvedAt()).toString(),
                duration(i) == null ? "" : duration(i).toString(), Stream.of(i.getObservations(),
                        i.getResolvedAt()==null && i.getResolutionObservation()!=null ? "Resolución observada: "+i.getResolutionObservation() : null,
                        i.getResolutionSummary()==null ? null : "Resolución validada: "+i.getResolutionSummary())
                        .filter(Objects::nonNull).collect(Collectors.joining("\n")))));
        });
        return new ExportResponse("matriz-incidencias-osg.csv", "text/csv;charset=utf-8", "\uFEFF" + String.join("\r\n", lines) + "\r\n");
    }

    private String actionText(String declared, List<LinkedInterventionResponse> linked, String purpose) {
        List<String> descriptions = new ArrayList<>();
        if (declared != null) descriptions.add(declared);
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
        return user.isActive() && !user.isDeleted() && Set.of("COORDINADOR", "SUPERVISOR").contains(user.getRoleCode());
    }
    private List<MatrixOptionResponse> options(String type) {
        return catalogs.findActiveByTypeCode(type).stream().map(i -> new MatrixOptionResponse(i.getId(), i.getCode(),
                type.equals("INCIDENT_ROOT_CAUSE") ? causeText(i) : i.getLabel(), i.getParentItem() == null ? null : i.getParentItem().getCode(), description(i))).toList();
    }
    private String description(CatalogItem item) {
        return item.getMetadata() == null ? null : Objects.toString(item.getMetadata().get("description"), null);
    }
    private String causeText(CatalogItem item) {
        return item == null ? "" : item.getCode() + " — " + Objects.toString(description(item), item.getLabel());
    }
    private OptionResponse causeOption(CatalogItem i) {return i==null ? null : new OptionResponse(i.getId(),i.getCode(),causeText(i));}
    private String clean(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private String text(CatalogItem i) { return i == null ? "" : i.getLabel(); }
    private String label(CatalogItem i) { return i == null ? "Sin evaluar" : i.getLabel(); }
    private OptionResponse option(CatalogItem i) { return i == null ? null : new OptionResponse(i.getId(), i.getCode(), i.getLabel()); }
    private PersonResponse person(User u) { return u == null ? null : new PersonResponse(u.getId(), u.getFullName()); }
}
