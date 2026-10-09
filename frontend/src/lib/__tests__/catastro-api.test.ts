import { apiClient } from '../api';
import { catastroApi } from '../catastro-api';

jest.mock('../api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    postForm: jest.fn(),
    putForm: jest.fn(),
    getBlob: jest.fn(),
  },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const MOLLE = { scientificName: 'Schinus molle', lat: -12.0702, lon: -77.081 };

/** jsdom no implementa Blob.text(). */
function jsonPart(form: FormData): Promise<unknown> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result as string));
    reader.readAsText(form.get('data') as Blob);
  });
}

describe('catastroApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra con los datos como parte JSON y la foto aparte', async () => {
    api.postForm.mockResolvedValue({ code: 'EV-000966' });
    const photo = new File(['x'], 'molle.jpg', { type: 'image/jpeg' });

    await expect(catastroApi.register(MOLLE, photo)).resolves.toBe('EV-000966');

    const [path, form] = api.postForm.mock.calls[0];
    expect(path).toBe('/green-inventory/specimens');
    expect((form.get('data') as Blob).type).toBe('application/json');
    expect(await jsonPart(form)).toEqual(MOLLE);
    expect(form.get('photo')).toBe(photo);
  });

  it('confirmar un duplicado lo dice en la ruta', async () => {
    api.postForm.mockResolvedValue({ code: 'EV-000967' });

    await catastroApi.register(MOLLE, null, true);

    expect(api.postForm.mock.calls[0][0]).toBe('/green-inventory/specimens?confirmDuplicate=true');
    expect(api.postForm.mock.calls[0][1].get('photo')).toBeNull();
  });

  it('corrige un ejemplar por su código', async () => {
    api.putForm.mockResolvedValue({ code: 'EV-000001' });

    await catastroApi.update('EV-000001', MOLLE, null);

    expect(api.putForm.mock.calls[0][0]).toBe('/green-inventory/specimens/EV-000001');
  });

  it('la vista previa sube el CSV y el ZIP en las partes que espera el backend', async () => {
    const csv = new File(['a'], 'carga.csv');
    const zip = new File(['z'], 'fotos.zip');

    await catastroApi.previewImport('specimens', csv, zip);

    const [path, form] = api.postForm.mock.calls[0];
    expect(path).toBe('/imports/specimens/preview');
    expect(form.get('file')).toBe(csv);
    expect(form.get('photos')).toBe(zip);
  });

  it('confirma con la decisión de cada duplicado', async () => {
    await catastroApi.confirmImport(12, { 3: true, 7: false });

    expect(api.post).toHaveBeenCalledWith('/imports/12/confirm', { duplicates: { 3: true, 7: false } });
  });

  it('el historial y una evaluación nueva van por el código del ejemplar', async () => {
    await catastroApi.assessments('EV-000951');
    await catastroApi.assess('EV-000951', { date: '2026-09-01' });

    expect(api.get).toHaveBeenCalledWith('/green-inventory/specimens/EV-000951/assessments');
    expect(api.post).toHaveBeenCalledWith('/green-inventory/specimens/EV-000951/assessments', { date: '2026-09-01' });
  });

  it('la plantilla y la exportación son archivos', async () => {
    await catastroApi.template('specimens');
    await catastroApi.exportSpecimens();

    expect(api.getBlob).toHaveBeenCalledWith('/imports/templates/specimens');
    expect(api.getBlob).toHaveBeenCalledWith('/green-inventory/export.csv');
  });

  it('la vista previa va al estándar elegido', async () => {
    await catastroApi.previewImport('waste-bins', new File(['a'], 't.csv'), null);

    expect(api.postForm.mock.calls[0][0]).toBe('/imports/waste-bins/preview');
    expect(api.postForm.mock.calls[0][1].get('photos')).toBeNull();
  });

  it('un tacho o bebedero va a campus-features', async () => {
    api.postForm.mockResolvedValue({ code: 'BB-000001' });

    await expect(
      catastroApi.registerFeature({ kind: 'drinking-fountains', lat: -12.07, lon: -77.08 }, null, true),
    ).resolves.toBe('BB-000001');
    expect(api.postForm.mock.calls[0][0]).toBe('/campus-features?confirmDuplicate=true');
  });
});
