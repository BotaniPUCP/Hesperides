/**
 * Mensajes que el backend ya escribe en español, listos para la persona. Se
 * muestran tal cual en vez de caer en el mensaje genérico: dicen qué corregir.
 * Lo normal es que el backend hable inglés técnico (SPEC-000) y el frontend
 * traduzca; estos módulos nacieron antes de esa regla.
 */
export const SPANISH_BACKEND_MESSAGES: readonly RegExp[] = [
  // Parámetros del sistema (SPEC-003)
  /^No se recibieron parámetros para actualizar$/,
  /^El valor del parámetro \S+ no puede estar vacío$/,
  /^El parámetro \S+ (tiene un tipo de valor no soportado: .+|debe ser un número entero|debe ser un número decimal válido|no es editable)$/,
  /^La longitud mínima de contraseña debe estar entre \d+ y \d+$/,
  /^El número de intentos de acceso debe estar entre 1 y \d+$/,
  /^La distancia de aviso por reservas debe estar entre 0 y \d+$/,
  /^El corte de las marcas de uso debe estar entre 0 y \d+ minutos$/,
  /^El rol no puede superar los \d+ caracteres$/,
  /^Las hectáreas del campus deben estar entre 0 y \S+$/,
  /^La meta de (cobertura|riego) mensual debe estar entre 1 y 100$/,
  // Reportes (SPEC-202): nacieron en español; se muestran tal cual.
  /^El mes debe tener el formato AAAA-MM$/,
  /^La semana debe empezar un lunes$/,
  /^(La semana no puede ser posterior a la semana en curso|El mes no puede ser posterior al mes en curso)$/,
  /^Elige un sector$/,
  // Catálogos y medidas adicionales (SPEC-105)
  /^Ya existe un ítem con el código .+ en .+$/,
  // SPEC-203 §3.4: nombra el conjunto y la actividad; se muestra tal cual.
  /^«.+» ya tiene una planificación de .+\. Edítala en vez de crear otra\.$/,
  /^Una medida adicional (necesita su unidad|no se puede repetir( en la misma medición)?)$/,
  /^La unidad no se puede cambiar: esta medida ya tiene valores registrados$/,
  /^La medida «.+» (no pertenece a esta especie|debe ser un número entero)$/,
  /^Unidad no válida: .+$/,
  /^Ya existe la medida «.+»$/,
  /^El nombre de la medida debe tener letras o números$/,
  /^Medida adicional no válida: .+$/,
  // Catálogo botánico
  /^Tipo de vegetación no válido: .+$/,
  /^Fuente de promedio no válida: .+$/,
  /^La especie «.+» ya está registrada en el catálogo$/,
  /^Una especie no crítica necesita altura y radio de copa promedio$/,
  /^Indica el valor y la fuente de: .+$/,
  /^El nombre científico (es obligatorio|no puede estar vacío|debe tener al menos 2 caracteres|no puede exceder 150 caracteres)$/,
  /^El nombre científico no debe contener números, barras \(\/\) ni caracteres especiales no botánicos$/,
  /^El nombre científico debe incluir al menos género y epíteto específico/,
  /^No se pudo generar un identificador legible para la especie$/,
  // Riego (M7)
  /^Selecciona entre 1 y 20 sectores para registrar$/,
  /^Cada turno debe indicar (un sector valido|la fecha de riego)$/,
  /^Las observaciones no pueden superar 500 caracteres$/,
  /^No repitas (el mismo sector en un registro masivo|secciones en un mismo turno)$/,
  /^La hora de fin debe ser posterior a la de inicio$/,
  /^Selecciona al menos una sección regada$/,
  /^Identificador de sección inválido$/,
  /^El rango de fechas no es válido$/,
  /^Sector y fecha son obligatorios$/,
  /^Una o mas secciones no pertenecen al sector seleccionado$/,
  // Frecuencias de mantenimiento (SPEC-101)
  /^El periodo a evaluar requiere fecha de inicio y de fin$/,
  /^La fecha de fin no puede ser anterior a la de inicio$/,
  /^Las reglas (por ciclo de cobertura|de intervalo por días|estacionales o anuales|de ventana anual) requieren /,
  /^Tipo de regla de frecuencia no soportado: .+$/,
  /^El intervalo mínimo no puede superar al intervalo máximo$/,
  /^Una actividad a demanda no lleva parámetros de periodicidad/,
  /^La estación .+ está configurada más de una vez$/,
  /^En la estación .+, el intervalo mínimo no puede superar al máximo$/,
  /^Esa es una versión histórica y no se edita\. Modifique la frecuencia vigente\.$/,
  /^Selecciona una sección para configurar una frecuencia por sección$/,
  /^La sección seleccionada no existe o no está activa$/,
  /^Solo una frecuencia por sección lleva una sección asociada$/,
  /^El tipo de actividad seleccionado no está activo$/,
  /^Elige una actividad concreta, no un grupo de actividades$/,
  /^Ya existe una frecuencia vigente para esta actividad, modalidad y ámbito$/,
  // Reportes (SPEC-202)
  /^El tipo no pertenece a la clase elegida$/,
  /^La sección no pertenece al sector elegido$/,
  /^Envía ambas fechas del periodo o ninguna$/,
  /^La fecha final no puede ser anterior a la inicial$/,
  /^El periodo no puede superar \d+ días$/,
  // Política de contraseñas (SPEC-001)
  /^La contraseña (es obligatoria|debe tener al menos \d+ caracteres|no puede superar los \d+ caracteres|no puede contener tus datos personales)$/,
  /^La contraseña debe incluir al menos (una letra minúscula|una letra mayúscula|un dígito)$/,
];

export const isSpanishBackendMessage = (message: string): boolean =>
  SPANISH_BACKEND_MESSAGES.some((pattern) => pattern.test(message));
