from flask import Flask, request, jsonify
import base64
import ddddocr

app = Flask(__name__)
ocr = ddddocr.DdddOcr()

@app.route('/api/ocr/image', methods=['POST'])
def ocr_image():
    try:
        # 检查请求头是否为application/json
        if request.headers.get('Content-Type') != 'application/json':
            return jsonify({"msg": "请求头必须为application/json"}), 400

        # 获取请求体中的JSON数据
        data = request.get_json()

        # 检查请求体中是否包含img_base64字段
        if 'img_base64' not in data:
            return jsonify({"msg": "请求体中必须包含img_base64字段"}), 400

        # 获取Base64编码的图片数据
        img_base64 = data['img_base64']

        try:
            # 解码Base64图片数据
            img_bytes = base64.b64decode(img_base64)

            # 使用ddddocr进行验证码识别
            result = ocr.classification(img_bytes)

            # 返回成功响应
            return jsonify({"result": result}), 200
        except Exception as e:
            # 识别失败，返回错误信息
            return jsonify({"msg": f"识别失败: {str(e)}"}), 500
    except Exception as e:
        # 其他错误，返回错误信息
        return jsonify({"msg": f"发生未知错误: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)