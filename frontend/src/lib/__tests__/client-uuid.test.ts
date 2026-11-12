import { createClientUuid } from '../client-uuid';

const original = Object.getOwnPropertyDescriptor(global.crypto,'randomUUID');
afterEach(()=>{
  jest.restoreAllMocks();
  if(original)Object.defineProperty(global.crypto,'randomUUID',original);
  else Reflect.deleteProperty(global.crypto,'randomUUID');
});
it('utiliza la implementación nativa cuando está disponible',()=>{
  const native=jest.fn().mockReturnValue('36b8f84d-df4e-4d49-b662-bcde71a8764f');
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:native});
  expect(createClientUuid()).toBe('36b8f84d-df4e-4d49-b662-bcde71a8764f');
  expect(native).toHaveBeenCalledTimes(1);
});
it('genera referencias v4 independientes mediante Web Crypto sin randomUUID',()=>{
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:undefined});
  const random=jest.spyOn(global.crypto,'getRandomValues');
  const first=createClientUuid(),second=createClientUuid();
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(second).not.toBe(first);expect(random).toHaveBeenCalledTimes(2);
});
it('no sustituye aleatoriedad segura con identificadores predecibles',()=>{
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:undefined});
  jest.spyOn(global.crypto,'getRandomValues').mockImplementation(()=>{throw new Error('Unavailable');});
  expect(()=>createClientUuid()).toThrow('Unavailable');
});
