from pathlib import Path
from flask import Flask
from config import CONFIG_MAP
from app.extensions import csrf, db, login_manager, migrate
from app.models import Operator
from app.utils import (
    SHORT_STATUS_LABELS,
    STATUS_LABELS,
    format_file_size,
    format_rupiah,
)


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")
    cfg_class = CONFIG_MAP.get(config_name, CONFIG_MAP["development"])
    app.config.from_object(cfg_class)

    Path(app.config["PROTECTED_UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)

    @login_manager.user_loader
    def load_operator(user_id: str) -> Operator | None:
        return db.session.get(Operator, int(user_id))

    # Jinja2 template filters & globals
    @app.template_filter("rupiah")
    def rupiah_filter(value: int | float | None) -> str:
        return format_rupiah(value)

    @app.template_filter("filesize")
    def filesize_filter(value: int) -> str:
        return format_file_size(value)

    @app.context_processor
    def inject_helpers():
        return {
            "STATUS_LABELS": STATUS_LABELS,
            "SHORT_STATUS_LABELS": SHORT_STATUS_LABELS,
            "STORE_NAME": app.config["STORE_NAME"],
            "OPERATIONAL_HOURS": app.config["OPERATIONAL_HOURS"],
            "STORE_LOCATION": app.config["STORE_LOCATION"],
        }

    # Register modular blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.customer import customer_bp
    from app.blueprints.operator import operator_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(operator_bp)

    # Bootstrap database schema & initial seed in non-testing runs
    with app.app_context():
        db.create_all()
        if not app.config.get("TESTING"):
            from app.seed import seed_initial_data
            seed_initial_data(app.config["PROTECTED_UPLOAD_FOLDER"])

    return app
