import json
import threading
import unittest
import urllib.error
import urllib.request

from jarvis.api.sdk import Jarvis
from jarvis.api.server import serve


class SdkTest(unittest.TestCase):
    def test_ask_and_status(self):
        app = Jarvis()
        result = app.ask("please plan a small project")
        self.assertEqual(result.status, "delivered")
        status = app.status()
        self.assertEqual(status["provider"], "echo")
        self.assertIn("planner", [a["name"] for a in status["agents"]])

    def test_remember(self):
        app = Jarvis()
        doc_id = app.remember("The user's favorite color is teal")
        self.assertTrue(doc_id)


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = serve(host="127.0.0.1", port=0)  # port 0 => OS picks free port
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def _post(self, path, payload):
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read())

    def test_health(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/health", timeout=5) as resp:
            self.assertEqual(resp.status, 200)

    def test_serves_ui(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/", timeout=5) as resp:
            self.assertEqual(resp.status, 200)
            self.assertTrue(resp.headers.get("Content-Type", "").startswith("text/html"))
            body = resp.read().decode("utf-8")
        self.assertIn("<title>JARVIS v2</title>", body)
        # The page must be self-contained: no external scripts/styles/fonts.
        for external in ("https://", "http://fonts", "cdn."):
            self.assertNotIn(external, body)

    def test_favicon_no_content(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/favicon.ico", timeout=5) as resp:
            self.assertEqual(resp.status, 204)

    def test_ask_endpoint(self):
        status, body = self._post("/ask", {"goal": "please plan a trip"})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "delivered")

    def test_ask_requires_goal(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._post("/ask", {})
        self.assertEqual(ctx.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
