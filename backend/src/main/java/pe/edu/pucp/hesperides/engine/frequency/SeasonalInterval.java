package pe.edu.pucp.hesperides.engine.frequency;

/**
 * El intervalo que rige durante una estacion.
 *
 * <p>Existe porque el clima manda sobre el calendario. El cliente lo dijo asi:
 * 2026 fue un ano atipico, "casi como si tuvieramos un verano eterno", y sin
 * invierno frio hubo que cortar cada 30-35 dias en vez de cada 45. Evaluar todo
 * el ano contra un unico numero reportaria incumplimiento donde hubo buena
 * gestion.
 */
public record SeasonalInterval(
        String season,
        int startMonth,
        int endMonth,
        Integer minDaysInterval,
        Integer maxDaysInterval
) {

    /**
     * Si el mes cae dentro de la estacion.
     *
     * <p>Una estacion puede cruzar el fin de ano (primavera de octubre a
     * diciembre no, pero una ventana de noviembre a febrero si). Cuando
     * {@code startMonth > endMonth} el rango se lee como dos tramos, no como
     * un rango vacio: ese es el error que hace que diciembre-enero no case
     * nunca si se compara con un simple {@code between}.
     */
    public boolean cubre(int month) {
        if (startMonth <= endMonth) {
            return month >= startMonth && month <= endMonth;
        }
        return month >= startMonth || month <= endMonth;
    }
}
