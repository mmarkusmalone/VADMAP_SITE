# VADMAP_PROD/start.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import json

from load_model import process_entry  # <--- this is the model function

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:5173"}})
BASE_DIR = Path(__file__).resolve().parent
UNPROCESSED_PATH = BASE_DIR / "public/unprocessed.json"
PROCESSED_PATH = BASE_DIR / "public/processed.json"

# UNPROCESSED_PATH = Path("VADMAP_PROD/public/unprocessed.json")
# PROCESSED_PATH = Path("VADMAP_PROD/public/processed.json")

@app.route('/api/save-entry', methods=['POST'])
def save_entry():
    print("✅ Route hit")
    if not request.is_json:
        return jsonify({"error": "Invalid request format. Expected JSON."}), 400

    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({"error": f"Failed to parse JSON: {str(e)}"}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "JSON must be an object with an 'unprocessed' key."}), 400

    new_unprocessed = data.get("unprocessed")

    if not new_unprocessed:
        return jsonify({"error": "Missing unprocessed entry"}), 400

    date = new_unprocessed.get("date")
    text = new_unprocessed.get("text")
    print(f"Received unprocessed entry: {new_unprocessed}")

    if not date or not text:
        return jsonify({"error": "Missing date or text"}), 400

    # --- Save to unprocessed.json ---
    unprocessed_data = json.loads(UNPROCESSED_PATH.read_text())
    unprocessed_data.setdefault("entries_unprocessed", []).append(new_unprocessed)
    with UNPROCESSED_PATH.open("w") as f:
        json.dump(unprocessed_data, f, indent=2)

    # --- Process the entry using model ---
    print(f"Processing entry: {text}")
    vad = process_entry(text)

    # --- Save to processed.json ---
    new_processed = {
        "date": date,
        "text": vad
    }

    processed_data = json.loads(PROCESSED_PATH.read_text())
    processed_data.setdefault("entries_processed", []).append(new_processed)
    with PROCESSED_PATH.open("w") as f:
        json.dump(processed_data, f, indent=2)

    return jsonify({
        "status": "success",
        "processed": new_processed
    }), 200

if __name__ == "__main__":
    print("🔥 Flask is starting...")
    app.run(port=5050, host='0.0.0.0', debug=False, use_reloader=False)