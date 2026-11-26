"""
start_ngrok.py
Usa `pyngrok` para exponer el servidor Flask en el puerto 5000.
Instalación: `pip install pyngrok`
Ejecución: `python start_ngrok.py`

El token se lee de la variable de entorno NGROK_AUTHTOKEN.
"""
from pyngrok import ngrok

# Reemplaza por tu token de ngrok
NGROK_TOKEN = os.environ.get("NGROK_AUTHTOKEN", "")

def main():
    ngrok.set_auth_token(NGROK_TOKEN)
    http_tunnel = ngrok.connect(5000)
    print("ngrok público URL:", http_tunnel.public_url)
    print("Ctrl+C para detener")
    try:
        import time
        # Mantener el proceso corriendo hasta Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Deteniendo ngrok...")
        try:
            ngrok.disconnect(http_tunnel.public_url)
        except Exception:
            pass
        try:
            ngrok.kill()
        except Exception:
            pass

if __name__ == '__main__':
    main()
