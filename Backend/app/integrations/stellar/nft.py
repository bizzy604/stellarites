"""Stellar NFT (review certificate) creation and retrieval using Claimable Balances."""
import base64
from stellar_sdk import Keypair, Network, Server, TransactionBuilder, Asset
from stellar_sdk.exceptions import Ed25519PublicKeyInvalidError, NotFoundError
from app.config import Config
from app.integrations.stellar.wallet import decrypt_secret # Assuming decrypt_secret is available for funding

# Initialize Horizon server
def _get_horizon_server():
    if Config.STELLAR_NETWORK == "TESTNET":
        return Server(horizon_url="https://horizon-testnet.stellar.org")
    return Server(horizon_url="https://horizon.stellar.org")

def _get_network_passphrase():
    if Config.STELLAR_NETWORK == "TESTNET":
        return Network.TESTNET_NETWORK_PASSPHRASE
    return Network.PUBLIC_NETWORK_PASSPHRASE

def mint_review_nft(
    reviewee_public_key: str,
    pdf_cid: str,
    asset_code_suffix: str, # Derived from SHA256(engagement_id + reviewer_id + timestamp)
    metadata: dict # rating, reviewer_type, role, duration, etc.
) -> dict:
    """
    Mints a new review NFT using a unique issuer and makes it claimable by the reviewee.
    Returns { asset_code, issuer_public_key, transaction_id, explorer_url }.
    """
    server = _get_horizon_server()
    network_passphrase = _get_network_passphrase()

    # 1. Generate fresh issuer keypair for this specific NFT
    issuer_keypair = Keypair.random()
    issuer_public_key = issuer_keypair.public_key
    issuer_secret = issuer_keypair.secret

    # Ensure funding account secret is available
    if not Config.STELLAR_FUNDING_SECRET:
        raise ValueError("STELLAR_FUNDING_SECRET is not configured for funding new accounts.")

    funding_keypair = Keypair.from_secret(Config.STELLAR_FUNDING_SECRET)
    funding_account = server.load_account(funding_keypair.public_key)

    # Asset code is RVW + unique suffix (max 12 chars total)
    asset_code = f"RVW{asset_code_suffix[:9]}".upper()
    asset = Asset(asset_code, issuer_public_key)

    # Build transaction to create issuer, add data, and make asset claimable
    tx_builder = (
        TransactionBuilder(
            source_account=funding_account,
            network_passphrase=network_passphrase,
            base_fee=100
        )
        .append_create_account_op(
            destination=issuer_public_key,
            starting_balance="5" # Min balance for issuer + enough for data entries + trustline to self
        )
    )

    # Add ManageData operations to the issuer account
    # Note: Stellar only allows str values for ManageData
    for key, value in metadata.items():
        tx_builder.append_manage_data_op(
            source=issuer_public_key,
            data_name=key,
            data_value=str(value).encode('utf-8')
        )
    tx_builder.append_manage_data_op(
        source=issuer_public_key,
        data_name="pdf_cid",
        data_value=pdf_cid.encode('utf-8')
    )
    tx_builder.append_manage_data_op(
        source=issuer_public_key,
        data_name="reviewee",
        data_value=reviewee_public_key.encode('utf-8')
    )

    # Lock the issuer account by setting master weight to 0
    # This prevents any further transactions from the issuer, making the NFT supply provably 1.
    tx_builder.append_set_options_op(
        source=issuer_public_key,
        master_weight=0
    )

    # Create Claimable Balance for 1 unit of the NFT to the reviewee
    tx_builder.append_create_claimable_balance_op(
        asset=asset,
        amount="1",
        claimants=[
            {"destination": reviewee_public_key, "predicate": {"unconditional": True}}
        ]
    )

    # Set timeout and build
    transaction = tx_builder.set_timeout(60).build()

    # Sign with funding account and new issuer account
    transaction.sign(funding_keypair)
    transaction.sign(issuer_keypair)

    # Submit to Horizon
    response = server.submit_transaction(transaction)

    explorer_url = f"https://stellar.expert/explorer/{'testnet' if Config.STELLAR_NETWORK == 'TESTNET' else 'public'}/tx/{response['hash']}"

    return {
        "asset_code": asset_code,
        "issuer_public_key": issuer_public_key,
        "transaction_id": response['hash'],
        "explorer_url": explorer_url,
    }


def get_reviews_for_account(stellar_public_key: str) -> list[dict]:
    """
    Retrieves all review NFTs (Claimable Balances and owned assets)
    for a given Stellar public key.

    Uses the synchronous stellar-sdk Server (`.call()` not `.execute()`).
    Returns an empty list if the account doesn't exist on the network yet.
    """
    server = _get_horizon_server()

    # 1. Fetch Claimable Balances
    try:
        cb_results = server.claimable_balances().for_claimant(stellar_public_key).call()
    except Exception:
        cb_results = {"_embedded": {"records": []}}

    # 2. Fetch account details (for owned assets)
    account_details = None
    try:
        account_details = server.accounts().account_id(stellar_public_key).call()
    except Exception:
        pass  # Account may not exist on network

    issuer_keys: list[str] = []
    metadata_context: list[dict] = []

    # Identify Claimable Review NFTs
    for cb in cb_results.get("_embedded", {}).get("records", []):
        asset_code = cb.get("asset", "").split(":")[0] if ":" in cb.get("asset", "") else cb.get("asset_code", "")
        asset_type = cb.get("asset_type", "")
        issuer = cb.get("asset", "").split(":")[-1] if ":" in cb.get("asset", "") else cb.get("asset_issuer", "")

        if not asset_code:
            # Claimable balance asset field may be "CODE:ISSUER" format
            raw = cb.get("asset", "")
            if ":" in raw:
                asset_code, issuer = raw.split(":", 1)

        if asset_code.startswith("RVW"):
            issuer_keys.append(issuer)
            metadata_context.append({"asset_code": asset_code, "status": "claimable", "issuer": issuer})

    # Identify Owned Review NFTs
    if account_details:
        for balance in account_details.get("balances", []):
            ac = balance.get("asset_code", "")
            if ac.startswith("RVW") and balance.get("balance") == "1.0000000":
                issuer = balance.get("asset_issuer", "")
                issuer_keys.append(issuer)
                metadata_context.append({"asset_code": ac, "status": "owned", "issuer": issuer})

    if not issuer_keys:
        return []

    # 3. Fetch issuer account data for each NFT
    reviews: list[dict] = []
    for i, issuer_pk in enumerate(issuer_keys):
        try:
            issuer_acc = server.accounts().account_id(issuer_pk).call()
            raw_data = issuer_acc.get("data", {})
            # Decode base64 values
            decoded = {}
            for k, v in raw_data.items():
                try:
                    decoded[k] = base64.b64decode(v).decode("utf-8")
                except Exception:
                    pass

            review_data = _extract_review_data_from_manage_data(decoded)
            if review_data and review_data.get("reviewee") == stellar_public_key:
                ctx = metadata_context[i]
                review_data.update({
                    "asset_code": ctx["asset_code"],
                    "issuer_public_key": ctx["issuer"],
                    "status": ctx["status"],
                })
                reviews.append(review_data)
        except Exception:
            continue

    return reviews


def _extract_review_data_from_manage_data(data: dict) -> dict:
    """Extract relevant review metadata from an already-decoded data dict."""
    expected_keys = {"pdf_cid", "rating", "reviewer_type", "role", "duration", "reviewee"}
    return {k: v for k, v in data.items() if k in expected_keys}
