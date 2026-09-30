-- Configuracion de frecuencias de mantenimiento. Cierra el pendiente P-03 de
-- SPEC-002 §4.6.
--
-- P-03 preguntaba si la frecuencia se define por zona, por tipo de elemento, por
-- especie o por combinacion. La 2.a entrevista resolvio que se define POR TIPO
-- DE ACTIVIDAD: ninguna frecuencia declarada por el cliente varia por zona ni
-- por especie ("campus completo cada 15 dias", "cada 30-45 dias" en todo el
-- campus). Lo que si varia es la FORMA de expresar la periodicidad, y por eso el
-- modelo es multi-patron en vez de un entero de dias.
--
-- Este diseno fusiona dos propuestas: el modelo multi-patron con regimen y
-- alcance geografico, y la vigencia temporal con evaluacion de cumplimiento.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Catalogo de tipos de regla
-- ═══════════════════════════════════════════════════════════════════════════
-- Cinco formas distintas de expresar una periodicidad, tomadas de la operacion
-- real: el cesped opera en rango (30-45 dias), el fitosanitario por cuota anual
-- (minimo 4), la poda mayor en ventana acotada (diciembre-enero), el riego por
-- ciclo de rotacion espacial (15-16 dias en 3 sectores) y la poda a demanda sin
-- regla alguna. Un entero plano falsearia la realidad operativa.
--
-- is_system = TRUE: cada code tiene un evaluador implementado en el Engine.
-- Sembrar un criterio nuevo desde la pantalla de catalogos crearia una opcion
-- que no calcula nada. Se extiende por migracion + evaluador, nunca por UI.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('FREQUENCY_RULE_TYPE', 'Tipos de reglas de frecuencia',
     'Modelos de periodicidad para el mantenimiento de areas verdes', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, is_active, metadata)
SELECT ct.id, v.code, v.label, v.sort_order, TRUE, v.metadata::jsonb
FROM catalog_types ct, (VALUES
    ('INTERVAL_DAYS',   'Intervalo por rango de días',           1,
     '{"evaluates": "distancia en dias entre dos ejecuciones consecutivas"}'),
    ('SEASONAL_PERIOD', 'Periodicidad estacional / cuota anual', 2,
     '{"evaluates": "conteo de ejecuciones dentro del ano"}'),
    ('ANNUAL_WINDOW',   'Ventana anual específica',              3,
     '{"evaluates": "conteo anual mas pertenencia a una ventana de meses"}'),
    ('COVERAGE_CYCLE',  'Ciclo rotativo de cobertura',           4,
     '{"evaluates": "dias para completar el 100% de la cobertura"}'),
    ('ON_DEMAND',       'A demanda / sin periodicidad fija',     5,
     '{"evaluates": "nada: la actividad es reactiva"}')
) AS v(code, label, sort_order, metadata)
WHERE ct.code = 'FREQUENCY_RULE_TYPE';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Tabla principal
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE maintenance_frequencies (
    id                          BIGSERIAL PRIMARY KEY,

    activity_type_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    frequency_rule_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),

    -- REGIMEN. El trabajo se ejecuta de dos formas distintas y casi todas las
    -- decisiones del proyecto dependen de cual sea (docs/dominio/README.md §3).
    -- Importa aqui porque la fuente de autoridad del numero es distinta: una
    -- frecuencia propia nace de la dinamica interna del equipo, una tercerizada
    -- esta fijada en un contrato que la seccion no controla.
    --
    -- El caso que lo obliga: la poda esta partida. La menor (< 5 m) la hace
    -- personal propio, la de altura (> 5 m) es tercerizada. Sin el regimen en la
    -- clave de unicidad, esas dos reglas no podrian coexistir.
    --
    -- No existe un valor BOTH: solapaba semanticamente con los otros dos y hacia
    -- ambigua la unicidad. Una labor que va por ambas vias se registra como dos
    -- filas explicitas.
    --
    -- ⚠️ De las tres actividades tercerizadas NO hemos visto los contratos
    -- (README §4). Una frecuencia OUTSOURCED guarda hoy lo que el cliente dijo
    -- en entrevista, no lo pactado: ningun reporte puede llamarse "pactado vs.
    -- real" mientras eso siga asi.
    regime                      VARCHAR(20) NOT NULL DEFAULT 'IN_HOUSE',

    -- ALCANCE GEOGRAFICO. Hoy toda frecuencia declarada es CAMPUS_WIDE, pero la
    -- columna se anade ahora para que vincular con zones no exija un ALTER
    -- disruptivo cuando el modulo M2 (Catastro Verde) migre esa tabla.
    --
    -- Es un CHECK y no un catalogo -- excepcion consciente a INV-2, igual que
    -- refresh_tokens.client_type. Son niveles de granularidad geografica
    -- derivados de la jerarquia del campus, y anadir uno exige logica nueva en
    -- el backend, no solo una fila de catalogo.
    scope                       VARCHAR(30) NOT NULL DEFAULT 'CAMPUS_WIDE',
    -- Sin FK a zones(id): esa tabla no existe aun. Mismo patron que teams.zone_id.
    zone_id                     BIGINT,

    -- ── Parametros, segun el tipo de regla ───────────────────────────────
    -- Todos nulables: cada tipo de regla usa unos y deja el resto en NULL. Que
    -- el conjunto sea coherente con el tipo lo valida el servicio, no un CHECK:
    -- la coherencia depende del `code` del item referenciado, que vive en otra
    -- tabla y un CHECK no puede consultarla.
    target_days_interval        INT,   -- INTERVAL_DAYS: el valor teorico/objetivo
    min_days_interval           INT,   -- INTERVAL_DAYS: piso del rango aceptable
    max_days_interval           INT,   -- INTERVAL_DAYS: techo; excederlo es incumplir
    annual_target_count         INT,   -- SEASONAL_PERIOD / ANNUAL_WINDOW: cuota anual
    coverage_target_days        INT,   -- COVERAGE_CYCLE: dias para cubrir el 100%
    estimated_duration_days     INT,   -- dato de planificacion, no de cumplimiento

    -- ── Ventana estacional (ANNUAL_WINDOW) ───────────────────────────────
    -- La poda mayor es "1 al ano, diciembre-enero": el conteo anual no basta, la
    -- ejecucion tiene que caer en su ventana. start > end es VALIDO y normal
    -- (12 → 1): la ventana cruza el fin de ano y el evaluador lo interpreta.
    season_start_month          SMALLINT,
    season_end_month            SMALLINT,

    notes                       TEXT,

    -- ── Vigencia temporal ────────────────────────────────────────────────
    -- La decision mas importante de esta tabla. Un cambio de parametros NUNCA
    -- actualiza en sitio: cierra esta fila y crea otra.
    --
    -- Sin vigencia, relajar el rango del cesped en noviembre convertiria
    -- retroactivamente en cumplidos los meses ya evaluados como incumplidos. Eso
    -- destruye la trazabilidad, que es el valor central del sistema: el cliente
    -- no pidio Hesperides para ahorrar dinero, sino para poder demostrar que se
    -- hizo y cuando.
    --
    -- Con vigencia, cada periodo se evalua con la configuracion que regia en su
    -- fecha, se calcula al vuelo y el resultado es siempre reproducible.
    valid_from                  DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to                    DATE,

    -- is_active y deleted_at coexisten y son hechos distintos:
    --   is_active = FALSE  → desactivada operativamente (p. ej. pausa invernal),
    --                        sigue visible si se consulta con active=false.
    --   deleted_at NOT NULL → retirada logicamente, fuera de toda consulta
    --                         estandar (@SQLRestriction).
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,

    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMP,

    CONSTRAINT chk_freq_regime CHECK (regime IN ('IN_HOUSE', 'OUTSOURCED')),
    CONSTRAINT chk_freq_scope  CHECK (scope IN ('CAMPUS_WIDE', 'BY_SECTOR', 'BY_ZONE')),

    -- BY_ZONE sin zona es una regla que dice ser especifica y no dice de que.
    CONSTRAINT chk_freq_zone_required
        CHECK (scope <> 'BY_ZONE' OR zone_id IS NOT NULL),

    CONSTRAINT chk_freq_interval CHECK (
        (min_days_interval IS NULL AND max_days_interval IS NULL) OR
        (min_days_interval IS NOT NULL AND max_days_interval IS NOT NULL
         AND min_days_interval <= max_days_interval)
    ),
    CONSTRAINT chk_freq_positive CHECK (
        (target_days_interval    IS NULL OR target_days_interval    > 0) AND
        (min_days_interval       IS NULL OR min_days_interval       > 0) AND
        (annual_target_count     IS NULL OR annual_target_count     > 0) AND
        (coverage_target_days    IS NULL OR coverage_target_days    > 0) AND
        (estimated_duration_days IS NULL OR estimated_duration_days > 0)
    ),
    CONSTRAINT chk_freq_validity
        CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CONSTRAINT chk_freq_season_months CHECK (
        (season_start_month IS NULL AND season_end_month IS NULL) OR
        (season_start_month BETWEEN 1 AND 12 AND season_end_month BETWEEN 1 AND 12)
    )
);

CREATE INDEX idx_maint_freq_activity  ON maintenance_frequencies(activity_type_item_id);
CREATE INDEX idx_maint_freq_rule_type ON maintenance_frequencies(frequency_rule_type_item_id);

-- Una sola configuracion VIGENTE por actividad, regimen y ambito. Las cerradas
-- (valid_to NOT NULL) si conviven: son el historico que da sentido a la vigencia.
--
-- COALESCE(zone_id, 0) porque en PostgreSQL dos NULL no se consideran iguales
-- para un indice unico: sin el, se podrian crear varias reglas campus-wide
-- identicas porque ningun par de NULL violaria la unicidad.
CREATE UNIQUE INDEX idx_maint_freq_unique_current
    ON maintenance_frequencies(activity_type_item_id, regime, scope, COALESCE(zone_id, 0))
    WHERE deleted_at IS NULL AND valid_to IS NULL;

-- Resuelve "que configuracion regia en esta fecha", que es la consulta que hace
-- el evaluador de cumplimiento por cada tramo de un periodo.
CREATE INDEX idx_maint_freq_validity
    ON maintenance_frequencies(activity_type_item_id, valid_from, valid_to)
    WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Estacionalidad por intervalo
-- ═══════════════════════════════════════════════════════════════════════════
-- Tabla hija en vez de un VARCHAR resumen. El diseno anterior guardaba
-- "Verano: 30-35d · Invierno: 40-45d" como texto generado por el frontend: se
-- lee bien, pero NINGUN calculo puede saber si se cumplio. Un dato que solo
-- sirve para mostrarse no puede sostener un reporte de cumplimiento.
--
-- Aplica a INTERVAL_DAYS cuando la labor varia por estacion. Sin filas, la
-- frecuencia usa el intervalo general de la fila padre: "uniforme todo el ano"
-- es la ausencia de estaciones, no una estacion que abarque el ano entero.
--
-- Por que la agronomia en Lima distingue cuatro periodos: el cesped crece mucho
-- mas rapido en verano y el fitosanitario tiene distinta presion de plagas segun
-- la epoca. 2026 fue un ano atipico -- "casi como si tuvieramos un verano
-- eterno" -- y sin invierno frio hubo que cortar cada 30-35 dias en vez de cada
-- 45. Un modelo de valor fijo habria reportado incumplimiento donde hubo buena
-- gestion.
CREATE TABLE maintenance_frequency_seasons (
    id                      BIGSERIAL PRIMARY KEY,
    maintenance_frequency_id BIGINT NOT NULL
        REFERENCES maintenance_frequencies(id) ON DELETE CASCADE,

    -- Las cuatro estaciones del hemisferio sur, que es como el cliente razona.
    -- CHECK y no catalogo por el mismo motivo que scope: cada valor implica un
    -- rango de meses que el evaluador conoce.
    season                  VARCHAR(20) NOT NULL,

    -- Meses que abarca la estacion. Explicitos en vez de derivados del nombre:
    -- permite ajustarlos si el cliente define sus periodos de otra forma, y el
    -- evaluador no necesita una tabla de conversion en codigo.
    start_month             SMALLINT NOT NULL,
    end_month               SMALLINT NOT NULL,

    min_days_interval       INT NOT NULL,
    max_days_interval       INT NOT NULL,
    -- El intervalo teorico o de manual, que suele diferir del operativo: el
    -- cesped tiene teorico de 21 dias y en la practica se corta cada 30-45.
    -- Conservarlo permite mostrar la brecha entre norma y realidad.
    target_days_interval    INT,

    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_season_name
        CHECK (season IN ('VERANO', 'OTONO', 'INVIERNO', 'PRIMAVERA')),
    CONSTRAINT chk_season_months
        CHECK (start_month BETWEEN 1 AND 12 AND end_month BETWEEN 1 AND 12),
    CONSTRAINT chk_season_interval
        CHECK (min_days_interval > 0 AND max_days_interval >= min_days_interval),
    CONSTRAINT chk_season_target
        CHECK (target_days_interval IS NULL OR target_days_interval > 0),

    -- Una estacion no se configura dos veces en la misma frecuencia.
    CONSTRAINT uq_season_per_frequency UNIQUE (maintenance_frequency_id, season)
);

CREATE INDEX idx_freq_seasons_frequency
    ON maintenance_frequency_seasons(maintenance_frequency_id);

-- NO se siembra ninguna frecuencia. Los valores del cliente entran por la
-- pantalla de administracion: una migracion que sembrara datos pendientes de
-- confirmacion los volveria indistinguibles de los confirmados.
