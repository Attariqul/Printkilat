from datetime import timedelta
from pathlib import Path
from app.extensions import db
from app.models import (
    Operator,
    Order,
    OrderFile,
    OrderItem,
    OrderStatusLog,
    PaymentRecord,
    ServiceTariff,
    utcnow,
)
from app.utils import calculate_order_total, format_queue_number, get_jakarta_date_str


def _build_minimal_pdf_bytes(title: str, pages: int) -> bytes:
    """Builds a minimal valid multi-page PDF without requiring heavy drawing libraries."""
    objects: list[bytes] = []
    # 1: Catalog, 2: Pages, then per-page Page + Content
    page_ids = []
    next_id = 3
    for _ in range(pages):
        page_ids.append(next_id)
        next_id += 1

    kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {pages} >>\nendobj\n".encode("ascii"))

    for pid in page_ids:
        objects.append(
            f"{pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\n".encode("ascii")
        )

    header = f"%PDF-1.4\n% PrintKilat {title}\n".encode("utf-8")
    body = b""
    offsets = [0]
    pos = len(header)
    for obj in objects:
        offsets.append(pos)
        body += obj
        pos += len(obj)

    xref_pos = pos
    xref = f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii")
    for off in offsets[1:]:
        xref += f"{off:010d} 00000 n \n".encode("ascii")

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    ).encode("ascii")
    return header + body + xref + trailer


def seed_initial_data(upload_folder: str) -> None:
    Path(upload_folder).mkdir(parents=True, exist_ok=True)

    # 1. Seed default operator
    operator = db.session.query(Operator).first()
    if not operator:
        operator = Operator(
            email="operator@printkilat.id",
            name="Raka Pratama",
            role="operator",
        )
        operator.set_password("printkilat123")
        db.session.add(operator)
        db.session.flush()

    # 2. Seed service tariffs
    if db.session.query(ServiceTariff).count() == 0:
        tariffs = [
            ServiceTariff(name="Print hitam-putih A4", category="cetak", paper_size="A4", color_mode="BW", price=500, is_active=True),
            ServiceTariff(name="Print hitam-putih F4", category="cetak", paper_size="F4", color_mode="BW", price=500, is_active=True),
            ServiceTariff(name="Print warna A4", category="cetak", paper_size="A4", color_mode="Color", price=1500, is_active=True),
            ServiceTariff(name="Print warna F4", category="cetak", paper_size="F4", color_mode="Color", price=1750, is_active=True),
            ServiceTariff(name="Tanpa jilid", category="jilid", paper_size=None, color_mode=None, price=0, is_active=True),
            ServiceTariff(name="Jilid lakban", category="jilid", paper_size=None, color_mode=None, price=3000, is_active=True),
            ServiceTariff(name="Jilid spiral", category="jilid", paper_size=None, color_mode=None, price=8000, is_active=True),
        ]
        db.session.add_all(tariffs)
        db.session.flush()

    # 3. Seed demo orders
    if db.session.query(Order).count() == 0:
        bw_a4 = db.session.query(ServiceTariff).filter_by(name="Print hitam-putih A4").first()
        color_a4 = db.session.query(ServiceTariff).filter_by(name="Print warna A4").first()
        no_bind = db.session.query(ServiceTariff).filter_by(name="Tanpa jilid").first()
        lakban = db.session.query(ServiceTariff).filter_by(name="Jilid lakban").first()
        spiral = db.session.query(ServiceTariff).filter_by(name="Jilid spiral").first()

        today = get_jakarta_date_str()
        now = utcnow()
        expires = now + timedelta(days=7)

        demos = [
            {
                "seq": 1,
                "track": "PK-TRK-DEMO0001",
                "name": "Nadia Putri",
                "phone": "0812-3456-7890",
                "status": "pending",
                "notes": "Mohon cek margin halaman lampiran",
                "print_t": bw_a4,
                "bind_t": no_bind,
                "pages": 10,
                "copies": 1,
                "file": "Makalah_Sistem_Informasi.pdf",
                "method": "cash",
                "pay_status": "unpaid",
            },
            {
                "seq": 2,
                "track": "PK-TRK-DEMO0002",
                "name": "Bima Pratama",
                "phone": "0857-9911-2233",
                "status": "printing",
                "notes": "Sampul warna depan, jilid spiral rapi",
                "print_t": bw_a4,
                "bind_t": spiral,
                "pages": 45,
                "copies": 3,
                "file": "Modul_Dummy.pdf",
                "method": "transfer",
                "pay_status": "pending_verification",
            },
            {
                "seq": 3,
                "track": "PK-TRK-DEMO0003",
                "name": "Tamu Kampus",
                "phone": None,
                "status": "ready",
                "notes": "Cetak bolak-balik",
                "print_t": bw_a4,
                "bind_t": lakban,
                "pages": 12,
                "copies": 2,
                "file": "Proposal_Skripsi_Bab1.pdf",
                "method": "cash",
                "pay_status": "unpaid",
            },
            {
                "seq": 4,
                "track": "PK-TRK-DEMO0004",
                "name": "Siti Rahma",
                "phone": "0813-8877-4455",
                "status": "completed",
                "notes": None,
                "print_t": color_a4,
                "bind_t": no_bind,
                "pages": 8,
                "copies": 1,
                "file": "Slide_Kewirausahaan.pdf",
                "method": "cash",
                "pay_status": "paid",
            },
        ]

        for d in demos:
            q_num = format_queue_number(today, d["seq"])
            pricing = calculate_order_total(
                d["print_t"].price, d["pages"], d["copies"], d["bind_t"].price
            )
            pdf_bytes = _build_minimal_pdf_bytes(d["file"], d["pages"])
            stored_pdf = f"seed_{q_num}.pdf"
            (Path(upload_folder) / stored_pdf).write_bytes(pdf_bytes)

            order = Order(
                queue_number=q_num,
                tracking_code=d["track"],
                customer_name=d["name"],
                customer_phone=d["phone"],
                status=d["status"],
                notes=d["notes"],
                total_amount=pricing["total"],
                file_expires_at=expires,
            )
            db.session.add(order)
            db.session.flush()

            db.session.add(
                OrderItem(
                    order_id=order.id,
                    print_tariff_id=d["print_t"].id,
                    print_tariff_name=d["print_t"].name,
                    paper_size=d["print_t"].paper_size,
                    color_mode=d["print_t"].color_mode,
                    print_unit_price=d["print_t"].price,
                    page_count=d["pages"],
                    copies=d["copies"],
                    bind_tariff_id=d["bind_t"].id,
                    bind_tariff_name=d["bind_t"].name,
                    bind_unit_price=d["bind_t"].price,
                    subtotal_print=pricing["print_subtotal"],
                    subtotal_bind=pricing["bind_subtotal"],
                )
            )
            db.session.add(
                OrderFile(
                    order_id=order.id,
                    original_name=d["file"],
                    stored_name=stored_pdf,
                    mime_type="application/pdf",
                    file_size_bytes=len(pdf_bytes),
                    detected_pages=d["pages"],
                )
            )
            db.session.add(
                PaymentRecord(
                    order_id=order.id,
                    method=d["method"],
                    status=d["pay_status"],
                    verified_by=operator.id if d["pay_status"] == "paid" else None,
                    verified_at=now if d["pay_status"] == "paid" else None,
                )
            )
            db.session.add(
                OrderStatusLog(
                    order_id=order.id,
                    from_status=None,
                    to_status="pending",
                    note="Pesanan diterima sistem",
                )
            )
            if d["status"] != "pending":
                db.session.add(
                    OrderStatusLog(
                        order_id=order.id,
                        from_status="pending",
                        to_status=d["status"],
                        note="Status awal demo gerai",
                        changed_by=operator.id,
                    )
                )

    db.session.commit()
