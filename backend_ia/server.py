"""
server.py — API Flask del Asistente Solar Rural
=================================================
Endpoints:
  GET  /api/status          → Estado de los tres módulos (LLM, predictor, visión)
  GET  /api/prediction      → Predicción de producción para las próximas horas
  POST /api/respond         → Respuesta conversacional (chat principal)
  POST /api/diagnose        → Diagnóstico visual de imagen (multipart/form-data)
  POST /api/sensor          → Evaluación rápida de producción real vs. esperada
  GET  /                    → Sirve index.html (frontend)

Autor: Equipo Asistente Solar Rural — Hackathon 2025
"""

import os
import tempfile

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ── Inicialización ──────────────────────────────────────────────
app = Flask(__name__, static_folder='.')
CORS(app, resources={r"/api/*": {"origins": "*"}})

print("[server] ☀️  Iniciando Asistente Solar Rural...")
print("[server] Cargando modelos — esto puede tardar ~10 segundos...")

try:
    from brain import cargar_asistente
    asistente = cargar_asistente()
    print("[server] ✅ Asistente cargado correctamente")
except Exception as e:
    print(f"[server] ⚠️  Error cargando asistente: {e}")
    asistente = None


# ── Helpers ─────────────────────────────────────────────────────

def _check_asistente():
    """Retorna (None, None) si ok, o (respuesta, código) si hay error."""
    if asistente is None:
        return jsonify({
            "error": "Asistente no disponible",
            "detalle": "Revisa los logs del servidor para ver el error de carga."
        }), 503
    return None, None


# ── Endpoints ───────────────────────────────────────────────────

@app.route('/api/status', methods=['GET'])
def status():
    """Devuelve el estado operativo de cada módulo."""
    err, code = _check_asistente()
    if err:
        return err, code
    return jsonify(asistente.estado())


@app.route('/api/prediction', methods=['GET'])
def prediction():
    """Devuelve el resumen de producción esperada para las próximas horas."""
    err, code = _check_asistente()
    if err:
        return err, code
    return jsonify({"resumen": asistente.prediccion_rapida()})


@app.route('/api/respond', methods=['POST'])
def respond():
    """
    Endpoint principal del chat.

    Body JSON:
      pregunta        (str)   — texto del usuario
      historial       (list)  — [{role, content}, ...] últimas N conversaciones
      produccion_real (float) — opcional: lectura del sensor en kWh
      datos_sensor    (dict)  — opcional: features extra para el GBR
      imagen_filename (str)   — opcional: nombre de archivo previamente subido
    """
    err, code = _check_asistente()
    if err:
        return err, code

    data = request.get_json(force=True, silent=True) or {}

    pregunta        = data.get('pregunta', '').strip()
    historial       = data.get('historial', [])
    produccion_real = data.get('produccion_real')
    datos_sensor    = data.get('datos_sensor')
    imagen_path     = None

    if not pregunta:
        return jsonify({"error": "El campo 'pregunta' es obligatorio."}), 400

    # Imagen previamente guardada en disco (flujo alternativo)
    imagen_filename = data.get('imagen_filename')
    if imagen_filename:
        candidate = os.path.join(os.getcwd(), imagen_filename)
        if os.path.exists(candidate):
            imagen_path = candidate

    # Convertir produccion_real a float si viene como string
    if produccion_real is not None:
        try:
            produccion_real = float(produccion_real)
        except (ValueError, TypeError):
            produccion_real = None

    resultado = asistente.responder(
        pregunta=pregunta,
        historial=historial,
        produccion_real=produccion_real,
        imagen_path=imagen_path,
        datos_sensor=datos_sensor,
    )

    return jsonify(resultado)


@app.route('/api/diagnose', methods=['POST'])
def diagnose():
    """
    Diagnóstico visual: recibe multipart con campo 'image'.
    Guarda temporalmente el archivo y lo pasa a YOLOv8.

    Returns:
      {
        "diagnostico": { nivel_alerta, mensaje, detecciones, recomendaciones },
        "imagen_path": "/tmp/..."
      }
    """
    err, code = _check_asistente()
    if err:
        return err, code

    if 'image' not in request.files:
        return jsonify({"error": "Campo 'image' no encontrado en el formulario."}), 400

    f = request.files['image']
    if f.filename == '':
        return jsonify({"error": "No se seleccionó ningún archivo."}), 400

    # Guardar temporalmente
    try:
        suffix = os.path.splitext(f.filename)[1] or '.jpg'
        tmp    = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        f.save(tmp.name)
        tmp.close()
    except Exception as e:
        return jsonify({"error": f"No se pudo guardar la imagen: {e}"}), 500

    resultado = asistente.vision.analizar_imagen(tmp.name)
    return jsonify({"diagnostico": resultado, "imagen_path": tmp.name})


@app.route('/api/sensor', methods=['POST'])
def sensor():
    """
    Evaluación rápida sin chat: solo compara producción real vs. predicha.

    Body JSON:
      produccion_real (float)  — lectura del medidor en kWh
      datos_sensor    (dict)   — opcional: {hour, month, ...}

    Returns:
      { prediccion, real, diferencia_pct, nivel, mensaje }
    """
    err, code = _check_asistente()
    if err:
        return err, code

    if asistente.predictor is None:
        return jsonify({"error": "Predictor energético no disponible."}), 503

    data = request.get_json(force=True, silent=True) or {}
    produccion_real = data.get('produccion_real')
    datos_sensor    = data.get('datos_sensor')

    if produccion_real is None:
        return jsonify({"error": "El campo 'produccion_real' es obligatorio."}), 400

    try:
        produccion_real = float(produccion_real)
    except (ValueError, TypeError):
        return jsonify({"error": "'produccion_real' debe ser un número."}), 400

    resultado = asistente.predictor.evaluar_sistema(produccion_real, datos_sensor)
    return jsonify(resultado)


# ── Sirviendo el frontend ────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def static_proxy(path):
    """Sirve el frontend estático desde la misma carpeta."""
    # index.html como raíz
    if path == '' or path == 'index.html':
        return send_from_directory('.', 'index.html')
    # Archivos estáticos conocidos
    if os.path.exists(os.path.join('.', path)):
        return send_from_directory('.', path)
    # SPA fallback
    return send_from_directory('.', 'index.html')


# ── Punto de entrada ─────────────────────────────────────────────

if __name__ == '__main__':
    print("\n" + "═" * 55)
    print("  ☀️  Asistente Solar Rural — Servidor Flask")
    PORT = int(os.environ.get("PORT", 8080))
    print(f"  URL local:  http://localhost:{PORT}")
    print("  Para acceso público ejecutar: python lanzar_demo.py")
    print("═" * 55 + "\n")
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
