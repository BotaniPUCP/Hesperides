from app.main import create_app


def test_health_returns_success_envelope():
    client = create_app().test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json == {
        "ok": True,
        "message": "Data service is healthy",
        "data": {"status": "UP"},
    }
