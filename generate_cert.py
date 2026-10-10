"""
Generate self-signed SSL certificate for local HTTPS development
"""
from OpenSSL import crypto
import os

def generate_selfsigned_cert(cert_dir="certs"):
    """
    Generate a self-signed certificate for localhost and local IP
    """
    # Create certs directory if it doesn't exist
    if not os.path.exists(cert_dir):
        os.makedirs(cert_dir)

    cert_file = os.path.join(cert_dir, "cert.pem")
    key_file = os.path.join(cert_dir, "key.pem")

    # Check if certificate already exists
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"Certificate already exists at {cert_file}")
        return cert_file, key_file

    # Create a key pair
    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 2048)

    # Create a self-signed cert
    cert = crypto.X509()
    cert.get_subject().C = "JP"
    cert.get_subject().ST = "Tokyo"
    cert.get_subject().L = "Tokyo"
    cert.get_subject().O = "Cyber Cube Timer"
    cert.get_subject().OU = "Development"
    cert.get_subject().CN = "localhost"

    # Add Subject Alternative Names for localhost and local IP
    cert.add_extensions([
        crypto.X509Extension(
            b"subjectAltName",
            False,
            b"DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:192.168.3.2"
        ),
    ])

    cert.set_serial_number(1000)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(365 * 24 * 60 * 60)  # Valid for 1 year
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha256')

    # Write certificate and private key to files
    with open(cert_file, "wb") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))

    with open(key_file, "wb") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k))

    print("=" * 60)
    print("SSL Certificate Generated Successfully!")
    print("=" * 60)
    print(f"Certificate: {os.path.abspath(cert_file)}")
    print(f"Private Key: {os.path.abspath(key_file)}")
    print()
    print("⚠️  IMPORTANT: This is a self-signed certificate.")
    print("Your browser will show a security warning.")
    print("You need to accept the warning to continue.")
    print("=" * 60)

    return cert_file, key_file

if __name__ == "__main__":
    generate_selfsigned_cert()
