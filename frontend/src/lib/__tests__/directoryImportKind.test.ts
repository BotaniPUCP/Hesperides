import { detectarTipoDeImportacion, TipoNoReconocidoError } from '../directoryImportKind';

const archivo = (contenido: string) => new File([contenido], 'carga.csv', { type: 'text/csv' });

describe('detectarTipoDeImportacion', () => {
  it('reconoce organizaciones por su columna «tipo»', async () => {
    await expect(detectarTipoDeImportacion(archivo('nombre;tipo;ruc;telefono;otros_nombres\nOIE;Unidad PUCP;;;\n')))
      .resolves.toBe('organizations');
  });

  it('reconoce contactos por su columna «organizaciones», con o sin «roles»', async () => {
    await expect(detectarTipoDeImportacion(archivo('nombre;organizaciones;roles;anexo;celular;correo\n')))
      .resolves.toBe('contacts');
    await expect(detectarTipoDeImportacion(archivo('nombre;organizaciones;anexo;celular;correo\n')))
      .resolves.toBe('contacts');
  });

  it('tolera BOM, mayúsculas, espacios y fin de línea de Windows', async () => {
    await expect(detectarTipoDeImportacion(archivo('﻿ Nombre ; TIPO ;ruc;telefono;otros_nombres\r\n')))
      .resolves.toBe('organizations');
  });

  it('reconoce el tipo aunque el separador sea coma: el servidor rechaza luego el separador', async () => {
    await expect(detectarTipoDeImportacion(archivo('nombre,tipo,ruc,telefono,otros_nombres\n')))
      .resolves.toBe('organizations');
  });

  it('un archivo vacío no se reconoce', async () => {
    await expect(detectarTipoDeImportacion(archivo(''))).rejects.toBeInstanceOf(TipoNoReconocidoError);
  });

  it('una cabecera ajena no se reconoce', async () => {
    await expect(detectarTipoDeImportacion(archivo('codigo;especie;altura\n'))).rejects.toThrow(/organizaciones ni de contactos/);
  });

  it('una cabecera con ambas columnas es ambigua y no se reconoce', async () => {
    await expect(detectarTipoDeImportacion(archivo('nombre;tipo;organizaciones\n'))).rejects.toBeInstanceOf(TipoNoReconocidoError);
  });
});
