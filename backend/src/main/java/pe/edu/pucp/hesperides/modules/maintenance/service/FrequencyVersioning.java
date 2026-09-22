package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.dto.SeasonalIntervalPayload;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequencySeason;

import java.time.LocalDate;
import java.util.List;

/**
 * Las mecanicas de versionar una frecuencia.
 *
 * <p>Vive aparte del servicio porque es una responsabilidad completa: copiar una
 * version, cerrarla y trasladar sus estaciones no es orquestacion, es la regla
 * que protege el historico de cumplimiento.
 */
final class FrequencyVersioning {

    private FrequencyVersioning() {
    }

    /**
     * Si editar debe abrir una version nueva o basta con actualizar en sitio.
     *
     * <p>Una frecuencia creada hoy no ha regido ningun dia cerrado: no hay
     * periodo evaluado que proteger, y cerrarla con valid_to = ayer dejaria
     * valid_to anterior a valid_from.
     */
    static boolean requiresNewVersion(MaintenanceFrequency current) {
        return current.getValidFrom().isBefore(LocalDate.now());
    }

    /**
     * Una copia de la version vigente que empieza hoy.
     *
     * <p>Quien la llama debe cerrar la anterior en la misma transaccion: asi
     * nunca hay dos vigentes ni un dia sin ninguna.
     */
    static MaintenanceFrequency copyForNewVersion(MaintenanceFrequency current) {
        MaintenanceFrequency next = new MaintenanceFrequency();
        next.setActivityTypeItem(current.getActivityTypeItem());
        next.setFrequencyRuleTypeItem(current.getFrequencyRuleTypeItem());
        next.setRegime(current.getRegime());
        next.setScope(current.getScope());
        next.setZoneId(current.getZoneId());
        next.setTargetDaysInterval(current.getTargetDaysInterval());
        next.setMinDaysInterval(current.getMinDaysInterval());
        next.setMaxDaysInterval(current.getMaxDaysInterval());
        next.setAnnualTargetCount(current.getAnnualTargetCount());
        next.setCoverageTargetDays(current.getCoverageTargetDays());
        next.setEstimatedDurationDays(current.getEstimatedDurationDays());
        next.setSeasonStartMonth(current.getSeasonStartMonth());
        next.setSeasonEndMonth(current.getSeasonEndMonth());
        next.setNotes(current.getNotes());
        next.setActive(current.isActive());
        next.setValidFrom(LocalDate.now());
        // Las estaciones se copian, no se mueven: la version antigua conserva las
        // suyas para que su periodo siga siendo explicable.
        current.getSeasons().forEach(s -> next.addSeason(copyOf(s)));
        return next;
    }

    /** Cierra la vigencia ayer, para que la nueva version empiece hoy sin solaparse. */
    static void closeYesterday(MaintenanceFrequency current) {
        current.setValidTo(LocalDate.now().minusDays(1));
    }

    static void replaceSeasons(MaintenanceFrequency f, List<SeasonalIntervalPayload> payloads) {
        f.getSeasons().clear();
        if (payloads == null) {
            return;
        }
        for (SeasonalIntervalPayload p : payloads) {
            MaintenanceFrequencySeason s = new MaintenanceFrequencySeason();
            s.setSeason(p.season());
            s.setStartMonth(p.startMonth().shortValue());
            s.setEndMonth(p.endMonth().shortValue());
            s.setMinDaysInterval(p.minDaysInterval());
            s.setMaxDaysInterval(p.maxDaysInterval());
            s.setTargetDaysInterval(p.targetDaysInterval());
            f.addSeason(s);
        }
    }

    static SeasonalIntervalPayload toPayload(MaintenanceFrequencySeason s) {
        return new SeasonalIntervalPayload(s.getSeason(), (int) s.getStartMonth(),
                (int) s.getEndMonth(), s.getMinDaysInterval(), s.getMaxDaysInterval(),
                s.getTargetDaysInterval());
    }

    private static MaintenanceFrequencySeason copyOf(MaintenanceFrequencySeason s) {
        MaintenanceFrequencySeason c = new MaintenanceFrequencySeason();
        c.setSeason(s.getSeason());
        c.setStartMonth(s.getStartMonth());
        c.setEndMonth(s.getEndMonth());
        c.setMinDaysInterval(s.getMinDaysInterval());
        c.setMaxDaysInterval(s.getMaxDaysInterval());
        c.setTargetDaysInterval(s.getTargetDaysInterval());
        return c;
    }
}
