import asyncio
import json
import os
import uuid
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel

from agents.storyboard_agent import StoryboardAgent
from agents.consistency_agent import ConsistencyAgent
from agents.image_agent import ImageGenerationAgent
from agents.bubble_agent import SpeechBubbleAgent

# ─── 앱 초기화 ─────────────────────────────────────────────────────
app = FastAPI(title="웹툰 자동 생성 API", version="1.0.0")

# CORS 설정 (Next.js 개발 서버 및 Vercel 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app", "https://hyunscartoon.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 출력 이미지 디렉터리 정적 파일 제공
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# ─── 간단 세션 스토어 (인메모리) ────────────────────────────────────
sessions: dict = {}

# ─── 인증 ──────────────────────────────────────────────────────────
ADMIN_ID  = "admin"
ADMIN_PW  = "123jesus"

class LoginRequest(BaseModel):
    username: str
    password: str

class GenerateRequest(BaseModel):
    story: str          # A4 반장~한 장 분량의 장문 스토리
    genre: str = "drama"
    hf_token: Optional[str] = None
    session_token: str

# ─── 엔드포인트 ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "웹툰 생성 API 서버 가동 중 ✅", "version": "1.0.0"}

@app.post("/api/login")
def login(req: LoginRequest):
    """관리자 로그인 및 세션 토큰 발급"""
    if req.username.strip() != ADMIN_ID or req.password != ADMIN_PW:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    token = str(uuid.uuid4())
    sessions[token] = {"username": req.username, "created_at": time.time()}
    return {"token": token, "message": "로그인 성공"}

def get_session(token: str = None):
    """세션 토큰 검증 의존성"""
    if not token or token not in sessions:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    return sessions[token]

@app.post("/api/storyboard")
async def generate_storyboard(req: GenerateRequest):
    """
    Step 1: 장문 스토리 → 20컷 콘티 JSON 생성
    """
    if not req.story or len(req.story.strip()) < 20:
        raise HTTPException(status_code=400, detail="스토리 내용이 너무 짧습니다. 최소 20자 이상 입력하세요.")
    get_session(req.session_token)

    agent = StoryboardAgent(hf_token=req.hf_token)
    consistency = ConsistencyAgent()

    # 스토리보드 생성
    storyboard = await agent.generate_storyboard(req.story, req.genre)
    # 캐릭터 프로필 생성 및 프롬프트에 일관성 주입
    profile = consistency.create_character_profile(
        storyboard.get("main_character", "주인공"), req.story, req.genre
    )
    storyboard["cuts"] = consistency.inject_consistency(storyboard["cuts"], profile)
    storyboard["character_profile"] = profile

    return storyboard

@app.get("/api/generate-stream")
async def generate_stream(story: str, genre: str = "drama", session_token: str = "", hf_token: str = ""):
    """
    Step 2+3+4: SSE 스트리밍으로 20컷 이미지 생성 진행률 실시간 전달
    EventStream 형식: data: {"type": "progress"|"cut_done"|"complete", ...}
    """
    get_session(session_token)

    session_id = str(uuid.uuid4())[:8]

    async def event_generator():
        try:
            # Step 1: 스토리보드 분석
            status1 = json.dumps({"type": "status", "message": "Story analysis and 20-cut storyboard planning...", "progress": 2}, ensure_ascii=False)
            yield f"data: {status1}\n\n"
            await asyncio.sleep(0.1)

            storyboard_agent = StoryboardAgent(hf_token=hf_token)
            consistency_agent = ConsistencyAgent()
            image_agent = ImageGenerationAgent(hf_token=hf_token, session_id=session_id)
            bubble_agent = SpeechBubbleAgent()

            storyboard = await storyboard_agent.generate_storyboard(story, genre)
            profile = consistency_agent.create_character_profile(
                storyboard.get("main_character", "주인공"), story, genre
            )
            cuts = consistency_agent.inject_consistency(storyboard["cuts"], profile)

            cuts_preview = [{"cut_index": c["cut_index"], "scene_title": c["scene_title"], "dialogue": c["dialogue"]} for c in cuts]
            storyboard_msg = json.dumps({
                "type": "status",
                "message": f"Storyboard complete! {len(cuts)} cuts confirmed. Starting image generation...",
                "progress": 5,
                "storyboard": {
                    "title": storyboard.get("title", ""),
                    "main_character": storyboard.get("main_character", ""),
                    "cuts_preview": cuts_preview
                }
            }, ensure_ascii=False)
            yield f"data: {storyboard_msg}\n\n"
            await asyncio.sleep(0.2)

            # Step 2-3: 이미지 비동기 병렬 생성 + SSE 실시간 전달
            completed_cuts = []

            async def on_progress(cut_index: int, total: int, image_path: str):
                cut_data = cuts[cut_index - 1]
                # 말풍선 합성
                bubble_out = image_path.replace(".png", "_bubble.png")
                bubble_agent.compose(cut_data, image_path, bubble_out)

                pct = 5 + int((cut_index / total) * 90)
                cut_idx_padded = str(cut_data["cut_index"]).zfill(2)
                rel_path = f"/outputs/{session_id}/cut_{cut_idx_padded}_bubble.png"

                payload = {
                    "type": "cut_done",
                    "cut_index": cut_index,
                    "total": total,
                    "progress": pct,
                    "message": f"Image {cut_index}/{total} complete",
                    "cut_data": {
                        "cut_index": cut_data["cut_index"],
                        "scene_title": cut_data["scene_title"],
                        "phase": cut_data["phase"],
                        "dialogue": cut_data["dialogue"],
                        "speaker": cut_data["speaker"],
                        "scene_summary": cut_data["scene_summary"],
                        "image_url": rel_path
                    }
                }
                completed_cuts.append(payload["cut_data"])
                payload_str = json.dumps(payload, ensure_ascii=False)
                await progress_queue.put(f"data: {payload_str}\n\n")

            progress_queue: asyncio.Queue = asyncio.Queue()

            # 이미지 생성 태스크 백그라운드 실행
            async def run_generation():
                await image_agent.generate_all(cuts, on_progress, max_parallel=3)
                await progress_queue.put("DONE")

            gen_task = asyncio.create_task(run_generation())

            # SSE 큐에서 읽어 스트리밍
            while True:
                item = await asyncio.wait_for(progress_queue.get(), timeout=120)
                if item == "DONE":
                    break
                yield item

            await gen_task

            # Step 4: 완료
            complete_msg = json.dumps({
                "type": "complete",
                "message": "Webtoon 20-cut generation complete!",
                "progress": 100,
                "session_id": session_id,
                "title": storyboard.get("title", "Webtoon"),
                "cuts": completed_cuts
            }, ensure_ascii=False)
            yield f"data: {complete_msg}\n\n"

        except Exception as e:
            err_msg = json.dumps({"type": "error", "message": f"Error: {str(e)}"}, ensure_ascii=False)
            yield f"data: {err_msg}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@app.get("/api/health")
def health():
    return {"status": "ok", "server": "FastAPI Webtoon Generator"}
