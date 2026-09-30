import base64
import os

from cryptography.fernet import Fernet, InvalidToken  # noqa: F401 (re-exported for callers)
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

SALT_BYTES = 16
# OWASP's current minimum for PBKDF2-HMAC-SHA256.
KDF_ITERATIONS = 480_000


def generate_salt() -> bytes:
    return os.urandom(SALT_BYTES)


def _derive_key(passphrase: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=KDF_ITERATIONS,
    )
    return base64.urlsafe_b64encode(kdf.derive(passphrase.encode()))


def encrypt_text(plaintext: str, passphrase: str) -> tuple[bytes, bytes]:
    """Returns (ciphertext, salt). A fresh salt is generated on every call."""
    salt = generate_salt()
    key = _derive_key(passphrase, salt)
    ciphertext = Fernet(key).encrypt(plaintext.encode())
    return ciphertext, salt


def decrypt_text(ciphertext: bytes, salt: bytes, passphrase: str) -> str:
    """Raises cryptography.fernet.InvalidToken on a wrong passphrase or
    tampered ciphertext.

    Both args come straight off BinaryFields, which Postgres hands back as
    memoryview, not bytes — so coerce them before use."""
    key = _derive_key(passphrase, bytes(salt))
    return Fernet(key).decrypt(bytes(ciphertext)).decode()
