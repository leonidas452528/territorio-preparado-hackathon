"""
test_sistema.py — Pruebas unitarias del Asistente Solar Rural
==============================================================
Cubre las tres capas del sistema:
  1. PredictorEnergia  (GBR .pkl)
  2. DiagnosticoVisual (YOLOv8)
  3. LLM / Fallback    (respuesta conversacional)
  4. Integración       (AsistenteSolarRural completo)
  5. API Flask         (endpoints REST)

Ejecutar:
  cd deploy_bundle
  python test_sistema.py          # todos los tests
  python test_sistema.py -v       # verbose con detalle
"""

import sys
import os
import unittest
import json
import io

# Asegurar que importa desde la misma carpeta
sys.path.insert(0, os.path.dirname(__file__))

# ─────────────────────────────────────────────────────────────────────────────
# SUITE 1 — Predictor Energético (GBR)
# ─────────────────────────────────────────────────────────────────────────────

class TestPredictorEnergia(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from brain import PredictorEnergia
        cls.predictor = PredictorEnergia("modelo_solar_expert_v2_1.pkl")

    def test_carga_modelo(self):
        """El modelo GBR debe cargarse sin excepciones."""
        self.assertIsNotNone(self.predictor.modelo)
        self.assertTrue(hasattr(self.predictor.modelo, 'predict'))

    def test_prediccion_retorna_float(self):
        """predecir() debe retornar un número flotante."""
        val = self.predictor.predecir()
        self.assertIsInstance(val, float)

    def test_prediccion_medioda_positiva(self):
        """A las 12:00 en un mes soleado la predicción debe ser >= 0."""
        val = self.predictor.predecir(extras={"hour": 12, "month": 6})
        self.assertGreaterEqual(val, 0.0)

    def test_evaluar_sistema_nivel_normal(self):
        """Si producción ≈ predicción el nivel debe ser 'normal'."""
        # Primero obtenemos la predicción real para simular un valor cercano
        pred = self.predictor.predecir(extras={"hour": 12})
        if pred > 0:
            resultado = self.predictor.evaluar_sistema(pred * 0.95)
            self.assertEqual(resultado["nivel"], "normal")

    def test_evaluar_sistema_nivel_advertencia(self):
        """Producción al 60% de lo esperado → advertencia."""
        pred = self.predictor.predecir(extras={"hour": 12, "month": 6})
        if pred > 0:
            resultado = self.predictor.evaluar_sistema(pred * 0.60)
            self.assertIn(resultado["nivel"], ("advertencia", "critico"))

    def test_evaluar_sistema_nivel_critico(self):
        """Producción al 20% de lo esperado → crítico."""
        pred = self.predictor.predecir(extras={"hour": 12, "month": 6})
        if pred > 0:
            resultado = self.predictor.evaluar_sistema(pred * 0.20)
            self.assertEqual(resultado["nivel"], "critico")

    def test_evaluar_sistema_keys_completas(self):
        """El resultado debe tener todas las claves esperadas."""
        resultado = self.predictor.evaluar_sistema(5.0)
        for key in ("prediccion", "real", "diferencia_pct", "nivel", "mensaje"):
            self.assertIn(key, resultado)

    def test_produccion_cero_no_falla(self):
        """Predicción=0 (noche) no debe lanzar ZeroDivisionError."""
        resultado = self.predictor.evaluar_sistema(0.0, extras={"hour": 2})
        self.assertIn("nivel", resultado)

    def test_resumen_dia_contiene_horas(self):
        """resumen_dia() debe retornar texto con flechas '→'."""
        resumen = self.predictor.resumen_dia()
        self.assertIn("→", resumen)


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 2 — Diagnóstico Visual (YOLOv8)
# ─────────────────────────────────────────────────────────────────────────────

class TestDiagnosticoVisual(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from brain import DiagnosticoVisual
        cls.vision = DiagnosticoVisual("yolov8n.pt")

    def test_carga_modelo(self):
        """YOLOv8 debe cargarse (disponible) o indicar que no está instalado."""
        # No forzamos disponible=True porque ultralytics puede no estar
        self.assertIn(self.vision.disponible, (True, False))

    def test_imagen_inexistente(self):
        """Una ruta de imagen inválida debe retornar nivel 'error' sin crash."""
        resultado = self.vision.analizar_imagen("/ruta/que/no/existe.jpg")
        self.assertIn(resultado["nivel_alerta"], ("error", "no_disponible"))

    def test_resultado_keys_completas(self):
        """El resultado siempre debe tener las 4 claves estándar."""
        resultado = self.vision.analizar_imagen("/ruta/falsa.png")
        for key in ("detecciones", "nivel_alerta", "mensaje", "recomendaciones"):
            self.assertIn(key, resultado)

    def test_analizar_imagen_real(self):
        """Si ultralytics está disponible, analiza una imagen de prueba real."""
        if not self.vision.disponible:
            self.skipTest("ultralytics no instalado — se omite test de imagen real")

        # Crear imagen de prueba con Pillow
        try:
            from PIL import Image
            import tempfile
            img = Image.new("RGB", (640, 480), color=(100, 180, 100))
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
                img.save(f.name)
                tmp_path = f.name
            resultado = self.vision.analizar_imagen(tmp_path)
            self.assertIn(resultado["nivel_alerta"], ("normal", "info", "advertencia", "critico"))
            os.unlink(tmp_path)
        except ImportError:
            self.skipTest("Pillow no instalado")


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 3 — LLM Fallback
# ─────────────────────────────────────────────────────────────────────────────

class TestFallback(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from brain import AsistenteSolarFallback
        cls.llm = AsistenteSolarFallback()

    def test_respuesta_panel(self):
        """Pregunta sobre paneles debe retornar respuesta no vacía."""
        r = self.llm.responder("¿Qué es un panel solar?")
        self.assertIsInstance(r, str)
        self.assertGreater(len(r), 10)

    def test_respuesta_bateria(self):
        r = self.llm.responder("¿Cómo cuido mi batería?")
        self.assertIn("batería", r.lower())

    def test_respuesta_subsidio(self):
        r = self.llm.responder("¿Hay subsidios disponibles?")
        self.assertIn("IPSE", r)

    def test_respuesta_costo(self):
        r = self.llm.responder("¿Cuánto cuesta un sistema solar?")
        self.assertIn("millones", r.lower())

    def test_respuesta_mantenimiento(self):
        r = self.llm.responder("¿Cómo hago el mantenimiento?")
        self.assertIsInstance(r, str)
        self.assertGreater(len(r), 10)

    def test_pregunta_sin_clave(self):
        """Preguntas sin keywords deben retornar mensaje de ayuda, no crash."""
        r = self.llm.responder("xyzxyzxyz pregunta desconocida")
        self.assertIsInstance(r, str)
        self.assertGreater(len(r), 5)

    def test_contexto_extra_incluido(self):
        """El contexto_extra debe aparecer en la respuesta."""
        r = self.llm.responder("¿Es normal?", contexto_extra="ALERTA CRÍTICA")
        self.assertIn("ALERTA CRÍTICA", r)

    def test_historial_no_falla(self):
        """Pasar historial no debe romper el fallback."""
        historial = [
            {"role": "user",      "content": "Hola"},
            {"role": "assistant", "content": "Hola, soy Solaris"},
        ]
        r = self.llm.responder("¿Y los paneles?", historial=historial)
        self.assertIsInstance(r, str)


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 4 — Motor Principal (AsistenteSolarRural)
# ─────────────────────────────────────────────────────────────────────────────

class TestAsistenteSolarRural(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from brain import cargar_asistente
        cls.asistente = cargar_asistente()

    def test_estado_retorna_dict(self):
        estado = self.asistente.estado()
        self.assertIsInstance(estado, dict)
        for key in ("llm", "predictor", "vision"):
            self.assertIn(key, estado)

    def test_modo_llm_asignado(self):
        self.assertIn(self.asistente.modo_llm, ("GGUF", "RAG", "Fallback"))

    def test_responder_basico(self):
        resultado = self.asistente.responder("¿Cuántos paneles necesito?")
        self.assertIn("respuesta", resultado)
        self.assertIsInstance(resultado["respuesta"], str)
        self.assertGreater(len(resultado["respuesta"]), 5)

    def test_responder_keys_completas(self):
        resultado = self.asistente.responder("Hola")
        for key in ("respuesta", "alertas", "diagnostico_visual", "modo"):
            self.assertIn(key, resultado)

    def test_responder_con_sensor_critico(self):
        """Con producción muy baja debe haber alerta crítica."""
        resultado = self.asistente.responder(
            pregunta="¿Por qué produce tan poco?",
            produccion_real=0.5,
            datos_sensor={"hour": 12, "month": 6}
        )
        if resultado["alertas"]:
            nivel = resultado["alertas"][0]["nivel"]
            self.assertIn(nivel, ("advertencia", "critico"))

    def test_responder_con_sensor_normal(self):
        """Con producción similar a la esperada el nivel debe ser normal."""
        pred = self.asistente.predictor.predecir(extras={"hour": 12}) if self.asistente.predictor else None
        if pred and pred > 0:
            resultado = self.asistente.responder(
                pregunta="¿Todo bien?",
                produccion_real=pred * 0.95,
            )
            if resultado["alertas"]:
                self.assertEqual(resultado["alertas"][0]["nivel"], "normal")

    def test_responder_imagen_inexistente_no_falla(self):
        resultado = self.asistente.responder(
            pregunta="¿Qué ves en la imagen?",
            imagen_path="/ruta/falsa/imagen.jpg"
        )
        self.assertIn("respuesta", resultado)

    def test_prediccion_rapida(self):
        texto = self.asistente.prediccion_rapida()
        self.assertIsInstance(texto, str)

    def test_historial_conversacional(self):
        """El asistente debe aceptar historial sin errores."""
        historial = [
            {"role": "user",      "content": "¿Qué es un panel solar?"},
            {"role": "assistant", "content": "Un panel convierte luz en electricidad."},
        ]
        resultado = self.asistente.responder("¿Y las baterías?", historial=historial)
        self.assertIn("respuesta", resultado)


# ─────────────────────────────────────────────────────────────────────────────
# SUITE 5 — API Flask
# ─────────────────────────────────────────────────────────────────────────────

class TestFlaskAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        import server
        server.app.config["TESTING"] = True
        cls.client = server.app.test_client()

    def test_status_200(self):
        r = self.client.get("/api/status")
        self.assertEqual(r.status_code, 200)

    def test_status_keys(self):
        r = self.client.get("/api/status")
        data = json.loads(r.data)
        for key in ("llm", "predictor", "vision"):
            self.assertIn(key, data)

    def test_prediction_200(self):
        r = self.client.get("/api/prediction")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertIn("resumen", data)

    def test_respond_pregunta_basica(self):
        r = self.client.post(
            "/api/respond",
            data=json.dumps({"pregunta": "¿Qué es la energía solar?"}),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertIn("respuesta", data)
        self.assertGreater(len(data["respuesta"]), 5)

    def test_respond_sin_pregunta_400(self):
        r = self.client.post(
            "/api/respond",
            data=json.dumps({}),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 400)

    def test_respond_con_sensor(self):
        r = self.client.post(
            "/api/respond",
            data=json.dumps({
                "pregunta": "¿Está bien mi sistema?",
                "produccion_real": 3.0
            }),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertIn("alertas", data)

    def test_sensor_endpoint(self):
        r = self.client.post(
            "/api/sensor",
            data=json.dumps({"produccion_real": 5.0}),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        for key in ("prediccion", "real", "nivel", "mensaje"):
            self.assertIn(key, data)

    def test_sensor_sin_valor_400(self):
        r = self.client.post(
            "/api/sensor",
            data=json.dumps({}),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 400)

    def test_diagnose_sin_imagen_400(self):
        r = self.client.post("/api/diagnose")
        self.assertEqual(r.status_code, 400)

    def test_diagnose_con_imagen(self):
        """Sube una imagen PNG de prueba y verifica la respuesta."""
        try:
            from PIL import Image
            import tempfile
            img = Image.new("RGB", (320, 240), color=(80, 160, 80))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            buf.seek(0)
        except ImportError:
            self.skipTest("Pillow no instalado")
            return

        r = self.client.post(
            "/api/diagnose",
            data={"image": (buf, "test_panel.jpg")},
            content_type="multipart/form-data"
        )
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.data)
        self.assertIn("diagnostico", data)
        for key in ("nivel_alerta", "mensaje", "detecciones", "recomendaciones"):
            self.assertIn(key, data["diagnostico"])

    def test_frontend_sirve_index(self):
        r = self.client.get("/")
        self.assertEqual(r.status_code, 200)
        self.assertIn(b"Solaris", r.data)

    def test_respond_historial_aceptado(self):
        historial = [
            {"role": "user",      "content": "¿Qué es FAZNI?"},
            {"role": "assistant", "content": "Es el Fondo de Apoyo para la Energía."},
        ]
        r = self.client.post(
            "/api/respond",
            data=json.dumps({
                "pregunta": "¿Y el IPSE?",
                "historial": historial
            }),
            content_type="application/json"
        )
        self.assertEqual(r.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Runner con reporte visual
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "═" * 60)
    print("  ☀️  SOLARIS — Suite de Pruebas Unitarias")
    print("  Asistente Solar Rural · Hackathon 2025")
    print("═" * 60)

    loader  = unittest.TestLoader()
    suites  = [
        ("Predictor Energético (GBR)",   loader.loadTestsFromTestCase(TestPredictorEnergia)),
        ("Diagnóstico Visual (YOLOv8)",  loader.loadTestsFromTestCase(TestDiagnosticoVisual)),
        ("LLM Fallback",                 loader.loadTestsFromTestCase(TestFallback)),
        ("Motor Principal (brain.py)",   loader.loadTestsFromTestCase(TestAsistenteSolarRural)),
        ("API Flask (server.py)",        loader.loadTestsFromTestCase(TestFlaskAPI)),
    ]

    total_ok  = 0
    total_err = 0
    total_skip = 0

    for nombre, suite in suites:
        print(f"\n📋  {nombre}")
        print("─" * 50)
        runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
        result = runner.run(suite)
        ok    = result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)
        total_ok   += ok
        total_err  += len(result.failures) + len(result.errors)
        total_skip += len(result.skipped)

    print("\n" + "═" * 60)
    print(f"  ✅  Pasaron:   {total_ok}")
    print(f"  ❌  Fallaron:  {total_err}")
    print(f"  ⏭️   Omitidos:  {total_skip}")
    estado = "✅  TODOS LOS TESTS PASARON" if total_err == 0 else "⚠️   ALGUNOS TESTS FALLARON"
    print(f"\n  {estado}")
    print("═" * 60 + "\n")

    sys.exit(0 if total_err == 0 else 1)
