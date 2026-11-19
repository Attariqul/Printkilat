from datetime import datetime, timezone
from typing import Optional
from flask_login import UserMixin
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash
from app.extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Operator(UserMixin, db.Model):
    __tablename__ = "operators"
    __table_args__ = (
        CheckConstraint("role IN ('operator', 'owner')", name="ck_operators_role"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="operator")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    verified_payments: Mapped[list["PaymentRecord"]] = relationship(back_populates="verifier")
    status_changes: Mapped[list["OrderStatusLog"]] = relationship(back_populates="operator")

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password, method="pbkdf2:sha256")

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)


class ServiceTariff(db.Model):
    __tablename__ = "service_tariffs"
    __table_args__ = (
        CheckConstraint("category IN ('cetak', 'jilid')", name="ck_tariff_category"),
        CheckConstraint("paper_size IN ('A4', 'F4') OR paper_size IS NULL", name="ck_tariff_paper_size"),
        CheckConstraint("color_mode IN ('BW', 'Color') OR color_mode IS NULL", name="ck_tariff_color_mode"),
        CheckConstraint("price >= 0", name="ck_tariff_non_negative_price"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    paper_size: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    color_mode: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class Order(db.Model):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected')",
            name="ck_orders_status",
        ),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_non_negative"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    queue_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    tracking_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False, default="Pelanggan Tamu")
    customer_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending", index=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    file_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    item: Mapped["OrderItem"] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    file: Mapped["OrderFile"] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    payment: Mapped["PaymentRecord"] = relationship(
        back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    status_logs: Mapped[list["OrderStatusLog"]] = relationship(
        back_populates="order",
        order_by="OrderStatusLog.id.asc()",
        cascade="all, delete-orphan",
    )


class OrderItem(db.Model):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("print_unit_price >= 0", name="ck_order_item_print_price"),
        CheckConstraint("bind_unit_price >= 0", name="ck_order_item_bind_price"),
        CheckConstraint("page_count > 0", name="ck_order_item_page_positive"),
        CheckConstraint("copies > 0", name="ck_order_item_copies_positive"),
        CheckConstraint("subtotal_print >= 0", name="ck_order_item_subtotal_print"),
        CheckConstraint("subtotal_bind >= 0", name="ck_order_item_subtotal_bind"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    print_tariff_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("service_tariffs.id"), nullable=False
    )
    print_tariff_name: Mapped[str] = mapped_column(String(120), nullable=False)
    paper_size: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    color_mode: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    print_unit_price: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    copies: Mapped[int] = mapped_column(Integer, nullable=False)
    bind_tariff_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("service_tariffs.id"), nullable=True
    )
    bind_tariff_name: Mapped[str] = mapped_column(String(120), nullable=False, default="Tanpa jilid")
    bind_unit_price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    subtotal_print: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal_bind: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    order: Mapped["Order"] = relationship(back_populates="item")


class OrderFile(db.Model):
    __tablename__ = "order_files"
    __table_args__ = (
        CheckConstraint("file_size_bytes > 0", name="ck_order_file_size_positive"),
        CheckConstraint("detected_pages IS NULL OR detected_pages > 0", name="ck_order_file_pages_positive"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    detected_pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    order: Mapped["Order"] = relationship(back_populates="file")


class PaymentRecord(db.Model):
    __tablename__ = "payment_records"
    __table_args__ = (
        CheckConstraint("method IN ('cash', 'transfer')", name="ck_payment_method"),
        CheckConstraint("status IN ('unpaid', 'pending_verification', 'paid')", name="ck_payment_status"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    method: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="unpaid")
    proof_stored_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    proof_original_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verified_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("operators.id"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    order: Mapped["Order"] = relationship(back_populates="payment")
    verifier: Mapped[Optional["Operator"]] = relationship(back_populates="verified_payments")


class OrderStatusLog(db.Model):
    __tablename__ = "order_status_logs"
    __table_args__ = (
        CheckConstraint(
            "from_status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected') OR from_status IS NULL",
            name="ck_status_log_from",
        ),
        CheckConstraint(
            "to_status IN ('pending', 'confirmed', 'printing', 'ready', 'completed', 'rejected')",
            name="ck_status_log_to",
        ),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    to_status: Mapped[str] = mapped_column(String(24), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("operators.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    order: Mapped["Order"] = relationship(back_populates="status_logs")
    operator: Mapped[Optional["Operator"]] = relationship(back_populates="status_changes")
