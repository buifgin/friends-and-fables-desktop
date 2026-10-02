"""Exercise the actual Python adapter protocol with a tiny translator fixture."""
import http.client
import json
from pathlib import Path
import subprocess
import sys
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
TOKEN = 'a' * 64


class ProtocolTest(unittest.TestCase):
    def setUp(self):
        adapter = ROOT / 'translator/service.py'
        script = 'import runpy; v=runpy.run_path(' + repr(str(adapter)) + '); v["run"](lambda texts:["Пробный перевод." for text in texts], ' + repr(TOKEN) + ')'
        self.child = subprocess.Popen([sys.executable, '-B', '-u', '-c', script], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.port = json.loads(self.child.stdout.readline())['port']

    def tearDown(self):
        self.child.stdin.close()
        self.child.wait(timeout=3)
        self.child.stdout.close()
        self.child.stderr.close()

    def request(self, method='GET', route='/languages', body=None, authorized=True, extra=None):
        headers = {'Authorization': 'Bearer ' + TOKEN} if authorized else {}
        if extra:
            headers.update(extra)
        data = None if body is None else json.dumps(body)
        if data is not None:
            headers['Content-Type'] = 'application/json'
        client = http.client.HTTPConnection('127.0.0.1', self.port, timeout=3)
        client.request(method, route, body=data, headers=headers)
        response = client.getresponse()
        status, result = response.status, json.loads(response.read())
        client.close()
        return status, result

    def test_authentication_routes_bounds_and_eof(self):
        self.assertEqual(self.request()[1], [{'code': 'en', 'targets': ['ru']}])
        self.assertEqual(self.request(authorized=False)[0], 403)
        self.assertEqual(self.request(extra={'Origin': 'https://play.fables.gg'})[0], 403)
        self.assertEqual(self.request(route='/download')[0], 404)
        body = {'q': ['The forest is quiet.'], 'source': 'en', 'target': 'ru', 'format': 'text'}
        self.assertEqual(self.request('POST', '/translate', body)[1], {'translatedText': ['Пробный перевод.']})
        for change in [{'q': ['word'] * 17}, {'q': ['a' * 1501]}, {'q': ['a' * 1400] * 6}, {'q': ['']}, {'q': 'hello'}, {'source': 'ru'}, {'format': 'html'}]:
            self.assertEqual(self.request('POST', '/translate', {**body, **change})[0], 400)
        self.assertEqual(self.request('POST', '/translate', None)[0], 400)
        self.child.stdin.close()
        self.child.wait(timeout=3)
        self.assertEqual(self.child.returncode, 0)


if __name__ == '__main__':
    unittest.main()
