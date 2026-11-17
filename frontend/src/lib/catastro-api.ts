import type {
  Assessment, AssessmentForm, FeatureForm, ImportConfirmationSummary, ImportKind, ImportPreview, ImportResult, MeasurementRecord,
  SpeciesImportOption, SpecimenForm,
} from '@shared/types';
import { apiClient } from './api';

const segment = encodeURIComponent;

/** Los datos van como parte JSON y la foto como archivo: así los separa el backend. */
function withPhoto(form: SpecimenForm | FeatureForm, photo: File | null): FormData {
  const data = new FormData();
  data.append('data', new Blob([JSON.stringify(form)], { type: 'application/json' }));
  if (photo) data.append('photo', photo);
  return data;
}

/** Registro del catastro (SPEC-103): formulario, carga por CSV y evaluaciones. */
export const catastroApi = {
  /** Un 409 trae `DuplicateMatch` en `ApiError.data`; se reintenta con `confirmDuplicate`. */
  register: (form: SpecimenForm, photo: File | null, confirmDuplicate = false) =>
    apiClient
      .postForm<{ code: string }>(
        `/green-inventory/specimens${confirmDuplicate ? '?confirmDuplicate=true' : ''}`,
        withPhoto(form, photo),
      )
      .then((r) => r.code),

  update: (code: string, form: SpecimenForm, photo: File | null) =>
    apiClient.putForm<{ code: string }>(`/green-inventory/specimens/${segment(code)}`, withPhoto(form, photo)),

  assessments: (code: string) =>
    apiClient.get<Assessment[]>(`/green-inventory/specimens/${segment(code)}/assessments`),

  measurements: (code: string) =>
    apiClient.get<MeasurementRecord[]>(`/green-inventory/specimens/${segment(code)}/measurements`),

  assess: (code: string, form: AssessmentForm) =>
    apiClient.post<Assessment[]>(`/green-inventory/specimens/${segment(code)}/assessments`, form),

  /** Un tacho o bebedero; el 409 de duplicado funciona igual que en `register`. */
  registerFeature: (form: FeatureForm, photo: File | null, confirmDuplicate = false) =>
    apiClient
      .postForm<{ code: string }>(`/campus-features${confirmDuplicate ? '?confirmDuplicate=true' : ''}`, withPhoto(form, photo))
      .then((r) => r.code),

  previewImport: (kind: ImportKind, csv: File, photosZip: File | null, speciesBindings?: Record<string, string>) => {
    const data = new FormData();
    data.append('file', csv);
    if (photosZip) data.append('photos', photosZip);
    if (speciesBindings) {
      data.append('speciesBindings', new Blob([JSON.stringify(speciesBindings)], { type: 'application/json' }));
    }
    return apiClient.postForm<ImportPreview>(`/imports/${kind}/preview`, data);
  },

  /** Actualiza la vista previa del mismo lote con las asociaciones elegidas para ejemplares. */
  reanalyzeImport: (batchId: number, csv: File, photosZip: File | null, speciesBindings: Record<string, string>) => {
    const data = new FormData();
    data.append('file', csv);
    if (photosZip) data.append('photos', photosZip);
    data.append('speciesBindings', new Blob([JSON.stringify(speciesBindings)], { type: 'application/json' }));
    return apiClient.postForm<ImportPreview>(`/imports/${batchId}/reanalyze`, data);
  },

  speciesImportOptions: (search: string) =>
    apiClient.get<SpeciesImportOption[]>(`/imports/specimens/species-options?search=${encodeURIComponent(search)}`),

  /** Counts the exact specimen rows the backend will write for these duplicate decisions. */
  confirmationSummary: (batchId: number, duplicates: Record<number, boolean>, planFingerprint: string) =>
    apiClient.post<ImportConfirmationSummary>(`/imports/${batchId}/confirmation-summary`, { duplicates, planFingerprint }),

  /** `duplicates`: por línea, true ingresa la fila y false la omite. */
  confirmImport: (batchId: number, duplicates: Record<number, boolean>, summaryFingerprint?: string) =>
    apiClient.post<ImportResult>(`/imports/${batchId}/confirm`, { duplicates, summaryFingerprint }),

  template: (kind: ImportKind) => apiClient.getBlob(`/imports/templates/${segment(kind)}`),

  exportSpecimens: () => apiClient.getBlob('/green-inventory/export.csv'),

  exportSpecies: () => apiClient.getBlob('/green-inventory/species/export.csv'),
};
