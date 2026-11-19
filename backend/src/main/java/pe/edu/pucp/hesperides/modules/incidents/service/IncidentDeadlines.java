package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.incidents.DeadlinePolicy;
import pe.edu.pucp.hesperides.engine.incidents.DeadlineStatus;
import pe.edu.pucp.hesperides.engine.incidents.IncidentDeadline;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.DeadlineResponse;
import pe.edu.pucp.hesperides.modules.incidents.entity.Incident;

import java.time.Duration;
import java.time.Instant;

/**
 * Plazo de cada incidencia con los parámetros vigentes (SPEC-201 §3.9). Hasta que coordinación
 * fije un tercero con sus días, la incidencia se mide como de personal propio (§9).
 */
@Component @RequiredArgsConstructor
public class IncidentDeadlines {
    private static final int DEFAULT_HIGH_HOURS = 24;
    private static final int DEFAULT_MEDIUM_HOURS = 48;
    private static final int DEFAULT_LOW_HOURS = 72;
    private final SystemParameterReader parameters;

    public DeadlineResponse of(Incident incident, Instant now) {
        Duration allowed = allowed(incident);
        if (allowed == null) return null;
        Instant due = IncidentDeadline.dueAt(incident.getCreatedAt(), allowed);
        if (incident.isClosed()) return new DeadlineResponse(due, null, incident.getDeadlineMet());
        return new DeadlineResponse(due, status(incident, allowed, now).name(), null);
    }

    public DeadlineStatus status(Incident incident, Instant now) {
        Duration allowed = allowed(incident);
        return allowed == null ? null : status(incident, allowed, now);
    }

    public Boolean metAtClosure(Incident incident, Instant closedAt) {
        Duration allowed = allowed(incident);
        return allowed == null ? null : IncidentDeadline.met(incident.getCreatedAt(), allowed, closedAt);
    }

    private DeadlineStatus status(Incident incident, Duration allowed, Instant now) {
        return IncidentDeadline.status(incident.getCreatedAt(), allowed, now);
    }

    private Duration allowed(Incident incident) {
        boolean thirdParty = incident.isThirdParty() && incident.getAgreedDays() != null;
        if (!thirdParty && incident.getUrgency() == null) return null;
        String urgency = incident.getUrgency() == null ? null : incident.getUrgency().getCode();
        return policy().allowed(urgency, thirdParty, incident.getAgreedDays());
    }

    private DeadlinePolicy policy() {
        return new DeadlinePolicy(
                hours(SystemParameterCodes.INCIDENT_DEADLINE_HIGH_HOURS, DEFAULT_HIGH_HOURS),
                hours(SystemParameterCodes.INCIDENT_DEADLINE_MEDIUM_HOURS, DEFAULT_MEDIUM_HOURS),
                hours(SystemParameterCodes.INCIDENT_DEADLINE_LOW_HOURS, DEFAULT_LOW_HOURS));
    }

    /** Un valor no positivo apagaría el aviso del mapa sin que nadie lo note: vuelve al de fábrica. */
    private long hours(String code, int fallback) {
        int value = parameters.readInt(code, fallback);
        return value > 0 ? value : fallback;
    }
}
