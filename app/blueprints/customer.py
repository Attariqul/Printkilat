import os
from pathlib import Path
from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from app.extensions import db
from app.models import Order, OrderFile, OrderItem, OrderStatusLog, PaymentRecord, ServiceTariff
from app.utils import (
    ORDER_STEPS,
    build_safe_stored_filename,
    calculate_order_total,
    detect_pdf_pages,
    format_queue_number,
    generate_tracking_code,
    get_jakarta_date_str,
    seven_days_from_now,
)

customer_bp = Blueprint("customer", __name__)


def _next_queue_number(date_str: str) -> str:
    prefix = f"PK-{date_str}-"
    latest = (
        db.session.query(Order.queue_number)
        .filter(Order.queue_number.like(f"{prefix}%"))
        .order_by(Order.queue_number.desc())
        .first()
    )
    seq = 1
    if latest and latest[0]:
        tail = latest[0][len(prefix) :]
        if tail.isdigit():
            seq = int(tail) + 1
    return format_queue_number(date_str, seq)


def _generate_unique_tracking() -> str:
    for _ in range(15):
        candidate = generate_tracking_code()
        exists = db.session.query(Order.id).filter_by(tracking_code=candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Gagal menghasilkan kode pelacakan unik.")


def _get_guest_orders_from_session() -> list[Order]:
    codes: list[str] = session.get("guest_tracking_codes") or ["PK-TRK-DEMO0003"]
    orders = (
        db.session.query(Order)
        .filter(Order.tracking_code.in_(codes))
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@customer_bp.route("/")
def entry():
    return render_template("entry.html", focus_operator=False)


@customer_bp.route("/tamu")
def home():
    orders = _get_guest_orders_from_session()
    active_orders = [o for o in orders if o.status not in ("completed", "rejected")]
    return render_template("customer/home.html", active_orders=active_orders)


@customer_bp.route("/tamu/pesan", methods=["GET", "POST"])
def create_order():
    print_tariffs = (
        db.session.query(ServiceTariff)
        .filter_by(category="cetak", is_active=True)
        .order_by(ServiceTariff.id.asc())
        .all()
    )
    bind_tariffs = (
        db.session.query(ServiceTariff)
        .filter_by(category="jilid", is_active=True)
        .order_by(ServiceTariff.id.asc())
        .all()
    )

    if request.method == "POST":
        doc_file = request.files.get("document")
        proof_file = request.files.get("payment_proof")

        if not doc_file or not doc_file.filename:
            flash("Berkas dokumen wajib diunggah (PDF, DOC, atau DOCX).", "danger")
            return render_template(
                "customer/order.html",
                print_tariffs=print_tariffs,
                bind_tariffs=bind_tariffs,
                transfer_info=current_app.config["TRANSFER_ACCOUNT_INFO"],
            ), 400

        ext = Path(doc_file.filename).suffix.lower()
        if ext not in current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"]:
            flash("Format berkas tidak didukung. Gunakan PDF, DOC, atau DOCX.", "danger")
            return render_template(
                "customer/order.html",
                print_tariffs=print_tariffs,
                bind_tariffs=bind_tariffs,
                transfer_info=current_app.config["TRANSFER_ACCOUNT_INFO"],
            ), 400

        try:
            print_tariff_id = int(request.form.get("print_tariff_id") or 0)
            bind_tariff_id_raw = request.form.get("bind_tariff_id")
            bind_tariff_id = int(bind_tariff_id_raw) if bind_tariff_id_raw else None
            pages = int(request.form.get("page_count") or 1)
            copies = int(request.form.get("copies") or 1)
        except ValueError:
            flash("Input jumlah halaman, rangkap, atau layanan tidak valid.", "danger")
            return redirect(url_for("customer.create_order"))

        print_tariff = db.session.get(ServiceTariff, print_tariff_id)
        if not print_tariff or not print_tariff.is_active or print_tariff.category != "cetak":
            flash("Layanan cetak tidak tersedia.", "danger")
            return redirect(url_for("customer.create_order"))

        bind_tariff = db.session.get(ServiceTariff, bind_tariff_id) if bind_tariff_id else None
        if bind_tariff_id and (not bind_tariff or not bind_tariff.is_active or bind_tariff.category != "jilid"):
            flash("Opsi jilid tidak tersedia.", "danger")
            return redirect(url_for("customer.create_order"))

        try:
            pricing = calculate_order_total(
                print_tariff.price,
                pages,
                copies,
                bind_tariff.price if bind_tariff else 0,
            )
        except ValueError as exc:
            flash(str(exc), "danger")
            return redirect(url_for("customer.create_order"))

        upload_dir = current_app.config["PROTECTED_UPLOAD_FOLDER"]
        Path(upload_dir).mkdir(parents=True, exist_ok=True)

        orig_name, stored_name = build_safe_stored_filename(doc_file.filename, prefix="doc")
        doc_path = os.path.join(upload_dir, stored_name)
        doc_file.save(doc_path)
        file_size = os.path.getsize(doc_path)

        if file_size <= 0 or file_size > current_app.config["MAX_CONTENT_LENGTH"]:
            os.remove(doc_path)
            flash("Ukuran berkas harus antara 1 byte hingga 20 MB.", "danger")
            return redirect(url_for("customer.create_order"))

        detected_pages = detect_pdf_pages(doc_path) if ext == ".pdf" else None

        proof_orig = None
        proof_stored = None
        payment_method = "transfer" if request.form.get("payment_method") == "transfer" else "cash"
        if payment_method == "transfer" and proof_file and proof_file.filename:
            proof_ext = Path(proof_file.filename).suffix.lower()
            if proof_ext in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]:
                proof_orig, proof_stored = build_safe_stored_filename(proof_file.filename, prefix="proof")
                proof_file.save(os.path.join(upload_dir, proof_stored))

        queue_number = _next_queue_number(get_jakarta_date_str())
        tracking_code = _generate_unique_tracking()
        customer_name = (request.form.get("customer_name") or "").strip() or "Pelanggan Tamu"
        customer_phone = (request.form.get("customer_phone") or "").strip() or None
        notes = (request.form.get("notes") or "").strip() or None

        order = Order(
            queue_number=queue_number,
            tracking_code=tracking_code,
            customer_name=customer_name,
            customer_phone=customer_phone,
            status="pending",
            notes=notes,
            total_amount=pricing["total"],
            file_expires_at=seven_days_from_now(),
        )
        db.session.add(order)
        db.session.flush()

        db.session.add(
            OrderItem(
                order_id=order.id,
                print_tariff_id=print_tariff.id,
                print_tariff_name=print_tariff.name,
                paper_size=print_tariff.paper_size,
                color_mode=print_tariff.color_mode,
                print_unit_price=print_tariff.price,
                page_count=pages,
                copies=copies,
                bind_tariff_id=bind_tariff.id if bind_tariff else None,
                bind_tariff_name=bind_tariff.name if bind_tariff else "Tanpa jilid",
                bind_unit_price=bind_tariff.price if bind_tariff else 0,
                subtotal_print=pricing["print_subtotal"],
                subtotal_bind=pricing["bind_subtotal"],
            )
        )
        db.session.add(
            OrderFile(
                order_id=order.id,
                original_name=orig_name,
                stored_name=stored_name,
                mime_type=doc_file.mimetype or "application/octet-stream",
                file_size_bytes=file_size,
                detected_pages=detected_pages,
            )
        )
        db.session.add(
            PaymentRecord(
                order_id=order.id,
                method=payment_method,
                status="pending_verification" if payment_method == "transfer" else "unpaid",
                proof_stored_name=proof_stored,
                proof_original_name=proof_orig,
            )
        )
        db.session.add(
            OrderStatusLog(
                order_id=order.id,
                from_status=None,
                to_status="pending",
                note="Pesanan dikirim pelanggan",
            )
        )
        db.session.commit()

        saved = list(session.get("guest_tracking_codes") or [])
        saved.insert(0, tracking_code)
        session["guest_tracking_codes"] = saved[:15]

        return render_template("customer/order_success.html", order=order)

    return render_template(
        "customer/order.html",
        print_tariffs=print_tariffs,
        bind_tariffs=bind_tariffs,
        transfer_info=current_app.config["TRANSFER_ACCOUNT_INFO"],
    )


@customer_bp.route("/tamu/lacak", methods=["GET", "POST"])
def track():
    code = (request.values.get("kode") or "").strip().upper()
    order = None
    if code:
        order = (
            db.session.query(Order)
            .filter(db.func.upper(Order.tracking_code) == code)
            .first()
        )
        if not order:
            flash("Pesanan dengan kode pelacakan tersebut tidak ditemukan.", "warning")
        else:
            saved = list(session.get("guest_tracking_codes") or [])
            if order.tracking_code not in saved:
                saved.insert(0, order.tracking_code)
                session["guest_tracking_codes"] = saved[:15]

    current_step_idx = -1
    if order and order.status in ORDER_STEPS:
        current_step_idx = ORDER_STEPS.index(order.status)

    saved_codes = session.get("guest_tracking_codes") or ["PK-TRK-DEMO0001", "PK-TRK-DEMO0002", "PK-TRK-DEMO0003"]
    return render_template(
        "customer/track.html",
        code=code,
        order=order,
        order_steps=ORDER_STEPS,
        current_step_idx=current_step_idx,
        saved_codes=saved_codes[:4],
    )


@customer_bp.route("/tamu/tarif")
def tariffs():
    print_tariffs = (
        db.session.query(ServiceTariff)
        .filter_by(category="cetak", is_active=True)
        .order_by(ServiceTariff.id.asc())
        .all()
    )
    bind_tariffs = (
        db.session.query(ServiceTariff)
        .filter_by(category="jilid", is_active=True)
        .order_by(ServiceTariff.id.asc())
        .all()
    )
    return render_template("customer/tariffs.html", print_tariffs=print_tariffs, bind_tariffs=bind_tariffs)


@customer_bp.route("/tamu/riwayat")
def history():
    orders = _get_guest_orders_from_session()
    return render_template("customer/history.html", orders=orders)


@customer_bp.route("/api/hitung-estimasi", methods=["GET"])
def api_calculate_estimate():
    try:
        print_id = int(request.args.get("print_id") or 0)
        bind_id = int(request.args.get("bind_id") or 0) if request.args.get("bind_id") else 0
        pages = int(request.args.get("pages") or 1)
        copies = int(request.args.get("copies") or 1)
        p = db.session.get(ServiceTariff, print_id)
        b = db.session.get(ServiceTariff, bind_id) if bind_id else None
        res = calculate_order_total(p.price if p else 0, pages, copies, b.price if b else 0)
        return jsonify(res)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
