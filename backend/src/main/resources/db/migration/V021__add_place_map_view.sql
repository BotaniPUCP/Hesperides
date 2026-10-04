-- La vista guardada de un lugar en el mapa: dónde está la cámara y hacia qué
-- punto mira. La elige quien edita el catálogo encuadrando el lugar a mano; sin
-- ella, el mapa usa el encuadre automático. En lat/lon y altura sobre el suelo,
-- no en coordenadas de la escena: así sigue valiendo si cambia el origen del mapa.
ALTER TABLE places
    ADD COLUMN view_camera_lat      DOUBLE PRECISION,
    ADD COLUMN view_camera_lon      DOUBLE PRECISION,
    ADD COLUMN view_camera_height_m DOUBLE PRECISION,
    ADD COLUMN view_target_lat      DOUBLE PRECISION,
    ADD COLUMN view_target_lon      DOUBLE PRECISION,
    ADD COLUMN view_target_height_m DOUBLE PRECISION,
    ADD CONSTRAINT chk_places_map_view_complete CHECK (num_nulls(view_camera_lat, view_camera_lon, view_camera_height_m,
        view_target_lat, view_target_lon, view_target_height_m) IN (0, 6));
