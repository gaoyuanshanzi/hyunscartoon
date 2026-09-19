@echo off
chcp 65001 >nul
echo.
echo ===================================================
echo   GitHub Push and Vercel Deploy Guide
echo ===================================================
echo.
echo [STEP 1] GitHub 리포지토리 생성
echo   - https://github.com 접속
echo   - 로그인: gaoyuanshanzi@gmail.com
echo   - 오른쪽 상단 [+] > [New repository]
echo   - Repository name: hyunscartoon
echo   - Public 선택 > [Create repository]
echo.
echo [STEP 2] 원격 저장소 연결 및 Push
echo   아래 명령어를 이 폴더에서 실행하세요:
echo.
echo   git remote add origin https://github.com/[YOUR_USERNAME]/hyunscartoon.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo [STEP 3] Vercel 배포
echo   - https://vercel.com 접속
echo   - GitHub로 로그인 (gaoyuanshanzi@gmail.com)
echo   - [Add New Project] > GitHub 리포: hyunscartoon 선택
echo   - Root Directory: frontend
echo   - Framework Preset: Next.js
echo   - Environment Variables:
echo       NEXT_PUBLIC_API_URL = [백엔드 서버 URL]
echo   - [Deploy] 클릭
echo.
echo [STEP 4] 백엔드 별도 배포 (선택)
echo   - Railway.app 또는 Render.com (무료 플랜)
echo   - Python FastAPI 서버 배포
echo   - 배포 후 URL을 Vercel 환경변수에 설정
echo.
echo ===================================================
echo   현재 로컬 실행 정보
echo ===================================================
echo   백엔드:     http://localhost:8000
echo   프론트엔드: http://localhost:3000
echo   로그인:     admin / 123jesus
echo ===================================================
pause
