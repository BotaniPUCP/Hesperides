import type { DirectoryImportKind } from '@shared/types';

interface Columna {
  nombre: string;
  obligatoria?: boolean;
  descripcion: string;
}

/** Copia de `docs/estandares/organizaciones.md` y `contactos.md`: si cambia uno, cambia el otro. */
const COLUMNAS: Record<DirectoryImportKind, Columna[]> = {
  organizations: [
    { nombre: 'nombre', obligatoria: true, descripcion: 'Hasta 200 caracteres. Sin repetirse en el archivo ni con el nombre o alias de otra organización.' },
    { nombre: 'tipo', obligatoria: true, descripcion: '«Unidad PUCP» o «Empresa externa».' },
    { nombre: 'ruc', descripcion: 'Solo empresas externas: 11 dígitos que empiezan con 10 o 20.' },
    { nombre: 'telefono', descripcion: 'Hasta 30 caracteres.' },
    { nombre: 'otros_nombres', descripcion: 'Alias separados por «|», por ejemplo EEGGCC|EE.GG.CC.' },
  ],
  contacts: [
    { nombre: 'nombre', obligatoria: true, descripcion: 'Nombre completo, hasta 200 caracteres.' },
    { nombre: 'organizaciones', obligatoria: true, descripcion: 'Por nombre, alias o código, separadas por «|». Si una no está en el Directorio, la fila se omite entera.' },
    { nombre: 'anexo', descripcion: '4 dígitos; se aceptan espacios.' },
    { nombre: 'celular', descripcion: '9 dígitos que empiezan con 9; se aceptan espacios.' },
    { nombre: 'correo', descripcion: 'Un correo válido.' },
  ],
};

const REGLAS = [
  'UTF-8, separador punto y coma (;). Un archivo separado por comas se rechaza.',
  'La cabecera lleva exactamente estas columnas: una que falta o una desconocida rechaza el archivo.',
  'Hasta 2000 filas. Lo que ya existe se muestra y se omite; nada se guarda hasta confirmar.',
];

/** El estándar del tipo elegido, a la vista mientras se prepara el archivo. */
export function EstandarDelDirectorio({ kind }: { kind: DirectoryImportKind }) {
  return (
    <details className="rounded-md border border-neutral-200 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-neutral-900">Estándar del archivo</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
        {REGLAS.map((regla) => <li key={regla}>{regla}</li>)}
      </ul>
      <dl className="mt-3 divide-y divide-neutral-100">
        {COLUMNAS[kind].map((c) => (
          <div key={c.nombre} className="grid gap-1 py-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
            {/* La etiqueta baja de línea en vez de montarse sobre la descripción: «organizaciones» no cabe con ella. */}
            <dt className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-neutral-900">
              <span className="break-all">{c.nombre}</span>
              {c.obligatoria && <span className="font-sans text-xs font-semibold text-brand-700">obligatoria</span>}
            </dt>
            <dd className="min-w-0 break-words text-neutral-700">{c.descripcion}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
