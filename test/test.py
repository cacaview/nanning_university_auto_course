import base64
import requests

# 读取图片文件并进行 Base64 编码
with open('code.png', 'rb') as f:
    img_bytes = f.read()
img_base64 = base64.b64encode(img_bytes).decode('utf-8')

# 发送 POST 请求
url = 'http://127.0.0.1:5000/api/ocr/image'
headers = {'Content-Type': 'application/json'}
data = {'img_base64': img_base64}
response = requests.post(url, headers=headers, json=data)

# 打印响应结果
print(response.json())