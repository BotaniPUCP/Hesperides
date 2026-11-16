package pe.edu.pucp.hesperides.modules.incidents.prefill;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentPrefillService;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentReported;

/**
 * Corre el prellenado en segundo plano después del commit del reporte. Si la transacción se
 * revierte no hay nada que prellenar; si el agente tarda, la respuesta al capataz no lo espera.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "hesperides.incidents.prefill.auto-run", havingValue = "true", matchIfMissing = true)
public class PrefillTrigger {
    private static final int THREADS = 2;
    private static final int QUEUE = 100;
    private final IncidentPrefillService prefill;
    private final TaskExecutor executor;

    public PrefillTrigger(IncidentPrefillService prefill) {
        this.prefill = prefill;
        var pool = new ThreadPoolTaskExecutor();
        pool.setCorePoolSize(THREADS);
        pool.setMaxPoolSize(THREADS);
        pool.setQueueCapacity(QUEUE);
        pool.setThreadNamePrefix("incident-prefill-");
        pool.initialize();
        this.executor = pool;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReported(IncidentReported event) {
        try {
            executor.execute(() -> prefill.run(event.incidentId()));
        } catch (RuntimeException ex) {
            // Cola llena: el reporte ya está guardado y coordinación puede reintentar a mano.
            log.warn("Incident prefill not scheduled incidentId={}", event.incidentId());
        }
    }
}
