# Hyun's Cartoon Studio – 실행 스크립트 (Windows PowerShell)

Write-Host "🚀 Hyun's Cartoon Studio 시작..." -ForegroundColor Cyan
Write-Host ""

# 가상환경 확인 및 생성
if (-not (Test-Path "venv")) {
    Write-Host "📦 Python 가상환경 생성 중..." -ForegroundColor Yellow
    python -m venv venv
}

# 가상환경 활성화
Write-Host "🔧 백엔드 의존성 설치 중..." -ForegroundColor Yellow
& "venv\Scripts\pip.exe" install -r requirements.txt --quiet

# 폰트 디렉터리 확인
if (-not (Test-Path "backend\fonts\malgun.ttf")) {
    Write-Host "🔤 한글 폰트 복사 중..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "backend\fonts" | Out-Null
    Copy-Item "C:\Windows\Fonts\malgun.ttf" -Destination "backend\fonts\malgun.ttf" -ErrorAction SilentlyContinue
}

# 프론트엔드 의존성 확인
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 프론트엔드 의존성 설치 중..." -ForegroundColor Yellow
    cmd /c "npm install"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  ✅ 백엔드: http://localhost:8000" -ForegroundColor Green
Write-Host "  ✅ 프론트엔드: http://localhost:3000" -ForegroundColor Green
Write-Host "  🔐 관리자: admin / 123jesus" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# 백엔드 백그라운드 실행
Write-Host "🖥 FastAPI 백엔드 시작..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -WorkingDirectory "$PWD\backend" `
    -PassThru -WindowStyle Normal
Write-Host "  백엔드 PID: $($backend.Id)"

Start-Sleep -Seconds 2

# 프론트엔드 실행
Write-Host "🌐 Next.js 프론트엔드 시작..." -ForegroundColor Cyan
cmd /c "npm run dev"
