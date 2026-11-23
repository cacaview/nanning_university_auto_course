# 南宁理工学院自动刷课脚本

自用的刷课脚本，使用本地ocr。

## 本地 OCR 服务启动

项目使用 `uv` 管理 Python 版本和依赖。先安装 [uv](https://docs.astral.sh/uv/getting-started/installation/)，然后：

- Windows：双击 `start.bat`
- macOS / Linux：在终端运行 `./start.sh`

首次启动时，uv 会自动准备 Python 3.12 和依赖。服务启动后监听 `http://127.0.0.1:5001`，关闭终端或按 `Ctrl+C` 停止。

也可以手动运行：

```sh
uv sync
uv run main.py
```

## 感谢

使用了以下开源项目：

https://github.com/sml2h3/ddddocr/


https://greasyfork.org/zh-CN/scripts/518964-%E5%8D%97%E5%AE%81%E7%90%86%E5%B7%A5%E5%AD%A6%E9%99%A2%E8%87%AA%E5%8A%A8%E5%88%B7%E8%AF%BE

以上大佬都是mvp，本人只是躺赢狗。

## 使用方法

1.[安装](https://microsoftedge.microsoft.com/addons/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4%E6%B5%8B%E8%AF%95%E7%89%88/fcmfnpggmnlmfebfghbfnillijihnkoh)油猴脚本（不用我多说了吧？）

**注意！需要在插件页面打开浏览器的插件开发者模式，以便使用插件**

2.启动本项目的 OCR 服务（见[本地 OCR 服务启动](#本地-ocr-服务启动)），并保持服务运行。

3.由于greasyfork在国内被墙，暂时不会上传至greasyfork。请打开项目中的 [captcha.js](captcha.js)，复制完整代码到篡改猴；已安装旧版的请替换全部内容并保存。当前脚本请求 `127.0.0.1:5001`。

4.添加方法：打开拓展>>篡改猴>>添加新脚本>>粘贴代码并保存。

5.可以开始刷网课了，建议将浏览器放置在前台。
