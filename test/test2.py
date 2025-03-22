import ddddocr

ocr = ddddocr.DdddOcr(beta=True)  # 切换为第二套OCR模型
with open("code.png", "rb") as f:
    image = f.read()
result = ocr.classification(image)
print(result)
