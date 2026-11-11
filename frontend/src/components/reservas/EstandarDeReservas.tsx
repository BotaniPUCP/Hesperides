interface Columna {
  nombre: string;
  obligatoria?: boolean;
  descripcion: string;
}

/** Copia de `docs/estandares/reservas.md`: si cambia uno, cambia el otro. */
const COLUMNAS: Columna[] = [
  { nombre: 'jardin', obligatoria: true, descripcion: 'Nombre del lugar, uno de sus alias o el código de una de sus secciones. Debe ser un jardín prestable.' },
  { nombre: 'pedido_de', obligatoria: true, descripcion: 'Código, nombre o alias de una organización vigente del Directorio: la que pide el jardín.' },
  { nombre: 'solicitante', obligatoria: true, descripcion: 'Código o nombre de un contacto vigente vinculado a «pedido de». Si el nombre coincide con dos personas, se usa su código.' },
  { nombre: 'para', descripcion: 'La organización que usará el jardín, cuando no es la que pide. Vacío si es la misma.' },
  { nombre: 'responsable', descripcion: 'Código o nombre de un contacto vigente, de cualquier organización. Vacío: el solicitante.' },
  { nombre: 'inicio', obligatoria: true, descripcion: 'dd/mm/aaaa hh:mm en hora de Lima.' },
  { nombre: 'fin', obligatoria: true, descripcion: 'Posterior a inicio; la reserva no puede durar más de 7 días.' },
  { nombre: 'motivo', descripcion: 'Hasta 300 caracteres.' },
];

const REGLAS = [
  'UTF-8, separador punto y coma (;). La plantilla lleva BOM para que Excel la abra bien.',
  'La cabecera lleva exactamente estas ocho columnas: una que falta o una desconocida rechaza el archivo.',
  'Una organización o un contacto que no está en el Directorio es error de esa fila: el Directorio se carga con su propio registro masivo.',
  'Hasta 2000 filas. Una fila con error impide confirmar el archivo entero.',
  'Los cruces y el trabajo cercano avisan, pero no bloquean: la fila se crea igual.',
];

/** El estándar del archivo, a la vista mientras se prepara la carga. */
export function EstandarDeReservas() {
  return (
    <details className="rounded-md border border-neutral-200 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-neutral-900">Estándar del archivo</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
        {REGLAS.map((regla) => <li key={regla}>{regla}</li>)}
      </ul>
      <dl className="mt-3 divide-y divide-neutral-100">
        {COLUMNAS.map((columna) => (
          <div key={columna.nombre} className="grid gap-1 py-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
            <dt className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-neutral-900">
              <span className="break-all">{columna.nombre}</span>
              {columna.obligatoria && <span className="font-sans text-xs font-semibold text-brand-700">obligatoria</span>}
            </dt>
            <dd className="min-w-0 break-words text-neutral-700">{columna.descripcion}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
