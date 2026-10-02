import type { Assessment, AssessmentForm, ImportPreview, ImportResult, SpecimenForm } from '@shared/types';
import { apiClient } from './api';

const segment = encodeURIComponent;

/** Los datos van como parte JSON y la foto como archivo: así los separa el backend. */
function specimenForm(form: SpecimenForm, photo: File | null): FormData {
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
        specimenForm(form, photo),
      )
      .then((r) => r.code),

  update: (code: string, form: SpecimenForm, photo: File | null) =>
    apiClient.putForm<{ code: string }>(`/green-inventory/specimens/${segment(code)}`, specimenForm(form, photo)),

  assessments: (code: string) =>
    apiClient.get<Assessment[]>(`/green-inventory/specimens/${segment(code)}/assessments`),

  assess: (code: string, form: AssessmentForm) =>
    apiClient.post<Assessment[]>(`/green-inventory/specimens/${segment(code)}/assessments`, form),

  previewImport: (csv: File, photosZip: File | null) => {
    const data = new FormData();
    data.append('file', csv);
    if (photosZip) data.append('photos', photosZip);
    return apiClient.postForm<ImportPreview>('/imports/specimens/preview', data);
  },

  /** `duplicates`: por línea, true ingresa la fila y false la omite. */
  confirmImport: (batchId: number, duplicates: Record<number, boolean>) =>
    apiClient.post<ImportResult>(`/imports/${batchId}/confirm`, { duplicates }),

  template: (kind: string) => apiClient.getBlob(`/imports/templates/${segment(kind)}`),

  exportSpecimens: () => apiClient.getBlob('/green-inventory/export.csv'),
};
