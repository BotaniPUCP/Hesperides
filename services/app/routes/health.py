from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    """Liveness probe. Mirrors the backend response envelope."""
    return jsonify(ok=True, message="Data service is healthy", data={"status": "UP"})
