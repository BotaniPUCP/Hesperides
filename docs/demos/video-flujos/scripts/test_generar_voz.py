import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import generar_voz as gv  # noqa: E402


def guion(*frases, voz="es-PE-CamilaNeural"):
    return {"voz": voz, "escenas": [{"id": "inicio", "frases": list(frases)}]}


def frase(id_, texto, **extra):
    return {"id": id_, "texto": texto, "hespo": {"x": 0, "pose": "quieto"}, **extra}


class Sintetizador:
    """Escribe un archivo y recuerda qué le pidieron."""

    def __init__(self, falla_en=None):
        self.textos = []
        self.falla_en = falla_en

    async def __call__(self, texto, voz, destino, velocidad=None):
        self.textos.append(texto)
        self.velocidad = velocidad
        destino.write_bytes(b"audio")
        if texto == self.falla_en:
            raise ConnectionError("corte de red")


def medir(_ruta):
    return 1.5


class GenerarVoz(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        carpeta = tempfile.TemporaryDirectory()
        self.addCleanup(carpeta.cleanup)
        self.salida = Path(carpeta.name) / "voz"
        self.manifiesto = self.salida / "manifiesto.json"

    async def generar(self, g, sintetizar):
        return await gv.generar(g, self.manifiesto, self.salida, sintetizar, medir)

    async def test_genera_cada_frase_y_el_manifiesto(self):
        m = await self.generar(guion(frase("i1", "Hola"), frase("i2", "Adiós")), Sintetizador())

        self.assertTrue((self.salida / "i1.mp3").exists())
        self.assertTrue((self.salida / "i2.mp3").exists())
        self.assertEqual(m["frases"]["i1"], {"archivo": "i1.mp3", "duracion": 1.5, "texto": "Hola"})
        self.assertEqual(json.loads(self.manifiesto.read_text(encoding="utf-8")), m)

    async def test_no_repite_lo_que_no_cambio(self):
        g = guion(frase("i1", "Hola"), frase("i2", "Adiós"))
        await self.generar(g, Sintetizador())

        segunda = Sintetizador()
        await self.generar(g, segunda)

        self.assertEqual(segunda.textos, [])

    async def test_regenera_si_cambia_el_texto(self):
        await self.generar(guion(frase("i1", "Hola"), frase("i2", "Adiós")), Sintetizador())

        segunda = Sintetizador()
        await self.generar(guion(frase("i1", "Hola de nuevo"), frase("i2", "Adiós")), segunda)

        self.assertEqual(segunda.textos, ["Hola de nuevo"])

    async def test_regenera_todo_si_cambia_la_voz(self):
        await self.generar(guion(frase("i1", "Hola"), frase("i2", "Adiós")), Sintetizador())

        segunda = Sintetizador()
        m = await self.generar(guion(frase("i1", "Hola"), frase("i2", "Adiós"), voz="es-PE-AlexNeural"), segunda)

        self.assertEqual(len(segunda.textos), 2)
        self.assertEqual(m["voz"], "es-PE-AlexNeural")

    async def test_pasa_la_velocidad_del_guion_y_la_guarda(self):
        g = {**guion(frase("i1", "Hola")), "velocidad": "+10%"}
        s = Sintetizador()
        m = await self.generar(g, s)

        self.assertEqual(s.velocidad, "+10%")
        self.assertEqual(m["velocidad"], "+10%")

    async def test_sin_velocidad_no_cambia_nada(self):
        s = Sintetizador()
        m = await self.generar(guion(frase("i1", "Hola")), s)

        self.assertIsNone(s.velocidad)
        self.assertNotIn("velocidad", m)

    async def test_regenera_todo_si_cambia_la_velocidad(self):
        await self.generar(guion(frase("i1", "Hola"), frase("i2", "Adiós")), Sintetizador())

        segunda = Sintetizador()
        await self.generar({**guion(frase("i1", "Hola"), frase("i2", "Adiós")), "velocidad": "+10%"}, segunda)

        self.assertEqual(len(segunda.textos), 2)

    async def test_usa_texto_voz_si_existe(self):
        s = Sintetizador()
        m = await self.generar(guion(frase("i1", "Hesperides", textoVoz="Hespérides")), s)

        self.assertEqual(s.textos, ["Hespérides"])
        self.assertEqual(m["frases"]["i1"]["texto"], "Hespérides")

    async def test_un_corte_no_deja_audio_valido(self):
        g = guion(frase("i0", "Antes"), frase("i1", "Se corta"))

        with self.assertRaises(gv.ErrorDeVoz) as error:
            await self.generar(g, Sintetizador(falla_en="Se corta"))

        self.assertEqual(error.exception.frase_id, "i1")
        self.assertFalse((self.salida / "i1.mp3").exists())
        self.assertEqual(list(self.salida.glob("*.tmp")), [])
        guardado = json.loads(self.manifiesto.read_text(encoding="utf-8"))
        self.assertEqual(list(guardado["frases"]), ["i0"])

        reintento = Sintetizador()
        await self.generar(g, reintento)
        self.assertEqual(reintento.textos, ["Se corta"])

    async def test_solo_genera_lo_pedido(self):
        s = Sintetizador()
        g = guion(frase("i1", "Hola"), frase("i2", "Adiós"))

        await gv.generar(g, self.manifiesto, self.salida, s, medir, solo={"i2"})

        self.assertEqual(s.textos, ["Adiós"])


class Argumentos(unittest.TestCase):
    def test_guion_por_defecto_y_elegido(self):
        self.assertEqual(gv._leer_argumentos([]).guion, "guion.json")
        elegidos = gv._leer_argumentos(["--guion", "guion-planificacion.json", "--salida", "public/voz/planificacion"])
        self.assertEqual(elegidos.guion, "guion-planificacion.json")
        self.assertEqual(elegidos.salida, "public/voz/planificacion")


class Lectura(unittest.TestCase):
    def test_lee_acentos_en_utf8(self):
        with tempfile.TemporaryDirectory() as carpeta:
            ruta = Path(carpeta) / "guion.json"
            ruta.write_bytes(json.dumps(guion(frase("i1", "¡Hola, ñandú!")), ensure_ascii=False).encode("utf-8"))

            leido = gv.cargar_guion(ruta)

        self.assertEqual(leido["escenas"][0]["frases"][0]["texto"], "¡Hola, ñandú!")

    def test_rechaza_voz_inexistente(self):
        with self.assertRaises(gv.VozNoDisponible):
            gv.comprobar_voz("es-PE-CamilaNeural", ["es-ES-ElviraNeural"])

    def test_acepta_voz_disponible(self):
        gv.comprobar_voz("es-PE-AlexNeural", ["es-PE-AlexNeural"])


if __name__ == "__main__":
    unittest.main()
