import { aSpecimenForm, FORMULARIO_VACIO, type FormularioPlanta } from '../registrar/formularioPlanta';

const MOLLE: FormularioPlanta = { ...FORMULARIO_VACIO, especie: 'Schinus molle', lat: '-12.0702', lon: '-77.0810' };

describe('aSpecimenForm', () => {
  it('lo mínimo es especie y ubicación', () => {
    expect(aSpecimenForm(MOLLE)).toEqual({
      form: { scientificName: 'Schinus molle', lat: -12.0702, lon: -77.081, quantity: 1, measurement: null, assessment: null, notes: null },
      errores: {},
    });
  });

  it('sin especie ni punto no envía nada', () => {
    const { form, errores } = aSpecimenForm(FORMULARIO_VACIO);
    expect(form).toBeNull();
    expect(Object.keys(errores)).toEqual(['especie', 'lat', 'lon']);
  });

  it('acepta la coma decimal que se escribe por costumbre', () => {
    const { form } = aSpecimenForm({ ...MOLLE, alturaM: '6,5', fechaMedicion: '2026-09-01' });
    expect(form?.measurement?.heightM).toBe(6.5);
  });

  it('una medida sin fecha es un error', () => {
    expect(aSpecimenForm({ ...MOLLE, alturaM: '6.5' }).errores.fechaMedicion).toBe('Una medición necesita su fecha');
  });

  it('una medida ilegible o negativa es un error', () => {
    expect(aSpecimenForm({ ...MOLLE, alturaM: 'alto', fechaMedicion: '2026-09-01' }).errores.medidas).toBeDefined();
    expect(aSpecimenForm({ ...MOLLE, dapCm: '-3', fechaMedicion: '2026-09-01' }).errores.medidas).toBeDefined();
  });

  it('en la evaluación, vacío es «no se evaluó» y no «no»', () => {
    const { form } = aSpecimenForm({
      ...MOLLE,
      fechaEvaluacion: '2026-09-01',
      respuestas: { ...FORMULARIO_VACIO.respuestas, hasDeadBranches: 'si', hasPests: 'no' },
    });
    expect(form?.assessment).toMatchObject({ date: '2026-09-01', hasDeadBranches: true, hasPests: false, hasDisease: null });
  });

  it('una evaluación sin fecha es un error', () => {
    const { errores } = aSpecimenForm({ ...MOLLE, manejo: 'Poda' });
    expect(errores.fechaEvaluacion).toBe('Una evaluación necesita su fecha');
  });

  it('la cantidad debe ser un entero de 1 o más', () => {
    expect(aSpecimenForm({ ...MOLLE, cantidad: '0' }).errores.cantidad).toBeDefined();
    expect(aSpecimenForm({ ...MOLLE, cantidad: '2.5' }).errores.cantidad).toBeDefined();
    expect(aSpecimenForm({ ...MOLLE, cantidad: '12' }).form?.quantity).toBe(12);
  });

  it('una latitud fuera de rango no se envía', () => {
    expect(aSpecimenForm({ ...MOLLE, lat: '-120' }).errores.lat).toBeDefined();
  });
});
