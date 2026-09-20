// 스토리 분석 및 20컷 콘티 / 프롬프트 생성 모듈

export interface GeneratedContiCut {
  cut_index: number;
  phase: string;        // '기 (도입)' | '승 (전개)' | '전 (위기 및 절정)' | '결 (결말 및 여운)'
  phase_code: '기' | '승' | '전' | '결';
  scene_title: string;  // 장면 소제목
  speaker: string;      // 화자
  dialogue: string;     // 대사
  direction: string;    // 연출 지문 / 상황 해설
  camera_angle: string; // 카메라 앵글 / 연출 구도
  prompt: string;       // Pollinations AI 영문 이미지 프롬프트
}

// 장르별 키워드 및 분위기 가이드
const GENRE_STYLE_MAP: Record<string, { base: string; color: string; sfx_flavor: string[] }> = {
  drama: {
    base: 'cinematic Korean webtoon drama manhwa style, realistic emotional lighting, nuanced facial expression, slice of life aesthetic',
    color: 'warm natural daylight, cinematic soft shadows',
    sfx_flavor: ['또각또각', '스르륵', '소곤소곤', '두근...', '째깍째깍'],
  },
  romance: {
    base: 'romantic Korean manhwa artstyle, soft pastel tones, sparkling shoujo aesthetic, gentle emotional glow, beautiful hair rendering',
    color: 'soft pink and golden sunset bokeh, dreamy backlight',
    sfx_flavor: ['두근두근', '샤랄라~', '심쿵!', '살며시', '빤히...'],
  },
  fantasy: {
    base: 'epic fantasy manhwa style, mystical glowing magical aura, ethereal particles, highly detailed arcane fantasy illustration',
    color: 'vibrant magical blue and gold illumination, dramatic ambient contrast',
    sfx_flavor: ['파아앗!', '쿠구구궁', '번쩍!', '슈우우욱', '휘이잉'],
  },
  thriller: {
    base: 'suspenseful thriller webtoon manhwa style, dramatic chiaroscuro shadows, high contrast tension, psychological thriller mood',
    color: 'cool moody desaturated palette, sharp rim lighting',
    sfx_flavor: ['서늘...', '꿀꺽', '스윽—', '끼이익!', '쿵!!'],
  },
  action: {
    base: 'dynamic action webtoon manhwa style, intense speed lines, dramatic Dutch angle, cinematic motion impact, high energy',
    color: 'bold vibrant saturated colors, intense explosive lighting',
    sfx_flavor: ['콰아앙!', '타타탓!', '콰직!', '채앵—!', '쿵!!'],
  },
};

// 한국어 단어 -> 영문 시각적 묘사 매핑
const KEYWORD_VISUAL_MAP: Array<{ regex: RegExp; en: string }> = [
  // 장소
  { regex: /카페|커피|바리스타/i, en: 'cozy boutique coffee shop cafe interior, espresso machine, warm wooden counter, coffee cups' },
  { regex: /학교|교실|교문|운동장/i, en: 'Korean high school setting, school desks, sunlight streaming through big classroom windows' },
  { regex: /거리|골목|인도|횡단보도|길/i, en: 'vibrant Korean urban city street sidewalk, buildings in background, pedestrian street' },
  { regex: /비|우산|빗방울|빗길/i, en: 'gentle rain falling, holding umbrella, reflective wet street pavement with city lights' },
  { regex: /도서관|책|서점|소설|독서/i, en: 'surrounded by book shelves, stacks of hardcover books, cozy quiet reading atmosphere' },
  { regex: /마법|탑|성|왕국|기사|검/i, en: 'ancient fantasy tower chamber, glowing magic circles, ornate medieval fantasy architecture' },
  { regex: /집|방|침대|침실|원룸/i, en: 'neat cozy modern bedroom apartment, soft indoor lamp lighting, comfortable personal space' },
  { regex: /부엌|식탁|요리|아침식사|밥/i, en: 'warm kitchen dining table with delicious homemade Korean dishes, steaming warm food' },
  { regex: /버스|정류장|지하철|전철/i, en: 'city transit bus stop, commuters, urban transit atmosphere' },
  { regex: /병원|의사|간호/i, en: 'modern clean hospital corridor, calm soft lighting' },
  { regex: /밤|새벽|달|별|어둠/i, en: 'deep starry night sky, glowing crescent moon, nocturnal moody atmosphere' },
  { regex: /노을|황혼|일몰|석양/i, en: 'magnificent golden orange sunset sky, long dramatic warm shadows' },
  { regex: /아침|새벽|햇살|일출/i, en: 'fresh dawn morning sunlight, crystal clear blue sky, hopeful morning ambiance' },
  { regex: /꽃|벚꽃|공원|나무|숲/i, en: 'beautiful blooming cherry blossom petals fluttering in breeze, tranquil park' },
  { regex: /바다|해변|파도|강/i, en: 'open ocean seaside horizon, gentle waves sparkling in sunlight' },

  // 행동 및 감정
  { regex: /울다|눈물|울먹|흐느끼/i, en: 'poignant tears welled up in expressive eyes, emotional manhwa expression' },
  { regex: /웃다|미소|방긋|활짝/i, en: 'warm genuine heartwarming smile, gentle joyful facial expression' },
  { regex: /놀라|화들짝|당황|충격|경악/i, en: 'wide surprised eyes in utter shock, blushing cheeks, dramatic reaction' },
  { regex: /선물|건네|받다|손길/i, en: 'two people hands exchanging a gift book, tender intimate moment' },
  { regex: /바라보다|마주치|시선|눈빛/i, en: 'intense eye contact, emotional spark between two characters, close-up composition' },
  { regex: /달리다|뛰다|쫓다|급히/i, en: 'running with hurried urgency, wind motion lines, dynamic motion pose' },
  { regex: /싸우다|대결|검술|공격/i, en: 'combat action stance, dynamic sparks and energy trails, dramatic angle' },
  { regex: /기다리다|혼자|쓸쓸|외로/i, en: 'solitary figure sitting quietly, contemplative melancholic mood, empty seat nearby' },
  { regex: /포옹|안다|손잡다|다정/i, en: 'heartwarming embrace, tender comforting gesture, sweet emotional climax' },
  { regex: /쓰다|노트북|타이핑|작업/i, en: 'typing diligently on modern slim laptop, focused creative writer expression' },
];

const CAMERA_ANGLES = [
  '익스트림 롱 샷 (전체 배경 조망)',
  '풀 샷 (인물 전신과 주변 환경)',
  '미디엄 샷 (인물 상반신과 동작 중심)',
  '바스트 샷 (가슴 위 인물 표정 집중)',
  '클로즈업 샷 (눈빛과 미세한 표정 극대화)',
  '오버 더 숄더 샷 (상대방 시점의 대화 구도)',
  '로우 앵글 (역동적이고 당당한 시선)',
  '하이 앵글 (내려다보는 시점의 심리적 묘사)',
  '더치 앵글 (기울어진 카메라의 긴장감 연출)',
  '익스트림 클로즈업 (핵심 소품/손짓 강조)',
];

/**
 * 사용자 입력 스토리를 정밀 분석하여 20컷 콘티 및 맞춤형 AI 프롬프트 생성
 */
export function analyzeStoryIntoConti(story: string, genre: string = 'drama'): {
  webtoonTitle: string;
  mainChar: string;
  genre: string;
  cuts: GeneratedContiCut[];
} {
  const cleanStory = story.trim();

  // 1. 문장 단위 분할
  const rawSentences = cleanStory
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  // 문장이 적을 경우 세부 쉼표/구문으로 추가 분할하여 최소 4개 이상의 청크 확보
  let sentences = [...rawSentences];
  if (sentences.length < 8) {
    sentences = cleanStory
      .split(/(?<=[.!?\n,])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 3);
  }

  if (sentences.length < 4) {
    const chunkLen = Math.max(20, Math.floor(cleanStory.length / 4));
    sentences = [
      cleanStory.slice(0, chunkLen) || '이야기가 시작된다.',
      cleanStory.slice(chunkLen, chunkLen * 2) || '새로운 전개가 펼쳐진다.',
      cleanStory.slice(chunkLen * 2, chunkLen * 3) || '위기와 갈등이 고조된다.',
      cleanStory.slice(chunkLen * 3) || '모든 것이 정리되고 미래로 나아간다.',
    ];
  }

  // 2. 주인공 이름 분석
  const nameMatches = cleanStory.match(/([가-힣]{2,4})(?:[은는이가를와의]|에게|씨|군|양|선배|후배)/g);
  let mainChar = '주인공';
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

  // 조연 캐릭터 이름 추론 (주인공 외 2번째 빈출 인물)
  let subChar = '';
  if (nameMatches) {
    for (const raw of nameMatches) {
      const n = raw.replace(/[은는이가를와의]|에게|씨|군|양|선배|후배/g, '');
      if (n !== mainChar && n.length >= 2 && !['그녀', '그것', '이것', '저것', '자신', '사람', '우리', '시간', '하루', '어느'].includes(n)) {
        subChar = n;
        break;
      }
    }
  }

  const isFemale = /그녀|소녀|여학생|언니|누나|지아|수아|유진|카에라|세라|민아|서연/.test(cleanStory);
  const webtoonTitle = `${mainChar}의 이야기 (${GENRE_STYLE_MAP[genre] ? genre.toUpperCase() : '웹툰'})`;

  // 3. 4단 기승전결 배분
  const totalSentences = sentences.length;
  const q1 = sentences.slice(0, Math.max(1, Math.floor(totalSentences * 0.25)));
  const q2 = sentences.slice(Math.max(1, Math.floor(totalSentences * 0.25)), Math.max(2, Math.floor(totalSentences * 0.5)));
  const q3 = sentences.slice(Math.max(2, Math.floor(totalSentences * 0.5)), Math.max(3, Math.floor(totalSentences * 0.75)));
  const q4 = sentences.slice(Math.max(3, Math.floor(totalSentences * 0.75)));
  const quarters = [q1, q2, q3, q4];

  const phaseConfigs: Array<{
    code: '기' | '승' | '전' | '결';
    label: string;
    titles: string[];
    dramaticRole: string;
  }> = [
    {
      code: '기',
      label: '기 (도입)',
      titles: ['배경과 일상의 문', '뜻밖의 발자국', '스치는 호기심', '낯선 온기', '마음에 맺힌 의문'],
      dramaticRole: '배경 설정, 주인공의 일상과 첫 번째 사건의 단초 제시',
    },
    {
      code: '승',
      label: '승 (전개)',
      titles: ['반복되는 시간 속에서', '새로운 일상의 조각', '서로를 향한 시선', '숨겨둔 진심의 편린', '갑작스러운 공백'],
      dramaticRole: '상황의 전개, 관계의 심화 및 서서히 다가오는 변화',
    },
    {
      code: '전',
      label: '전 (위기 및 절정)',
      titles: ['사라진 온기', '기다림과 초조함', '예상치 못한 재회', '마주 잡은 손끝', '클라이맥스의 순간'],
      dramaticRole: '극적인 반전, 갈등의 폭발, 감정의 최고조 클라이맥스',
    },
    {
      code: '결',
      label: '결 (결말 및 여운)',
      titles: ['건네받은 대답', '새로운 약속', '따스한 미소', '함께 맞이하는 내일', '영원히 이어질 이야기'],
      dramaticRole: '갈등의 해소, 깊은 여운과 희망찬 새로운 시작',
    },
  ];

  const styleConfig = GENRE_STYLE_MAP[genre] || GENRE_STYLE_MAP.drama;
  const cuts: GeneratedContiCut[] = [];
  let cutNum = 1;

  for (let qIdx = 0; qIdx < 4; qIdx++) {
    const pConf = phaseConfigs[qIdx];
    const qSentences = quarters[qIdx].length > 0 ? quarters[qIdx] : [`이야기의 ${pConf.label} 부분이 펼쳐진다.`];

    for (let subIdx = 0; subIdx < 5; subIdx++) {
      const sentencePick = qSentences[subIdx % qSentences.length];
      const title = pConf.titles[subIdx];

      // 대사 추출 (따옴표 안)
      const dialogueMatch = sentencePick.match(/["'「『]([^"'」』]+)["'」』]/);
      let dialogue = '';
      let narration = sentencePick;
      if (dialogueMatch) {
        dialogue = dialogueMatch[1].trim();
        narration = sentencePick.replace(dialogueMatch[0], '').trim();
      } else {
        // 문장이 길면 앞부분을 지문, 뒷부분을 대사형 독백으로 변형
        if (sentencePick.length > 30) {
          dialogue = sentencePick.slice(0, 35) + '...';
        } else {
          dialogue = sentencePick;
        }
      }

      // 화자 설정
      let speaker = mainChar;
      if (subIdx % 3 === 2 && subChar) {
        speaker = subChar;
      } else if (subIdx % 4 === 3) {
        speaker = '내레이션';
      }

      // 카메라 앵글
      const cameraAngle = CAMERA_ANGLES[(cutNum - 1) % CAMERA_ANGLES.length];

      // 문장에서 시각적 키워드 추출
      const matchedVisuals: string[] = [];
      for (const item of KEYWORD_VISUAL_MAP) {
        if (item.regex.test(sentencePick) || item.regex.test(cleanStory.slice(0, 100))) {
          matchedVisuals.push(item.en);
          if (matchedVisuals.length >= 2) break;
        }
      }

      const visualScene = matchedVisuals.length > 0
        ? matchedVisuals.join(', ')
        : (isFemale ? 'young Korean female protagonist' : 'young Korean male protagonist') + ', expressive face, atmospheric background';

      // 컷별 드라마틱 연출 키워드
      const phaseMood =
        qIdx === 0 ? 'peaceful quiet opening, establishing environment, soft natural daylight' :
        qIdx === 1 ? 'engaging interaction, subtle emotional interest, dynamic character framing' :
        qIdx === 2 ? 'dramatic tension, intense emotional realization, high contrast lighting, cinematic close-up' :
                     'warm emotional resolution, hopeful bright lighting, beautiful aesthetic, heartfelt smile';

      // AI 이미지 영문 프롬프트 조립
      const prompt = `Korean webtoon artstyle, manhwa illustration, ${styleConfig.base}, ${visualScene}, ${phaseMood}, ${styleConfig.color}, highly detailed lineart, cell shading, dynamic manhwa panel, masterpiece, 8k resolution`;

      // 연출 지문 완성
      const direction = narration || sentencePick;

      cuts.push({
        cut_index: cutNum,
        phase: pConf.label,
        phase_code: pConf.code,
        scene_title: `#${cutNum} ${title}`,
        speaker,
        dialogue,
        direction,
        camera_angle: cameraAngle,
        prompt,
      });

      cutNum++;
    }
  }

  return {
    webtoonTitle,
    mainChar,
    genre,
    cuts,
  };
}
