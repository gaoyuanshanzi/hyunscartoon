import os
import textwrap
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, List, Tuple

FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")

class SpeechBubbleAgent:
    """
    Layout & Speech Bubble Agent (말풍선 및 레이아웃 합성 에이전트)
    Pillow(PIL)로 생성 이미지 위에 한국어 대사와 웹툰 스타일 말풍선을 합성합니다.
    - 둥근 사각 말풍선 (기본 대사)
    - 타원형 말풍선 (강조 대사)
    - 내레이션 박스 (직사각형, 반투명 흰 배경)
    - 자동 줄바꿈 및 한글 폰트 적용
    - 말풍선 꼬리(tail) 자동 렌더링
    """

    def __init__(self):
        self.font_path = self._find_font()

    def _find_font(self) -> str:
        candidates = [
            os.path.join(FONT_DIR, "malgun.ttf"),
            os.path.join(FONT_DIR, "NanumGothic.ttf"),
            "C:/Windows/Fonts/malgun.ttf",
            "C:/Windows/Fonts/gulim.ttc",
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None

    def _get_font(self, size: int) -> ImageFont.ImageFont:
        if self.font_path:
            try:
                return ImageFont.truetype(self.font_path, size)
            except:
                pass
        return ImageFont.load_default()

    def compose(self, cut: Dict[str, Any], image_path: str, output_path: str) -> str:
        """이미지 + 말풍선 합성 후 저장"""
        img = Image.open(image_path).convert("RGBA")
        W, H = img.size

        dialogue   = cut.get("dialogue", "")
        speaker    = cut.get("speaker", "")
        position   = cut.get("bubble_position", "top-left")
        is_narr    = (speaker == "내레이션")

        if not dialogue or len(dialogue.strip()) < 1:
            final = img.convert("RGB")
            final.save(output_path, "PNG")
            return output_path

        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        if is_narr:
            self._draw_narration_box(draw, dialogue, W, H)
        else:
            self._draw_speech_bubble(draw, dialogue, position, W, H)

        final = Image.alpha_composite(img, overlay).convert("RGB")
        final.save(output_path, "PNG")
        return output_path

    def _wrap_korean(self, text: str, max_chars: int = 16) -> List[str]:
        """한국어 텍스트 자동 줄바꿈"""
        lines = []
        while len(text) > max_chars:
            # 자연 어절 분리 우선
            break_at = text.rfind(' ', 0, max_chars)
            if break_at < max_chars // 2:
                break_at = max_chars
            lines.append(text[:break_at])
            text = text[break_at:].strip()
        if text:
            lines.append(text)
        return lines[:4]  # 최대 4줄

    def _draw_speech_bubble(self, draw: ImageDraw.Draw, text: str, position: str, W: int, H: int):
        """둥근 사각형 말풍선 (대화 대사)"""
        font = self._get_font(28)
        lines = self._wrap_korean(text, 14)
        pad_x, pad_y = 22, 14
        line_h = 36
        max_w = max((self._text_width(draw, l, font) for l in lines), default=80)
        bw = max_w + pad_x * 2
        bh = len(lines) * line_h + pad_y * 2

        # 위치 계산
        margin = 24
        positions_map = {
            "top-left":     (margin, margin),
            "top-right":    (W - bw - margin, margin),
            "top-center":   ((W - bw) // 2, margin),
            "bottom-left":  (margin, H - bh - margin - 80),
            "bottom-right": (W - bw - margin, H - bh - margin - 80),
        }
        bx, by = positions_map.get(position, (margin, margin))
        bx = max(margin, min(bx, W - bw - margin))
        by = max(margin, min(by, H - bh - margin - 60))

        # 말풍선 그림자
        draw.rounded_rectangle([bx+3, by+3, bx+bw+3, by+bh+3], radius=18, fill=(0, 0, 0, 60))
        # 말풍선 본체
        draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=18, fill=(255, 255, 255, 235), outline=(30, 30, 60, 200), width=2)

        # 꼬리 (아래 방향)
        if by > H // 2:  # 아래쪽 말풍선은 꼬리가 위
            cx = bx + bw // 2
            tail_pts = [(cx - 10, by + 2), (cx + 10, by + 2), (cx, by - 18)]
        else:
            cx = bx + bw // 2
            tail_pts = [(cx - 10, by + bh - 2), (cx + 10, by + bh - 2), (cx, by + bh + 18)]
        draw.polygon(tail_pts, fill=(255, 255, 255, 235), outline=(30, 30, 60, 200))

        # 텍스트 렌더링
        ty = by + pad_y
        for line in lines:
            tw = self._text_width(draw, line, font)
            tx = bx + (bw - tw) // 2
            draw.text((tx + 1, ty + 1), line, font=font, fill=(0, 0, 0, 80))
            draw.text((tx, ty), line, font=font, fill=(20, 20, 50, 255))
            ty += line_h

    def _draw_narration_box(self, draw: ImageDraw.Draw, text: str, W: int, H: int):
        """내레이션 박스 (상단 가로 바 스타일)"""
        font = self._get_font(24)
        lines = self._wrap_korean(text, 22)
        pad_x, pad_y = 28, 14
        line_h = 32
        bh = len(lines) * line_h + pad_y * 2

        # 상단 가로 내레이션 박스
        draw.rectangle([0, 0, W, bh + 8], fill=(20, 20, 50, 210))
        draw.rectangle([0, bh + 8, W, bh + 11], fill=(100, 130, 220, 255))

        ty = pad_y + 4
        for line in lines:
            draw.text((pad_x + 1, ty + 1), line, font=font, fill=(0, 0, 0, 80))
            draw.text((pad_x, ty), line, font=font, fill=(230, 230, 255, 255))
            ty += line_h

    def _text_width(self, draw: ImageDraw.Draw, text: str, font: ImageFont.ImageFont) -> int:
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            return bbox[2] - bbox[0]
        except:
            return len(text) * 14
