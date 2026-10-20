import sys
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import serve  # noqa: E402


class ServeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data_root = Path(self.tmp.name)
        (self.data_root / "dataflow.txt").write_text("01 hello", encoding="utf-8")
        handler = partial(
            serve.CORSHandler,
            directory=str(self.data_root),
            extra_files=serve.EXTRA_FILES,
        )
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        self.tmp.cleanup()

    def url(self, path):
        return f"http://127.0.0.1:{self.port}{path}"

    def test_serves_file_from_data_root(self):
        with urllib.request.urlopen(self.url("/dataflow.txt")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read().decode("utf-8"), "01 hello")

    def test_serves_mapped_file(self):
        target = serve.EXTRA_FILES["/focus-dataflow.html"]
        with urllib.request.urlopen(self.url("/focus-dataflow.html")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read(), target.read_bytes())

    def test_alias_path_serves_mapped_file(self):
        with urllib.request.urlopen(self.url("/focus-data.html")) as r:
            self.assertEqual(r.status, 200)

    def test_adds_cors_header(self):
        with urllib.request.urlopen(self.url("/dataflow.txt")) as r:
            self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "*")

    def test_options_preflight_returns_204(self):
        req = urllib.request.Request(self.url("/dataflow.txt"), method="OPTIONS")
        with urllib.request.urlopen(req) as r:
            self.assertEqual(r.status, 204)
            self.assertEqual(
                r.headers.get("Access-Control-Allow-Methods"), "GET, HEAD, OPTIONS"
            )

    def test_unknown_path_returns_404(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(self.url("/nope.txt"))
        self.assertEqual(ctx.exception.code, 404)

    def test_api_files_lists_directory(self):
        with urllib.request.urlopen(self.url("/api/files")) as r:
            self.assertEqual(r.status, 200)
            self.assertIn("application/json", r.headers.get("Content-Type", ""))
            data = json.loads(r.read().decode("utf-8"))
        names = [e["name"] for e in data["entries"]]
        self.assertIn("dataflow.txt", names)

    def test_api_files_ignores_dot_entries(self):
        (self.data_root / ".claude").mkdir()
        (self.data_root / ".dev").mkdir()
        (self.data_root / ".hidden").write_text("x", encoding="utf-8")
        with urllib.request.urlopen(self.url("/api/files")) as r:
            data = json.loads(r.read().decode("utf-8"))
        names = [e["name"] for e in data["entries"]]
        for hidden in (".claude", ".dev", ".hidden"):
            self.assertNotIn(hidden, names)
        self.assertIn("dataflow.txt", names)

    def test_api_files_ignores_index_html(self):
        (self.data_root / "start.html").write_text("<html></html>", encoding="utf-8")
        with urllib.request.urlopen(self.url("/api/files")) as r:
            data = json.loads(r.read().decode("utf-8"))
        names = [e["name"] for e in data["entries"]]
        self.assertNotIn("start.html", names)

    def test_api_files_includes_mapped_files(self):
        with urllib.request.urlopen(self.url("/api/files")) as r:
            data = json.loads(r.read().decode("utf-8"))
        paths = [e["path"] for e in data["entries"]]
        self.assertIn("/focus-dataflow.html", paths)

    def test_api_files_hides_prefixed_entries(self):
        (self.data_root / "h-dataflow.txt").write_text("01 hidden", encoding="utf-8")
        (self.data_root / "h-notes").mkdir()
        with urllib.request.urlopen(self.url("/api/files")) as r:
            data = json.loads(r.read().decode("utf-8"))
        names = [e["name"] for e in data["entries"]]
        self.assertNotIn("h-dataflow.txt", names)
        self.assertNotIn("h-notes", names)
        self.assertIn("dataflow.txt", names)

    def test_prefixed_files_are_still_servable(self):
        (self.data_root / "h-dataflow.txt").write_text("01 hidden", encoding="utf-8")
        with urllib.request.urlopen(self.url("/h-dataflow.txt")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read().decode("utf-8"), "01 hidden")

    def test_root_serves_index_html(self):
        (self.data_root / "start.html").write_text("ENTRY-PAGE", encoding="utf-8")
        with urllib.request.urlopen(self.url("/")) as r:
            self.assertEqual(r.status, 200)
            self.assertEqual(r.read().decode("utf-8"), "ENTRY-PAGE")


@unittest.skipUnless(serve.DATA_ROOT.is_dir(), "本机数据目录不存在")
class DefaultConfigTests(unittest.TestCase):
    def test_default_data_root_contains_dataflow(self):
        self.assertTrue((serve.DATA_ROOT / "h-dataflow.txt").is_file())



class AzureTtsEndpointTests(ServeTests):
    """TTS 代理端点。"""

    def test_tts_status_reports_availability(self):
        with urllib.request.urlopen(self.url("/api/tts")) as r:
            data = json.loads(r.read().decode("utf-8"))
        self.assertIn("available", data)
        self.assertIn("voices", data)
        self.assertTrue(data["voices"], "音色列表不该为空")

    def test_tts_post_without_key_returns_error(self):
        import azure_tts

        original = azure_tts.KEY_FILE
        azure_tts.KEY_FILE = Path(self.tmp.name) / "no-such.key"
        try:
            req = urllib.request.Request(
                self.url("/api/tts"),
                data=json.dumps({"text": "你好", "voice": "zh-CN-XiaoxiaoNeural"}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(req)
            self.assertEqual(ctx.exception.code, 502)
            body = json.loads(ctx.exception.read().decode("utf-8"))
            self.assertIn("error", body)
        finally:
            azure_tts.KEY_FILE = original

    def test_tts_post_rejects_bad_json(self):
        req = urllib.request.Request(
            self.url("/api/tts"), data=b"not json",
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 400)


class AzureTtsUnitTests(unittest.TestCase):
    """azure_tts 模块的纯逻辑部分。"""

    def test_split_text_keeps_short_text_whole(self):
        import azure_tts
        self.assertEqual(azure_tts.split_text("短句"), ["短句"])

    def test_split_text_splits_long_text(self):
        import azure_tts
        long_text = "句子。" * 1000
        chunks = azure_tts.split_text(long_text, limit=600)
        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 600)
        self.assertEqual("".join(chunks), long_text)

    def test_build_ssml_always_sets_rate(self):
        # Azure 会拒绝没有 rate 属性的 <prosody>(直接 400)
        import azure_tts
        ssml = azure_tts.build_ssml("你好", "zh-CN-XiaoxiaoNeural", 1.0)
        self.assertIn("rate='100%'", ssml)
        self.assertIn("xml:lang='zh-CN'", ssml)

    def test_build_ssml_escapes_markup(self):
        import azure_tts
        ssml = azure_tts.build_ssml("a < b & c", "zh-CN-XiaoxiaoNeural", 1.0)
        self.assertIn("&lt;", ssml)
        self.assertIn("&amp;", ssml)

    def test_build_ssml_language_follows_text(self):
        import azure_tts
        # 多语言音色念中文,语言也要跟着中文走
        ssml = azure_tts.build_ssml("你好", "en-US-AvaMultilingualNeural", 1.0)
        self.assertIn("xml:lang='zh-CN'", ssml)

    def test_rate_is_clamped(self):
        import azure_tts
        self.assertIn("rate='50%'", azure_tts.build_ssml("x", "zh-CN-XiaoxiaoNeural", 0.1))
        self.assertIn("rate='200%'", azure_tts.build_ssml("x", "zh-CN-XiaoxiaoNeural", 9))

if __name__ == "__main__":
    unittest.main()
