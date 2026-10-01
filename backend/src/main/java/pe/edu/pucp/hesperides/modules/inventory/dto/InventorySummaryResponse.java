package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.util.List;

/** Cuántas especies y ejemplares hay, y cuántos ejemplares por tipo de vegetación. */
public record InventorySummaryResponse(long totalSpecies, long totalSpecimens, List<VegetationTypeCount> vegetationTypes) {
}
