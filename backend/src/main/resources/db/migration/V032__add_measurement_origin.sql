-- Propiedad de SPEC-105 §4.3.
--
-- El origen se guarda; jamas se deduce comparando valores: una medida real igual
-- al promedio sigue siendo real. Una fila AVERAGE conserva el valor vigente en
-- ese momento, asi que cambiar el promedio despues no reescribe el historial.

ALTER TABLE green_element_measurements
    ADD COLUMN origin VARCHAR(10) NOT NULL DEFAULT 'MEASURED' CHECK (origin IN ('MEASURED', 'AVERAGE')),
    ADD COLUMN intervention_id BIGINT REFERENCES interventions(id);

CREATE INDEX idx_green_elements_data_source ON green_elements(data_source);
