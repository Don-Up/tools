import sys
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


@unittest.skipUnless(serve.DATA_ROOT.is_dir(), "本机数据目录不存在")
class DefaultConfigTests(unittest.TestCase):
    def test_default_data_root_contains_dataflow(self):
        self.assertTrue((serve.DATA_ROOT / "dataflow.txt").is_file())


if __name__ == "__main__":
    unittest.main()
