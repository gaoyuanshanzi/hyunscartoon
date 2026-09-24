// 고차원 시맨틱 비주얼 프롬프트 엔진 (Visual Prompt Engine)
// [주요 대상(Subject) + 구체적 행동(Action) + 배경 장소(Setting) + 분위기/화풍(Mood & Style)] 4대 구조 기반

export interface GeneratedContiCut {
  cut_index: number;
  phase: string;        // '기 (도입 1~2컷)' | '승 (전개 3~5컷)' | '전 (위기 및 절정 6~7컷)' | '결 (결말 및 여운 8~9컷)'
  phase_code: '기' | '승' | '전' | '결';
  scene_title: string;  // 장면 소제목 (스토리 본문 구절 적극 활용)
  speaker: string;      // 화자
  dialogue: string;     // 대사
  direction: string;    // 연출 지문 / 본문
  camera_angle: string; // 카메라 앵글 / 구도
  prompt: string;       // AI 이미지 영문 프롬프트 (고차원 Visual Prompt)
  hasHuman: boolean;    // 인물/동물 캐릭터 주체 포함 여부
}

// 9컷 단계 정의
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
 * 1. 주체(Subject) 감지 및 영문 묘사 변환
 */
function extractSubject(text: string, title: string): { en: string; isCharacter: boolean; name: string } {
  const combined = `${text} ${title}`.toLowerCase();

  // 🐒 유인원 / 동물 참모 / 지능형 동물 (SF, 포스트 아포칼립스 등)
  if (/오랑우탄|유인원|침팬지|고릴라|원숭이/i.test(combined)) {
    const isMilitary = /참모|군|장군|대장|사령관|제복|군복/i.test(combined);
    const role = isMilitary ? 'dressed in military advisor uniform' : 'intelligent and dignified posture';
    if (/오랑우탄/i.test(combined)) {
      return { en: `A smart orangutan ${role}`, isCharacter: true, name: '오랑우탄' };
    }
    if (/고릴라/i.test(combined)) {
      return { en: `A formidable silverback gorilla ${role}`, isCharacter: true, name: '고릴라' };
    }
    if (/침팬지/i.test(combined)) {
      return { en: `A clever chimpanzee ${role}`, isCharacter: true, name: '침팬지' };
    }
    return { en: `An intelligent primate ape ${role}`, isCharacter: true, name: '유인원' };
  }

  if (/호랑이|사자|늑대|곰|독수리/i.test(combined)) {
    if (/호랑이/i.test(combined)) return { en: 'A majestic royal tiger', isCharacter: true, name: '호랑이' };
    if (/사자/i.test(combined)) return { en: 'A magnificent lion leader', isCharacter: true, name: '사자' };
    if (/늑대/i.test(combined)) return { en: 'A watchful alpha wolf', isCharacter: true, name: '늑대' };
  }

  // 🤖 로봇 / 안드로이드 / 사이보그 / AI
  if (/로봇|안드로이드|사이보그|인공지능|ai/i.test(combined)) {
    return { en: 'A futuristic humanoid android with glowing circuit lines', isCharacter: true, name: '안드로이드' };
  }

  // ⛪ 성자 / 고대 철학자 / 신학자
  if (/어거스틴|아우구스티누스|히포|성자|신학자|수도사|사제/i.test(combined)) {
    return {
      en: 'Saint Augustine of Hippo, early Christian father and philosopher, wise contemplative man with trimmed beard and scholarly Roman tunic robes',
      isCharacter: true,
      name: '어거스틴',
    };
  }
  if (/모니카|어머니/i.test(combined) && /기도|성자|히포|타가스테/i.test(combined)) {
    return {
      en: 'devout caring mother Saint Monica in ancient Mediterranean head covering and robes, hands clasped in prayer',
      isCharacter: true,
      name: '모니카',
    };
  }

  // 👑 역사 / 조선 / 사극
  if (/조선|선비|왕|장군|무사|임금/i.test(combined)) {
    if (/왕|임금/i.test(combined)) return { en: 'A Joseon dynasty king in royal red dragon robes', isCharacter: true, name: '왕' };
    if (/장군|무사/i.test(combined)) return { en: 'A valiant Korean Joseon general in armor', isCharacter: true, name: '장군' };
    return { en: 'A dignified Korean Joseon scholar nobleman wearing fine hanbok and gat hat', isCharacter: true, name: '선비' };
  }

  // ☕ 현대 / 일상 / 드라마
  if (/바리스타|카페|커피/i.test(combined) && /민우|청년|남자|직원/i.test(combined)) {
    return { en: 'A handsome young male barista wearing clean apron', isCharacter: true, name: '바리스타' };
  }
  if (/소설가|작가|노트북|지아|그녀/i.test(combined)) {
    return { en: 'A focused young female novelist working with laptop', isCharacter: true, name: '작가' };
  }

  // 일반 인물 감지
  if (/소녀|여학생|여자|그녀/i.test(combined)) {
    return { en: 'A young female protagonist with expressive face', isCharacter: true, name: '그녀' };
  }
  if (/소년|남학생|청년|남자|그/i.test(combined)) {
    return { en: 'A young male protagonist with thoughtful expression', isCharacter: true, name: '그' };
  }
  if (/노인|할아버지|할머니|원로|어르신/i.test(combined)) {
    return { en: 'A wise elderly figure with dignified weathered face', isCharacter: true, name: '노인' };
  }

  // 주체가 인물이 아닌 순수 사물/환경인 경우
  return { en: '', isCharacter: false, name: '내레이션' };
}

/**
 * 2. 배경 장소(Setting/Background) 감지 및 영문 묘사
 */
function extractSetting(text: string): string {
  const combined = text.toLowerCase();

  // 방송 / 전자기기 / 관제실 / 스튜디오
  if (/방송|송출|스튜디오|전자기기|관제실|조종실|뉴스룸|모니터|통제/i.test(combined)) {
    return 'sitting in front of a high-tech broadcasting control room, surrounded by vintage and futuristic electronic consoles, screens showing world maps and signal wavelengths, studio newsroom environment';
  }

  // 연구소 / 컴퓨터 / 사이버펑크
  if (/연구소|실험실|컴퓨터|해킹|서버/i.test(combined)) {
    return 'inside a glowing cybernetic mainframe server room, neon holographic data displays, cables and futuristic technology';
  }

  // 우주 / SF
  if (/우주|우주선|정거장|행성|은하/i.test(combined)) {
    return 'command bridge of an interstellar starship, panoramic observation window overlooking deep space and planets';
  }

  // 자연 / 숲 / 정글 / 폐허가 된 자연 복원
  if (/자연|지구|숲|정글|밀림|동물원|생태/i.test(combined)) {
    if (/폐허|도시/i.test(combined)) {
      return 'overgrown post-apocalyptic city ruins reclaimed by lush green forests and wild nature, sunlight piercing through vines';
    }
    return 'vast pristine primeval forest wilderness, ancient towering trees, golden ethereal sunbeams through misty canopy';
  }

  // 고대 로마 / 지중해 / 성당 / 서재
  if (/타가스테|카르타고|밀라노|로마|고대|성당|교회|신학/i.test(combined)) {
    if (/서재|책상|양피지|두루마리/i.test(combined)) {
      return 'inside an ancient Mediterranean stone library study, illuminated by warm oil lamps, stacks of parchment scrolls';
    }
    return 'classical ancient Roman stone architecture, arched colonnades, overlooking Mediterranean coast under azure sky';
  }

  // 카페 / 도시
  if (/카페|커피|찻집/i.test(combined)) {
    return 'warm cozy boutique coffee shop interior, wooden counters, soft pendant lighting, rain on window';
  }
  if (/거리|골목|도시|인도/i.test(combined)) {
    return 'bustling atmospheric urban city avenue with modern architecture, cinematic perspective';
  }

  // 기본 환경
  return 'atmospheric cinematic environment, detailed visual depth';
}

/**
 * 3. 상황 및 구체적 행동(Action) 감지 및 영문 묘사
 */
function extractAction(text: string): string {
  const combined = text.toLowerCase();

  // 방송 송출 / 연설 / 전자기기 조작
  if (/송출|방송|메시지|전파|선언|발표/i.test(combined)) {
    return 'operating vintage and futuristic electronics, speaking into a broadcasting microphone, transmitting historic message to the world';
  }
  if (/기기|컴퓨터|조작|키보드|컨트롤/i.test(combined)) {
    return 'expertly operating complex electronic switchboards, pressing buttons on illuminated control panels';
  }

  // 연구 / 독서 / 성경 읽기 / 회심
  if (/읽으라|성경|책|독서|양피지/i.test(combined)) {
    return 'holding and reading an open ancient sacred scripture, sudden spiritual enlightenment, rays of golden light';
  }
  if (/기도|탄식|고뇌|눈물/i.test(combined)) {
    return 'deeply moved in tearful prayer, head bowed in profound contemplation and reverence';
  }

  // 대화 / 만남 / 선물 교환
  if (/선물|건네|책을 주/i.test(combined)) {
    return 'tenderly exchanging a special gift book across a table, warm grateful connection';
  }
  if (/바라보|미소|눈빛|마주/i.test(combined)) {
    return 'sharing an intense emotional gaze, warm heartfelt expression';
  }

  // 전투 / 액션 / 질주
  if (/달리|뛰|도망|돌진/i.test(combined)) {
    return 'running with hurried urgency, dynamic perspective and motion blur';
  }
  if (/싸우|대결|공격|파괴/i.test(combined)) {
    return 'intense combat action stance, dynamic energy sparks and dramatic tension';
  }

  return 'contemplative impactful moment, nuanced expressive pose';
}

/**
 * 4. 분위기 및 화풍(Mood & Style) 결정
 */
function extractStyle(text: string, userGenre: string): string {
  const combined = text.toLowerCase();

  // SF / 사이언스 픽션 / 유인원 혁명 / 전자기기
  if (/오랑우탄|유인원|전자기기|방송|로봇|우주|외계|sf|기계/i.test(combined)) {
    return 'cinematic lighting, photorealistic, 8k resolution, sci-fi concept art, masterpiece, high dynamic range';
  }

  // 역사 / 성자 / 종교
  if (/성자|어거스틴|아우구스티누스|고대|로마|성경|모니카/i.test(combined)) {
    return 'epic historical oil painting and manhwa lineart style, dramatic chiaroscuro lighting, heavenly golden rays, 8k resolution, masterpiece';
  }

  // 조선 / 사극
  if (/조선|왕|선비|장군|한복/i.test(combined)) {
    return 'Korean historical graphic novel style, traditional ink and rich color aesthetic, cinematic lighting, 8k resolution';
  }

  // 기본 장르별 화풍
  if (userGenre === 'romance') {
    return 'romantic webtoon manhwa artstyle, soft pastel glow, dreamy backlight, emotional depth, 8k resolution';
  }
  if (userGenre === 'thriller') {
    return 'suspenseful thriller manhwa style, high contrast shadows, sharp rim lighting, intense psychological mood, 8k resolution';
  }
  if (userGenre === 'action') {
    return 'dynamic action webtoon style, intense speed lines, Dutch angle, cinematic motion impact, vibrant colors, 8k resolution';
  }

  return 'cinematic Korean webtoon drama manhwa style, realistic emotional lighting, 8k resolution, masterpiece';
}

/**
 * 본문 구절에서 자연스러운 장면 제목 추출 (억지 생성 방지)
 */
function extractNaturalTitle(text: string, cutNum: number): string {
  if (!text || text.trim().length === 0) {
    return `#${cutNum} 장면`;
  }
  const clean = text.trim().replace(/^["'#\d\s:.-]+/, '');
  const match = clean.match(/^([^.!?,\n]{4,28})/);
  if (match && match[1].trim().length >= 4) {
    return match[1].trim();
  }
  return clean.slice(0, 25).trim() || `#${cutNum} 장면`;
}

/**
 * 9개 컷 한글 텍스트를 [주체 + 행동 + 장소 + 화풍] 4대 구조의 영문 비주얼 프롬프트로 고차원 변환
 */
export function buildHighLevelVisualPrompt(text: string, cutTitle: string, userGenre: string = 'drama'): {
  prompt: string;
  hasHuman: boolean;
  speaker: string;
} {
  const subjectInfo = extractSubject(text, cutTitle);
  const setting = extractSetting(text);
  const action = extractAction(text);
  const style = extractStyle(text, userGenre);

  let prompt = '';
  if (subjectInfo.isCharacter) {
    // [주요 대상(Subject) + 구체적 행동(Action) + 배경 장소(Setting) + 분위기/화풍(Mood & Style)]
    prompt = `${subjectInfo.en}, ${action}, ${setting}, ${style}`;
  } else {
    // 인물 없이 순수 배경/풍경/정물일 경우
    prompt = `${setting}, ${action}, scenery only, environment landscape art, NO HUMANS, NO PEOPLE, ${style}`;
  }

  return {
    prompt,
    hasHuman: subjectInfo.isCharacter,
    speaker: subjectInfo.name || '해설',
  };
}

/**
 * 9개 박스 텍스트(또는 통문장)를 바탕으로 정밀 9컷 콘티 및 고차원 프롬프트 생성
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
    while (cutTexts.length < 9) {
      cutTexts.push('');
    }
  } else {
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
  const mainSubject = extractSubject(allCombinedText, title);
  const mainChar = mainSubject.name || '주인공';
  const webtoonTitle = title || `${mainChar}의 이야기 (${userGenre.toUpperCase()})`;

  const cuts: GeneratedContiCut[] = [];

  for (let i = 0; i < 9; i++) {
    const cutNum = i + 1;
    const phaseInfo = NINE_CUT_PHASES[i];
    const text = (cutTexts[i] || '').trim();

    // 장면 소제목 (본문 발췌)
    const naturalTitle = extractNaturalTitle(text, cutNum);
    const scene_title = `#${cutNum} ${naturalTitle}`;

    // 고차원 비주얼 프롬프트 빌더 호출
    const visualData = buildHighLevelVisualPrompt(text, scene_title, userGenre);

    // 대사 추출
    const dialogueMatch = text.match(/["'「『]([^"'」』]+)["'」』]/);
    let dialogue = '';
    let direction = text;
    if (dialogueMatch) {
      dialogue = dialogueMatch[1].trim();
      direction = text.replace(dialogueMatch[0], '').trim() || text;
    } else {
      dialogue = text.length > 30 ? text.slice(0, 32) + '...' : text;
    }

    // 카메라 앵글
    let cameraAngle = '';
    if (visualData.hasHuman) {
      const humanAngles = [
        '와이드 풀 샷 (주체와 첨단 환경의 조화)',
        '미디엄 샷 (주체의 동작과 제어 패널 조작 포커스)',
        '클로즈업 샷 (결연한 표정과 눈빛 집중)',
        '로우 앵글 (당당하고 위엄 있는 사령관 구도)',
      ];
      cameraAngle = humanAngles[i % humanAngles.length];
    } else {
      const sceneryAngles = [
        '익스트림 롱 샷 (전체 배경 및 풍경 조망)',
        '공간 중심 샷 (배경 장비와 환경 연출)',
        '원경 파노라마 (광활한 자연과 하늘 구도)',
        '정물 클로즈업 (핵심 기기 및 오브젝트 강조)',
      ];
      cameraAngle = sceneryAngles[i % sceneryAngles.length];
    }

    cuts.push({
      cut_index: cutNum,
      phase: phaseInfo.label,
      phase_code: phaseInfo.code,
      scene_title,
      speaker: visualData.speaker,
      dialogue,
      direction: direction || text || `${cutNum}번째 장면`,
      camera_angle: cameraAngle,
      prompt: visualData.prompt,
      hasHuman: visualData.hasHuman,
    });
  }

  return {
    webtoonTitle,
    mainChar,
    genre: userGenre,
    cuts,
  };
}
