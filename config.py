import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _default_sqlite_uri() -> str:
    if os.environ.get("VERCEL") or os.environ.get("NETLIFY"):
        return "sqlite:////tmp/printkilat.db"
    data_dir = BASE_DIR / "instance"
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'printkilat.db'}"


def _default_upload_dir() -> str:
    if os.environ.get("VERCEL") or os.environ.get("NETLIFY"):
        return "/tmp/protected_uploads"
    return str(BASE_DIR / "protected_uploads")


class BaseConfig:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "printkilat-dev-secret-ubah-di-produksi")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or _default_sqlite_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    PROTECTED_UPLOAD_FOLDER = os.environ.get("PROTECTED_UPLOAD_FOLDER") or _default_upload_dir()
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20 MB
    ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx"}
    ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    STORE_NAME = os.environ.get("STORE_NAME", "PrintKilat Gerai Kampus")
    OPERATIONAL_HOURS = os.environ.get("OPERATIONAL_HOURS", "Senin–Sabtu · 07.30–20.00 WIB")
    STORE_LOCATION = os.environ.get("STORE_LOCATION", "Gedung Pusat Mahasiswa Lt. 1, Sektor Barat")
    TRANSFER_ACCOUNT_INFO = os.environ.get(
        "TRANSFER_ACCOUNT_INFO",
        "BCA 7710-4429-18 a.n. Gerai Fotokopi Kampus / QRIS Gerai",
    )


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "1") == "1"


class TestingConfig(BaseConfig):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    PROTECTED_UPLOAD_FOLDER = "/tmp/printkilat_test_uploads"


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
