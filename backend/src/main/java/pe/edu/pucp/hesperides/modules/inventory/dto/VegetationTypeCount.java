package pe.edu.pucp.hesperides.modules.inventory.dto;

/** Un tipo de vegetación con sus ejemplares. Van los nueve, aunque alguno tenga cero. */
public record VegetationTypeCount(String code, String label, long count) {
}
