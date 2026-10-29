package pe.edu.pucp.hesperides.modules.places.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Una perspectiva marcada en el mapa: el lado, el punto y hacia dónde mira. El nombre lo pone el sistema. */
public record PerspectiveRequest(
        @NotBlank(message = "El lado es obligatorio")
        String sideCode,

        @NotNull(message = "La latitud es obligatoria")
        @DecimalMin(value = "-90", message = "Latitud fuera de rango")
        @DecimalMax(value = "90", message = "Latitud fuera de rango")
        Double lat,

        @NotNull(message = "La longitud es obligatoria")
        @DecimalMin(value = "-180", message = "Longitud fuera de rango")
        @DecimalMax(value = "180", message = "Longitud fuera de rango")
        Double lon,

        @NotNull(message = "La dirección es obligatoria")
        @DecimalMin(value = "0", message = "La dirección va de 0 a 360 grados")
        @DecimalMax(value = "360", inclusive = false, message = "La dirección va de 0 a 360 grados")
        Double headingDeg,

        /** La cámara con que se encuadró al guardarla. Sin ella, al editar se conserva la que tenía. */
        @Valid
        MapViewDtos.MapView mapView) {
}
