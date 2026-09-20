import asyncio
import httpx
import os
import re
import io
import urllib.parse
import random
from typing import List, Dict, Any, Optional, Callable
from PIL import Image, ImageDraw, ImageFont

# ─── 이미지 생성 엔드포인트 ─────────────────────────────────────────
# 1순위: Pollinations.ai (노 토큰, 무료, 빠름)
POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/{prompt}?width=768&height=1024&model=flux&nologo=true&enhance=true&seed={seed}"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")
FONT_DIR   = os.path.join(os.path.dirname(__file__), "..", "fonts")


def build_pollinations_url(prompt: str, seed: int) -> str:
    """Pollinations URL 생성 – 항상 유효한 영문 URL 보장"""
    # 1) 비ASCII 제거 (한국어 등)
    ascii_only = re.sub(r'[^\x00-\x7F]+', '', prompt)
    # 2) 특수문자 정리 (영숫자·공백·,·.·-·_ 만 허용)
    clean = re.sub(r'[^a-zA-Z0-9 ,.\-_]', ' ', ascii_only)
    clean = re.sub(r'\s+', ' ', clean).strip()[:300]
    # 3) 빈 프롬프트 폴백 (한국어만 있는 경우)
    if len(clean) < 8:
        clean = "korean webtoon manhwa comic panel character scene, anime style, detailed lineart"
    encoded = urllib.parse.quote(clean)
    return POLLINATIONS_BASE.format(prompt=encoded, seed=seed)


class ImageGenerationAgent:
    """
    Image Generation Agent
    - Pollinations.ai FLUX (서버 fetch → 성공 시 로컬 저장)
    - PIL 스케치 폴백 (오프라인 100% 성공)
    - progress_callback(cut_index, total, image_path, pollinations_url) 형식
    """

    def __init__(self, hf_token: str = None, session_id: str = "default"):
        self.hf_token = hf_token or os.environ.get("HUGGINGFACE_TOKEN", "")
        self.session_id = session_id
        try:
            self.session_dir = os.path.join(OUTPUT_DIR, session_id)
            os.makedirs(self.session_dir, exist_ok=True)
        except Exception:
            self.session_dir = os.path.join("/tmp", "outputs", session_id)
            os.makedirs(self.session_dir, exist_ok=True)

    async def generate_all(
        self,
        cuts: List[Dict[str, Any]],
        progress_callback: Optional[Callable] = None,
        max_parallel: int = 2
    ) -> List[Dict[str, Any]]:
        """20컷 이미지 병렬 생성. callback 형식: (cut_index, total, path, url)"""
        semaphore = asyncio.Semaphore(max_parallel)
        results = [None] * len(cuts)

        async def generate_one(idx: int, cut: Dict[str, Any]):
            async with semaphore:
                image_path, actual_url = await self._generate_image(cut)
                results[idx] = {**cut, "image_path": image_path, "image_url": actual_url}
                if progress_callback:
                    await progress_callback(idx + 1, len(cuts), image_path, actual_url)

        tasks = [generate_one(i, cut) for i, cut in enumerate(cuts)]
        await asyncio.gather(*tasks)
        return results

    async def _generate_image(self, cut: Dict[str, Any]) -> tuple:
        """단일 컷 이미지 생성 (local_path, cloud_url) 반환"""
        cut_index = cut.get("cut_index", 0)
        prompt = cut.get("consistent_prompt_en", cut.get("visual_prompt_en", ""))
        # 각 컷마다 seed 변형 (같은 기본 seed + cut_index로 컷별 다른 이미지)
        base_seed = cut.get("seed", random.randint(10000, 99999))
        seed = (base_seed + cut_index * 37) % 100000
        output_path = os.path.join(self.session_dir, f"cut_{cut_index:02d}.png")

        # Pollinations URL 미리 생성 (항상 유효)
        pollinations_url = build_pollinations_url(prompt, seed)
        print(f"[ImageAgent] Cut {cut_index} URL: {pollinations_url[:80]}...")

        # 이미 생성된 이미지 재사용
        if os.path.exists(output_path):
            return output_path, pollinations_url

        # 1차: Pollinations.ai (25초 타임아웃 – Vercel 한도 고려)
        try:
            img_bytes = await self._fetch_url(pollinations_url, timeout=25.0)
            if img_bytes:
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                img = img.resize((768, 1024), Image.LANCZOS)
                img.save(output_path, "PNG", optimize=True)
                print(f"[ImageAgent] ✅ Cut {cut_index}: Pollinations 성공")
                return output_path, pollinations_url
        except Exception as e:
            print(f"[ImageAgent] Pollinations 실패 ({e})")

        # 2차: HuggingFace (토큰 있을 때)
        if self.hf_token:
            try:
                img_bytes = await self._fetch_hf_flux(prompt, seed, timeout=30.0)
                if img_bytes:
                    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    img = img.resize((768, 1024), Image.LANCZOS)
                    img.save(output_path, "PNG", optimize=True)
                    print(f"[ImageAgent] ✅ Cut {cut_index}: HuggingFace 성공")
                    return output_path, pollinations_url
            except Exception as e:
                print(f"[ImageAgent] HuggingFace 실패 ({e})")

        # 3차: PIL 스케치 (100% 성공 폴백)
        fallback_path = await self._render_pil_sketch(cut, output_path, seed)
        print(f"[ImageAgent] ✅ Cut {cut_index}: PIL 폴백 (브라우저는 Pollinations URL 사용)")
        return fallback_path, pollinations_url

    async def _fetch_url(self, url: str, timeout: float = 25.0) -> Optional[bytes]:
        """단순 GET 이미지 fetch"""
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and len(resp.content) > 5000:
                return resp.content
        return None

    async def _fetch_hf_flux(self, prompt: str, seed: int, timeout: float = 30.0) -> Optional[bytes]:
        """HuggingFace FLUX.1-schnell 무료 API"""
        headers = {"Authorization": f"Bearer {self.hf_token}", "Content-Type": "application/json"}
        payload = {"inputs": prompt[:500], "parameters": {"seed": seed, "num_inference_steps": 4, "guidance_scale": 0.0}}
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
                headers=headers, json=payload
            )
            if resp.status_code == 200:
                return resp.content
        return None

    async def _render_pil_sketch(self, cut: Dict[str, Any], output_path: str, seed: int) -> str:
        """PIL 배경 그라디언트 스케치 (오프라인 폴백)"""
        W, H = 768, 1024
        cut_index = cut.get("cut_index", 0)
        phase = cut.get("phase", "")
        scene_title = cut.get("scene_title", f"컷 {cut_index}")
        scene_summary = cut.get("scene_summary", "")
        visual_kr = cut.get("visual_prompt_kr", "")

        phase_colors = {
            "기": [(220, 235, 255), (180, 210, 250)],
            "승": [(220, 255, 225), (170, 240, 195)],
            "전": [(255, 225, 220), (250, 180, 170)],
            "결": [(240, 220, 255), (210, 175, 245)],
        }
        phase_key = phase[:1] if phase else "기"
        top_color, bot_color = phase_colors.get(phase_key, [(230, 230, 230), (200, 200, 200)])

        img = Image.new("RGB", (W, H), top_color)
        draw = ImageDraw.Draw(img)
        for y in range(H):
            ratio = y / H
            r = int(top_color[0] * (1 - ratio) + bot_color[0] * ratio)
            g = int(top_color[1] * (1 - ratio) + bot_color[1] * ratio)
            b = int(top_color[2] * (1 - ratio) + bot_color[2] * ratio)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        draw.rectangle([10, 10, W-10, H-10], outline=(30, 30, 60), width=4)

        font_path = os.path.join(FONT_DIR, "malgun.ttf")
        alt_font  = os.path.join(FONT_DIR, "NanumGothic.ttf")

        def get_font(size):
            for fp in [font_path, alt_font]:
                if os.path.exists(fp):
                    try:
                        return ImageFont.truetype(fp, size)
                    except:
                        pass
            return ImageFont.load_default()

        badge_x, badge_y = 30, 30
        draw.ellipse([badge_x, badge_y, badge_x+80, badge_y+80], fill=(30, 30, 80), outline="white", width=2)
        draw.text((badge_x+15, badge_y+12), f"{cut_index:02d}", font=get_font(44), fill="white")
        draw.text((120, 42), phase, font=get_font(30), fill=(60, 60, 120))
        draw.text((W//2, 145), scene_title, font=get_font(32), fill=(20, 20, 60), anchor="mm")
        draw.line([(60, 185), (W-60, 185)], fill=(80, 80, 150), width=2)

        cx, cy = W // 2, H // 2
        draw.ellipse([cx-60, cy-200, cx+60, cy-100], fill=(160, 160, 200), outline=(100, 100, 160))
        draw.polygon([(cx-50, cy-100), (cx+50, cy-100), (cx+80, cy+80), (cx-80, cy+80)],
                     fill=(140, 140, 190), outline=(100, 100, 160))

        desc_y = cy + 130
        for line in self._wrap_text(scene_summary or visual_kr, 28)[:5]:
            draw.text((W//2, desc_y), line, font=get_font(22), fill=(40, 40, 80), anchor="mm")
            desc_y += 30

        draw.rectangle([20, H-80, W-20, H-20], fill=(255, 255, 255), outline=(180, 180, 220), width=1)
        draw.text((W//2, H-55), "이미지 로딩 중... (Pollinations AI)", font=get_font(18), fill=(100, 100, 160), anchor="mm")

        img.save(output_path, "PNG")
        return output_path

    def _wrap_text(self, text: str, max_chars: int) -> List[str]:
        if not text:
            return []
        words = text.split()
        lines, line = [], ""
        for word in words:
            if len(line) + len(word) + 1 <= max_chars:
                line = (line + " " + word).strip()
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
        return lines
