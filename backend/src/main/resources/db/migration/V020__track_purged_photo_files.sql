-- Las fotos se dan de baja con borrado lógico: la fila queda (historial de quién
-- subió qué) pero sus archivos ocupan espacio para siempre. Pasados cuatro meses
-- de la baja, una tarea diaria borra los dos archivos y marca aquí cuándo, para
-- no volver a procesarlos. La fila nunca se borra.
ALTER TABLE place_photos ADD COLUMN files_purged_at TIMESTAMP;
ALTER TABLE species_photos ADD COLUMN files_purged_at TIMESTAMP;

-- Solo interesan las bajas con archivos todavía en disco.
CREATE INDEX idx_place_photos_pending_purge ON place_photos (deleted_at)
    WHERE deleted_at IS NOT NULL AND files_purged_at IS NULL;
CREATE INDEX idx_species_photos_pending_purge ON species_photos (deleted_at)
    WHERE deleted_at IS NOT NULL AND files_purged_at IS NULL;
