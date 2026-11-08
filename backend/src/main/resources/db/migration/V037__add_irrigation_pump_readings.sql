-- M7/D-04. Daily readings for the campus well and reservoir.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable) VALUES
    ('IRRIGATION_PUMP_FLOW_M3_PER_HOUR', 'Caudal de la bomba (m³/h)', '', 'DECIMAL', 'Caudal verificado de la bomba del pozo en metros cúbicos por hora', TRUE),
    ('IRRIGATION_PUMP_DAILY_LIMIT_HOURS', 'Límite diario de bombeo (horas)', '', 'DECIMAL', 'Límite diario de seguridad confirmado por el responsable de la bomba', TRUE);

CREATE TABLE irrigation_pump_readings (
    id BIGSERIAL PRIMARY KEY,
    reading_date DATE NOT NULL,
    recorded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    initial_meter_hours NUMERIC(12, 3) NOT NULL CHECK (initial_meter_hours >= 0),
    final_meter_hours NUMERIC(12, 3) NOT NULL,
    reservoir_level_percent NUMERIC(6, 3) NOT NULL CHECK (reservoir_level_percent BETWEEN 0 AND 100),
    flow_m3_per_hour NUMERIC(12, 3) NOT NULL CHECK (flow_m3_per_hour > 0),
    daily_limit_hours NUMERIC(5, 3) NOT NULL CHECK (daily_limit_hours > 0 AND daily_limit_hours <= 24),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_irrigation_pump_daily_hours CHECK (final_meter_hours - initial_meter_hours BETWEEN 0 AND 24)
);

CREATE UNIQUE INDEX idx_irrigation_pump_readings_active_date
    ON irrigation_pump_readings (reading_date) WHERE deleted_at IS NULL;
