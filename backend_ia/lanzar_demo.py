"""
lanzar_demo.py — Lanzador completo para demo en auditorio
==========================================================
Inicia Flask en un hilo y expone la URL pública via ngrok.

Uso:
  cd deploy_bundle
  python lanzar_demo.py

Requisitos:
  pip install pyngrok flask flask-cors
"""

import threading
import time
import sys
import os
import webbrowser

NGROK_TOKEN = os.environ.get("NGROK_AUTHTOKEN", "")
PORT = 8080


def start_flask():
    """Arranca Flask en un hilo daemon (se cierra solo al salir)."""
    # Silenciar el log de werkzeug para que no tape la URL de ngrok
    import logging
    log = logging.getLogger("werkzeug")
    log.setLevel(logging.ERROR)

    import server
    server.app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True, use_reloader=False)


def main():
    print("\n" + "═" * 60)
    print("  ☀️  SOLARIS — Lanzador de Demo para Auditorio")
    print("═" * 60)

    # 1. Arrancar Flask en background
    print("\n[1/3] Iniciando servidor Flask...")
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()
    time.sleep(4)   # darle tiempo al asistente para cargar modelos
    print("      ✅ Servidor Flask activo en http://localhost:5000")

    # 2. Conectar ngrok
    print("\n[2/3] Conectando túnel ngrok...")
    try:
        from pyngrok import ngrok, conf

        conf.get_default().auth_token = NGROK_TOKEN
        # Cerrar túneles previos que puedan existir
        for t_old in ngrok.get_tunnels():
            ngrok.disconnect(t_old.public_url)

        tunnel = ngrok.connect(PORT, "http")
        public_url = tunnel.public_url
        # ngrok puede devolver http, forzamos https
        public_url_https = public_url.replace("http://", "https://")

        print("\n" + "╔" + "═" * 56 + "╗")
        print("║" + " " * 56 + "║")
        print("║   🌐  URL PÚBLICA PARA EL AUDITORIO:               ║")
        print(f"║                                                        ║")
        print(f"║   ➤  {public_url_https:<50} ║")
        print("║                                                        ║")
        print("║   🏠  URL LOCAL (tu laptop):                           ║")
        print(f"║   ➤  http://localhost:{PORT:<34} ║")
        print("║" + " " * 56 + "║")
        print("╚" + "═" * 56 + "╝")

    except ImportError:
        print("      ⚠️  pyngrok no instalado. Instalar con: pip install pyngrok")
        print("      El servidor local sigue activo en http://localhost:5000")
        public_url_https = f"http://localhost:{PORT}"
    except Exception as e:
        print(f"      ⚠️  Error ngrok: {e}")
        print(f"      El servidor local sigue activo en http://localhost:{PORT}")
        public_url_https = f"http://localhost:{PORT}"

    # 3. Abrir browser local
    print("\n[3/3] Abriendo navegador local...")
    try:
        webbrowser.open(f"http://localhost:{PORT}")
        print("      ✅ Navegador abierto")
    except Exception:
        print(f"      Abre manualmente: http://localhost:{PORT}")

    print("\n" + "─" * 60)
    print("  Presiona Ctrl+C para detener el servidor y cerrar ngrok.")
    print("─" * 60 + "\n")

    # Mantener vivo
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Cerrando...")
        try:
            from pyngrok import ngrok
            ngrok.kill()
        except Exception:
            pass
        print("    ✅ Servidor detenido. ¡Hasta la próxima!")
        sys.exit(0)


if __name__ == "__main__":
    main()
