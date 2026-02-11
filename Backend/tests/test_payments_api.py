from fastapi.testclient import TestClient
from app import app
from app.routes import payments as payments_module


class FakeTx:
    def __init__(self, tx_hash, memo_map):
        self._tx_hash = tx_hash
        self._memo_map = memo_map

    def to_xdr(self):
        return f"XDR_FOR_{self._tx_hash}"


class FakeTransactionsAPI:
    def __init__(self, memo_map):
        self._memo_map = memo_map

    def transaction(self, tx_hash):
        class Caller:
            def __init__(self, memo):
                self._memo = memo

            def call(self):
                return {"memo": self._memo}

        return Caller(self._memo_map.get(tx_hash))


class FakeServer:
    def __init__(self, memo_map):
        self._memo_map = memo_map

    def transactions(self):
        return FakeTransactionsAPI(self._memo_map)


class FakePaymentService:
    def __init__(self):
        self._payments = [
            {"id": "1", "from": "GALICE", "to": "GPLAT", "amount": "10", "transaction_hash": "tx1", "paging_token": "1"},
        ]
        self.stellar = type("S", (), {"server": FakeServer({"tx1": "deposit:abc123"})})()

    def get_payment_history(self, public_key, limit=50, cursor=None):
        return self._payments

    def get_incoming_payments(self, public_key, limit=50):
        return [p for p in self._payments if p.get("to") == public_key]

    def get_payment_stats(self, public_key):
        return {"total_received": 10.0, "total_sent": 0.0, "received_count": 1, "sent_count": 0, "unique_senders": 1, "unique_recipients": 0}

    def send_payment(self, sender_keypair, destination_public_key, amount):
        return {"successful": True, "hash": "submitted_tx"}

    def build_payment_transaction(self, source_public_key, destination_public_key, amount):
        return FakeTx("unsigned", {"unsigned": ""})


def test_payments_endpoints(monkeypatch):
    client = TestClient(app)

    # override dependencies
    app.dependency_overrides[payments_module.get_payment_service] = lambda: fake
    app.dependency_overrides[payments_module.get_current_user] = lambda: {"id": "test"}
    # use realistic test Stellar platform keys (56-char formats)
    payments_module.settings.stellar_platform_public = "G" + "A" * 55
    payments_module.settings.stellar_platform_secret = "S" + "B" * 55
    # ensure fake payments target the configured platform public key
    fake._payments[0]["to"] = payments_module.settings.stellar_platform_public

    # GET payment history (use a long enough public key to pass validation)
    test_pk = "G" + "A" * 20
    r = client.get(f"/payments/{test_pk}")
    assert r.status_code == 200
    assert "payments" in r.json()

    # create deposit
    r = client.post("/payments/deposit/create", json={"amount": "10"})
    assert r.status_code == 200
    body = r.json()
    assert "memo" in body

    # verify deposit (memo present in fake server)
    memo = "deposit:abc123"
    r = client.post("/payments/deposit/verify", json={"memo": memo})
    assert r.status_code == 200
    assert r.json().get("found") is True

    # withdraw (server-side signing path since test secret is configured)
    dest_pk = "G" + "B" * 55
    r = client.post("/payments/withdraw", json={"destination": dest_pk, "amount": "1"})
    assert r.status_code == 200
    assert r.json().get("submitted") is True
