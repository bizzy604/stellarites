from fastapi.testclient import TestClient
import traceback
from app import app
from app.routes import payments as payments_module


class FakePaymentService:
    def __init__(self):
        self._payments = [
            {"id": "1", "from": "GALICE", "to": "GPLAT", "amount": "10", "transaction_hash": "tx1", "paging_token": "1"},
        ]
        class Caller:
            def __init__(self, memo):
                self._memo = memo

            def call(self):
                return {"memo": self._memo}

        class FakeTransactionsAPI:
            def __init__(self, memo_map):
                self._memo_map = memo_map

            def transaction(self, tx_hash):
                return Caller(self._memo_map.get(tx_hash))

        class FakeServer:
            def __init__(self, memo_map):
                self._memo_map = memo_map

            def transactions(self):
                return FakeTransactionsAPI(self._memo_map)

        self.stellar = type("S", (), {"server": FakeServer({"tx1": "deposit:abc123"})})()

    def get_payment_history(self, public_key, limit=50, cursor=None):
        return self._payments

    def get_incoming_payments(self, public_key, limit=50):
        return [p for p in self._payments if p.get("to") == public_key]


def main():
    fake = FakePaymentService()
    app.dependency_overrides[payments_module.get_payment_service] = lambda: fake
    app.dependency_overrides[payments_module.get_current_user] = lambda: {"id": "test"}

    client = TestClient(app, raise_server_exceptions=True)
    try:
        r = client.post("/payments/deposit/verify", json={"memo": "deposit:abc123"})
        print("STATUS", r.status_code)
        print(r.text)
    except Exception:
        traceback.print_exc()


if __name__ == '__main__':
    main()
