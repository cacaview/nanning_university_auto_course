import ddddocr
from pathlib import Path

ocr = ddddocr.DdddOcr(beta=True)  # 切换为第二套OCR模型
with (Path(__file__).resolve().parent / "code.png").open("rb") as f:
    image = f.read()
result = ocr.classification(image)
print(result)
