import { interventionsApi } from '../interventions-api';
import { apiClient, setAccessToken } from '../api';

afterEach(()=>{jest.restoreAllMocks();setAccessToken(null);});
it('conserva el código del ejemplar junto con los filtros y la página',async()=>{
  jest.spyOn(apiClient,'get').mockResolvedValue({});
  await interventionsApi.list(2,'COMPLETED','2026-10-01','2026-10-29','EV/A & B');
  expect(apiClient.get).toHaveBeenCalledWith('/interventions?page=2&size=20&statusCode=COMPLETED&dateFrom=2026-10-01&dateTo=2026-10-29&greenElementCode=EV%2FA+%26+B');
});
it('preserva Idempotency-Key al refrescar sesión y reintentar el mismo anuncio',async()=>{
  setAccessToken('old');const fetch=jest.fn().mockResolvedValueOnce({status:401,ok:false})
    .mockResolvedValueOnce({status:200,ok:true,json:async()=>({ok:true,data:{accessToken:'new'}})})
    .mockResolvedValueOnce({status:201,ok:true,json:async()=>({ok:true,data:{id:5}})});
  global.fetch=fetch;
  await interventionsApi.announce(1,2,3,'reference','stable-key','Garden','UNSPECIFIED');
  expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('stable-key');
  expect(fetch.mock.calls[2][1].headers['Idempotency-Key']).toBe('stable-key');
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
  expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[2][1].body);
});
it('recupera fotos mediante lectura autenticada',async()=>{
  jest.spyOn(apiClient,'getBlob').mockResolvedValue(new Blob());await interventionsApi.photo(1,4);
  expect(apiClient.getBlob).toHaveBeenCalledWith('/interventions/1/evidences/4/file');
});
