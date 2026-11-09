import { redirect } from 'next/navigation';

/** SPEC-203 §2.3: las frecuencias se movieron a Intervenciones; la ruta antigua no rompe marcadores. */
export default function OldFrequenciesPage() {
  redirect('/intervenciones/frecuencias');
}
