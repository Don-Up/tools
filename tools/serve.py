"""同源静态服务器。

把「本地数据目录」(dataflow.txt、viewer.html 等) 与 focus-dataflow 页面挂到同一个
origin,使页面可以用相对路径 fetch('dataflow.txt')。

动机:focus-dataflow 部署在 GitHub Pages(HTTPS),HTTPS 页面 fetch 内网 http 资源会被
浏览器的混合内容策略拦截,加 CORS 头也无效。同源提供服务可以同时绕开混合内容与
跨域两个问题。

用法:
    python tools/serve.py [--host 0.0.0.0] [--port 8000] [--data-root DIR]
"""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent

# 本机数据目录:存放 dataflow.txt、viewer.html 等
DATA_ROOT = Path(r"C:\Users\10691\Desktop\html")

# URL 路径 -> 本地文件
EXTRA_FILES = {
    "/focus-dataflow.html": REPO_ROOT / "focus-dataflow.html",
    "/focus-data.html": REPO_ROOT / "focus-dataflow.html",
}


class CORSHandler(SimpleHTTPRequestHandler):
    """静态文件服务 + CORS 头 + 固定路径映射。"""

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

    def translate_path(self, path):
        clean = unquote(urlparse(path).path)
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
