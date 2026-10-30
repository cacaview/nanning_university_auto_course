import base64
import binascii

from flask import Flask, jsonify, request
import ddddocr


MAX_REQUEST_BYTES = 2 * 1024 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES
ocr = ddddocr.DdddOcr()


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"msg": "请求图片过大"}), 413


@app.get("/")
def index():
    return jsonify({"status": "ok", "endpoint": "/api/ocr/image"})


@app.post("/api/ocr/image")
def ocr_image():
    if not request.is_json:
        return jsonify({"msg": "请求头必须为application/json"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"msg": "请求体必须是JSON对象"}), 400

    img_base64 = data.get("img_base64")
    if not isinstance(img_base64, str) or not img_base64:
        return jsonify({"msg": "img_base64必须是非空字符串"}), 400

    try:
        img_bytes = base64.b64decode(img_base64, validate=True)
    except (binascii.Error, ValueError):
        return jsonify({"msg": "img_base64不是有效的Base64编码"}), 400

    if not img_bytes:
        return jsonify({"msg": "图片数据不能为空"}), 400

    try:
        result = ocr.classification(img_bytes)
    except Exception:
        app.logger.exception("OCR识别失败")
        return jsonify({"msg": "识别失败，请检查图片或OCR模型"}), 500

    return jsonify({"result": result}), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
