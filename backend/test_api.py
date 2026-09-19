import urllib.request, json

# 1. 로그인 테스트
data = json.dumps({"username": "admin", "password": "123jesus"}).encode()
req = urllib.request.Request("http://localhost:8000/api/login", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print("Login OK:", result.get("message"))
token = result.get("token")
print("Token:", token[:16], "...")

# 2. 건강 체크
req2 = urllib.request.Request("http://localhost:8000/api/health")
resp2 = urllib.request.urlopen(req2)
print("Health:", json.loads(resp2.read()))
