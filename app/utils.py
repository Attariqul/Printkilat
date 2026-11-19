import base64
import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from cryptography.fernet import Fernet
from pypdf import PdfReader
from werkzeug.utils import secure_filename

JAKARTA_TZ = ZoneInfo("Asia/Jakarta")
TRACKING_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
ORDER_STEPS = ("pending", "confirmed", "printing", "ready", "completed")

ALLOWED_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "pending": ("confirmed", "rejected"),
    "confirmed": ("printing", "rejected"),
    "printing": ("ready", "rejected"),
    "ready": ("completed",),
    "completed": (),
    "rejected": (),
}

STATUS_LABELS: dict[str, str] = {
    "pending": "Menunggu Konfirmasi",
    "confirmed": "Dikonfirmasi",
    "printing": "Sedang Dicetak",
    "ready": "Siap Diambil",
    "completed": "Selesai",
    "rejected": "Ditolak",
}

SHORT_STATUS_LABELS: dict[str, str] = {
    "pending": "Menunggu",
    "confirmed": "Dikonfirmasi",
    "printing": "Dicetak",
    "ready": "Siap Diambil",
    "completed": "Selesai",
    "rejected": "Ditolak",
}


def format_rupiah(amount: int | float | None) -> str:
    value = int(round(amount or 0))
    return f"Rp {value:,}".replace(",", ".")


def format_file_size(size_bytes: int) -> str:
    if size_bytes <= 0:
        return "0 KB"
    if size_bytes < 1024 * 1024:
        return f"{max(1, round(size_bytes / 1024))} KB"
    return f"{size_bytes / (1024 * 1024):.1f}".replace(".", ",") + " MB"


def calculate_order_total(print_rate: int, pages: int, copies: int, bind_rate: int = 0) -> dict[str, int]:
    if print_rate < 0 or bind_rate < 0:
        raise ValueError("Tarif layanan tidak boleh negatif.")
    if pages < 1:
        raise ValueError("Jumlah halaman minimal 1.")
    if copies < 1:
        raise ValueError("Jumlah rangkap minimal 1.")

    print_subtotal = int(print_rate) * int(pages) * int(copies)
    bind_subtotal = int(bind_rate) * int(copies)
    return {
        "print_subtotal": print_subtotal,
        "bind_subtotal": bind_subtotal,
        "total": print_subtotal + bind_subtotal,
    }


def generate_tracking_code() -> str:
    suffix = "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(8))
    return f"PK-TRK-{suffix}"


def build_safe_stored_filename(original_name: str, prefix: str = "doc") -> tuple[str, str]:
    cleaned = secure_filename(original_name) or "dokumen.pdf"
    ext = Path(cleaned).suffix.lower()
    unique_id = uuid.uuid4().hex[:12]
    return cleaned, f"{prefix}_{unique_id}{ext}"


def format_queue_number(date_str: str, sequence: int) -> str:
    clean_date = "".join(ch for ch in date_str if ch.isdigit())[:8]
    if len(clean_date) != 8:
        raise ValueError("Format tanggal antrean harus YYYYMMDD.")
    if sequence < 1:
        raise ValueError("Nomor urut antrean minimal 1.")
    return f"PK-{clean_date}-{sequence:03d}"


def get_jakarta_date_str(now: Optional[datetime] = None) -> str:
    current = now or datetime.now(timezone.utc)
    return current.astimezone(JAKARTA_TZ).strftime("%Y%m%d")


def validate_status_transition(
    current_status: str, next_status: str, rejection_reason: str = ""
) -> tuple[bool, Optional[str]]:
    if current_status == next_status:
        return False, "Status baru sama dengan status saat ini."
    allowed = ALLOWED_TRANSITIONS.get(current_status, ())
    if next_status not in allowed:
        return False, f"Transisi status dari {current_status} ke {next_status} tidak diizinkan."
    if next_status == "rejected" and len(rejection_reason.strip()) < 3:
        return False, "Alasan penolakan wajib diisi minimal 3 karakter."
    return True, None


def detect_pdf_pages(file_path: str | Path) -> Optional[int]:
    try:
        reader = PdfReader(str(file_path))
        count = len(reader.pages)
        return count if count > 0 else None
    except Exception:
        return None


def get_fernet(secret_key: str) -> Fernet:
    digest = hashlib.sha256(secret_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_sensitive_note(text: str, secret_key: str) -> str:
    return get_fernet(secret_key).encrypt(text.encode("utf-8")).decode("utf-8")


def decrypt_sensitive_note(token: str, secret_key: str) -> str:
    return get_fernet(secret_key).decrypt(token.encode("utf-8")).decode("utf-8")


def cleanup_expired_uploads(db, OrderFile, Order, upload_folder: str) -> int:
    now = datetime.now(timezone.utc)
    expired = (
        db.session.query(OrderFile)
        .join(Order, Order.id == OrderFile.order_id)
        .filter(OrderFile.deleted_at.is_(None), Order.file_expires_at <= now)
        .all()
    )
    removed = 0
    for record in expired:
        file_path = os.path.join(upload_folder, os.path.basename(record.stored_name))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        record.deleted_at = now
        removed += 1
    if removed:
        db.session.commit()
    return removed


def seven_days_from_now() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)
