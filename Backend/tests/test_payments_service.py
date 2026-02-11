from app.services.payments import PaymentService
from app.config import get_settings


def test_get_payment_stats():
    # prepare a PaymentService and monkeypatch get_payment_history
    # ensure no platform secret is present for the unit test
    get_settings().stellar_platform_secret = ""
    svc = PaymentService()

    public_key = "GTESTPUBLICKEY"

    sample_payments = [
        {"to": public_key, "from": "GALICE", "amount": "10"},
        {"to": "GBOB", "from": public_key, "amount": "5"},
        {"to": public_key, "from": "GCHARLIE", "amount": "2"},
    ]

    svc.get_payment_history = lambda public_key_arg, limit=50, cursor=None, order="desc": sample_payments

    stats = svc.get_payment_stats(public_key)

    assert stats["total_received"] == 12.0
    assert stats["received_count"] == 2
    assert stats["total_sent"] == 5.0
    assert stats["sent_count"] == 1
    assert stats["unique_senders"] >= 1
