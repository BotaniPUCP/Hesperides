/**
 * La licencia ODbL de OpenStreetMap exige atribución visible mientras el mapa
 * muestre sus edificios. Desaparece sola cuando el backend deja de servirlos
 * (llegan los planos de la PUCP y `attributionRequired` pasa a falso).
 */
export function MapAttribution({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <p className="rounded bg-neutral-0/80 px-2 py-0.5 text-[11px] text-neutral-600">
      Edificios ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
        colaboradores de OpenStreetMap
      </a>
    </p>
  );
}
