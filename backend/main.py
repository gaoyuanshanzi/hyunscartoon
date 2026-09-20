import asyncio
import json
import os
import sys
import uuid
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel

# Vercel 서버리스 환경에서 backend 디렉터리를 sys.path에 추가
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from agents.storyboard_agent import StoryboardAgent
from agents.consistency_agent import ConsistencyAgent
from agents.image_agent import ImageGenerationAgent
from agents.bubble_agent import SpeechBubbleAgent

# ─── Neon PostgreSQL 연결 ────────────────────────────────────────────
NEON_DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_ImMAjuKH5ZD7@ep-holy-shadow-b5417rlb-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

def get_db_conn():
    """psycopg2 연결 반환 (실패 시 None)"""
    try:
        import psycopg2
        conn = psycopg2.connect(NEON_DSN)
        return conn
    except Exception as e:
        print(f"[DB] Neon 연결 실패: {e}")
        return None

def init_db():
    """테이블 초기화 (없으면 생성)"""
    conn = get_db_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS webtoon_sessions (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT UNIQUE NOT NULL,
                    title TEXT,
                    genre TEXT,
                    story TEXT,
                    export_html TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS webtoon_cuts (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT REFERENCES webtoon_sessions(session_id) ON DELETE CASCADE,
                    cut_index INTEGER,
                    phase TEXT,
                    scene_title TEXT,
                    dialogue TEXT,
                    speaker TEXT,
                    scene_summary TEXT,
                    image_url TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
        conn.commit()
        print("[DB] ✅ Neon 테이블 초기화 완료")
    except Exception as e:
        print(f"[DB] 테이블 생성 실패: {e}")
    finally:
        conn.close()

def db_save_session(session_id: str, title: str, genre: str, story: str):
    """세션 정보를 Neon에 저장"""
    conn = get_db_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO webtoon_sessions (session_id, title, genre, story)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (session_id) DO UPDATE
                    SET title = EXCLUDED.title,
                        genre = EXCLUDED.genre,
                        story = EXCLUDED.story;
            """, (session_id, title, genre, story))
        conn.commit()
    except Exception as e:
        print(f"[DB] 세션 저장 실패: {e}")
    finally:
        conn.close()

def db_save_cut(session_id: str, cut: dict):
    """컷 정보를 Neon에 저장"""
    conn = get_db_conn()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO webtoon_cuts
                    (session_id, cut_index, phase, scene_title, dialogue, speaker, scene_summary, image_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                session_id,
                cut.get("cut_index"),
                cut.get("phase"),
                cut.get("scene_title"),
                cut.get("dialogue"),
                cut.get("speaker"),
                cut.get("scene_summary"),
                cut.get("image_url"),
            ))
        conn.commit()
    except Exception as e:
        print(f"[DB] 컷 저장 실패: {e}")
    finally:
        conn.close()

def db_save_export_html(session_id: str, html: str):
    """내보내기 HTML을 Neon에 저장"""
    conn = get_db_conn()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE webtoon_sessions SET export_html = %s WHERE session_id = %s;
            """, (html, session_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] HTML 내보내기 저장 실패: {e}")
        return False
    finally:
        conn.close()

# ─── 앱 초기화 ─────────────────────────────────────────────────────
app = FastAPI(title="웹툰 자동 생성 API", version="2.0.0")

@app.on_event("startup")
async def startup_event():
    init_db()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 출력 이미지 디렉터리 정적 파일 제공
OUTPUTS_DIR = os.path.join(CURRENT_DIR, "outputs")
if not os.path.exists(OUTPUTS_DIR):
    try:
        os.makedirs(OUTPUTS_DIR, exist_ok=True)
    except Exception:
        pass

if os.path.exists(OUTPUTS_DIR):
    app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# ─── 간단 세션 스토어 (인메모리) ────────────────────────────────────
sessions: dict = {}

# ─── 인증 ──────────────────────────────────────────────────────────
ADMIN_ID = "admin"
ADMIN_PW = "123jesus"

class LoginRequest(BaseModel):
    username: str
    password: str

class ExportRequest(BaseModel):
    session_id: str
    title: str
    html: str
    save_to_neon: bool = True

# ─── 엔드포인트 ─────────────────────────────────────────────────────

@app.get("/")
def root():
    html_path = os.path.join(CURRENT_DIR, "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path, media_type="text/html")
    return {"message": "웹툰 생성 API 서버 가동 중 ✅", "version": "2.0.0"}

@app.post("/api/login")
def login(req: LoginRequest):
    """관리자 로그인 및 세션 토큰 발급"""
    if req.username.strip() != ADMIN_ID or req.password != ADMIN_PW:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    token = str(uuid.uuid4())
    sessions[token] = {"username": req.username, "created_at": time.time()}
    return {"token": token, "message": "로그인 성공"}

def get_session(token: str = None):
    if not token or token not in sessions:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    return sessions[token]

@app.get("/api/generate-stream")
async def generate_stream(story: str, genre: str = "drama", session_token: str = "", hf_token: str = ""):
    """
    SSE 스트리밍으로 20컷 이미지 생성 진행률 실시간 전달
    EventStream: data: {"type": "status"|"cut_done"|"complete"|"error", ...}
    """
    get_session(session_token)
    gen_session_id = str(uuid.uuid4())[:8]

    async def event_generator():
        try:
            # ── Step 1: 스토리보드 분석 ──────────────────────────────
            yield f"data: {json.dumps({'type':'status','message':'스토리 분석 및 20컷 콘티 기획 중...','progress':2}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)

            storyboard_agent = StoryboardAgent(hf_token=hf_token)
            consistency_agent = ConsistencyAgent()
            image_agent = ImageGenerationAgent(hf_token=hf_token, session_id=gen_session_id)
            bubble_agent = SpeechBubbleAgent()

            storyboard = await storyboard_agent.generate_storyboard(story, genre)
            title = storyboard.get("title", "웹툰")
            profile = consistency_agent.create_character_profile(
                storyboard.get("main_character", "주인공"), story, genre
            )
            cuts = consistency_agent.inject_consistency(storyboard["cuts"], profile)

            # Neon에 세션 저장
            db_save_session(gen_session_id, title, genre, story)

            cuts_preview = [{"cut_index": c["cut_index"], "scene_title": c["scene_title"], "dialogue": c["dialogue"]} for c in cuts]
            yield f"data: {json.dumps({'type':'status','message':f'콘티 완료! {len(cuts)}컷 확정. 이미지 생성 시작...','progress':5,'storyboard':{'title':title,'main_character':storyboard.get('main_character',''),'cuts_preview':cuts_preview}}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.2)

            # ── Step 2-3: 이미지 병렬 생성 + SSE 스트리밍 ─────────────
            completed_cuts = []
            progress_queue: asyncio.Queue = asyncio.Queue()

            async def on_progress(cut_index: int, total: int, image_path: str, actual_url: str):
                cut_data = cuts[cut_index - 1]

                # 말풍선 합성 (로컬 환경에서만)
                try:
                    bubble_out = image_path.replace(".png", "_bubble.png")
                    bubble_agent.compose(cut_data, image_path, bubble_out)
                except Exception:
                    pass

                pct = 5 + int((cut_index / total) * 90)

                cut_payload = {
                    "cut_index": cut_data["cut_index"],
                    "scene_title": cut_data.get("scene_title", ""),
                    "phase": cut_data.get("phase", ""),
                    "dialogue": cut_data.get("dialogue", ""),
                    "speaker": cut_data.get("speaker", ""),
                    "scene_summary": cut_data.get("scene_summary", ""),
                    "image_url": actual_url,  # ← 실제 사용된 Pollinations URL
                }

                # Neon에 컷 저장
                db_save_cut(gen_session_id, cut_payload)

                completed_cuts.append(cut_payload)
                msg = json.dumps({
                    "type": "cut_done",
                    "cut_index": cut_index,
                    "total": total,
                    "progress": pct,
                    "message": f"이미지 {cut_index}/{total} 완료",
                    "session_id": gen_session_id,
                    "cut_data": cut_payload,
                }, ensure_ascii=False)
                await progress_queue.put(f"data: {msg}\n\n")

            async def run_generation():
                await image_agent.generate_all(cuts, on_progress, max_parallel=3)
                await progress_queue.put("DONE")

            gen_task = asyncio.create_task(run_generation())

            while True:
                item = await asyncio.wait_for(progress_queue.get(), timeout=180)
                if item == "DONE":
                    break
                yield item

            await gen_task

            # ── Step 4: 완료 ──────────────────────────────────────────
            complete = json.dumps({
                "type": "complete",
                "message": "🎉 웹툰 20컷 생성 완료!",
                "progress": 100,
                "session_id": gen_session_id,
                "title": title,
                "cuts": completed_cuts,
            }, ensure_ascii=False)
            yield f"data: {complete}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            err = json.dumps({"type": "error", "message": f"오류: {str(e)}"}, ensure_ascii=False)
            yield f"data: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

@app.post("/api/export")
async def export_webtoon(req: ExportRequest):
    """
    완성된 웹툰 HTML을 Neon DB에 저장
    """
    if req.save_to_neon:
        ok = db_save_export_html(req.session_id, req.html)
        if ok:
            return {"success": True, "message": "Neon DB에 저장 완료", "session_id": req.session_id}
        else:
            return {"success": False, "message": "Neon DB 저장 실패 (연결 오류)"}
    return {"success": True, "message": "로컬 저장만 선택됨"}

@app.get("/api/health")
def health():
    conn = get_db_conn()
    db_ok = conn is not None
    if conn:
        conn.close()
    return {"status": "ok", "server": "FastAPI Webtoon Generator v2", "neon_db": db_ok}
