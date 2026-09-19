import random
from typing import Dict, Any, List

class ConsistencyAgent:
    """
    Consistency Agent (캐릭터 일관성 유지 에이전트)
    주인공 캐릭터의 외형 특징(헤어, 의상, 대표 색상, 아트 스타일)을 프로필화하고
    고정 시드(Seed) 및 앵커 프롬프트를 1~20컷 전체에 주입하여 시각적 연속성을 보장합니다.
    """

    PRESET_PROFILES = [
        {
            "id": "modern_male",
            "name": "민우",
            "gender": "male",
            "hair": "black messy layered hair, slight bangs",
            "eyes": "dark brown expressive sharp eyes",
            "outfit": "dark navy casual oversized hoodie, white undershirt, black pants",
            "accent": "subtle silver ear cuff",
            "anchor_token": "1boy, handsome modern korean webtoon protagonist, messy black hair, dark brown eyes, navy hoodie"
        },
        {
            "id": "modern_female",
            "name": "지아",
            "gender": "female",
            "hair": "long straight chestnut brown hair with soft curtain bangs",
            "eyes": "warm amber sparkling eyes",
            "outfit": "beige knitted cardigan over white blouse, pleated skirt",
            "accent": "dainty necklace",
            "anchor_token": "1girl, pretty modern korean webtoon heroine, long brown hair with bangs, amber eyes, beige cardigan"
        },
        {
            "id": "fantasy_hero",
            "name": "카엘",
            "gender": "male",
            "hair": "silver-white spiky hair",
            "eyes": "glowing sapphire blue eyes",
            "outfit": "black adventurer leather coat with silver shoulder trim",
            "accent": "rune inscribed pendant",
            "anchor_token": "1boy, fantasy manhwa protagonist, silver hair, glowing blue eyes, black leather coat"
        }
    ]

    def __init__(self):
        pass

    def create_character_profile(self, character_name: str, story_text: str, genre: str = "drama", fixed_seed: int = None) -> Dict[str, Any]:
        """
        스토리와 장르에 맞춰 주인공 캐릭터의 시각적 일관성 프로필과 시드를 생성
        """
        # 고정 시드 결정 (미지정시 1~99999 사이 고정값 생성)
        seed = fixed_seed if fixed_seed is not None else random.randint(10000, 99999)

        # 텍스트 내 성별 힌트 파악
        is_female = any(w in story_text for w in ["그녀", "소녀", "여학생", "언니", "누나", "지아", "수아", "유진"])

        if genre == "fantasy":
            base = self.PRESET_PROFILES[2]
        elif is_female:
            base = self.PRESET_PROFILES[1]
        else:
            base = self.PRESET_PROFILES[0]

        profile = {
            "character_name": character_name or base["name"],
            "seed": seed,
            "gender": "female" if is_female else "male",
            "hair": base["hair"],
            "eyes": base["eyes"],
            "outfit": base["outfit"],
            "accent": base["accent"],
            "anchor_token": base["anchor_token"],
            "art_style_tag": "webtoon masterpiece, highly detailed comic panel, official manhwa digital art, consistent character face, vibrant aesthetic, 8k resolution"
        }
        return profile

    def inject_consistency(self, cuts: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        20컷의 각 visual prompt에 캐릭터 앵커 토큰과 고정 시드를 결합
        """
        enhanced_cuts = []
        anchor = profile["anchor_token"]
        style_tag = profile["art_style_tag"]
        seed = profile["seed"]

        for cut in cuts:
            c = dict(cut)
            # 프롬프트 융합: [캐릭터 외형 앵커] + [컷 고유 동작/구도] + [마스터 스타일 태그]
            original_prompt = c.get("visual_prompt_en", "")
            c["consistent_prompt_en"] = f"{anchor}, {original_prompt}, {style_tag}"
            c["negative_prompt"] = "blurry, low quality, distorted anatomy, bad hands, extra limbs, deformed face, text watermark, ugly, low resolution"
            c["seed"] = seed
            enhanced_cuts.append(c)

        return enhanced_cuts
