-- La vista del mapa de cada perspectiva: la cámara con que quien la marcó la
-- encuadró al guardarla. «Ver en el mapa» vuela a ella; sin vista, el mapa usa
-- una por defecto (detrás del cono, mirando hacia donde mira la foto). Mismo
-- formato que la vista del lugar (V021): lat/lon y altura sobre el suelo.
ALTER TABLE place_perspectives
    ADD COLUMN view_camera_lat      DOUBLE PRECISION,
    ADD COLUMN view_camera_lon      DOUBLE PRECISION,
    ADD COLUMN view_camera_height_m DOUBLE PRECISION,
    ADD COLUMN view_target_lat      DOUBLE PRECISION,
    ADD COLUMN view_target_lon      DOUBLE PRECISION,
    ADD COLUMN view_target_height_m DOUBLE PRECISION,
    ADD CONSTRAINT chk_place_perspectives_map_view_complete CHECK (num_nulls(view_camera_lat, view_camera_lon,
        view_camera_height_m, view_target_lat, view_target_lon, view_target_height_m) IN (0, 6));
