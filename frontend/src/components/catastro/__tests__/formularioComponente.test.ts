import { aFeatureForm, componenteVacio } from '../registrar/formularioComponente';

const PUNTO = { lat: '-12.0702', lon: '-77,0810' };

describe('aFeatureForm', () => {
  it('un tacho lleva sus residuos, acción y recomendaciones', () => {
    const { form } = aFeatureForm({ ...componenteVacio('waste-bins'), ...PUNTO, lugar: ' Frente a Ciencias ', residuos: ['Vidrio'], accion: 'Mantener' });

    expect(form).toEqual({
      kind: 'waste-bins', lat: -12.0702, lon: -77.081, place: 'Frente a Ciencias', note: null,
      wasteStreams: ['Vidrio'], action: 'Mantener', recommendations: null,
    });
  });

  it('un tacho sin residuos no se envía', () => {
    expect(aFeatureForm({ ...componenteVacio('waste-bins'), ...PUNTO }).errores.residuos).toBe('Marca al menos un tipo de residuo');
  });

  it('un bebedero lleva tipo y estado; vacío es sin dato', () => {
    const { form } = aFeatureForm({ ...componenteVacio('drinking-fountains'), ...PUNTO, estado: 'NEW' });

    expect(form).toMatchObject({ kind: 'drinking-fountains', fountainKind: null, fountainStatus: 'NEW', sector: null });
    expect(form).not.toHaveProperty('wasteStreams');
  });

  it('sin punto no se envía', () => {
    const { form, errores } = aFeatureForm(componenteVacio('drinking-fountains'));
    expect(form).toBeNull();
    expect(Object.keys(errores)).toEqual(['lat', 'lon']);
  });
});
