// ==UserScript==
// @name         南宁理工学院自动刷课脚本
// @version      1.2
// @description  本地OCR辅助处理验证码，支持指定课程页和登录页
// @author       cacaview
// @match        *://zxshixun.bwgl.cn/user/node*
// @match        *://gyxy.bwgl.cn/user/node*
// @match        *://mooc.bwgl.cn/user/node*
// @match        *://bwgl.duxingkej.com/user/node*
// @match        *://zxshixun.bwgl.cn/user/login*
// @match        *://gyxy.bwgl.cn/user/login*
// @match        *://mooc.bwgl.cn/user/login*
// @match        *://bwgl.duxingkej.com/user/login*
// @grant        GM_xmlhttpRequest
// @license      MIT
// @namespace    yei
// @connect      127.0.0.1
// @connect      127.0.0.1:5000
// @downloadURL
// @updateURL
// ==/UserScript==

let current = 0;
let Timer = null;
let xuanxian = null;
let video = null;
let Text2 = null;
let captchaProcessing = false;
let captchaRetryAt = 0;

const OCR_URL = "http://127.0.0.1:5000/api/ocr/image";

function isCoursePage() {
    return window.location.pathname.includes("/user/node");
}

function isLoginPage() {
    return window.location.pathname.includes("/user/login");
}

function onDomReady(callback) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
        callback();
    }
}

function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        element.getClientRects().length > 0;
}

function findCaptchaLayer() {
    return $(".layui-layer-content:visible").filter(function () {
        return Boolean(this.querySelector("img") && this.querySelector("input"));
    }).first();
}

function findCaptchaImage(layer) {
    return layer.find("img").toArray().find(image =>
        isVisible(image) && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    );
}

function findCaptchaInput(layer) {
    return layer.find("input").toArray().find(input =>
        isVisible(input) && !input.disabled && input.type !== "hidden"
    );
}

function stopPlaybackMonitor() {
    if (Timer !== null) {
        clearInterval(Timer);
        Timer = null;
    }
}

function startPlaybackMonitor() {
    stopPlaybackMonitor();
    if (isCoursePage()) {
        Timer = setInterval(playVideo, 1000);
    }
}

function waitForElement(selector, timeoutMs = 10000) {
    return new Promise(resolve => {
        let finished = false;
        const observer = new MutationObserver(() => finish(document.querySelector(selector)));
        const timeout = setTimeout(() => finish(null), timeoutMs);

        function finish(element) {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            observer.disconnect();
            resolve(element);
        }

        const existing = document.querySelector(selector);
        if (existing) {
            finish(existing);
            return;
        }

        observer.observe(document.documentElement, { childList: true, subtree: true });
    });
}

function waitForImage(image, timeoutMs = 10000) {
    if (image.complete) {
        return Promise.resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
    }

    return new Promise(resolve => {
        let finished = false;
        const timeout = setTimeout(() => finish(false), timeoutMs);

        function finish(loaded) {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
            resolve(loaded && image.naturalWidth > 0 && image.naturalHeight > 0);
        }

        function onLoad() { finish(true); }
        function onError() { finish(false); }

        image.addEventListener("load", onLoad, { once: true });
        image.addEventListener("error", onError, { once: true });
    });
}

function getCurrent() {
    xuanxian = $('a[target="_self"]');
    current = 0;
    xuanxian.each((index, item) => {
        if ($(item).hasClass("on")) {
            current = index;
            return false;
        }
    });
    return xuanxian.length > 0;
}

async function playNext() {
    stopPlaybackMonitor();
    if (!xuanxian || xuanxian.length === 0) {
        addText("未找到课程列表");
        return;
    }

    if (current >= xuanxian.length - 1) {
        addText("已看完！");
        return;
    }

    addText("播放下个视频");
    await pause(3);
    xuanxian[current + 1].click();
}

async function inputCaptcha() {
    if (captchaProcessing) return;
    captchaProcessing = true;
    let resumePlayback = true;

    try {
        const layer = findCaptchaLayer();
        if (!layer.length) {
            captchaRetryAt = Date.now() + 3000;
            return;
        }

        addText("验证码出现，准备填写验证码...");
        await pause(2, 5);

        const image = findCaptchaImage(layer);
        if (!image) {
            addText("弹窗中的验证码图片尚未准备好");
            captchaRetryAt = Date.now() + 3000;
            return;
        }

        const answer = await getCode(getBase64FromImage(image));
        const input = findCaptchaInput(layer);
        if (!input) {
            addText("弹窗中未找到可用的验证码输入框");
            captchaRetryAt = Date.now() + 3000;
            return;
        }

        input.focus();
        input.value = answer;
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        input.dispatchEvent(new window.Event("change", { bubbles: true }));
        await pause(2, 5);

        const playButton = $(".layui-layer-btn0:visible").first();
        if (!playButton.length) {
            addText("未找到验证码提交按钮，已停止自动重试");
            resumePlayback = false;
            return;
        }

        playButton.trigger("click");
        captchaRetryAt = Date.now() + 3000;
        addText("已提交验证码，恢复播放检测");
    } catch (error) {
        addText(`验证码处理出错: ${error.message}`);
        captchaRetryAt = Date.now() + 5000;
    } finally {
        captchaProcessing = false;
        if (resumePlayback) startPlaybackMonitor();
    }
}

function getBase64FromImage(image) {
    if (!image || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        throw new Error("验证码图片尚未加载完成");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建图片画布");
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
}

function addText(text) {
    const message = String(text);
    if (!Text2 || !Text2.length || !Text2[0].isConnected) {
        console.info(`[课程助手] ${message}`);
        return;
    }

    const line = document.createElement("div");
    line.textContent = message;
    Text2.append(line, document.createElement("br"));
    Text2.scrollTop(Text2[0].scrollHeight);
}

function getCode(code) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: OCR_URL,
            data: JSON.stringify({ img_base64: String(code) }),
            headers: { "Content-Type": "application/json" },
            responseType: "json",
            timeout: 15000,
            onload(response) {
                if (response.status !== 200) {
                    reject(new Error(`OCR服务返回状态码 ${response.status}`));
                    return;
                }

                const result = response.response && response.response.result;
                if (typeof result !== "string" || !result.trim()) {
                    reject(new Error("OCR服务未返回有效识别结果"));
                    return;
                }

                addText(`识别结果：${result}`);
                resolve(result.trim());
            },
            onerror() {
                reject(new Error("无法连接本地OCR服务"));
            },
            ontimeout() {
                reject(new Error("本地OCR服务请求超时"));
            }
        });
    });
}

async function playVideo() {
    if (!isCoursePage() || captchaProcessing) return;
    if (!xuanxian || xuanxian.length === 0) {
        addText("未找到课程列表，已停止播放检测");
        stopPlaybackMonitor();
        return;
    }

    if (!video) {
        const currentLink = xuanxian[current];
        if (currentLink && currentLink.title === "考试") {
            addText("课已看完！");
            stopPlaybackMonitor();
        } else {
            getVideoElement();
        }
        return;
    }

    const captchaLayer = findCaptchaLayer();
    if (captchaLayer.length) {
        if (Date.now() < captchaRetryAt) return;
        stopPlaybackMonitor();
        await inputCaptcha();
        return;
    }

    if (video.paused) {
        try {
            await video.play();
            if (video.readyState === 4) {
                const message = Text2.text().includes("加载完成") ? "请置于前台运行" : "加载完成，开始播放";
                addText(message);
            }
        } catch (error) {
            addText(`播放视频出错: ${error.message}`);
        }
    }
}

function getVideoElement() {
    video = document.querySelector("video");
    if (video) {
        video.muted = true;
        video.playbackRate = 1.0;
        video.volume = 0;
        video.onended = async function () {
            await playNext();
        };
    }
}

function addContainer() {
    const container = $("<container></container>");
    container.addClass("yans");
    const header = $("<div></div>");
    header.addClass("container-header");
    header.html(`
        <div>
            <a href="http://127.0.0.1:5000/"
               target="_blank"
               style="color: #2196F3; text-decoration: none; border-bottom: 1px dashed #2196F3;">
                查看本地OCR服务 ↗
            </a>
        </div>
    `);
    container.append(header);
    header.on("mousedown", function (event) {
        const shiftX = event.clientX - header.offset().left;
        const shiftY = event.clientY - header.offset().top;
        function onMouseMove(moveEvent) {
            container.css({
                left: moveEvent.pageX - shiftX + "px",
                top: moveEvent.pageY - shiftY + "px"
            });
        }
        function onMouseUp() {
            $(document).off("mousemove", onMouseMove);
            $(document).off("mouseup", onMouseUp);
        }
        $(document).on("mousemove", onMouseMove);
        $(document).on("mouseup", onMouseUp);
    });

    container.append($("<hr>"));
    Text2 = $("<div></div>");
    Text2.addClass("container-text");
    container.append(Text2);
    addText("请置于前台运行");
    addText("开启成功");
    $("body").append(container);
}

function addStyle() {
    const style = $("<style></style>");
    style.prop("type", "text/css");
    style.text(`
       .yans {
            position: fixed;
            top: 111px;
            left: 222px;
            width: 333px;
            z-index: 666666;
            background-color: #CCFFFF;
        }
    `);
    $("body").append(style);
}

function pause(start, end = undefined) {
    let seconds = start;
    if (end) {
        seconds = Math.floor(Math.random() * (end - start)) + start;
        addText(`${seconds} 秒后继续`);
    }
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function init() {
    if (!isCoursePage()) return false;

    addContainer();
    addStyle();
    if (!getCurrent()) {
        addText("未找到课程列表，无法启动播放检测");
        return false;
    }

    const refreshMinutes = 30;
    addText(`已启用${refreshMinutes}分钟强制刷新功能`);
    setInterval(() => {
        addText("即将强制刷新页面...");
        location.reload();
    }, refreshMinutes * 60 * 1000);
    return true;
}

if (isCoursePage()) {
    onDomReady(() => {
        if (init()) startPlaybackMonitor();
    });
}

if (isLoginPage()) {
    async function handleLoginCaptcha() {
        const image = await waitForElement("#codeImg");
        if (!image) {
            addText("等待验证码图片超时");
            return;
        }
        if (!await waitForImage(image)) {
            addText("验证码图片加载失败");
            return;
        }

        const answer = await getCode(getBase64FromImage(image));
        const input = await waitForElement("#code");
        if (!input) {
            addText("等待验证码输入框超时");
            return;
        }

        input.focus();
        input.value = answer;
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        input.dispatchEvent(new window.Event("change", { bubbles: true }));
    }

    onDomReady(() => {
        handleLoginCaptcha().catch(error => addText(`验证码处理出错: ${error.message}`));
    });
}
