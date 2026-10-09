package pe.edu.pucp.hesperides.modules.places.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** La vista guardada de un lugar en el mapa: la cámara y el punto al que mira. */
public final class MapViewDtos {

    private MapViewDtos() {
    }

    /** Un punto del campus con su altura sobre el suelo de la maqueta, en metros. */
    public record GeoPoint(
            @NotNull(message = "La latitud es obligatoria")
            @DecimalMin(value = "-90", message = "Latitud fuera de rango")
            @DecimalMax(value = "90", message = "Latitud fuera de rango")
            Double lat,

            @NotNull(message = "La longitud es obligatoria")
            @DecimalMin(value = "-180", message = "Longitud fuera de rango")
            @DecimalMax(value = "180", message = "Longitud fuera de rango")
            Double lon,

            @NotNull(message = "La altura es obligatoria")
            Double heightM) {
    }

    public record MapView(
            @NotNull(message = "Falta la cámara") @Valid GeoPoint camera,
            @NotNull(message = "Falta el punto al que mira") @Valid GeoPoint target) {
    }
}
