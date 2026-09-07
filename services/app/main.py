import os

from flask import Flask

from app.routes.health import health_bp


def create_app() -> Flask:
    """Application factory. Data processing blueprints register here."""
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.getenv("DATA_SERVICE_PORT", "5001")))
