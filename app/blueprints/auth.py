from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from app.extensions import db
from app.models import Operator

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/operator/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("operator.queue"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""

        if not email or not password:
            flash("Email dan kata sandi wajib diisi.", "danger")
            return render_template("entry.html", focus_operator=True), 400

        operator = db.session.query(Operator).filter(db.func.lower(Operator.email) == email).first()
        if not operator or not operator.check_password(password):
            flash("Email atau kata sandi operator salah.", "danger")
            return render_template("entry.html", focus_operator=True), 401

        login_user(operator, remember=False)
        return redirect(url_for("operator.queue"))

    return render_template("entry.html", focus_operator=True)


@auth_bp.route("/operator/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    flash("Anda telah keluar dari akun operator.", "info")
    return redirect(url_for("customer.entry"))
