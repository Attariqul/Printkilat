import io
import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.extensions import db
from app.models import Operator, Order, OrderItem, OrderStatusLog, PaymentRecord, ServiceTariff
from app.utils import (
    calculate_order_total,
    format_queue_number,
    format_rupiah,
    generate_tracking_code,
    seven_days_from_now,
    validate_status_transition,
)


@pytest.fixture
def app():
    application = create_app("testing")
    with application.app_context():
        db.create_all()
        op = Operator(email="op@test.id", name="Tester")
        op.set_password("secret123")
        t_print = ServiceTariff(
            name="Print hitam-putih A4",
            category="cetak",
            paper_size="A4",
            color_mode="BW",
            price=500,
            is_active=True,
        )
        t_bind = ServiceTariff(
            name="Jilid lakban",
            category="jilid",
            paper_size=None,
            color_mode=None,
            price=3000,
            is_active=True,
        )
        db.session.add_all([op, t_print, t_bind])
        db.session.commit()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_pricing_formula_and_formatting():
    res = calculate_order_total(print_rate=500, pages=12, copies=2, bind_rate=3000)
    assert res["print_subtotal"] == 12000
    assert res["bind_subtotal"] == 6000
    assert res["total"] == 18000
    assert format_rupiah(res["total"]) == "Rp 18.000"


def test_queue_and_tracking_code_generation():
    assert format_queue_number("2026-11-19", 1) == "PK-20261119-001"
    code = generate_tracking_code()
    assert code.startswith("PK-TRK-")
    assert len(code) == 15


def test_status_transition_state_machine():
    ok, _ = validate_status_transition("pending", "confirmed")
    assert ok is True

    bad_skip, _ = validate_status_transition("pending", "ready")
    assert bad_skip is False

    bad_reject, _ = validate_status_transition("pending", "rejected", "")
    assert bad_reject is False

    ok_reject, _ = validate_status_transition("pending", "rejected", "File rusak")
    assert ok_reject is True


def test_database_check_constraints_and_relations(app):
    with app.app_context():
        # Negative tariff violates CHECK constraint
        bad_tariff = ServiceTariff(name="Invalid", category="cetak", price=-500)
        db.session.add(bad_tariff)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

        # Invalid status violates CHECK constraint
        bad_order = Order(
            queue_number="PK-20261119-999",
            tracking_code="PK-TRK-BAD00001",
            status="unknown_status",
            total_amount=1000,
            file_expires_at=seven_days_from_now(),
        )
        db.session.add(bad_order)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_guest_order_creation_and_operator_workflow(client, app):
    with app.app_context():
        print_t = db.session.query(ServiceTariff).filter_by(category="cetak").first()
        bind_t = db.session.query(ServiceTariff).filter_by(category="jilid").first()
        print_id, bind_id = print_t.id, bind_t.id

    # 1. Guest submits order without logging in
    res = client.post(
        "/tamu/pesan",
        data={
            "print_tariff_id": str(print_id),
            "bind_tariff_id": str(bind_id),
            "page_count": "10",
            "copies": "2",
            "payment_method": "cash",
            "notes": "Cetak bolak-balik",
            "document": (io.BytesIO(b"%PDF-1.4\n%%EOF"), "makalah.pdf"),
        },
        content_type="multipart/form-data",
    )
    assert res.status_code == 200
    assert b"Pesanan berhasil dikirim!" in res.data

    with app.app_context():
        order = db.session.query(Order).first()
        assert order is not None
        assert order.total_amount == 16000  # (500 * 10 * 2) + (3000 * 2)
        order_id = order.id

    # 2. Operator logs in and advances order status
    login_res = client.post(
        "/operator/login",
        data={"email": "op@test.id", "password": "secret123"},
        follow_redirects=True,
    )
    assert login_res.status_code == 200

    status_res = client.post(
        f"/operator/pesanan/{order_id}/status",
        data={"status": "confirmed"},
        follow_redirects=True,
    )
    assert status_res.status_code == 200
    with app.app_context():
        updated = db.session.get(Order, order_id)
        assert updated.status == "confirmed"
        assert len(updated.status_logs) == 2
