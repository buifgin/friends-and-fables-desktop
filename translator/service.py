"""Private loopback adapter for the bundled English–Russian model. No downloads."""
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import threading

MAX_BODY = 48000


def run(translate, token):
    inference = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Source text, names, and the secret never go to logs.

        def reply(self, status, value):
            data = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def authorized(self):
            self.connection.settimeout(30)
            if self.headers.get("Origin") or not hmac.compare_digest(self.headers.get("Authorization", "").encode("utf-8"), ("Bearer " + token).encode("ascii")):
                self.reply(403, {"error": "Unauthorized"})
                return False
            return True

        def do_GET(self):
            if not self.authorized():
                return
            if self.path != "/languages":
                self.reply(404, {"error": "Unknown route"})
                return
            self.reply(200, [{"code": "en", "targets": ["ru"]}])

        def do_POST(self):
            if not self.authorized():
                return
            if self.path != "/translate":
                self.reply(404, {"error": "Unknown route"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= MAX_BODY or self.headers.get("Transfer-Encoding") or self.headers.get("Content-Type") != "application/json":
                    raise ValueError()
                body = json.loads(self.rfile.read(length))
                texts = body["q"]
                if body.get("source") != "en" or body.get("target") != "ru" or body.get("format") != "text" or not isinstance(texts, list) or not 1 <= len(texts) <= 16 or any(not isinstance(text, str) or not text.strip() or len(text) > 1500 for text in texts) or sum(map(len, texts)) > 8000:
                    raise ValueError()
            except (ValueError, KeyError, TypeError, TimeoutError):
                self.reply(400, {"error": "Invalid translation request"})
                return
            if not inference.acquire(blocking=False):
                self.reply(429, {"error": "Translator busy"})
                return
            try:
                translated = translate(texts)
                self.reply(200, {"translatedText": translated})
            except Exception:
                self.reply(500, {"error": "Translation failed"})
            finally:
                inference.release()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True

    def parent_watchdog():
        # The owning app keeps this pipe open. EOF also covers a parent crash.
        sys.stdin.buffer.read()
        server.shutdown()

    threading.Thread(target=parent_watchdog, daemon=True).start()
    print(json.dumps({"port": server.server_port}), flush=True)
    try:
        server.serve_forever(poll_interval=0.1)
    finally:
        server.server_close()


def main():
    config = json.loads(sys.stdin.buffer.readline(1024))
    token = config.get("token", "")
    if not isinstance(token, str) or len(token) != 64 or any(char not in "0123456789abcdef" for char in token):
        raise ValueError("Invalid startup configuration")
    import ctranslate2
    import sentencepiece
    root = Path(__file__).resolve().parent / "model"
    metadata = json.loads((root / "metadata.json").read_text(encoding="utf-8"))
    if metadata["from_code"] != "en" or metadata["to_code"] != "ru":
        raise ValueError("Incorrect bundled language model")
    tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(root / "sentencepiece.model"))
    translator = ctranslate2.Translator(str(root / "model"), device="cpu", compute_type="int8", inter_threads=1, intra_threads=2)

    def translate(texts):
        tokens = [tokenizer.encode(text, out_type=str) for text in texts]
        prefix = metadata.get("target_prefix")
        results = translator.translate_batch(tokens, target_prefix=[[prefix]] * len(tokens) if prefix else None,
                                              beam_size=4, length_penalty=0.2, replace_unknowns=True, max_decoding_length=768)
        return [tokenizer.decode(result.hypotheses[0]).removeprefix(prefix or "").strip() for result in results]

    run(translate, token)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Bundled translator could not start.", file=sys.stderr)
        sys.exit(1)
