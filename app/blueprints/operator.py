import os
from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from flask_login import current_user, login_required
from app.extensions import db
from app.models import Order, OrderStatusLog, ServiceTariff, utcnow
from app.utils import ALLOWED_TRANSITIONS, validate_status_transition

operator_bp = Blueprint("operator", __name__, url_prefix="/operator")


@operator_bp.route("/antrean")
@login_required
def queue():
    status_filter = request.args.get("status", "all")
    search_q = (request.args.get("q") or "").strip().lower()

    all_orders = db.session.query(Order).order_by(Order.created_at.desc()).all()
    counts = {
        "pending": sum(1 for o in all_orders if o.status == "pending"),
        "confirmed_printing": sum(1 for o in all_orders if o.status in ("confirmed", "printing")),
        "ready": sum(1 for o in all_orders if o.status == "ready"),
    }

    active_orders = [o for o in all_orders if o.status not in ("completed", "rejected")]
    if status_filter != "all":
        active_orders = [o for o in active_orders if o.status == status_filter]
    if search_q:
        active_orders = [
            o
            for o in active_orders
            if search_q in o.queue_number.lower()
            or search_q in o.customer_name.lower()
            or (o.file and search_q in o.file.original_name.lower())
        ]

    return render_template(
        "operator/queue.html",
        orders=active_orders,
        counts=counts,
        status_filter=status_filter,
        search_q=request.args.get("q", ""),
    )


@operator_bp.route("/pesanan/<int:order_id>")
@login_required
def order_detail(order_id: int):
    order = db.session.get(Order, order_id)
    if not order:
        abort(404)
    next_statuses = [s for s in ALLOWED_TRANSITIONS.get(order.status, ()) if s != "rejected"]
    can_reject = "rejected" in ALLOWED_TRANSITIONS.get(order.status, ())
    return render_template(
        "operator/order_detail.html",
        order=order,
        next_statuses=next_statuses,
        can_reject=can_reject,
    )


@operator_bp.route("/pesanan/<int:order_id>/unduh")
@login_required
def download_file(order_id: int):
    order = db.session.get(Order, order_id)
    if not order or not order.file or order.file.deleted_at:
        abort(404)
    upload_dir = current_app.config["PROTECTED_UPLOAD_FOLDER"]
    stored_name = os.path.basename(order.file.stored_name)
    if not os.path.exists(os.path.join(upload_dir, stored_name)):
        abort(404)
    return send_from_directory(
        upload_dir,
        stored_name,
        as_attachment=True,
        download_name=order.file.original_name,
    )


@operator_bp.route("/pesanan/<int:order_id>/bukti")
@login_required
def view_payment_proof(order_id: int):
    order = db.session.get(Order, order_id)
    if not order or not order.payment or not order.payment.proof_stored_name:
        abort(404)
    upload_dir = current_app.config["PROTECTED_UPLOAD_FOLDER"]
    stored_name = os.path.basename(order.payment.proof_stored_name)
    return send_from_directory(upload_dir, stored_name)


@operator_bp.route("/pesanan/<int:order_id>/lunas", methods=["POST"])
@login_required
def mark_paid(order_id: int):
    order = db.session.get(Order, order_id)
    if not order:
        abort(404)
    order.payment.status = "paid"
    order.payment.verified_by = current_user.id
    order.payment.verified_at = utcnow()
    db.session.commit()
    flash("Pembayaran ditandai Lunas.", "success")
    return redirect(url_for("operator.order_detail", order_id=order.id))


@operator_bp.route("/pesanan/<int:order_id>/status", methods=["POST"])
@login_required
def update_status(order_id: int):
    order = db.session.get(Order, order_id)
    if not order:
        abort(404)

    next_status = (request.form.get("status") or "").strip()
    rejection_reason = (request.form.get("rejection_reason") or "").strip()

    ok, err = validate_status_transition(order.status, next_status, rejection_reason)
    if not ok:
        flash(err or "Perubahan status gagal.", "danger")
        return redirect(url_for("operator.order_detail", order_id=order.id))

    prev_status = order.status
    order.status = next_status
    if next_status == "rejected":
        order.rejection_reason = rejection_reason

    db.session.add(
        OrderStatusLog(
            order_id=order.id,
            from_status=prev_status,
            to_status=next_status,
            note=rejection_reason if next_status == "rejected" else None,
            changed_by=current_user.id,
        )
    )
    db.session.commit()
    flash("Status pesanan berhasil diperbarui.", "success")
    return redirect(url_for("operator.order_detail", order_id=order.id))


@operator_bp.route("/tarif", methods=["GET", "POST"])
@login_required
def manage_tariffs():
    if request.method == "POST":
        tariff_id = request.form.get("tariff_id")
        name = (request.form.get("name") or "").strip()
        category = "jilid" if request.form.get("category") == "jilid" else "cetak"
        paper_size = request.form.get("paper_size") if category == "cetak" else None
        color_mode = request.form.get("color_mode") if category == "cetak" else None
        is_active = request.form.get("is_active") == "on"
        try:
            price = int(request.form.get("price") or 0)
        except ValueError:
            price = -1

        if len(name) < 2 or price < 0:
            flash("Nama layanan minimal 2 karakter dan tarif tidak boleh negatif.", "danger")
            return redirect(url_for("operator.manage_tariffs"))

        if tariff_id and tariff_id != "new":
            tariff = db.session.get(ServiceTariff, int(tariff_id))
            if tariff:
                tariff.name = name
                tariff.category = category
                tariff.paper_size = paper_size
                tariff.color_mode = color_mode
                tariff.price = price
                tariff.is_active = is_active
                db.session.commit()
                flash("Tarif layanan berhasil diperbarui.", "success")
        else:
            db.session.add(
                ServiceTariff(
                    name=name,
                    category=category,
                    paper_size=paper_size,
                    color_mode=color_mode,
                    price=price,
                    is_active=is_active,
                )
            )
            db.session.commit()
            flash("Layanan tarif baru berhasil ditambahkan.", "success")

        return redirect(url_for("operator.manage_tariffs"))

    tariffs = db.session.query(ServiceTariff).order_by(ServiceTariff.category.asc(), ServiceTariff.id.asc()).all()
    edit_id = request.args.get("edit")
    selected = db.session.get(ServiceTariff, int(edit_id)) if edit_id and edit_id.isdigit() else (tariffs[0] if tariffs else None)
    return render_template("operator/tariffs.html", tariffs=tariffs, selected=selected)


@operator_bp.route("/riwayat")
@login_required
def history():
    orders = (
        db.session.query(Order)
        .filter(Order.status.in_(("completed", "rejected")))
        .order_by(Order.updated_at.desc())
        .all()
    )
    return render_template("operator/history.html", orders=orders)
