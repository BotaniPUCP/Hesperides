import { aSpecimenForm, FORMULARIO_VACIO, formularioNuevo, type FormularioPlanta } from '../registrar/formularioPlanta';

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

describe('formularioNuevo', () => {
  const NUEVO = { ...formularioNuevo('2026-11-06'), especie: 'Schinus molle', lat: '-12.0702', lon: '-77.0810' };

  it('propone hoy como fecha de medición y de evaluación', () => {
    expect(formularioNuevo('2026-11-06')).toMatchObject({ fechaMedicion: '2026-11-06', fechaEvaluacion: '2026-11-06' });
  });

  it('la fecha propuesta por sí sola no crea una medición ni una evaluación', () => {
    const { form, errores } = aSpecimenForm(NUEVO);

    expect(errores).toEqual({});
    expect(form).toMatchObject({ measurement: null, assessment: null });
  });

  it('una medida usa la fecha propuesta sin pedir más', () => {
    const hoy = formularioNuevo().fechaMedicion;
    const { form } = aSpecimenForm({ ...formularioNuevo(), especie: 'Schinus molle', lat: '-12', lon: '-77', alturaM: '5' });

    expect(form?.measurement).toMatchObject({ date: hoy, heightM: 5 });
  });

  it('si la persona borra la fecha, una medición la sigue exigiendo', () => {
    const { errores } = aSpecimenForm({ ...NUEVO, alturaM: '5', fechaMedicion: '' });

    expect(errores.fechaMedicion).toBe('Una medición necesita su fecha');
  });
});
