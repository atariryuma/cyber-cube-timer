"""
Cyber Cube Timer - Esports-style Rubik's Cube Timer Web Application
Entry point for running the Flask application
"""

import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # Use environment variable for debug mode (safer for production)
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    host = os.environ.get('FLASK_HOST', '0.0.0.0')  # Allow access from local network
    port = int(os.environ.get('FLASK_PORT', 5000))

    # SSL certificate paths
    cert_file = os.path.join(os.path.dirname(__file__), 'certs', 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'certs', 'key.pem')

    # Check if SSL certificates exist
    use_ssl = os.path.exists(cert_file) and os.path.exists(key_file)
    ssl_context = (cert_file, key_file) if use_ssl else None
    protocol = "https" if use_ssl else "http"

    print("=" * 60)
    print("CYBER CUBE TIMER - Starting Server...")
    print("=" * 60)
    print(f"Server running at: {protocol}://{host}:{port}")
    if host == '0.0.0.0':
        print(f"Local network access: {protocol}://192.168.3.2:{port}")
        print(f"Localhost access: {protocol}://localhost:{port}")
    if use_ssl:
        print("SSL: ENABLED (Self-signed certificate)")
        print("NOTE: Browser will show security warning - click 'Advanced' and 'Proceed'")
    else:
        print("SSL: DISABLED (Camera access requires HTTPS or localhost)")
    print(f"Environment: {'Development' if debug_mode else 'Production'}")
    print("Press Ctrl+C to stop")
    print("=" * 60)

    app.run(debug=debug_mode, host=host, port=port, ssl_context=ssl_context)
