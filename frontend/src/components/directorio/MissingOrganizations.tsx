import type { MissingOrganization } from '@shared/types';

const filas = (n: number) => (n === 1 ? '1 fila' : `${n} filas`);

/** Las organizaciones que faltan, con cuántas filas dejó fuera cada una (como las especies del catastro). */
export function MissingOrganizations({ missing, note }: { missing: MissingOrganization[]; note: string }) {
  if (missing.length === 0) return null;

  return (
    <section aria-labelledby="organizaciones-faltantes"
      className="space-y-1 rounded-md bg-urgency-medium-bg p-3 text-sm text-urgency-medium-fg">
      <h3 id="organizaciones-faltantes" className="font-semibold">Organizaciones que no están en el Directorio</h3>
      <ul className="list-disc pl-5">
        {missing.map((m) => <li key={m.name}>«{m.name}»: {filas(m.rows)}</li>)}
      </ul>
      <p>{note}</p>
    </section>
  );
}
