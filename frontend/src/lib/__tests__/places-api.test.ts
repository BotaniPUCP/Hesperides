import { apiClient } from '../api';
import { placesApi } from '../places-api';

jest.mock('../api', () => ({
  apiClient: {
    postForm: jest.fn(),
  },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

function jsonPart(form: FormData, key: string): Promise<unknown> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result as string));
    reader.readAsText(form.get(key) as Blob);
  });
}

describe('placesApi.importPlaces', () => {
  it('envía las elecciones de sobrescritura como una parte JSON junto al Excel', async () => {
    const file = new File(['xlsx'], 'lugares.xlsx');
    const replacements = [{ row: 2, placeCode: 'LUG-0007' }];

    await placesApi.importPlaces(file, replacements);

    const [path, form] = api.postForm.mock.calls[0];
    expect(path).toBe('/places/import');
    expect(form.get('file')).toBe(file);
    expect((form.get('replacements') as Blob).type).toBe('application/json');
    expect(await jsonPart(form, 'replacements')).toEqual(replacements);
  });
});
