import asyncio
import httpx
import os
import re
import io
import urllib.parse
from typing import List, Dict, Any, Optional, Callable
from PIL import Image, ImageDraw, ImageFont

# ─── 이미지 생성 엔드포인트 (완전 무료) ─────────────────────────────
# 1순위: Pollinations.ai 무료 FLUX/SDXL API (API Key 불필요)
POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/{prompt}?width=768&height=1024&model=flux&nologo=true&seed={seed}"
# 2순위: Hugging Face 무료 FLUX.1-schnell (HF 토큰 선택적)
HF_FLUX_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")
FONT_DIR   = os.path.join(os.path.dirname(__file__), "..", "fonts")


def build_pollinations_url(prompt: str, seed: int) -> str:
    """Pollinations URL을 일관되게 생성 (image_agent와 main.py 모두 동일 URL 사용)"""
    safe_prompt = re.sub(r'[^\x00-\x7F]+', '', prompt)[:300]
    safe_prompt = re.sub(r'[^a-zA-Z0-9 ,.\-_]', '', safe_prompt).strip()
    encoded = urllib.parse.quote(safe_prompt)
    return POLLINATIONS_BASE.format(prompt=encoded, seed=seed)


class ImageGenerationAgent:
    """
    Image Generation Agent (이미지 생성 에이전트)
    20컷의 비주얼 프롬프트를 비동기(asyncio) 병렬 호출로 처리합니다.
    - 1차: Pollinations.ai 무료 FLUX 엔드포인트
    - 2차: Hugging Face 무료 FLUX.1-schnell (토큰 있을 시)
    - 3차: PIL 텍스트 스케치 플레이스홀더 (오프라인 완전 폴백)
    
    progress_callback(cut_index, total, image_path, pollinations_url) 형식으로 호출
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
        max_parallel: int = 3
    ) -> List[Dict[str, Any]]:
        """
        20컷 이미지를 최대 max_parallel 개씩 병렬 생성
        progress_callback(cut_index, total, image_path, pollinations_url) 로 실시간 진행률 전달
        """
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

    async def _generate_image(self, cut: Dict[str, Any]) -> tuple[str, str]:
        """단일 컷 이미지 생성 – 3단계 폴백 시스템
        Returns: (local_path, cloud_url)
        """
        cut_index = cut.get("cut_index", 0)
        prompt = cut.get("consistent_prompt_en", cut.get("visual_prompt_en", "webtoon panel"))
        seed = cut.get("seed", 42)
        output_path = os.path.join(self.session_dir, f"cut_{cut_index:02d}.png")

        # 실제 사용할 Pollinations URL을 미리 생성 (항상 반환)
        pollinations_url = build_pollinations_url(prompt, seed)

        # 이미 생성된 이미지 재사용
        if os.path.exists(output_path):
            return output_path, pollinations_url

        # 1차 시도: Pollinations.ai FLUX (무료, 토큰 불필요)
        try:
            img_bytes = await self._fetch_pollinations(pollinations_url)
            if img_bytes:
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                img = img.resize((768, 1024), Image.LANCZOS)
                img.save(output_path, "PNG", optimize=True)
                print(f"[ImageAgent] ✅ Cut {cut_index}: Pollinations FLUX 성공")
                return output_path, pollinations_url
        except Exception as e:
            print(f"[ImageAgent] Pollinations 실패 ({e}), HF로 전환")

        # 2차 시도: HuggingFace FLUX.1-schnell (무료 토큰 있을 시)
        if self.hf_token:
            try:
                img_bytes = await self._fetch_hf_flux(prompt, seed)
                if img_bytes:
                    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    img = img.resize((768, 1024), Image.LANCZOS)
                    img.save(output_path, "PNG", optimize=True)
                    print(f"[ImageAgent] ✅ Cut {cut_index}: HuggingFace FLUX 성공")
                    return output_path, pollinations_url
            except Exception as e:
                print(f"[ImageAgent] HuggingFace 실패 ({e}), PIL 폴백으로 전환")

        # 3차 폴백: PIL 텍스트 스케치 (100% 오프라인 무결점)
        fallback_path = await self._render_pil_sketch(cut, output_path)
        print(f"[ImageAgent] ✅ Cut {cut_index}: PIL 스케치 생성 (폴백)")
        # 폴백의 경우 로컬 파일이 있지만 cloud URL은 여전히 Pollinations URL 반환
        # (브라우저에서 Pollinations URL로 직접 접근하면 이미지 나올 수 있음)
        return fallback_path, pollinations_url

    async def _fetch_pollinations(self, url: str) -> Optional[bytes]:
        """Pollinations.ai FLUX 무료 API 호출 (이미 완성된 URL 사용)"""
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200 and len(resp.content) > 5000:
                return resp.content
        return None

    async def _fetch_hf_flux(self, prompt: str, seed: int) -> Optional[bytes]:
        """HuggingFace FLUX.1-schnell 무료 API 호출"""
        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": prompt[:500],
            "parameters": {"seed": seed, "num_inference_steps": 4, "guidance_scale": 0.0}
        }
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(HF_FLUX_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.content
        return None

    async def _render_pil_sketch(self, cut: Dict[str, Any], output_path: str) -> str:
        """
        PIL 기반 텍스트 스케치 플레이스홀더 생성
        – 배경 그라디언트 + 컷 번호 + 장면 설명 + 웹툰 패널 경계 표시
        """
        W, H = 768, 1024
        cut_index = cut.get("cut_index", 0)
        phase = cut.get("phase", "")
        scene_title = cut.get("scene_title", f"컷 {cut_index}")
        scene_summary = cut.get("scene_summary", "")
        visual_kr = cut.get("visual_prompt_kr", "")

        # 4개 구간별 배경 색상
        phase_colors = {
            "기": [(220, 235, 255), (180, 210, 250)],
            "승": [(220, 255, 225), (170, 240, 195)],
            "전": [(255, 225, 220), (250, 180, 170)],
            "결": [(240, 220, 255), (210, 175, 245)],
        }
        phase_key = phase[:1] if phase else "기"
        colors = phase_colors.get(phase_key, [(230, 230, 230), (200, 200, 200)])
        top_color, bot_color = colors

        img = Image.new("RGB", (W, H), top_color)
        draw = ImageDraw.Draw(img)
        for y in range(H):
            ratio = y / H
            r = int(top_color[0] * (1 - ratio) + bot_color[0] * ratio)
            g = int(top_color[1] * (1 - ratio) + bot_color[1] * ratio)
            b = int(top_color[2] * (1 - ratio) + bot_color[2] * ratio)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        draw.rectangle([10, 10, W-10, H-10], outline=(30, 30, 60), width=4)
        draw.rectangle([14, 14, W-14, H-14], outline=(80, 80, 120), width=1)

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

        font_medium = get_font(30)
        font_small  = get_font(22)
        font_tiny   = get_font(18)

        badge_x, badge_y = 30, 30
        draw.ellipse([badge_x, badge_y, badge_x+80, badge_y+80], fill=(30, 30, 80), outline="white", width=2)
        draw.text((badge_x+15, badge_y+12), f"{cut_index:02d}", font=get_font(44), fill="white")

        draw.text((120, 42), phase, font=font_medium, fill=(60, 60, 120))
        draw.text((W//2, 145), scene_title, font=get_font(36), fill=(20, 20, 60), anchor="mm")
        draw.line([(60, 185), (W-60, 185)], fill=(80, 80, 150), width=2)

        cx, cy = W // 2, H // 2
        draw.ellipse([cx-60, cy-200, cx+60, cy-100], fill=(160, 160, 200), outline=(100, 100, 160))
        draw.polygon([(cx-50, cy-100), (cx+50, cy-100), (cx+80, cy+80), (cx-80, cy+80)], fill=(140, 140, 190), outline=(100, 100, 160))

        desc_y = cy + 120
        desc_lines = self._wrap_text(scene_summary or visual_kr, 28)
        for line in desc_lines[:5]:
            draw.text((W//2, desc_y), line, font=font_small, fill=(40, 40, 80), anchor="mm")
            desc_y += 30

        draw.rectangle([20, H-80, W-20, H-20], fill=(255, 255, 255), outline=(180, 180, 220), width=1)
        draw.text((W//2, H-55), "🎨 AI 이미지 생성 중 (콘티 미리보기)", font=font_tiny, fill=(100, 100, 160), anchor="mm")

        img.save(output_path, "PNG")
        return output_path

    def _wrap_text(self, text: str, max_chars: int) -> List[str]:
        """한국어 자동 줄바꿈"""
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
