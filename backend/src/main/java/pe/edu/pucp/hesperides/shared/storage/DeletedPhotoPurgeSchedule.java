package pe.edu.pucp.hesperides.shared.storage;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Una vez al día, de madrugada: nadie sube fotos a esa hora. */
@Component
@RequiredArgsConstructor
public class DeletedPhotoPurgeSchedule {

    private final DeletedPhotoPurger purger;

    @Scheduled(cron = "${hesperides.storage.purge-cron:0 30 3 * * *}", zone = "America/Lima")
    public void run() {
        purger.purge(LocalDateTime.now());
    }
}
