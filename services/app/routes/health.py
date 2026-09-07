from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


# NOTE: unlike the backend (/api/v1/health), this route has no version
# prefix. The versioning scheme for internal service routes is still
# undefined; it will be settled in SPEC-C03.
@health_bp.get("/health")
def health():
    """Liveness probe. Mirrors the backend response envelope."""
    return jsonify(ok=True, message="Data service is healthy", data={"status": "UP"})
