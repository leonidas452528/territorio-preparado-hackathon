"""
brain.py — Motor de respuestas del Asistente Solar Rural
=========================================================
Integra tres capas de inteligencia:
  1. GradientBoostingRegressor (.pkl) → Predicción numérica de energía + alertas
  2. YOLOv8 (.pt)                     → Diagnóstico visual de paneles
  3. LLM (GGUF / RAG / Claude API)    → Respuestas conversacionales en español

Autor: Equipo Asistente Solar Rural — Hackathon
"""

import os
import datetime
import numpy as np

# ─────────────────────────────────────────────────────────────
# CAPA 1: PREDICCIÓN ENERGÉTICA (GradientBoostingRegressor)
# ─────────────────────────────────────────────────────────────

class PredictorEnergia:
    """
    Usa el modelo GBR entrenado para predecir producción solar
    y detectar anomalías comparando predicción vs. medición real.
    
    Features esperadas (14 en total):
      hour, day, month, day_of_week,
      AT00, AT01, AT02, AT03,
      BA00, BE00, BE01, BE02, BE03, BG00
    """

    FEATURE_NAMES = [
        "hour", "day", "month", "day_of_week",
        "AT00", "AT01", "AT02", "AT03",
        "BA00", "BE00", "BE01", "BE02", "BE03", "BG00"
    ]

    # Umbrales de alerta (% de desviación respecto a la predicción)
    UMBRAL_ADVERTENCIA = 0.30   # 30% por debajo → advertencia
    UMBRAL_CRITICO     = 0.60   # 60% por debajo → crítico

    def __init__(self, model_path: str = "modelo_solar_expert_v2_1.pkl"):
        import joblib
        print(f"[PredictorEnergia] Cargando modelo: {model_path}")
        self.modelo = joblib.load(model_path)
        print(f"[PredictorEnergia] Listo — {self.modelo.n_estimators} estimadores")

    def _features_desde_ahora(self, extras: dict = None) -> np.ndarray:
        """
        Construye el vector de features usando la hora actual
        y valores opcionales para las variables regionales.
        Si no se proveen extras, usa ceros (escenario neutro).
        """
        ahora = datetime.datetime.now()
        base = {
            "hour":        ahora.hour,
            "day":         ahora.day,
            "month":       ahora.month,
            "day_of_week": ahora.weekday(),
            # Variables regionales — deben venir del sensor/usuario
            "AT00": 0.0, "AT01": 0.0, "AT02": 0.0, "AT03": 0.0,
            "BA00": 0.0,
            "BE00": 0.0, "BE01": 0.0, "BE02": 0.0, "BE03": 0.0,
            "BG00": 0.0,
        }
        if extras:
            base.update(extras)
        return np.array([[base[f] for f in self.FEATURE_NAMES]])

    def predecir(self, extras: dict = None) -> float:
        """Retorna la producción solar predicha (kWh o unidad del dataset)."""
        X = self._features_desde_ahora(extras)
        return float(self.modelo.predict(X)[0])

    def evaluar_sistema(self, produccion_real: float, extras: dict = None) -> dict:
        """
        Compara producción real vs. predicha y emite una alerta contextual.
        
        Returns:
            dict con: prediccion, real, diferencia_pct, nivel, mensaje
        """
        prediccion = self.predecir(extras)
        ahora = datetime.datetime.now()

        if prediccion <= 0:
            return {
                "prediccion": prediccion,
                "real": produccion_real,
                "diferencia_pct": 0.0,
                "nivel": "info",
                "mensaje": (
                    f"⏰ Son las {ahora.hour}:00. En este horario la producción "
                    f"esperada es mínima (noche o amanecer). Tu sistema está normal."
                )
            }

        diferencia = (prediccion - produccion_real) / prediccion

        if diferencia >= self.UMBRAL_CRITICO:
            nivel = "critico"
            mensaje = (
                f"🚨 ALERTA CRÍTICA: Tu sistema produce {produccion_real:.1f} "
                f"cuando debería producir ~{prediccion:.1f} "
                f"(déficit del {diferencia*100:.0f}%). "
                f"Causas posibles: panel roto, batería agotada, cable cortado "
                f"o sombra total. Revisa visualmente el sistema."
            )
        elif diferencia >= self.UMBRAL_ADVERTENCIA:
            nivel = "advertencia"
            mensaje = (
                f"⚠️ ADVERTENCIA: Producción un {diferencia*100:.0f}% por debajo "
                f"de lo esperado ({produccion_real:.1f} vs {prediccion:.1f}). "
                f"Posibles causas: paneles sucios, sombra parcial o conexión floja. "
                f"Limpia los paneles y revisa cables."
            )
        else:
            nivel = "normal"
            mensaje = (
                f"✅ Sistema funcionando bien. Producción: {produccion_real:.1f} "
                f"(esperado ~{prediccion:.1f}). "
                f"Variación normal del {abs(diferencia)*100:.0f}%."
            )

        return {
            "prediccion":      round(prediccion, 3),
            "real":            round(produccion_real, 3),
            "diferencia_pct":  round(diferencia * 100, 1),
            "nivel":           nivel,
            "mensaje":         mensaje
        }

    def resumen_dia(self) -> str:
        """Genera un resumen de producción esperada para las próximas horas."""
        ahora = datetime.datetime.now()
        horas = []
        for h in range(ahora.hour, min(ahora.hour + 8, 24)):
            extras = {"hour": h}
            pred = float(self.modelo.predict(
                np.array([[h, ahora.day, ahora.month, ahora.weekday(),
                           0, 0, 0, 0, 0, 0, 0, 0, 0, 0]])
            )[0])
            horas.append(f"  {h:02d}:00 → {pred:.2f}")
        return "Producción estimada próximas horas:\n" + "\n".join(horas)


# ─────────────────────────────────────────────────────────────
# CAPA 2: DIAGNÓSTICO VISUAL (YOLOv8)
# ─────────────────────────────────────────────────────────────

class DiagnosticoVisual:
    """
    Usa YOLOv8 para analizar imágenes de paneles solares
    y detectar objetos/anomalías visibles.
    """

    # Mapeo de clases YOLO a descripciones amigables en español
    # (Ajustar según el fine-tune de tu modelo)
    CLASES_SOLAR = {
        "person":       "persona cerca del panel",
        "bird":         "pájaro o animal sobre el panel",
        "car":          "vehículo bloqueando la luz",
        # Clases personalizadas si se hizo fine-tune:
        "panel_roto":   "panel con grieta o daño físico",
        "panel_sucio":  "panel con suciedad o polvo",
        "panel_sombra": "panel con sombra",
        "cable_suelto": "cable desconectado",
        "panel_ok":     "panel en buen estado",
    }

    def __init__(self, model_path: str = "yolov8n.pt"):
        try:
            from ultralytics import YOLO
            print(f"[DiagnosticoVisual] Cargando YOLOv8: {model_path}")
            self.modelo = YOLO(model_path)
            self.disponible = True
            print("[DiagnosticoVisual] Listo")
        except ImportError:
            print("[DiagnosticoVisual] ultralytics no instalado — modo desactivado")
            self.modelo = None
            self.disponible = False
        except Exception as e:
            print(f"[DiagnosticoVisual] Error: {e} — modo desactivado")
            self.modelo = None
            self.disponible = False

    def analizar_imagen(self, imagen_path: str) -> dict:
        """
        Analiza una imagen y retorna diagnóstico en lenguaje natural.
        
        Args:
            imagen_path: Ruta local a la imagen (jpg, png, etc.)
        
        Returns:
            dict con: detecciones, nivel_alerta, mensaje, recomendaciones
        """
        if not self.disponible:
            return {
                "detecciones": [],
                "nivel_alerta": "no_disponible",
                "mensaje": (
                    "El módulo de visión artificial no está disponible. "
                    "Instala 'ultralytics' para activarlo: pip install ultralytics"
                ),
                "recomendaciones": []
            }

        if not os.path.exists(imagen_path):
            return {
                "detecciones": [],
                "nivel_alerta": "error",
                "mensaje": f"No se encontró la imagen: {imagen_path}",
                "recomendaciones": []
            }

        try:
            resultados = self.modelo(imagen_path, conf=0.25, verbose=False)
            detecciones = []

            for r in resultados:
                for box in r.boxes:
                    clase_id   = int(box.cls[0])
                    clase_nom  = self.modelo.names[clase_id]
                    confianza  = float(box.conf[0])
                    descripcion = self.CLASES_SOLAR.get(clase_nom, clase_nom)
                    detecciones.append({
                        "clase":      clase_nom,
                        "descripcion": descripcion,
                        "confianza":  round(confianza, 2),
                    })

            # Determinar nivel de alerta y mensaje
            clases_detectadas = [d["clase"] for d in detecciones]

            if "panel_roto" in clases_detectadas:
                nivel = "critico"
                mensaje = (
                    "🚨 Se detectó un panel con daño físico. "
                    "Es necesario reemplazarlo para evitar pérdidas de producción y riesgos eléctricos."
                )
                recs = [
                    "Apaga el sistema antes de manipular el panel dañado.",
                    "Toma fotos del daño para garantía o seguro.",
                    "Contacta un técnico solar para reemplazo."
                ]
            elif "panel_sucio" in clases_detectadas or "panel_sombra" in clases_detectadas:
                nivel = "advertencia"
                mensaje = (
                    "⚠️ Se detectó suciedad o sombra sobre los paneles. "
                    "Esto puede reducir la producción hasta un 30%."
                )
                recs = [
                    "Limpia los paneles con agua y trapo suave (sin jabón abrasivo).",
                    "Poda ramas o reubicar objetos que generen sombra.",
                    "Realiza limpieza cada 2-4 semanas en época seca."
                ]
            elif "cable_suelto" in clases_detectadas:
                nivel = "critico"
                mensaje = (
                    "🚨 Se detectó un cable desconectado. "
                    "Esto interrumpe el flujo de energía y puede ser peligroso."
                )
                recs = [
                    "Apaga el sistema antes de tocar los cables.",
                    "Verifica y asegura todas las conexiones con los conectores MC4.",
                    "Si el cable está pelado, reemplázalo."
                ]
            elif "panel_ok" in clases_detectadas or not detecciones:
                nivel = "normal"
                mensaje = (
                    "✅ Los paneles se ven en buen estado visualmente. "
                    "No se detectaron anomalías evidentes."
                )
                recs = ["Continúa con el mantenimiento preventivo regular."]
            else:
                nivel = "info"
                objetos = ", ".join(set(clases_detectadas))
                mensaje = (
                    f"ℹ️ Se detectaron los siguientes elementos en la imagen: {objetos}. "
                    f"Revisa que no interfieran con los paneles."
                )
                recs = ["Verifica manualmente que ningún objeto bloquee los paneles."]

            return {
                "detecciones":       detecciones,
                "nivel_alerta":      nivel,
                "mensaje":           mensaje,
                "recomendaciones":   recs
            }

        except Exception as e:
            return {
                "detecciones": [],
                "nivel_alerta": "error",
                "mensaje": f"Error al analizar imagen: {str(e)}",
                "recomendaciones": []
            }


# ─────────────────────────────────────────────────────────────
# CAPA 3: LLM CONVERSACIONAL (Gemini → GGUF → RAG → Fallback)
# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres Solaris, un asistente experto en energía solar para comunidades rurales \
de Colombia, especialmente Zonas No Interconectadas (ZNI).

Tu personalidad:
- Hablas como un técnico amigable que le explica a un campesino, sin términos complicados
- Siempre usas ejemplos concretos con costos en pesos colombianos (COP)
- Cuando aplica, menciona subsidios del programa FAZNI del IPSE
- Si recibes datos de sensores o imágenes, los incorporas en tu respuesta
- Das respuestas prácticas con pasos numerados cuando sea posible
- Nunca inventas datos: si no sabes algo, lo dices con honestidad
- Siempre respondes en español colombiano

Capacidades especiales:
- Puedes calcular cuántos paneles, baterías e inversores necesita una casa según su consumo
- Puedes estimar costos de instalación según el tamaño de la vivienda o los electrodomésticos
- Puedes diagnosticar problemas a partir de síntomas descritos por el usuario
- Conoces todos los subsidios y programas del IPSE para ZNI en Colombia 2025

Contexto de Colombia:
- Las zonas ZNI son más de 1700 localidades sin red eléctrica nacional
- El precio de la gasolina oscila entre $8.000 y $12.000 COP por galón en zonas remotas
- 1 kWh en zona ZNI con diésel cuesta entre $1.500 y $3.000 COP
- Horas pico solar promedio en Colombia: 4 a 5 horas diarias
- Irradiación promedio: 4.5 kWh/m²/día
"""


class AsistenteSolarGemini:
    """
    Motor LLM usando Google Gemini Flash via API.
    Es la capa de mayor prioridad: responde cualquier pregunta con contexto
    solar colombiano, calcula consumos, estima costos y da respuestas
    contextualizadas con datos de sensor o imágenes.
    """

    # Modelos en orden de preferencia (si uno tiene cuota agotada, prueba el siguiente)
    MODELOS = [
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-2.0-flash-lite",
        "models/gemini-flash-latest",
    ]

    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self.genai      = genai
        self.modelo     = None
        self.model_name = None

        for nombre in self.MODELOS:
            try:
                m = genai.GenerativeModel(nombre, system_instruction=SYSTEM_PROMPT)
                # Prueba rápida para verificar cuota
                m.generate_content("test")
                self.modelo     = m
                self.model_name = nombre
                print(f"[Gemini] ✅ Conectado — modelo {nombre}")
                break
            except Exception as e:
                err = str(e)
                if "quota" in err.lower() or "429" in err or "limit: 0" in err:
                    print(f"[Gemini] ⚠️  {nombre} sin cuota — probando siguiente...")
                    continue
                if "404" in err or "not found" in err.lower():
                    continue
                # Error distinto (auth, red) → lanzar
                raise

        if self.modelo is None:
            raise RuntimeError("Todos los modelos Gemini tienen cuota agotada.")

    def _build_content(self, pregunta: str, contexto_extra: str) -> str:
        if contexto_extra:
            return (
                f"[CONTEXTO DEL SISTEMA SOLAR DEL USUARIO]\n{contexto_extra}\n\n"
                f"[PREGUNTA DEL USUARIO]\n{pregunta}"
            )
        return pregunta

    def responder(self, pregunta: str, historial: list = None, contexto_extra: str = "") -> str:
        contenido = self._build_content(pregunta, contexto_extra)

        # Construir historial en formato Gemini
        chat_history = []
        if historial:
            for msg in historial[-8:]:
                role = "user" if msg["role"] == "user" else "model"
                chat_history.append({"role": role, "parts": [{"text": msg["content"]}]})

        # Intentar con el modelo activo; si falla por cuota, rotar al siguiente
        modelos_a_intentar = [self.model_name] + [
            m for m in self.MODELOS if m != self.model_name
        ]

        for nombre in modelos_a_intentar:
            try:
                modelo_actual = self.genai.GenerativeModel(
                    nombre, system_instruction=SYSTEM_PROMPT
                )
                chat      = modelo_actual.start_chat(history=chat_history)
                respuesta = chat.send_message(contenido)
                if nombre != self.model_name:
                    self.model_name = nombre  # actualizar modelo activo
                    self.modelo     = modelo_actual
                return respuesta.text
            except Exception as e:
                err = str(e)
                if "quota" in err.lower() or "429" in err or "limit: 0" in err:
                    continue   # probar siguiente modelo
                if "API_KEY" in err or "INVALID_ARGUMENT" in err.upper():
                    raise RuntimeError("API key de Gemini inválida.")
                raise  # error inesperado, propagar


class AsistenteSolarGGUF:
    """Usa modelo Llama en formato GGUF ejecutado localmente via llama-cpp-python."""

    def __init__(self, model_path: str = "asistente_solar.gguf"):
        from llama_cpp import Llama
        print(f"[GGUF] Cargando modelo: {model_path}")
        self.llm = Llama(
            model_path=model_path,
            n_ctx=2048,
            n_threads=os.cpu_count() or 4,
            n_gpu_layers=0,
            verbose=False,
        )
        print("[GGUF] Modelo cargado")

    def responder(self, pregunta: str, historial: list = None, contexto_extra: str = "") -> str:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if historial:
            messages.extend(historial[-6:])
        contenido = pregunta
        if contexto_extra:
            contenido = f"{contexto_extra}\n\nPregunta del usuario: {pregunta}"
        messages.append({"role": "user", "content": contenido})
        try:
            resp = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=512,
                temperature=0.7,
                top_p=0.9,
            )
            return resp["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Error al generar respuesta: {e}"


class AsistenteSolarRAG:
    """Usa ChromaDB + embeddings multilingues para recuperación aumentada."""

    def __init__(self, db_path: str = "./solar_db"):
        import chromadb
        from chromadb.utils import embedding_functions
        print(f"[RAG] Cargando base vectorial: {db_path}")
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        client = chromadb.PersistentClient(path=db_path)
        self.collection = client.get_or_create_collection(
            name="manuales_solares",
            embedding_function=ef
        )
        print(f"[RAG] Base cargada: {self.collection.count()} documentos")

    def responder(self, pregunta: str, historial: list = None, contexto_extra: str = "") -> str:
        try:
            resultados = self.collection.query(
                query_texts=[pregunta],
                n_results=3
            )
            contexto = "\n".join(resultados["documents"][0])
            if contexto_extra:
                contexto = f"{contexto_extra}\n\n{contexto}"
            return (
                f"Según la información técnica disponible:\n\n"
                f"{contexto}\n\n"
                f"¿Necesitas que explique alguno de estos puntos con más detalle?"
            )
        except Exception as e:
            return f"Error al consultar base de datos: {e}"


class AsistenteSolarFallback:
    """
    Base de conocimiento completa para comunidades rurales ZNI de Colombia.
    30 preguntas organizadas en 6 bloques temáticos con búsqueda por
    similitud de palabras clave (sin dependencias externas).
    """

    # ── Base de conocimiento: (palabras_clave, respuesta) ──────────
    BASE_CONOCIMIENTO = [

        # ══════════════════════════════════════════════════════
        # BLOQUE 1: Conceptos básicos y beneficios
        # ══════════════════════════════════════════════════════
        (
            ["qué es energía solar", "cómo da luz", "cómo funciona solar", "qué es solar",
             "energía solar", "cómo me da luz"],
            "☀️ La energía solar funciona así: los paneles en el techo capturan la luz del sol y la convierten en corriente eléctrica (como pilas gigantes del sol). Esa corriente carga una batería durante el día. De noche, la batería le da electricidad a tus bombillos, televisor y celular. Es como tener una planta eléctrica, pero gratis y sin gasolina. Un kit básico para una casa rural tiene: 1 panel de 200W, 1 batería de 100Ah, 1 regulador y 4-6 bombillos LED."
        ),
        (
            ["mejor que gasolina", "planta de gasolina", "planta eléctrica", "por qué solar",
             "ventajas solar", "mejor solar"],
            "⚡ Comparemos con honestidad:\n\n🔴 Planta de gasolina:\n• Gasta entre $80.000 y $150.000 en combustible al mes\n• Hace ruido, contamina y falla seguido\n• Solo funciona cuando la prende\n• Dura 3-5 años con buen mantenimiento\n\n🟢 Sistema solar:\n• Después de instalarlo, la luz es GRATIS\n• No hace ruido, no contamina\n• Funciona solo, día y noche\n• Los paneles duran 25 años o más\n• El IPSE da subsidios de hasta el 80% para zonas ZNI\n\nEn 12 a 24 meses el solar se paga solo con lo que ahorra en gasolina."
        ),
        (
            ["nublado", "llueve", "día nublado", "nubes", "lluvia", "mal tiempo", "cloudy"],
            "🌥️ ¡Buena pregunta! Los paneles SÍ funcionan cuando está nublado, pero producen menos:\n\n• Día soleado → 100% de producción\n• Día nublado → entre 25% y 40% de producción\n• Lluvia fuerte → 10% a 20% (pero la lluvia limpia los paneles, eso es bueno)\n\nPor eso las baterías son tan importantes: almacenan la energía de los días buenos para usarla en los días malos. Un sistema bien calculado tiene batería para 2 o 3 días sin sol. En Colombia tenemos suerte: la mayoría de zonas rurales tienen entre 4 y 5 horas de sol fuerte al día."
        ),
        (
            ["toda la noche", "luz de noche", "noche", "oscuridad", "después del sol"],
            "🌙 Sí, puedes tener luz toda la noche, pero depende del tamaño de tu batería y cuánto consumes.\n\nEjemplo real para una casa básica:\n• 4 bombillos LED de 10W encendidos 6 horas = 240Wh\n• Una batería de 100Ah a 12V almacena 1.200Wh (usable: 600Wh)\n• Eso alcanza para 2 noches sin sol\n\nConsejos para que dure más la noche:\n✅ Usa bombillos LED (consumen 80% menos que los normales)\n✅ Apaga lo que no usas\n✅ No cargues el celular toda la noche conectado\n✅ El televisor consuma más que 3 bombillos juntos"
        ),
        (
            ["cuántos años", "duración paneles", "cuánto duran", "vida útil", "años dura"],
            "📅 Vida útil de cada componente:\n\n☀️ Paneles solares: 25 a 30 años (garantía de fábrica suele ser 10-12 años para el 90% de rendimiento)\n🔋 Batería de plomo-ácido: 3 a 5 años si la cuidas bien\n🔋 Batería de litio (LiFePO4): 10 a 15 años (más cara pero dura más)\n⚙️ Regulador de carga: 10 a 15 años\n🔌 Inversor: 10 a 12 años\n📌 Cables y estructuras: 20+ años\n\nEl secreto para que todo dure más:\n• No descargar la batería por debajo del 50%\n• Limpiar los paneles cada 2-4 semanas\n• Revisar que los cables no estén pelados ni sueltos"
        ),

        # ══════════════════════════════════════════════════════
        # BLOQUE 2: Conociendo los equipos (componentes)
        # ══════════════════════════════════════════════════════
        (
            ["para qué sirve el panel", "qué hace el panel", "panel del techo", "para qué panel"],
            "🌞 El panel solar (también llamado módulo fotovoltaico) es el corazón del sistema.\n\nCómo funciona:\n• Dentro tiene cientos de celdas de silicio (un material especial)\n• Cuando la luz del sol toca esas celdas, generan electricidad directamente\n• Es como una batería que se carga con luz, pero en vez de guardar energía, la produce al momento\n\nDatos importantes:\n• Un panel de 200W en un día soleado produce entre 0.8 y 1.2 kWh\n• No se deben pisar, golpear ni limpiar con objetos duros\n• Si tiene una sola celda rota, puede bajar la producción de todo el panel\n• Orientar siempre hacia el norte en Colombia, inclinado 10-15 grados"
        ),
        (
            ["para qué sirve la batería", "qué hace la batería", "batería pesada", "batería solar", "por qué pesada"],
            "🔋 La batería es el 'tanque de gasolina' de tu sistema solar.\n\nSu función es simple pero vital:\n• Durante el día el panel carga la batería\n• Durante la noche (o cuando hay nubes) la batería da electricidad\n• Sin batería, solo tendrías luz cuando brilla el sol\n\n¿Por qué es tan pesada?\n• Las baterías de plomo-ácido llevan placas de plomo bañadas en ácido sulfúrico\n• Una batería de 100Ah puede pesar 25-30 kilos\n• Ese peso es normal y es señal de que tiene suficiente material para almacenar energía\n\n⚠️ Cuidado: no dejes caer la batería, no fumes cerca, no la tapes con trapos."
        ),
        (
            ["regulador", "cajita con luces", "controlador", "caja del panel", "luces de colores"],
            "⚙️ El regulador de carga (o controlador) es el 'cerebro' del sistema.\n\nQué hace:\n• Controla cuánta electricidad entra del panel a la batería\n• Protege la batería de sobrecargarse (lo que la dañaría)\n• Protege la batería de descargarse demasiado\n• Muestra el estado de la batería con luces de colores\n\nSignificado de las luces más comunes:\n🟢 Verde = batería bien cargada (80-100%)\n🟡 Amarillo/Naranja = carga media (40-80%)\n🔴 Rojo = batería baja (menos del 40%) → apaga cosas\n🔴 Rojo parpadeando = batería muy baja, el sistema se apagará solo para protegerla\n\nEs normal que las luces cambien durante el día."
        ),
        (
            ["para qué sirve el inversor", "qué es inversor", "enchufe normal", "corriente alterna", "aparato enchufe", "qué hace inversor"],
            "🔌 El inversor convierte la electricidad del sistema solar para que la puedas usar en enchufes normales.\n\nPor qué lo necesitas:\n• Los paneles y baterías dan corriente continua (DC) de 12V o 24V\n• Tus electrodomésticos (nevera, TV, licuadora) necesitan corriente alterna (AC) de 110V\n• El inversor hace esa conversión\n\nTipos de inversores:\n🟡 Onda modificada: más barato ($150.000-$400.000), sirve para bombillos y TV\n🟢 Onda sinusoidal pura: más caro ($400.000-$1.200.000), necesario para nevera, motobomba, licuadora y equipos con motor\n\n⚠️ Si conectas una nevera a un inversor de onda modificada, el motor se daña."
        ),
        (
            ["batería de carro", "batería usada", "batería vieja", "batería automotriz", "carro"],
            "🚫 ¡NO uses una batería de carro en tu sistema solar! Aunque parezca lo mismo, son muy diferentes:\n\n❌ Batería de carro (arranque):\n• Está diseñada para dar mucha energía en 2-3 segundos (para arrancar el motor)\n• Si la descargas más del 20%, se daña permanentemente\n• En un sistema solar se descarga profundo cada día → se daña en 3-6 meses\n• Es un desperdicio de dinero\n\n✅ Batería solar (ciclo profundo):\n• Diseñada para cargarse y descargarse completamente todos los días\n• Aguanta 500-1000 ciclos de descarga profunda\n• Es más gruesa y más pesada que la de carro\n• La palabra clave es 'ciclo profundo' o 'deep cycle'\n\nUna batería solar correcta dura 3-5 años. Una de carro en sistema solar: 3-6 meses."
        ),

        # ══════════════════════════════════════════════════════
        # BLOQUE 3: Instalación y montaje
        # ══════════════════════════════════════════════════════
        (
            ["para qué lado", "dirección panel", "norte", "orientar panel", "mirar panel", "hacia dónde"],
            "🧭 En Colombia los paneles SIEMPRE deben mirar hacia el NORTE geográfico.\n\n¿Por qué el norte?\n• Colombia está en el hemisferio norte (cerca del ecuador)\n• El sol se mueve de este a oeste pasando por el sur\n• Si el panel mira al norte, 've' el sol durante más horas al día\n\nÁngulo de inclinación recomendado:\n• Entre 5° y 15° hacia abajo desde la horizontal\n• En zonas cerca del ecuador (Amazonas, Chocó): 5°\n• En zonas más altas (Boyacá, Nariño): 10-15°\n\n🛑 Errores comunes:\n• Panel mirando al sur → pierde hasta el 40% de producción\n• Panel completamente horizontal → acumula agua y polvo\n• Panel inclinado más de 30° → muy poca producción en días nublados"
        ),
        (
            ["sombra árbol", "sombra en panel", "sombra parcial", "esquinita sombra", "árbol"],
            "⚠️ Una sombra pequeña puede ser un gran problema. Aquí el efecto que causa:\n\nSi una esquinita del panel está tapada:\n• Esa celda bloqueada actúa como 'freno' de todo el circuito\n• Puede reducir la producción del PANEL COMPLETO hasta un 50-80%\n• No es proporcional a la sombra: el 5% de sombra puede causar el 50% de pérdida\n\n¿Por qué pasa esto?\n• Las celdas van conectadas en serie (como bombillos navideños viejos)\n• Si uno falla, todos bajan\n\nSoluciones:\n✅ Pode los árboles que puedan dar sombra\n✅ Mueve la estructura si es posible\n✅ Instala optimizadores de potencia (más costoso pero soluciona el problema)\n✅ Programa las revisiones de sombra: los árboles crecen"
        ),
        (
            ["cómo conectar cables", "corto circuito", "cables conexión", "no causar corto", "cómo cablear"],
            "🔧 Reglas de oro para conectar cables sin causar cortocircuito:\n\n1️⃣ Primero desconecta todo antes de trabajar\n2️⃣ Usa los colores correctos: ROJO = positivo (+), NEGRO/AZUL = negativo (−)\n3️⃣ Cable mínimo desde panel hasta regulador: calibre 10 AWG (o 6mm²)\n4️⃣ Nunca conectes el positivo con el negativo directamente (eso es un corto)\n5️⃣ El orden correcto de conexión es:\n   → Primero batería al regulador\n   → Luego panel al regulador\n   → Por último las cargas (bombillos, inversor)\n6️⃣ Usa terminales (conectores) crimpeados, no cables pelados enredados\n7️⃣ Asegura todos los tornillos: un cable flojo chispea y puede causar incendio\n\n⚠️ Si no tienes experiencia con electricidad, pide ayuda a alguien que sepa."
        ),
        (
            ["techo o suelo", "estructura suelo", "dónde poner paneles", "montaje suelo", "mejor poner"],
            "🏠 ¿Techo o estructura en suelo? Depende de tu situación:\n\n🏠 En el TECHO:\n✅ Aprovecha espacio que de todas formas no usas\n✅ Fuera del alcance de animales y niños\n✅ Menos cables necesitas\n❌ Más difícil de limpiar y revisar\n❌ El calor del techo reduce un poco la producción\n\n🌿 En el SUELO (estructura):\n✅ Más fácil de limpiar y mantener\n✅ Puedes inclinar al ángulo perfecto\n✅ Más fácil de revisar problemas\n❌ Puede ser tocado por niños, animales o ladrones\n❌ Necesitas más cable\n\nRecomendación para zonas rurales:\n→ Techo si es firme (concreto o zinc grueso)\n→ Suelo si el techo es muy inclinado o de paja\n→ En cualquier caso, asegura bien los paneles para que el viento no los vuele"
        ),
        (
            ["herramientas", "qué necesito instalar", "herramientas instalar", "kit herramientas"],
            "🔨 Herramientas básicas para instalar un kit solar:\n\n✅ Destornilladores (pala y estrella)\n✅ Alicates y pinzas\n✅ Cutter para pelar cables\n✅ Llave de tuercas\n✅ Taladro (si el techo es concreto)\n✅ Multímetro (voltímetro) — muy importante para verificar conexiones\n✅ Cinta aislante de buena calidad\n✅ Conectores MC4 y crimpadora (para los cables del panel)\n✅ Cinta de amarre (zunchos)\n\nMateriales adicionales:\n• Rieles de aluminio (para sujetar los paneles)\n• Pernos y tornillos inoxidables (el zinc normal se oxida)\n• Tubo conduit o canaleta para proteger los cables\n\nHerramienta más importante y que más se olvida: 📏 Un multímetro de $20.000 puede salvar tu instalación."
        ),

        # ══════════════════════════════════════════════════════
        # BLOQUE 4: ¿Qué puedo conectar?
        # ══════════════════════════════════════════════════════
        (
            ["nevera", "refrigerador", "conectar nevera"],
            "🌡️ Conectar una nevera es posible pero requiere cuidado:\n\n⚠️ La nevera es el electrodoméstico que más consume energía del sistema solar.\n\nDatos reales:\n• Una nevera normal de 200-300 litros consume entre 100W y 150W cuando el motor está encendido\n• El motor arranca varias veces al día y pide un pico de 3-5 veces su consumo normal\n• En un día puede gastar 0.8 a 1.5 kWh\n\n¿Qué necesitas para una nevera?\n☀️ Mínimo 4 paneles de 200W (800W total)\n🔋 Batería de 200Ah o más (mejor 2 de 100Ah en paralelo)\n🔌 Inversor de onda SINUSOIDAL PURA de mínimo 1500W\n\n💡 Consejo: Las neveras de 12V DC para camping consumen 4 veces menos y no necesitan inversor. Cuestan más pero son la mejor opción para sistemas pequeños."
        ),
        (
            ["cuántos bombillos", "bombillos", "cuántas luces", "lámparas", "luces noche"],
            "💡 Calculemos juntos cuántos bombillos puedes tener:\n\nPrimero: ¿qué tipo de bombillo?\n• LED de 10W: muy recomendado, consume poquísimo y da buena luz\n• LED de 5W: perfecto para cuartos pequeños\n• Bombillo corriente (incandescente) de 60W: ¡evítalos! consumen 6 veces más\n\nEjemplo con sistema básico (panel 200W + batería 100Ah):\n• 4 bombillos LED de 10W = 40W total\n• 6 horas de noche = 240Wh consumidos\n• La batería tiene 600Wh usables → alcanza para 2 noches y media\n\nRegla práctica:\n→ Batería de 100Ah → 4 a 6 bombillos LED toda la noche\n→ Batería de 200Ah → 8 a 12 bombillos LED toda la noche\n\n⚡ Siempre usa LED. Con el mismo sistema solar puedes tener el doble de luz."
        ),
        (
            ["plancha", "licuadora", "electrodomésticos grandes", "puedo usar plancha"],
            "⚡ Plancha y licuadora consumen MUCHA energía. Veamos la realidad:\n\nConsumos:\n🔴 Plancha: 1.000W a 2.000W → descarga la batería en 30 minutos\n🟡 Licuadora: 300W a 600W → consume bastante pero usualmente se usa poco tiempo\n🟡 Olla eléctrica: 1.000W → muy pesada para el sistema\n\n¿Se puede?\n• Con un sistema GRANDE (4+ paneles, batería 200Ah, inversor 2000W): usar la licuadora poco tiempo sí es posible\n• La plancha: EVITAR en sistemas pequeños, consume como tener 100 bombillos LED encendidos\n\n💡 Alternativas rurales inteligentes:\n• Para planchar: usa plancha de carbón o plancha a gas\n• Para cocinar: estufa de gas o leña\n• Para licuar: hazlo durante el día cuando el panel está produciendo directamente"
        ),
        (
            ["televisor", "tv", "cuánto gasta televisor", "televisión"],
            "📺 El televisor es uno de los más consultados. Buenos datos:\n\nConsumo por tipo:\n• TV LED 32 pulgadas: 40W a 60W (es el más común en zonas rurales)\n• TV LED 42 pulgadas: 60W a 80W\n• TV CRT (de tubo, los viejos): 80W a 120W ← cámbialos si puedes\n• Decodificador de señal: 8W a 15W adicionales\n\nEjemplo real:\nTV 32\" (50W) + decodificador (10W) = 60W\n4 horas de televisión al día = 240Wh\n\nCon batería de 100Ah (600Wh usables):\n• TV 4 horas + 4 bombillos LED 6 horas = 480Wh → alcanza bien ✅\n\n💡 Consejo: Apaga el TV del tomacorriente, no lo dejes en standby. El standby gasta 5-15W permanentemente, que en un mes suman bastante."
        ),
        (
            ["gastando carga", "cómo sé si", "batería descargando", "carga rápido", "nivel batería"],
            "📊 Formas de saber si estás gastando demasiado rápido:\n\n1️⃣ Mira el regulador de carga:\n• Luz verde → bien, tienes carga suficiente\n• Luz amarilla → moderado, reduce el consumo\n• Luz roja → bajo, apaga cosas no esenciales ya\n\n2️⃣ Señales de que gastas demasiado:\n• Las luces se ven amarillas o temblorosas (voltaje bajo)\n• El inversor pita o se apaga solo\n• La batería se carga en el día pero se acaba antes de media noche\n\n3️⃣ Usa un multímetro:\n• Batería 12V llena = 12.7V\n• Batería 12V al 50% = 12.0V (límite seguro)\n• Batería 12V peligrosa = 11.8V o menos\n\n4️⃣ Regla simple:\n→ Si al anochecer el regulador está en verde, tienes buena carga\n→ Si ya está en amarillo al oscurecer, reduce lo que conectas de noche"
        ),

        # ══════════════════════════════════════════════════════
        # BLOQUE 5: Mantenimiento
        # ══════════════════════════════════════════════════════
        (
            ["cómo limpiar paneles", "limpiar paneles", "polvo panel", "basura panel", "cómo se limpian"],
            "🧹 Limpiar los paneles es sencillo pero hay reglas importantes:\n\nLo que SÍ debes hacer:\n✅ Usa agua limpia y un trapo suave o esponja sin rayar\n✅ Hazlo temprano en la mañana o al atardecer (cuando el panel está frío)\n✅ Moja bien el panel primero para ablandar la suciedad\n✅ Limpia con movimientos suaves de arriba hacia abajo\n✅ Enjuaga bien sin dejar jabón\n\nLo que NO debes hacer:\n❌ No uses jabón abrasivo ni detergente fuerte (daña la cubierta de vidrio)\n❌ No limpies con el panel caliente (puede agrietarse por el choque térmico)\n❌ No uses escoba, cepillo duro ni estropajo de metal\n❌ No pises el panel para alcanzarlo\n\n💧 Truco: en época de lluvias la lluvia los limpia sola. En verano (época seca), limpia cada 2 semanas."
        ),
        (
            ["cada cuánto limpiar", "cada cuánto subir", "frecuencia limpieza", "cuándo limpiar"],
            "📅 Calendario de mantenimiento recomendado:\n\n🗓️ Cada 2 semanas (época seca):\n• Limpiar los paneles con agua y trapo suave\n• Revisar visualmente que no haya sombras nuevas de árboles\n\n🗓️ Cada mes:\n• Revisar que todos los cables estén bien sujetos y sin pelarse\n• Limpiar los bornes de la batería (el polvo blanco que sale se quita con un cepillo seco)\n• Verificar que el regulador esté mostrando colores normales\n\n🗓️ Cada 3 meses (batería de plomo-ácido):\n• Revisar nivel de agua destilada en las celdas (si la batería lo permite)\n• Agregar agua destilada si está por debajo de la línea mínima\n• Nunca usar agua del río ni agua potable del acueducto\n\n🗓️ Una vez al año:\n• Revisar toda la instalación con alguien que sepa de electricidad"
        ),
        (
            ["batería agua de lluvia", "agua en batería", "lluvia batería", "mojar batería"],
            "🌧️ El agua de lluvia no debe tocar la batería. Así de importante:\n\n⚠️ Riesgos si la batería se moja:\n• El agua conduce electricidad → puede causar cortocircuito\n• La humedad oxida los bornes → aumenta la resistencia y baja el rendimiento\n• Si entra agua dentro de la batería → daño permanente\n• En el peor caso: chispa, incendio o explosión\n\nCómo proteger la batería:\n✅ Instálala en un lugar techado y ventilado (no en cajón cerrado sin aire)\n✅ Usa una caja de baterías con tapa\n✅ Si está al aire libre, cúbrela con una caja plástica con huecos de ventilación abajo\n✅ Los cables de conexión deben entrar por abajo, no por arriba\n\n💨 Importante: la batería necesita ventilación. Si la tapas completamente puede acumular gas hidrógeno, que es inflamable."
        ),
        (
            ["cómo sé si batería dañada", "batería dañándose", "batería mala", "batería vieja daño"],
            "🔋 Señales de que tu batería está empezando a dañarse:\n\n🔴 Señales claras de daño:\n• Se descarga muy rápido (antes duraba toda la noche, ahora 2-3 horas)\n• Los bornes tienen mucho polvo blanco o verde (sulfatación)\n• Está hinchada, deformada o tiene fisuras (PELIGROSO)\n• Está muy caliente al tacto aunque no haya estado cargando\n• Huele a azufre (huevo podrido) de forma persistente\n\n🟡 Señales de advertencia:\n• El regulador siempre muestra bajo aunque sea mediodía con sol\n• Los bombillos parpadean más de lo normal\n• El inversor pita aunque la batería supuestamente esté cargada\n\n📏 Prueba con multímetro:\n• Si al mediodía (con sol) el voltaje es menos de 12.4V → batería muy débil\n• Si totalmente cargada solo llega a 12.2V → batería casi muerta\n\n⏰ Recuerda: batería de plomo-ácido dura 3-5 años. Si ya tiene 4 años, planea reemplazarla."
        ),
        (
            ["cable pelado", "chispas", "cable echando chispas", "cable quemado"],
            "🚨 ¡Un cable pelado o con chispas es una EMERGENCIA! Sigue estos pasos:\n\nACCIÓN INMEDIATA:\n1️⃣ Desconecta todo: apaga el regulador e interruptores\n2️⃣ NO toques el cable con las manos descubiertas\n3️⃣ Si hay fuego: usa arena o polvo químico, NUNCA agua\n4️⃣ Ventila bien el área (puede haber gas de batería)\n5️⃣ No vuelvas a encender nada hasta reparar el cable\n\nCómo reparar el cable:\n• Si solo está pelado: cubre bien con cinta aislante de buena calidad (3 capas)\n• Si está quemado o cortado: reemplaza todo el tramo de cable\n• No empalmes cables solares con cables de extensión doméstica\n• Usa cable de la misma sección (grosor) o más grueso\n\n⚠️ Un cable incorrecto causa incendios. Este es el mantenimiento más importante de todos."
        ),

        # ══════════════════════════════════════════════════════
        # BLOQUE 6: Solución de problemas (emergencias)
        # ══════════════════════════════════════════════════════
        (
            ["no prendieron bombillos", "hoy no prende", "por qué no enciende", "ayer hizo sol y hoy no"],
            "🔍 Si ayer hizo sol y hoy no prende nada, revisa esto en orden:\n\n1️⃣ ¿El regulador tiene luz?\n   → No tiene luz: el fusible del regulador puede estar quemado\n   → Tiene luz roja: batería descargada completamente\n\n2️⃣ ¿Está el interruptor general encendido?\n   → A veces alguien lo apaga sin darse cuenta\n\n3️⃣ Revisa los cables del panel:\n   → ¿Están bien conectados al regulador?\n   → ¿Hay alguno suelto o con señales de quemado?\n\n4️⃣ Revisa si los bornes de la batería están bien apretados\n   → Afloja y vuelve a apretar si hay polvo blanco\n\n5️⃣ Mide el voltaje de la batería con multímetro:\n   → Si está por debajo de 10.5V: batería sulfatada o muerta\n   → Si está bien: el problema es en el cableado o el regulador\n\n6️⃣ ¿Los paneles están sucios o con sombra?\n   → Limpia y revisa sombras de árboles que puedan haber crecido"
        ),
        (
            ["luz roja regulador", "regulador luz roja", "indicador rojo", "alarma regulador"],
            "🔴 La luz ROJA en el regulador tiene varios significados según cómo parpadea:\n\n🔴 Roja fija (no parpadea):\n• Batería en nivel bajo (menos del 40%)\n• Solución: espera que el sol cargue la batería, reduce consumo\n\n🔴 Roja parpadeando lento:\n• Batería muy baja, el sistema cortará la energía pronto para proteger la batería\n• Solución: apaga todo lo que no sea esencial, el regulador está protegiendo la batería\n\n🔴 Roja parpadeando rápido:\n• Puede indicar falla en el panel (no está llegando carga)\n• O que la batería está dañada y no acepta carga\n• Revisa que el cable del panel esté bien conectado\n\n🔴 Roja permanente con el sol brillando:\n• El panel puede estar mal conectado o la batería está en cortocircuito interno\n• Requiere revisión técnica\n\n📖 Consulta el manual de tu regulador: cada marca tiene sus propios códigos de color."
        ),
        (
            ["inversor pita", "pitido inversor", "inversor hace ruido", "alarma inversor", "pitido fuerte"],
            "🔊 El pitido del inversor es una alarma. El patrón del pitido te dice qué pasa:\n\n🟡 Un pitido corto cada pocos segundos:\n• Batería en nivel bajo (menos del 20%)\n• Solución: reduce la carga, deja que el sol cargue durante el día\n\n🔴 Pitido continuo o muy frecuente:\n• Batería críticamente baja → el inversor se va a apagar solo para proteger la batería\n• O hay sobrecarga: estás conectando más de lo que el inversor aguanta\n\n🔴 Pitido con el inversor apagado:\n• Temperatura muy alta (el inversor se sobrecalentó)\n• Ponlo en un lugar con más ventilación, lejos de paredes\n\n🔴 Pitidos en código (varios cortos seguidos de largos):\n• Consulta el manual, es un código de error específico\n\n✅ Solución más común: apaga el inversor 10 minutos, revisa la batería y vuelve a encender con menos carga conectada."
        ),
        (
            ["cables calientes", "panel cable caliente", "cable temperatura", "calor cables"],
            "🌡️ ¡Cables calientes al tacto es señal de PELIGRO! Actúa de inmediato:\n\n⚠️ ¿Por qué se calientan los cables?\n• El cable es muy delgado para la corriente que pasa (calibre equivocado)\n• Hay una conexión floja o con óxido que genera resistencia\n• Hay un cortocircuito parcial (un punto donde + y − casi se tocan)\n\n🚨 Nivel de peligro por temperatura:\n• Tibio (puedes mantener la mano): precaución, revisa\n• Caliente (no puedes mantener la mano 5 segundos): desconecta ya\n• Huele a quemado o hay decoloración: emergencia total\n\nAcción inmediata:\n1️⃣ Desconecta el sistema\n2️⃣ Busca el punto caliente siguiendo el cable\n3️⃣ Revisa todos los terminales y bornes de ese cable\n4️⃣ Si el cable está deformado o quemado, reemplázalo completo\n5️⃣ Verifica que el calibre sea correcto:\n   • Panel a regulador: mínimo calibre 10 AWG (6mm²)\n   • Regulador a batería: mínimo calibre 8 AWG (10mm²)"
        ),
        (
            ["a quién avisar", "nada funciona", "qué revisar si no funciona", "todo apagado", "emergencia solar"],
            "🆘 Si absolutamente nada funciona, sigue este protocolo paso a paso:\n\nPASO 1 — Seguridad primero:\n• No toques cables si hay agua o humedad cerca\n• Si hueles a quemado, abre ventanas y sal del área\n\nPASO 2 — Revisión básica (5 minutos):\n□ ¿Está el interruptor principal encendido?\n□ ¿El regulador tiene alguna luz?\n□ ¿Los cables del panel al regulador están conectados?\n□ ¿Los cables de batería al regulador están conectados?\n□ ¿Hay algún fusible quemado (si el sistema tiene)?\n\nPASO 3 — Mide con multímetro:\n□ Voltaje en bornes de la batería (debe ser > 11V)\n□ Voltaje saliendo del panel (debe ser > 17V con sol)\n\nPASO 4 — A quién llamar:\n📞 IPSE (Instituto de Planificación y Promoción de Soluciones Energéticas):\n   Línea gratuita nacional: 01 8000 514 440\n📞 Programa FAZNI: registra tu caso para asistencia técnica\n📞 Alcaldía de tu municipio: puede tener técnicos del programa ZNI\n📞 El proveedor que instaló el sistema (guarda siempre su número)"
        ),

        # ══════════════════════════════════════════════════════
        # RESPUESTAS EXTRA (subsidios, costos, ZNI, FAZNI)
        # ══════════════════════════════════════════════════════
        (
            ["subsidio", "ipse", "fazni", "programa gobierno", "ayuda gobierno", "apoyo económico"],
            "🏛️ Subsidios disponibles para energía solar en Colombia:\n\nPrograma FAZNI (Fondo de Apoyo para la Energía No Interconectada):\n• Subsidia hasta el 80% del costo total de instalación\n• Para comunidades en Zonas No Interconectadas (ZNI)\n• Incluye paneles, baterías, regulador, inversor e instalación\n\n¿Quién puede aplicar?\n• Comunidades en municipios clasificados como ZNI\n• Familias de estratos 1 y 2 en zonas rurales aisladas\n• Comunidades indígenas y afrocolombianas\n\nCómo aplicar:\n1️⃣ Llama al IPSE: 01 8000 514 440 (línea gratuita)\n2️⃣ Contacta la Alcaldía de tu municipio\n3️⃣ El IPSE hace visita técnica para verificar la necesidad\n\nOtros programas:\n• Colombia Rural (MinAgricultura): subsidios para sistemas agropecuarios\n• PAZ (Programa de Acceso a la Energía): para comunidades en proceso de paz"
        ),
        (
            ["costo", "precio", "cuánto cuesta", "cuánto vale", "millones", "inversión"],
            "💰 Costos reales de sistemas solares en Colombia (2025):\n\nKit básico (1-2 cuartos + bombillos + celular):\n• 1 panel 200W + batería 100Ah + regulador + inversor 500W\n• Costo: entre $1.800.000 y $2.500.000 COP\n• Con subsidio FAZNI (80%): pagas solo $360.000 - $500.000\n\nKit familiar completo (casa típica rural):\n• 2 paneles 200W + 2 baterías 100Ah + regulador + inversor 1500W\n• Costo: entre $4.000.000 y $6.000.000 COP\n• Con subsidio FAZNI (80%): pagas solo $800.000 - $1.200.000\n\nKit premium (nevera + TV + cargas grandes):\n• 4 paneles 300W + batería 200Ah + inversor 3000W onda pura\n• Costo: entre $8.000.000 y $14.000.000 COP\n\nRetorno de inversión sin subsidio:\n• Ahorro vs planta diésel: $80.000 - $150.000/mes\n• Se paga solo en 12 a 24 meses"
        ),
        (
            ["zona no interconectada", "zni", "qué es zni", "zonas sin luz", "sin red eléctrica"],
            "🗺️ Las Zonas No Interconectadas (ZNI) en Colombia:\n\n¿Qué son?\nSon zonas del país que NO están conectadas al Sistema Interconectado Nacional (SIN), la red eléctrica principal de Colombia.\n\nDatos importantes:\n• Más de 1.700 localidades son ZNI en Colombia\n• Aproximadamente 1.900.000 colombianos viven en zonas ZNI\n• Se concentran en: Chocó, Amazonas, Vaupés, Guainía, Vichada, San Andrés, zonas costeras del Pacífico y Caribe\n\nSituación actual:\n• Muchas dependen de plantas diésel comunitarias (costosas y contaminantes)\n• Otras no tienen electricidad en absoluto\n• La energía solar es la solución más viable técnica y económicamente\n\nEl IPSE (Instituto de Planificación y Promoción de Soluciones Energéticas para las Zonas No Interconectadas) es la entidad del gobierno encargada de llevar energía a estas zonas a través del programa FAZNI."
        ),
    ]

    def _puntaje_similitud(self, pregunta: str, palabras_clave: list) -> int:
        """
        Calcula cuántas palabras clave de la lista aparecen en la pregunta.
        Retorna el puntaje más alto posible entre todas las claves de la lista.
        """
        p = pregunta.lower()
        # Normalizar caracteres con tilde
        for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u'),('ñ','n')]:
            p = p.replace(a, b)

        mejor = 0
        for clave in palabras_clave:
            c = clave.lower()
            for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u'),('ñ','n')]:
                c = c.replace(a, b)
            # Coincidencia exacta de la frase clave
            if c in p:
                mejor = max(mejor, len(c.split()) * 2)  # frase completa vale doble
                continue
            # Coincidencia por palabras individuales
            palabras_p = set(p.split())
            palabras_c = set(c.split())
            coincidencias = palabras_p & palabras_c
            mejor = max(mejor, len(coincidencias))
        return mejor

    def responder(self, pregunta: str, historial: list = None, contexto_extra: str = "") -> str:
        # Buscar la mejor coincidencia en la base de conocimiento
        mejor_puntaje  = 0
        mejor_respuesta = None

        for palabras_clave, respuesta in self.BASE_CONOCIMIENTO:
            puntaje = self._puntaje_similitud(pregunta, palabras_clave)
            if puntaje > mejor_puntaje:
                mejor_puntaje   = puntaje
                mejor_respuesta = respuesta

        if mejor_puntaje == 0 or mejor_respuesta is None:
            mejor_respuesta = (
                "Soy Solaris, tu asistente de energía solar para zonas rurales de Colombia. "
                "Puedo ayudarte con:\n\n"
                "☀️ Conceptos básicos y beneficios del solar\n"
                "🔧 Instalación y componentes (paneles, baterías, regulador, inversor)\n"
                "⚡ Qué electrodomésticos puedes conectar\n"
                "🧹 Mantenimiento preventivo\n"
                "🚨 Solución de problemas y emergencias\n"
                "💰 Costos y subsidios del IPSE/FAZNI\n\n"
                "¿Sobre cuál de estos temas quieres saber más?"
            )

        if contexto_extra:
            return f"{contexto_extra}\n\n{mejor_respuesta}"
        return mejor_respuesta


# ─────────────────────────────────────────────────────────────
# MOTOR PRINCIPAL — Integra las tres capas
# ─────────────────────────────────────────────────────────────

class AsistenteSolarRural:
    """
    Punto de entrada único del backend.
    
    Flujo:
      1. (Opcional) Recibe datos del sensor → PredictorEnergia
      2. (Opcional) Recibe imagen → DiagnosticoVisual  
      3. Construye contexto enriquecido
      4. Pasa contexto + pregunta al LLM seleccionado
    """

    def __init__(
        self,
        gguf_path:      str = "asistente_solar.gguf",
        rag_path:       str = "./solar_db",
        gbr_path:       str = "modelo_solar_expert_v2_1.pkl",
        yolo_path:      str = "yolov8n.pt",
    ):
        # --- Capa 1: Predicción energética ---
        try:
            self.predictor = PredictorEnergia(gbr_path)
        except Exception as e:
            print(f"[Brain] PredictorEnergia no disponible: {e}")
            self.predictor = None

        # --- Capa 2: Visión artificial ---
        self.vision = DiagnosticoVisual(yolo_path)

        # --- Capa 3: LLM (prioridad: Gemini → GGUF → RAG → Fallback) ---
        self.llm      = None
        self.modo_llm = "desconocido"
        # Fallback siempre disponible como red de seguridad
        self.fallback = AsistenteSolarFallback()

        # Prioridad 0: Gemini API (más inteligente, requiere internet)
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        if gemini_key:
            try:
                self.llm      = AsistenteSolarGemini(gemini_key)
                self.modo_llm = "Gemini"
            except Exception as e:
                print(f"[Brain] Gemini falló: {e} — probando GGUF")

        # Prioridad 1: GGUF local
        if self.llm is None and os.path.exists(gguf_path):
            try:
                self.llm      = AsistenteSolarGGUF(gguf_path)
                self.modo_llm = "GGUF"
            except Exception as e:
                print(f"[Brain] GGUF falló: {e} — probando RAG")

        # Prioridad 2: RAG
        if self.llm is None and os.path.exists(rag_path):
            try:
                self.llm      = AsistenteSolarRAG(rag_path)
                self.modo_llm = "RAG"
            except Exception as e:
                print(f"[Brain] RAG falló: {e} — usando Fallback")

        # Prioridad 3: Fallback local (siempre funciona sin internet)
        if self.llm is None:
            self.llm      = self.fallback
            self.modo_llm = "Fallback"

        print(f"\n[Brain] ✅ Asistente Solar Rural iniciado — Modo LLM: {self.modo_llm}")

    # ── API pública ──────────────────────────────────────────

    def responder(
        self,
        pregunta:        str,
        historial:       list = None,
        produccion_real: float = None,
        imagen_path:     str = None,
        datos_sensor:    dict = None,
    ) -> dict:
        """
        Punto de entrada principal del backend.

        Args:
            pregunta:        Texto del usuario
            historial:       Lista de dicts {role, content} para contexto
            produccion_real: Valor real del sensor (kWh) para comparar con GBR
            imagen_path:     Ruta a imagen para análisis YOLO
            datos_sensor:    Features extras para el GBR (dict)

        Returns:
            dict con: respuesta, alertas, diagnostico_visual, modo
        """
        contexto_partes = []
        alertas = []
        diagnostico_visual = None

        # --- Capa 1: Analizar producción si hay datos ---
        if self.predictor and produccion_real is not None:
            eval_resultado = self.predictor.evaluar_sistema(
                produccion_real, datos_sensor
            )
            alertas.append(eval_resultado)
            if eval_resultado["nivel"] in ("advertencia", "critico"):
                contexto_partes.append(
                    f"[DATOS DEL SENSOR] {eval_resultado['mensaje']}"
                )

        # --- Capa 2: Analizar imagen si se provee ---
        if imagen_path:
            diagnostico_visual = self.vision.analizar_imagen(imagen_path)
            if diagnostico_visual["nivel_alerta"] in ("advertencia", "critico"):
                contexto_partes.append(
                    f"[DIAGNÓSTICO VISUAL] {diagnostico_visual['mensaje']} "
                    f"Recomendaciones: {'; '.join(diagnostico_visual['recomendaciones'])}"
                )

        # --- Capa 3: Generar respuesta conversacional ---
        contexto_extra  = "\n".join(contexto_partes)
        modo_usado      = self.modo_llm
        respuesta_texto = None

        # Intentar con el LLM principal
        try:
            respuesta_texto = self.llm.responder(pregunta, historial, contexto_extra)
        except Exception as e:
            print(f"[Brain] LLM principal ({self.modo_llm}) falló en runtime: {e}")

        # Si el LLM principal falló, usar fallback local
        if not respuesta_texto:
            respuesta_texto = self.fallback.responder(pregunta, historial, contexto_extra)
            modo_usado      = "Fallback"

        return {
            "respuesta":          respuesta_texto,
            "alertas":            alertas,
            "diagnostico_visual": diagnostico_visual,
            "modo":               modo_usado,
        }

    def prediccion_rapida(self, datos_sensor: dict = None) -> str:
        """Retorna texto de producción esperada para mostrar en sidebar."""
        if self.predictor:
            return self.predictor.resumen_dia()
        return "Predictor no disponible."

    def estado(self) -> dict:
        """Retorna estado de cada componente para mostrar en UI."""
        return {
            "llm":       self.modo_llm,
            "predictor": "activo" if self.predictor else "inactivo",
            "vision":    "activo" if self.vision.disponible else "inactivo (instala ultralytics)",
        }


# ─────────────────────────────────────────────────────────────
# SELECTOR RÁPIDO (compatibilidad con código legacy)
# ─────────────────────────────────────────────────────────────

def cargar_asistente(
    gguf_path: str = "asistente_solar.gguf",
    rag_path:  str = "./solar_db",
    gbr_path:  str = "modelo_solar_expert_v2_1.pkl",
    yolo_path: str = "yolov8n.pt",
) -> AsistenteSolarRural:
    """Función de conveniencia para instanciar el asistente completo."""
    return AsistenteSolarRural(
        gguf_path=gguf_path,
        rag_path=rag_path,
        gbr_path=gbr_path,
        yolo_path=yolo_path,
    )


# ─────────────────────────────────────────────────────────────
# TEST RÁPIDO (ejecutar directamente: python brain.py)
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  TEST RÁPIDO — Asistente Solar Rural")
    print("=" * 60)

    asistente = cargar_asistente()

    print("\n📊 Estado de componentes:")
    for comp, estado in asistente.estado().items():
        print(f"  {comp:12} → {estado}")

    print("\n🔮 Predicción para las próximas horas:")
    print(asistente.prediccion_rapida())

    print("\n💬 Test conversacional:")
    preguntas = [
        "¿Cuántos paneles necesito para una nevera?",
        "¿Cómo limpio los paneles?",
        "¿Hay subsidios del gobierno?",
    ]
    historial = []
    for p in preguntas:
        print(f"\n  Usuario: {p}")
        resultado = asistente.responder(p, historial)
        print(f"  Solaris: {resultado['respuesta'][:200]}...")
        historial.append({"role": "user", "content": p})
        historial.append({"role": "assistant", "content": resultado["respuesta"]})

    print("\n⚡ Test de alerta con sensor simulado:")
    resultado_sensor = asistente.responder(
        pregunta="¿Por qué mi sistema produce tan poca energía hoy?",
        produccion_real=5.0,   # Muy por debajo de lo esperado
        datos_sensor={"hour": 12, "month": 4},  # Mediodía, buen mes
    )
    print(f"  Nivel de alerta: {resultado_sensor['alertas'][0]['nivel'] if resultado_sensor['alertas'] else 'N/A'}")
    print(f"  Mensaje sensor: {resultado_sensor['alertas'][0]['mensaje'] if resultado_sensor['alertas'] else 'N/A'}")
    print(f"  Respuesta LLM: {resultado_sensor['respuesta'][:200]}...")

    print("\n✅ Test completado")