# 南宁理工学院课程视频脚本

脚本使用本地 `ddddocr` 服务处理验证码。OCR 模型通过 PyPI 的 `ddddocr` 包安装；旧版源码副本保存在 `vendor/legacy_ddddocr/`，运行时不会从该目录导入。

## 环境要求

- Python 3.11 或 3.12
- [uv](https://docs.astral.sh/uv/)
- Tampermonkey 浏览器扩展

## 安装与启动

在项目目录运行：

```sh
uv sync
uv run python main.py
```

服务只监听本机 `127.0.0.1:5000`。打开 `http://127.0.0.1:5000/` 可查看服务状态。

## 安装浏览器脚本

在 Tampermonkey 中新建脚本，将 `captcha.js` 内容复制进去并保存。脚本只会匹配以下站点的课程页和登录页：

- `zxshixun.bwgl.cn`
- `gyxy.bwgl.cn`
- `mooc.bwgl.cn`
- `bwgl.duxingkej.com`

使用时保持本地 OCR 服务运行，并在课程播放期间让浏览器页面保持打开。

## 手动检查脚本

需要安装辅助依赖时运行 `uv sync --extra dev`。随后可从项目根目录运行：

```sh
uv run --extra dev python test/test2.py
uv run --extra dev python test/test.py
```

`test/test.py` 需要先启动 `main.py`；两段脚本都从自身所在目录读取 `code.png`，不依赖当前工作目录。
