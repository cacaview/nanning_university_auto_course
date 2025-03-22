// ==UserScript==
// @name         南宁理工学院自动刷课脚本
// @version      1.0
// @description  稍加改进的刷课脚本，使用本地ocr模型
// @author       cacaview
// @match        *://zxshixun.bwgl.cn/user/node*
// @match        *://gyxy.bwgl.cn/user/node*
// @match        *://mooc.bwgl.cn/user/node*
// @match        *://*/user/node*
// @match        *://*/user/login*
// @iconURL
// @grant        GM_xmlhttpRequest
// @license    	 MIT
// @namespace  	 yei
// @connect      127.0.0.1
// @connect      127.0.0.1:5000
// @downloadURL
// @updateURL
// ==/UserScript==

// 全局变量
let current = 0;
let Timer = null;
let yzm = null;
let xuanxian = null;
let video = null;
let Text2 = null;
let refreshTimer = null;

// 获取当前课程索引
function getCurrent() {
    xuanxian = $('a[target="_self"]');
    xuanxian.each((index, item) => {
        if ($(item).hasClass("on")) {
            current = index;
            return false; // 提前结束循环
        }
    });
}

// 播放下一个视频
async function playNext() {
    clearInterval(Timer);
    if (current === xuanxian.length - 1) {
        addText("已看完！");
    } else {
        addText("播放下个视频");
        await pause(3);
        xuanxian[current + 1].click();
    }
}

// 处理验证码
async function inputCaptcha() {
    try {
        if (yzm.length && yzm.is(':visible')) {
            addText("验证码出现，准备填写验证码...");
            await pause(2, 5);
            const imgs = yzm.find("img");
            const img = imgs[0].style.opacity === '0' ? imgs[1] : imgs[0];
            const base64 = getBase64FromImage(img);
            const ans = await getCode(base64);
            const inputs = yzm.find("input");
            const input = inputs[0].style.display === 'none' ? inputs[1] : inputs[0];
            $(input).mousedown();
            input.value = ans;
            await pause(2, 5);
            const playButton = $('.layui-layer-btn0');
            if (playButton.length) {
                playButton.click();
                Timer = setInterval(playVideo, 1000);
                addText("自动播放！");
            } else {
                location.reload();
            }
        }
    } catch (error) {
        addText(`验证码处理出错: ${error.message}`);
    } finally {
        Timer = setInterval(playVideo, 1000);
        addText("验证码处理完成，恢复播放检测");
    }
}

// 获取 base64 编码的图片数据
function getBase64FromImage(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
}

// 辅助函数：添加文本信息到页面
function addText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    document.body.appendChild(div);
}

// 获取验证码识别结果
function getCode(code) {
    return new Promise((resolve, reject) => {
        const datas = {
            "img_base64": String(code),
        };
        GM_xmlhttpRequest({
            method: "POST",
            url: "http://127.0.0.1:5000/api/ocr/image",
            data: JSON.stringify(datas),
            headers: {
                "Content-Type": "application/json",
            },
            responseType: "json",
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        const result = response.response.result;
                        if (typeof result === 'undefined') {
                            addText("响应中缺少 'result' 字段");
                            reject(new Error("响应中缺少 'result' 字段"));
                        } else {
                            addText("识别结果：" + result);
                            resolve(result);
                        }
                    } catch (e) {
                        addText("验证码识别结果解析失败");
                        addText("原始响应: " + JSON.stringify(response.response));
                        reject(new Error("验证码识别结果解析失败"));
                    }
                } else {
                    addText("请求未授权! 状态码: " + response.status);
                    addText("响应内容: " + JSON.stringify(response.response));
                    reject(new Error("请求未授权，状态码: " + response.status));
                }
            },
            onerror: function (error) {
                addText("请求出错: " + JSON.stringify(error));
                reject(error);
            }
        });
    });
}

// 播放视频
async function playVideo() {
    if (!video) {
        if (xuanxian[current].title && xuanxian[current].title === "考试") {
            addText("课已看完！");
            clearInterval(Timer);
        } else {
            getVideoElement();
        }
        return;
    }
    yzm = $('.layui-layer-content');
    if (yzm.length > 0) {
        clearInterval(Timer);
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

// 获取视频元素
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

// 添加浮动容器
function addContainer() {
    const container = $('<container></container>');
    container.addClass('yans');
    const header = $("<div></div>");
    header.addClass('container-header');
    header.html(`
        <div>
            <a href='http://127.0.0.1:5000'
               target='_blank'
               style="color: #2196F3; text-decoration: none; border-bottom: 1px dashed #2196F3;">
                点击更新 ↗
            </a>
        </div>
    `);
    container.append(header);
    header.on("mousedown", function (event) {
        const shiftX = event.clientX - header.offset().left;
        const shiftY = event.clientY - header.offset().top;
        function onMouseMove(event) {
            container.css({
                left: event.pageX - shiftX + 'px',
                top: event.pageY - shiftY + 'px'
            });
        }
        function onMouseUp() {
            $(document).off('mousemove', onMouseMove);
            $(document).off('mouseup', onMouseUp);
        }
        $(document).on('mousemove', onMouseMove);
        $(document).on('mouseup', onMouseUp);
    });
    const hr = $("<hr>");
    container.append(hr);
    Text2 = $("<div></div>");
    Text2.addClass('container-text');
    container.append(Text2);
    addText("请置于前台运行");
    addText("开启成功");
    $("body").append(container);
}

// 添加样式
function addStyle() {
    const style = $("<style></style>");
    style.prop('type', 'text/css');
    style.html(`
       .yans {
            position: fixed;
            top: 111px;
            left: 222px;
            width: 333px;
            z-index: 666666;
            background-color: #CCFFFF;
        }
    `);
    $('body').append(style);
}

// 向容器添加文本
function addText(text) {
    Text2.append(text + "<br>");
    Text2.scrollTop(Text2[0].scrollHeight);
}

// 暂停指定时间
function pause(start, end = undefined) {
    let lay22 = start;
    if (end) {
        lay22 = Math.floor(Math.random() * (end - start)) + start;
        addText(` ${lay22} 秒后继续`);
    }
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, lay22 * 1000);
    });
}

// 初始化脚本
async function init() {
    addContainer();
    addStyle();
    getCurrent();
    // 30分钟强制刷新逻辑
    if (window.location.pathname.includes('/user/node')) {
        const refreshMinutes = 30;
        addText(`已启用${refreshMinutes}分钟强制刷新功能`);
        refreshTimer = setInterval(() => {
            addText("即将强制刷新页面...");
            location.reload();
        }, refreshMinutes * 60 * 1000);
    }
}

// 入口函数
(function () {
    'use strict';
    $(document).ready(async function () {
        await init();
        Timer = setInterval(playVideo, 1000);
    });
})();

// 验证码处理部分
(function () {
    async function handleCaptcha() {
        const img = document.getElementById('codeImg');
        if (!img) {
            addText("未找到验证码图片元素");
            return;
        }
        try {
            const base64 = getBase64FromImage(img);
            const code = await getCode(base64);
            const input = document.getElementById('code');
            if (input) {
                input.value = code;
            } else {
                addText("未找到验证码输入框元素");
            }
        } catch (error) {
            addText("验证码处理出错: " + error.message);
        }
    }

    handleCaptcha();
})();
