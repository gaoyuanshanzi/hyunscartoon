// 스토리 분석 및 9컷 콘티 / 프롬프트 생성 모듈

export interface GeneratedContiCut {
  cut_index: number;
  phase: string;        // '기 (도입 1~2컷)' | '승 (전개 3~5컷)' | '전 (위기 및 절정 6~7컷)' | '결 (결말 및 여운 8~9컷)'
  phase_code: '기' | '승' | '전' | '결';
  scene_title: string;  // 장면 소제목 (스토리 본문 구절 적극 활용)
  speaker: string;      // 화자
  dialogue: string;     // 대사
  direction: string;    // 연출 지문 / 본문
  camera_angle: string; // 카메라 앵글 / 구도 (인물 여부에 따라 자동 결정)
  prompt: string;       // AI 이미지 영문 프롬프트 (인물 유무 완벽 반영)
  hasHuman: boolean;    // 인물 포함 여부
}

// 장르 및 테마별 스타일 가이드
const THEME_STYLE_MAP: Record<string, { base: string; color: string }> = {
  saint_history: {
    base: 'epic historical biographical manhwa graphic novel style, ancient Roman Christian era, classical Mediterranean stone architecture, parchment manuscripts, sacred divine lighting',
    color: 'dramatic chiaroscuro, warm candlelight, heavenly golden sunbeams, rich earthen tones',
  },
  historical_korean: {
    base: 'historical Joseon Korean manhwa webtoon style, traditional Joseon architecture and scenery, delicate lineart, oriental aesthetics',
    color: 'elegant natural ink and muted watercolor palette, soft morning mist, lantern warmth',
  },
  drama: {
    base: 'cinematic Korean webtoon drama manhwa style, realistic emotional lighting, atmospheric scenery, dynamic composition',
    color: 'warm natural daylight, cinematic soft shadows',
  },
  romance: {
    base: 'romantic manhwa artstyle, soft pastel tones, gentle emotional glow, picturesque scenery',
    color: 'soft pink and golden sunset bokeh, dreamy backlight',
  },
  fantasy: {
    base: 'epic fantasy manhwa style, mystical glowing magical aura, ethereal particles, highly detailed arcane fantasy environment',
    color: 'vibrant magical blue and gold illumination, dramatic ambient contrast',
  },
  thriller: {
    base: 'suspenseful thriller webtoon manhwa style, dramatic chiaroscuro shadows, high contrast tension, moody scenery',
    color: 'cool moody desaturated palette, sharp rim lighting',
  },
  action: {
    base: 'dynamic action webtoon manhwa style, intense perspective, cinematic motion impact, high energy environment',
    color: 'bold vibrant saturated colors, intense explosive lighting',
  },
};

// 한국어 단어 -> 영문 시각적 묘사 매핑
const KEYWORD_VISUAL_MAP: Array<{ regex: RegExp; en: string }> = [
  // 성자 / 기독교 / 역사 / 고대
  { regex: /어거스틴|아우구스티누스|히포|성자|신학|교부/i, en: 'ancient North African Christian scholar Saint Augustine, contemplative wise theologian in scholarly Roman tunic robes, surrounded by manuscripts' },
  { regex: /모니카|기도하는 어머니/i, en: 'devout caring mother in ancient Mediterranean robes, hands clasped in sincere deep prayer, soft holy light' },
  { regex: /타가스테|카르타고|밀라노|로마|고대/i, en: 'ancient Roman Mediterranean town scenery, classical stone colonnades, dusty cobblestone streets, antique villas under azure sky' },
  { regex: /성경|신앙|기도|회심|말씀|성당|교회|십자가/i, en: 'ancient sacred church interior, stained glass windows, wooden altar, holy cross, shafts of celestial warm light' },
  { regex: /서재|책상|양피지|두루마리|촛불/i, en: 'ancient stone library study, rustic wooden desk, illuminated by flickering candle, stacks of parchment scrolls' },

  // 풍경 / 배경 / 사물 (인물 없을 때도 단독 적용)
  { regex: /카페|커피|바리스타/i, en: 'cozy boutique coffee shop interior, warm wooden furniture, steaming coffee cups, soft amber lamps' },
  { regex: /학교|교실|교문|운동장/i, en: 'school classroom setting, wooden desks, bright sunlight streaming through tall windows' },
  { regex: /거리|골목|인도|횡단보도|길|도시/i, en: 'vibrant urban city street scenery, modern architecture, peaceful sidewalks, distant buildings' },
  { regex: /비|우산|빗방울|빗길/i, en: 'gentle rain falling, reflective wet asphalt street surface reflecting glowing city lights, moody weather' },
  { regex: /도서관|책|서점|소설|독서/i, en: 'magnificent library room with towering wooden bookshelves filled with antique books, quiet reading sanctuary' },
  { regex: /마법|탑|성|왕국/i, en: 'majestic fantasy stone castle tower interior, arcane glowing runes, starlit fantasy vista' },
  { regex: /집|방|침대|침실|원룸/i, en: 'neat cozy indoor bedroom interior, warm nightstand lamp light, tranquil personal living space' },
  { regex: /부엌|식탁|요리|음식/i, en: 'warm kitchen dining table, freshly prepared appetizing food dishes on ceramic plates' },
  { regex: /정류장|지하철|전철|기차역/i, en: 'quiet transit station platform, railway tracks receding into distance, evening ambient light' },
  { regex: /병원|복도|창문/i, en: 'clean hospital corridor, calm soft lighting, peaceful atmosphere' },
  { regex: /밤|새벽|달|별|어둠/i, en: 'deep nocturnal starry night sky, glowing crescent moon, tranquil calm darkness' },
  { regex: /노을|황혼|일몰|석양/i, en: 'breathtaking orange and violet sunset horizon, long warm shadows, scenic landscape' },
  { regex: /아침|새벽|햇살|일출/i, en: 'fresh dawn morning sunrise, golden sunlight rays breaking through horizon, crystal clear sky' },
  { regex: /꽃|벚꽃|공원|나무|숲|정원/i, en: 'lush tranquil green garden landscape, blooming flower blossoms, leaves dancing in gentle breeze' },
  { regex: /바다|해변|파도|강|호수/i, en: 'open sparkling blue ocean seascape, gentle waves lapping on shore, scenic horizon' },
  { regex: /산|언덕|들판|초원/i, en: 'scenic rolling green hills, vast open landscape, dynamic dramatic clouds in sky' },
  { regex: /선물|책|물건|상자/i, en: 'beautiful hardcover book gift resting on clean table, elegant packaging' },
  { regex: /노트북|모니터|작업/i, en: 'modern desk workspace with laptop display, warm desk lamp, creative study atmosphere' },
];

// 사람(인물) 출현 여부 감지 정규식
const HUMAN_DETECTION_REGEX = /사람|인물|그녀|그|소년|소녀|남자|여자|아이|노인|어르신|선생|스승|제자|어거스틴|아우구스티누스|성자|모니카|어머니|아버지|친구|얼굴|눈빛|표정|손길|손|눈|의사|환자|기사|주인공|자신|우리|그들|바리스타|작가/i;

// 9컷 단계 정의 (기 2컷, 승 3컷, 전 2컷, 결 2컷 = 총 9컷)
export const NINE_CUT_PHASES = [
  { index: 1, code: '기' as const, label: '기 (도입)' },
  { index: 2, code: '기' as const, label: '기 (도입)' },
  { index: 3, code: '승' as const, label: '승 (전개)' },
  { index: 4, code: '승' as const, label: '승 (전개)' },
  { index: 5, code: '승' as const, label: '승 (전개)' },
  { index: 6, code: '전' as const, label: '전 (위기·절정)' },
  { index: 7, code: '전' as const, label: '전 (위기·절정)' },
  { index: 8, code: '결' as const, label: '결 (결말)' },
  { index: 9, code: '결' as const, label: '결 (결말)' },
];

/**
 * 본문 구절에서 자연스러운 장면 제목 추출 (억지 생성 금지)
 */
function extractNaturalTitle(text: string, cutNum: number): string {
  if (!text || text.trim().length === 0) {
    return `#${cutNum} 장면`;
  }
  const clean = text.trim().replace(/^["'#\d\s:.-]+/, '');
  // 첫 문장 또는 쉼표 앞 구절 추출
  const match = clean.match(/^([^.!?,\n]{4,28})/);
  if (match && match[1].trim().length >= 4) {
    return match[1].trim();
  }
  // 문장이 짧거나 없으면 앞 25자 발췌
  return clean.slice(0, 25).trim() || `#${cutNum} 장면`;
}

/**
 * 9개 박스 텍스트(또는 통문장)를 바탕으로 정밀 9컷 콘티 및 프롬프트 생성
 */
export function analyzeStoryIntoConti(
  storyOrCuts: string | string[],
  userGenre: string = 'drama',
  customTitle?: string
): {
  webtoonTitle: string;
  mainChar: string;
  genre: string;
  cuts: GeneratedContiCut[];
} {
  let title = customTitle?.trim() || '';
  let cutTexts: string[] = [];

  if (Array.isArray(storyOrCuts)) {
    cutTexts = storyOrCuts.slice(0, 9);
    // 9개보다 모자라면 빈 칸 채우기
    while (cutTexts.length < 9) {
      cutTexts.push('');
    }
  } else {
    // 단일 긴 텍스트가 들어온 경우: 문장 또는 줄바꿈 기반 9개 분할
    const cleanStory = storyOrCuts.trim();
    const lines = cleanStory
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (lines.length >= 9) {
      const step = lines.length / 9;
      for (let i = 0; i < 9; i++) {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        cutTexts.push(lines.slice(start, end).join(' '));
      }
    } else {
      for (let i = 0; i < 9; i++) {
        cutTexts.push(lines[i % lines.length] || `이야기의 #${i + 1}번째 장면`);
      }
    }
  }

  const allCombinedText = cutTexts.join(' ');

  // 1. 테마 감지
  const isSaintStory = /어거스틴|아우구스티누스|히포|성자|신학|성직|수도사|사제|신부|교부|모니카|타가스테|기독교|교회|성당|신앙|고백록/i.test(allCombinedText + title);
  const isJoseonStory = /조선|왕|장군|고려|무사|궁궐|선비|한양/i.test(allCombinedText + title);

  let effectiveTheme = userGenre;
  if (isSaintStory) effectiveTheme = 'saint_history';
  else if (isJoseonStory) effectiveTheme = 'historical_korean';

  const themeConfig = THEME_STYLE_MAP[effectiveTheme] || THEME_STYLE_MAP[userGenre] || THEME_STYLE_MAP.drama;

  // 2. 주인공 / 화자 추론
  let mainChar = '화자';
  if (isSaintStory) {
    mainChar = '어거스틴';
    if (/아우구스티누스/.test(allCombinedText)) mainChar = '아우구스티누스';
  } else {
    const nameMatches = allCombinedText.match(/([가-힣]{2,4})(?:[은는이가를와의]|에게|씨|군|양|선배|후배)/g);
    if (nameMatches) {
      const counts: Record<string, number> = {};
      for (const raw of nameMatches) {
        const n = raw.replace(/[은는이가를와의]|에게|씨|군|양|선배|후배/g, '');
        if (!['그녀', '그것', '이것', '저것', '자신', '사람', '우리', '시간', '하루', '어느', '다음', '일주일'].includes(n) && n.length >= 2) {
          counts[n] = (counts[n] || 0) + 1;
        }
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) mainChar = sorted[0][0];
    }
  }

  const webtoonTitle = title || `${mainChar}의 이야기 (${isSaintStory ? '역사 평전' : userGenre.toUpperCase()})`;

  // 3. 9컷 콘티 생성
  const cuts: GeneratedContiCut[] = [];

  for (let i = 0; i < 9; i++) {
    const cutNum = i + 1;
    const phaseInfo = NINE_CUT_PHASES[i];
    const text = (cutTexts[i] || '').trim();

    // 요구사항 3: 본문에 나온 말을 활용하여 제목 추출 (억지 생성 금지)
    const naturalTitle = extractNaturalTitle(text, cutNum);
    const scene_title = `#${cutNum} ${naturalTitle}`;

    // 요구사항 4: 사람 출현 여부 판단 (사람이 없으면 인물 강제 삽입 금지)
    const hasHuman = text.length > 0 ? HUMAN_DETECTION_REGEX.test(text) : false;

    // 대사 추출 (따옴표 안의 문장 또는 텍스트 본문)
    const dialogueMatch = text.match(/["'「『]([^"'」』]+)["'」』]/);
    let dialogue = '';
    let direction = text;
    if (dialogueMatch) {
      dialogue = dialogueMatch[1].trim();
      direction = text.replace(dialogueMatch[0], '').trim() || text;
    } else {
      dialogue = text.length > 30 ? text.slice(0, 32) + '...' : text;
    }

    // 화자 지정
    let speaker = mainChar;
    if (isSaintStory && /모니카|어머니/.test(text)) {
      speaker = '모니카';
    } else if (!hasHuman) {
      speaker = '해설';
    }

    // 시각 키워드 매칭
    const matchedVisuals: string[] = [];
    for (const item of KEYWORD_VISUAL_MAP) {
      if (item.regex.test(text) || item.regex.test(scene_title)) {
        matchedVisuals.push(item.en);
        if (matchedVisuals.length >= 2) break;
      }
    }

    // 카메라 앵글 / 연출 구도 (사람 유무에 따라 자연스럽게 결정)
    let cameraAngle = '';
    if (hasHuman) {
      const humanAngles = [
        '와이드 풀 샷 (인물과 주변 환경 조화)',
        '미디엄 샷 (인물의 동작과 분위기 포커스)',
        '클로즈업 샷 (인물의 깊은 시선과 감정 포착)',
        '바스트 샷 (상반신 중심의 진지한 구도)',
      ];
      cameraAngle = humanAngles[i % humanAngles.length];
    } else {
      const sceneryAngles = [
        '익스트림 롱 샷 (전체 배경 및 풍경 조망)',
        '공간 중심 샷 (배경 인테리어와 정물 연출)',
        '원경 파노라마 (광활한 대자연과 하늘 구도)',
        '정물 클로즈업 (핵심 사물 및 오브젝트 강조)',
      ];
      cameraAngle = sceneryAngles[i % sceneryAngles.length];
    }

    // 요구사항 4 핵심: 프롬프트 작성 시 사람이 없으면 no humans 확실히 명시
    let promptVisual = '';
    if (hasHuman) {
      const humanDesc = isSaintStory
        ? 'Saint Augustine of Hippo in classical scholar robe, dignified contemplative man'
        : `${mainChar}, expressive character in scene`;

      promptVisual = matchedVisuals.length > 0
        ? `${matchedVisuals.join(', ')}, ${humanDesc}`
        : `${humanDesc}, atmospheric setting`;
    } else {
      // 🚫 사람 없음: 순수 배경, 풍경, 정물 일러스트
      const sceneryDesc = matchedVisuals.length > 0
        ? matchedVisuals.join(', ')
        : 'scenic background environment, beautiful landscape, still life scenery';

      promptVisual = `${sceneryDesc}, NO HUMANS, NO PEOPLE, scenery only, environment art, pure landscape illustration, empty scene`;
    }

    // 컷별 분위기
    const phaseMood =
      phaseInfo.code === '기' ? 'peaceful establishing opening, gentle ambient light' :
      phaseInfo.code === '승' ? 'deep emotional immersion, dynamic environmental details' :
      phaseInfo.code === '전' ? 'dramatic tension and intense contrast, breathtaking visual impact' :
                                'warm serene resolution, golden lingering light, harmonious peace';

    // 최종 영문 프롬프트
    const prompt = `masterpiece manhwa webtoon style, ${themeConfig.base}, ${promptVisual}, ${phaseMood}, ${themeConfig.color}, highly detailed lineart, cell shading, cinematic atmosphere, 8k resolution`;

    cuts.push({
      cut_index: cutNum,
      phase: phaseInfo.label,
      phase_code: phaseInfo.code,
      scene_title,
      speaker,
      dialogue,
      direction: direction || text || `${cutNum}번째 장면`,
      camera_angle: cameraAngle,
      prompt,
      hasHuman,
    });
  }

  return {
    webtoonTitle,
    mainChar,
    genre: isSaintStory ? 'history' : userGenre,
    cuts,
  };
}
