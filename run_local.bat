@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════╗
echo ║   Hyun's Cartoon Studio 시작        ║
echo ║   AI 웹툰 자동 생성기              ║
echo ╚════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] 백엔드 의존성 확인...
pip install -r requirements.txt -q

echo [2/3] 한글 폰트 복사...
if not exist "backend\fonts" mkdir "backend\fonts"
if not exist "backend\fonts\malgun.ttf" (
    copy "C:\Windows\Fonts\malgun.ttf" "backend\fonts\malgun.ttf" >nul 2>&1
    echo     malgun.ttf 복사 완료
)

echo [3/3] FastAPI 백엔드 시작 (http://localhost:8000)...
start "Webtoon Backend" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo 잠시 기다리는 중...
timeout /t 3 /nobreak >nul

echo Next.js 프론트엔드 시작 (http://localhost:3000)...
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   관리자 로그인: admin / 123jesus
echo   브라우저: http://localhost:3000
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
cd frontend
cmd /k "npm run dev"
