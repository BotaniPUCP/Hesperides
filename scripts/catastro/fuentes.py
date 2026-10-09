"""Lee las fuentes del catastro y las une en ejemplares listos para cargar.

Las reglas de esta union estan explicadas en docs/inventario-verde/README.md.
"""
import csv
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DATOS = RAIZ / "docs/dominio/datos"
FUENTES = DATOS / "fuentes-catastro"

# Palmeras: p01-p42 conservan su nombre; p43-p76 son Mec-Pal-1..34 (README §6).
PRIMERA_PALMERA_DE_MECANICA = 43
NOTA_SIN_UBICACION = "Falta ubicarla individualmente: el catastro registró el grupo en un solo punto."
NOTA_MEDICION = "Medida en «mediciones forestales - palmeras»."


@dataclass
class Especie:
    cientifico: str
    slug: str
    comun: str
    familia: str
    tipo: str
    alternativos: list = field(default_factory=list)


@dataclass
class Ejemplar:
    especie: str
    lat: float
    lon: float
    referencia: str
    ubicacion: str
    foto: str
    codigo_antiguo: str | None
    cantidad: int = 1
    medidas: dict | None = None
    notas: list = field(default_factory=list)


def _numero(texto):
    texto = str(texto).strip().replace(",", ".")
    return float(texto) if texto not in ("", "-") else None


def especies():
    """nombre_en_catastro -> Especie, y la lista de especies.

    especies.csv tiene una fila por especie. nombres-catastro.csv traduce cada forma
    en que el catastro escribio un nombre a su especie: varias formas pueden ser la
    misma especie (README del inventario verde, §3).
    """
    with open(DATOS / "especies.csv", encoding="utf-8") as f:
        lista = [Especie(fila["nombre_cientifico"], fila["slug"], fila["nombre_comun"], fila["familia"],
                         fila["tipo"], [n for n in fila["nombres_alternativos"].split("|") if n])
                 for fila in csv.DictReader(f)]
    por_cientifico = {especie.cientifico: especie for especie in lista}
    if len(por_cientifico) != len(lista):
        raise ValueError("especies.csv repite un nombre científico: debe tener una fila por especie")
    with open(DATOS / "nombres-catastro.csv", encoding="utf-8") as f:
        por_nombre = {fila["nombre_en_catastro"]: por_cientifico[fila["nombre_cientifico"]]
                      for fila in csv.DictReader(f)}
    return por_nombre, lista


def _referencia_de_medicion(numero):
    if numero < PRIMERA_PALMERA_DE_MECANICA:
        return f"p{numero:02d}"
    return f"mec-pal-{numero - PRIMERA_PALMERA_DE_MECANICA + 1}"


def mediciones_de_palmeras():
    """Referencia del catastro (en minúsculas) -> medidas de la palmera."""
    medidas = {}
    with open(FUENTES / "mediciones-palmeras.csv", encoding="utf-8") as f:
        for fila in list(csv.reader(f))[3:]:
            if not fila[0].strip().isdigit():
                continue
            medidas[_referencia_de_medicion(int(fila[0]))] = {
                "altura": _numero(fila[11]), "fuste": _numero(fila[12]), "dap": _numero(fila[13]),
                "radio": _numero(fila[14]), "zunchado": fila[15].strip().lower().startswith("s"),
            }
    return medidas


def _codigo_antiguo(texto):
    texto = texto.strip()
    return None if texto.lower() in ("", "null") else texto


def ejemplares(especie_de):
    """Los ejemplares del catastro, con las palmeras agrupadas separadas y sus medidas."""
    medidas = mediciones_de_palmeras()
    usadas, salida = set(), []
    with open(FUENTES / "catastro.csv", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            especie = especie_de[fila["Nombre científico"]]
            referencia = fila["Referencia"].strip()
            base = dict(especie=especie.cientifico, lat=float(fila["Latitud"]), lon=float(fila["Longitud"]),
                        referencia=referencia, ubicacion=fila["Ubicación"].strip(), foto=fila["Foto"].strip(),
                        codigo_antiguo=_codigo_antiguo(fila["Código"]))
            cantidad = int(float(fila["Cantidad"] or 1))
            if cantidad > 1 and especie.tipo == "PALM":
                salida += [Ejemplar(**base, notas=[NOTA_SIN_UBICACION]) for _ in range(cantidad)]
                continue
            ejemplar = Ejemplar(**base, cantidad=cantidad)
            medida = medidas.get(referencia.lower())
            if medida:
                ejemplar.medidas = medida
                ejemplar.notas.append(NOTA_MEDICION)
                usadas.add(referencia.lower())
            salida.append(ejemplar)
    sin_cruzar = set(medidas) - usadas
    if sin_cruzar:
        raise ValueError(f"Mediciones sin ejemplar en el catastro: {sorted(sin_cruzar)}")
    return salida
