# Hyun's Cartoon Studio 🎨

> AI 기반 웹툰 자동 생성 웹 애플리케이션  
> 장문 스토리(A4 반장~한 장 분량)를 입력하면 **20컷 웹툰**으로 완전 자동 생성

---

## 🚀 로컬 실행

### 방법 1: 원클릭 실행 (Windows)
```bat
run_local.bat
```

### 방법 2: 수동 실행

**백엔드 (터미널 1)**
```bash
cd backend
pip install -r ../requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**프론트엔드 (터미널 2)**
```bash
cd frontend
npm install
npm run dev
```

브라우저에서 **http://localhost:3000** 접속  
로그인: `admin` / `123jesus`

---

## 🧠 시스템 구조

```
입력(A4 분량 스토리)
    │
    ▼
[1] Storyboard Agent    ← 20컷 기승전결 콘티 자동 분석
    │
    ▼
[2] Consistency Agent   ← 캐릭터 외형 앵커 + 고정 시드
    │
    ▼
[3] Image Agent         ← 비동기 병렬 이미지 생성
    │    ├─ 1순위: Pollinations.ai FLUX (무료, 토큰 불필요)
    │    ├─ 2순위: HuggingFace FLUX.1-schnell (무료 티어)
    │    └─ 3순위: PIL 텍스트 스케치 (오프라인 폴백)
    ▼
[4] Speech Bubble Agent ← Pillow 한글 말풍선 합성
    │
    ▼
세로 스크롤 웹툰 뷰어
```

---

## 🌐 GitHub → Vercel 배포

```bash
# 1. 깃 초기화 및 GitHub 업로드
git init
git add .
git commit -m "feat: 웹툰 자동생성 앱 초기 구축"
git remote add origin https://github.com/<username>/hyunscartoon.git
git push -u origin main

# 2. Vercel 배포 (vercel CLI)
npm i -g vercel
vercel --prod

# 3. Vercel 환경변수 설정
# NEXT_PUBLIC_API_URL = https://your-backend-url.railway.app (or Render.com 등)
```

---

## 📦 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.9+, FastAPI, uvicorn, httpx |
| Frontend | Next.js 15, React 19, Tailwind CSS, TypeScript |
| 이미지 생성 | Pollinations.ai FLUX (무료), HF FLUX.1-schnell |
| 이미지 합성 | Python Pillow (PIL) |
| 배포 | Vercel (Frontend), Railway/Render (Backend) |
| 폰트 | 맑은 고딕 (시스템), NanumGothic |

---

## 🔐 인증

- 관리자 ID: `admin`
- 관리자 PW: `123jesus`

© 2025 Hyun's Cartoon Studio · All rights reserved
