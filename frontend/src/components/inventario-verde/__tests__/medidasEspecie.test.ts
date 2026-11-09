import { aFormulario, criticaPorTipo, erroresMedidas, medidasDe, medidasPorTipo } from '../medidasEspecie';
import { palmeraReal } from '../__fixtures__/inventario';

describe('medidasEspecie', () => {
  it.each([
    ['TREE', true],
    ['PALM', true],
    ['SHRUB', false],
    ['CLIMBER', false],
    [null, true],
  ])('el tipo %s preselecciona crítica = %s', (tipo, esperado) => {
    expect(criticaPorTipo(tipo)).toBe(esperado);
  });

  it('una especie crítica no exige promedios', () => {
    expect(erroresMedidas(medidasPorTipo('TREE'))).toEqual({});
  });

  it('una no crítica exige altura y radio con su fuente', () => {
    expect(erroresMedidas(medidasPorTipo('SHRUB'))).toEqual({
      altura: 'Indica la altura promedio',
      radio: 'Indica el radio de copa promedio',
    });
  });

  it('un promedio sin fuente se rechaza, aunque la especie sea crítica', () => {
    const errores = erroresMedidas({ ...medidasPorTipo('TREE'), alturaM: '3', fuenteAltura: null });
    expect(errores.fuenteAltura).toBe('Indica la fuente de la altura');
  });

  it('una fuente sin valor se rechaza', () => {
    const errores = erroresMedidas({ ...medidasPorTipo('TREE'), fuenteRadio: 'BOTANICAL_SHEET' });
    expect(errores.radio).toBe('Indica el radio de copa promedio');
  });

  it.each(['0', '-1', 'abc'])('rechaza %s como promedio', (valor) => {
    const errores = erroresMedidas({ ...medidasPorTipo('TREE'), alturaM: valor, fuenteAltura: 'TEAM_ESTIMATE' });
    expect(errores.altura).toBe('Debe ser un número mayor que 0');
  });

  it('acepta la coma decimal al armar el formulario', () => {
    const formulario = aFormulario({
      critical: false, alturaM: '2,5', fuenteAltura: 'BOTANICAL_SHEET', radioM: '1.5', fuenteRadio: 'TEAM_ESTIMATE',
      usaFuste: false, usaDap: true, adicionales: [{ code: 'STEM_COUNT', label: 'Tallos', unitCode: 'UNIT', nota: ' 3 tallos ' }],
    });
    expect(formulario).toEqual({
      critical: false,
      referenceHeightM: 2.5,
      referenceHeightSourceCode: 'BOTANICAL_SHEET',
      referenceCrownRadiusM: 1.5,
      referenceCrownRadiusSourceCode: 'TEAM_ESTIMATE',
      usesTrunkHeight: false,
      usesDbh: true,
      extraMeasures: [{ code: 'STEM_COUNT', referenceNote: '3 tallos' }],
    });
  });

  it('un promedio vacío viaja como nulo', () => {
    const formulario = aFormulario(medidasPorTipo('TREE'));
    expect(formulario.referenceHeightM).toBeNull();
    expect(formulario.referenceHeightSourceCode).toBeNull();
  });

  it('precarga los valores guardados de una especie', () => {
    const valores = medidasDe({
      ...palmeraReal, critical: false, referenceHeightM: 3, referenceHeightSourceCode: 'BOTANICAL_SHEET',
      referenceCrownRadiusM: 1.25, referenceCrownRadiusSourceCode: 'TEAM_ESTIMATE', usesTrunkHeight: false, usesDbh: false,
      extraMeasures: [{ code: 'STEM_COUNT', label: 'Tallos', unitCode: 'UNIT', referenceNote: null }],
    });
    expect(valores).toEqual({
      critical: false, alturaM: '3', fuenteAltura: 'BOTANICAL_SHEET', radioM: '1.25', fuenteRadio: 'TEAM_ESTIMATE',
      usaFuste: false, usaDap: false, adicionales: [{ code: 'STEM_COUNT', label: 'Tallos', unitCode: 'UNIT', nota: '' }],
    });
  });
});
