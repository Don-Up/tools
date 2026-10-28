"""同源静态服务器。

把「本地数据目录」(h-dataflow.txt、viewer.html 等) 与 focus-dataflow 页面挂到同一个
origin,使页面可以用相对路径 fetch('h-dataflow.txt')。

动机:focus-dataflow 部署在 GitHub Pages(HTTPS),HTTPS 页面 fetch 内网 http 资源会被
浏览器的混合内容策略拦截,加 CORS 头也无效。同源提供服务可以同时绕开混合内容与
跨域两个问题。

用法:
    python tools/serve.py [--host 0.0.0.0] [--port 8000] [--data-root DIR]
"""

from __future__ import annotations

import argparse
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

import azure_tts

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent

# 本机数据目录:存放 h-dataflow.txt、viewer.html 等
DATA_ROOT = Path(r"C:\Users\10691\Desktop\PyServer Files")

# 入口页:同时作为根路径的默认页面
INDEX_FILENAME = "start.html"

# 隐藏前缀:以此开头的条目不出现在文件列表里。
# 这类文件是给别的页面读取用的(比如数据流文本),直接打开没有意义,
# 但仍然可以通过 URL 正常访问。
HIDDEN_PREFIX = "h-"

# URL 路径 -> 本地文件
EXTRA_FILES = {
    "/focus-dataflow.html": REPO_ROOT / "focus-dataflow.html",
    "/focus-data.html": REPO_ROOT / "focus-dataflow.html",
}


def file_entry(name, path, is_dir, size, mtime):
    return {
        "name": name,
        "path": path,
        "is_dir": is_dir,
        "size": size,
        "mtime": mtime,
    }


def list_files(root, extra_files=None, skip=()):
    """列出根目录下的文件,忽略点开头的目录、隐藏前缀的条目和指定的名字。"""
    entries = []
    seen = set()
    try:
        children = sorted(root.iterdir(), key=lambda p: p.name.lower())
    except OSError:
        children = []
    for p in children:
        if p.name.startswith(".") or p.name.startswith(HIDDEN_PREFIX) or p.name in skip:
            continue
        try:
            st = p.stat()
        except OSError:
            continue
        is_dir = p.is_dir()
        entries.append(
            file_entry(
                p.name,
                "/" + quote(p.name) + ("/" if is_dir else ""),
                is_dir,
                0 if is_dir else st.st_size,
                st.st_mtime,
            )
        )
        seen.add(p.name.lower())

    # 仓库里映射进来的文件也一并列出(同一文件只出现一次)
    for url_path, target in (extra_files or {}).items():
        if target.name.lower() in seen or not target.is_file():
            continue
        try:
            st = target.stat()
        except OSError:
            continue
        seen.add(target.name.lower())
        entries.append(file_entry(target.name, url_path, False, st.st_size, st.st_mtime))

    entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
    return {"root": root.name, "entries": entries}


class CORSHandler(SimpleHTTPRequestHandler):
    """静态文件服务 + CORS 头 + 固定路径映射 + 文件列表接口。"""

    def __init__(self, *args, directory, extra_files=None, **kwargs):
        # 必须在 super().__init__ 之前赋值:BaseHTTPRequestHandler.__init__ 会立刻
        # 调用 handle(),那时 translate_path 已经被用到了。
        self.extra_files = dict(extra_files or {})
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/files":
            root = Path(self.directory)
            self.send_json(list_files(root, self.extra_files, skip={INDEX_FILENAME}))
            return
        if path == "/api/tts":
            # 告诉页面 Azure TTS 能不能用,以及有哪些音色
            self.send_json({
                "available": azure_tts.is_available(),
                "region": azure_tts.REGION,
                "voices": azure_tts.VOICES,
            })
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/tts":
            self.send_error(404, "Not Found")
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self.send_json({"error": "请求体不是合法 JSON"}, 400)
            return
        text = str(payload.get("text") or "")
        voice = str(payload.get("voice") or "zh-CN-XiaoxiaoNeural")
        try:
            rate = payload.get("rate")
            preview = text[:40].replace(chr(10), " ")
            # 写到 stderr:pythonw 下 stdout 是 devnull,stderr 才指向 launcher.log
            print("TTS voice=%s rate=%s chars=%d %r" % (voice, rate, len(text), preview),
                  file=sys.stderr, flush=True)
            audio = azure_tts.synthesize(text, voice=voice)
        except azure_tts.AzureTtsUnavailable as exc:
            self.send_json({"error": str(exc)}, 502)
            return
        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)

    def translate_path(self, path):
        clean = unquote(urlparse(path).path)
        if clean == "/":
            index = Path(self.directory) / INDEX_FILENAME
            if index.is_file():
                return str(index)
        target = self.extra_files.get(clean)
        if target is not None:
            return str(target)
        return super().translate_path(path)


def build_server(host, port, data_root, extra_files):
    handler = partial(
        CORSHandler, directory=str(data_root), extra_files=extra_files
    )
    return ThreadingHTTPServer((host, port), handler)


def main():
    parser = argparse.ArgumentParser(description="focus-dataflow 同源静态服务器")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--data-root", default=str(DATA_ROOT))
    args = parser.parse_args()

    data_root = Path(args.data_root)
    if not data_root.is_dir():
        raise SystemExit(f"数据目录不存在: {data_root}")

    httpd = build_server(args.host, args.port, data_root, EXTRA_FILES)
    print(
        f"serving {data_root} + {len(EXTRA_FILES)} mapped file(s) "
        f"on http://{args.host}:{args.port}",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
