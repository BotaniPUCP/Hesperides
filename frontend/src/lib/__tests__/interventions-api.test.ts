import { activitiesApi, interventionsApi, interventionError, type ActivityPlanning } from '../interventions-api';
import { ApiError, apiClient, setAccessToken } from '../api';

it('distingue una ruta ausente de una actividad no disponible sin atribuirlo a la cuenta',()=>{
  expect(interventionError(new ApiError(404,'Endpoint not found'))).toContain('backend');
  expect(interventionError(new ApiError(404,'Resource not found'))).toBe('La actividad o el objetivo solicitado no está disponible.');
});

afterEach(()=>{jest.restoreAllMocks();setAccessToken(null);});
it('consulta el mapa autorizado por actividad y filtra con los estados vigentes en el servidor',async()=>{
  jest.spyOn(apiClient,'get').mockResolvedValue({});
  await activitiesApi.mapOptions(7);expect(apiClient.get).toHaveBeenCalledWith('/activities/7/map-options');
  await interventionsApi.list(2,'FINISHED','','');expect(apiClient.get).toHaveBeenCalledWith('/interventions?page=2&size=20&activityStatusCode=FINISHED');
});
it('envía el avance global y las decisiones con versión por sus rutas propias',async()=>{
  jest.spyOn(apiClient,'post').mockResolvedValue({id:7});jest.spyOn(apiClient,'put').mockResolvedValue({id:7});
  const body={version:4,clientReference:'same-reference',percentage:40,description:'Limpieza',targets:[{locationId:20,statusCode:'PARTIAL' as const,partialDescription:'Borde pendiente'}],evidenceIds:[3]};
  await activitiesApi.progress(7,body);expect(apiClient.post).toHaveBeenCalledWith('/activities/7/progress',body);
  await activitiesApi.approve(7,5);expect(apiClient.post).toHaveBeenCalledWith('/activities/7/approve',{version:5});
  await activitiesApi.cancel(7,5,'  ');expect(apiClient.post).toHaveBeenCalledWith('/activities/7/cancel',{version:5,reason:null});
  await activitiesApi.responsible(7,5,9);expect(apiClient.put).toHaveBeenCalledWith('/activities/7/responsible',{version:5,responsibleSupervisorUserId:9});
});
it('sube fotos por multipart y las recupera mediante lectura privada de actividad',async()=>{
  jest.spyOn(apiClient,'putForm').mockResolvedValue({id:4});jest.spyOn(apiClient,'getBlob').mockResolvedValue(new Blob());
  const file=new File(['test'],'foto.png',{type:'image/png'});await activitiesApi.upload(7,4,file);
  const [url,body]=jest.mocked(apiClient.putForm).mock.calls[0];expect(url).toBe('/activities/7/evidences/4/file');expect(body.get('file')).toBe(file);
  await activitiesApi.photo(7,4);expect(apiClient.getBlob).toHaveBeenCalledWith('/activities/7/evidences/4/file');
});
it('crea y edita con responsable opcional usando el contrato global sin cuadrilla',async()=>{
  const body:ActivityPlanning={responsibleSupervisorUserId:null,planning:{classItemId:1,typeItemId:null,scheduledDate:'2099-01-01',description:'Trabajo',locations:[]}};
  jest.spyOn(apiClient,'postWithKey').mockResolvedValue({id:5});
  jest.spyOn(apiClient,'put').mockResolvedValue({id:5});
  await activitiesApi.create(body,'stable-uuid');
  expect(apiClient.postWithKey).toHaveBeenCalledWith('/activities',body,'stable-uuid');
  await activitiesApi.update(5,body);
  expect(apiClient.put).toHaveBeenCalledWith('/activities/5/planning',body);
});
it('conserva el código del ejemplar junto con los filtros y la página',async()=>{
  jest.spyOn(apiClient,'get').mockResolvedValue({});
  await interventionsApi.list(2,'COMPLETED','2026-10-01','2026-10-29','EV/A & B');
  expect(apiClient.get).toHaveBeenCalledWith('/interventions?page=2&size=20&statusCode=COMPLETED&dateFrom=2026-10-01&dateTo=2026-10-29&greenElementCode=EV%2FA+%26+B');
});
it('permite consultar el historial por ID inmutable sin resolver un código reutilizable',async()=>{
  jest.spyOn(apiClient,'get').mockResolvedValue({});
  await interventionsApi.list(0,'','','',undefined,undefined,42);
  expect(apiClient.get).toHaveBeenCalledWith('/interventions?page=0&size=20&greenElementId=42');
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
