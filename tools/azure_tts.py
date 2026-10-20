"""Azure Speech 文本转语音。

订阅 key 只保存在本机,默认位置 %LOCALAPPDATA%\\focus-dataflow\\azure-speech.key,
**刻意放在被服务目录之外**:静态文件服务不会把它暴露出去,合成由服务端代理完成,
浏览器全程拿不到 key。

环境变量:
    AZURE_SPEECH_KEY_FILE  key 文件路径
    AZURE_SPEECH_REGION    区域,默认 eastus
"""

from __future__ import annotations

import os
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DEFAULT_KEY_FILE = Path.home() / "AppData" / "Local" / "focus-dataflow" / "azure-speech.key"
KEY_FILE = Path(os.environ.get("AZURE_SPEECH_KEY_FILE", str(DEFAULT_KEY_FILE)))
REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")
TTS_URL = f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3"

# 单次请求的字符上限。Azure 的响应体有 1MB 上限(48kbitrate 约合 170 秒音频),
# 超了连接会被中途掐断,所以每段压到 600 字左右,留足余量。
MAX_CHARS = 600

# 可选音色。中文用 Neural 音色,英文优先选 Multilingual(能念中文)。
VOICES = [
    {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓 · 女声 · 温暖亲和", "lang": "zh-CN"},
    {"id": "zh-CN-XiaoyiNeural", "name": "晓伊 · 女声 · 新闻播报", "lang": "zh-CN"},
    {"id": "zh-CN-XiaomoNeural", "name": "晓墨 · 女声 · 自然闲聊", "lang": "zh-CN"},
    {"id": "zh-CN-XiaochenNeural", "name": "晓辰 · 女声 · 活泼", "lang": "zh-CN"},
    {"id": "zh-CN-XiaoruiNeural", "name": "晓睿 · 女声 · 沉稳", "lang": "zh-CN"},
    {"id": "zh-CN-YunxiNeural", "name": "云希 · 男声 · 阳光活泼", "lang": "zh-CN"},
    {"id": "zh-CN-YunyangNeural", "name": "云扬 · 男声 · 专业新闻", "lang": "zh-CN"},
    {"id": "zh-CN-YunjianNeural", "name": "云健 · 男声 · 浑厚有力", "lang": "zh-CN"},
    {"id": "en-US-AvaMultilingualNeural", "name": "Ava · 女声 · 多语言", "lang": "en-US"},
    {"id": "en-US-AndrewMultilingualNeural", "name": "Andrew · 男声 · 多语言", "lang": "en-US"},
    {"id": "en-US-EmmaMultilingualNeural", "name": "Emma · 女声 · 多语言", "lang": "en-US"},
    {"id": "en-US-JennyNeural", "name": "Jenny · 女声 · 亲和", "lang": "en-US"},
    {"id": "en-US-GuyNeural", "name": "Guy · 男声 · 沉稳", "lang": "en-US"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia · 女声 · 英式", "lang": "en-GB"},
    {"id": "en-GB-RyanNeural", "name": "Ryan · 男声 · 英式", "lang": "en-GB"},
]


class AzureTtsUnavailable(RuntimeError):
    """没配 key,或者调用 Azure 失败。"""


def read_key():
    try:
        return KEY_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def is_available():
    return bool(read_key())


def split_text(text, limit=MAX_CHARS):
    """按句子边界切分,单句超长时硬切。"""
    if len(text) <= limit:
        return [text]
    chunks = []
    buf = ""
    for sentence in re.split(r"(?<=[。！？!?\n])", text):
        while len(sentence) > limit:
            if buf:
                chunks.append(buf)
                buf = ""
            chunks.append(sentence[:limit])
            sentence = sentence[limit:]
        if len(buf) + len(sentence) > limit:
            chunks.append(buf)
            buf = ""
        buf += sentence
    if buf:
        chunks.append(buf)
    return chunks


def build_ssml(text, voice):
    """生成 SSML。

    语速不在这里调:实测这个 endpoint 不认 <prosody rate> —— 50% 和 200% 合成出来的
    音频长度一模一样,rate 的值被直接忽略了。播放速度改由客户端的
    audio.playbackRate 控制(配合 preservesPitch 保持音调)。
    """
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # 语言按文本实际内容判定:多语言音色念中文时也要用 zh-CN,否则发音不对
    has_cn = any("一" <= ch <= "鿿" for ch in text)
    lang = "zh-CN" if (has_cn or voice.startswith("zh")) else "en-US"
    # rate 属性必须给:Azure 会拒绝没有属性的 <prosody>(直接返回 400)
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
        f"xml:lang='{lang}'><voice name='{voice}'>"
        f"<prosody rate='100%'>{escaped}</prosody></voice></speak>"
    )


def _synthesize_chunk(chunk, voice, key):
    ssml = build_ssml(chunk, voice).encode("utf-8")
    req = urllib.request.Request(
        TTS_URL,
        data=ssml,
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
            "User-Agent": "focus-dataflow-tts",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read()[:200].decode("utf-8", "replace")
        raise AzureTtsUnavailable(f"Azure 返回 HTTP {exc.code}: {detail}") from exc
    except Exception as exc:
        raise AzureTtsUnavailable(f"调用 Azure 失败:{exc}") from exc


def _synthesize_with_retry(chunk, voice, key, depth=0):
    """合成一段;失败就对半再切一次 —— 响应被掐断通常说明这段太长了。"""
    try:
        return _synthesize_chunk(chunk, voice, key)
    except AzureTtsUnavailable:
        if len(chunk) <= 120 or depth >= 4:
            raise
        half = len(chunk) // 2
        return _synthesize_with_retry(chunk[:half], voice, key, depth + 1) + \
            _synthesize_with_retry(chunk[half:], voice, key, depth + 1)


def synthesize(text, voice="zh-CN-XiaoxiaoNeural", key=None):
    """合成音频,返回 mp3 字节。"""
    key = key or read_key()
    if not key:
        raise AzureTtsUnavailable(
            f"Azure Speech 未配置 key(期望路径:{KEY_FILE})"
        )
    if not text.strip():
        raise AzureTtsUnavailable("文本为空")

    parts = []
    chunks = split_text(text)
    if len(chunks) == 1:
        return _synthesize_with_retry(chunks[0], voice, key)
    # 各段并行合成(顺序仍按原样拼接),否则长文要等 N 倍时间
    with ThreadPoolExecutor(max_workers=min(4, len(chunks))) as pool:
        futures = [pool.submit(_synthesize_with_retry, c, voice, key) for c in chunks]
        for future in futures:
            parts.append(future.result())
    return b"".join(parts)
