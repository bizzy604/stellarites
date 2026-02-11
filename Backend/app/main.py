from flask import Flask, jsonify, request

from app.config import Config

app = Flask(__name__)
app.config["USSD_API_KEY"] = Config.USSD_API_KEY or None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/ussd", methods=["POST"])
def ussd():
    api_key = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if app.config.get("USSD_API_KEY") and api_key != app.config.get("USSD_API_KEY"):
        return "", 403

    session_id = request.form.get("sessionId", "")
    phone_number = request.form.get("phoneNumber", "")
    text = request.form.get("text", "")

    from app.ussd.handler import handle_ussd
    response_text = handle_ussd(session_id, phone_number, text)

    return response_text, 200, {"Content-Type": "text/plain; charset=utf-8"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
