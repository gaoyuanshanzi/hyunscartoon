export interface WebtoonCutInput {
  cut_index: number;
  phase: string;
  scene_title: string;
  scene_summary: string;
  speaker: string;
  dialogue: string;
  genre?: string;
  mainChar?: string;
  isFemale?: boolean;
}

export function generateWebtoonCutSvg(cut: WebtoonCutInput): string {
  const { cut_index, phase, scene_title, scene_summary, speaker, dialogue, genre = 'drama', isFemale = false } = cut;

  const width = 768;
  const height = 1024;

  // 1. 장르 및 컷 번호에 따른 테마 색상 팔레트
  const palettes: Record<string, { top: string; mid: string; bot: string; accent: string; glow: string; textDark: string }> = {
    drama: {
      top: '#1e293b',
      mid: '#334155',
      bot: '#0f172a',
      accent: '#38bdf8',
      glow: '#60a5fa',
      textDark: '#0f172a',
    },
    romance: {
      top: '#4c1d95',
      mid: '#831843',
      bot: '#1e1b4b',
      accent: '#f472b6',
      glow: '#fb7185',
      textDark: '#831843',
    },
    fantasy: {
      top: '#1e1b4b',
      mid: '#312e81',
      bot: '#09090b',
      accent: '#a855f7',
      glow: '#c084fc',
      textDark: '#3b0764',
    },
    thriller: {
      top: '#18181b',
      mid: '#27272a',
      bot: '#09090b',
      accent: '#ef4444',
      glow: '#f87171',
      textDark: '#450a0a',
    },
    action: {
      top: '#172554',
      mid: '#1e3a8a',
      bot: '#020617',
      accent: '#f97316',
      glow: '#fb923c',
      textDark: '#7c2d12',
    },
  };

  const theme = palettes[genre.toLowerCase()] || palettes.drama;

  // 4개 막(기승전결)별 하늘 및 분위기 조정
  let skyGradientId = `sky_${cut_index}`;
  let skyTop = theme.top;
  let skyMid = theme.mid;
  let skyBot = theme.bot;

  if (cut_index <= 5) {
    // 기: 은은한 아침 햇살 / 시작
    skyTop = genre === 'romance' ? '#fda4af' : '#60a5fa';
    skyMid = genre === 'romance' ? '#fbcfe8' : '#93c5fd';
    skyBot = genre === 'romance' ? '#ffe4e6' : '#dbeafe';
  } else if (cut_index <= 10) {
    // 승: 활기찬 낮 / 탐색
    skyTop = genre === 'fantasy' ? '#312e81' : '#3b82f6';
    skyMid = genre === 'fantasy' ? '#4338ca' : '#60a5fa';
    skyBot = genre === 'fantasy' ? '#1e1b4b' : '#bfdbfe';
  } else if (cut_index <= 15) {
    // 전: 극적 석양 / 어두운 밤 / 위기
    skyTop = genre === 'thriller' ? '#09090b' : '#1e1b4b';
    skyMid = genre === 'thriller' ? '#7f1d1d' : '#831843';
    skyBot = genre === 'thriller' ? '#450a0a' : '#f97316';
  } else {
    // 결: 평화로운 여명 / 별빛 밤하늘 / 새로운 내일
    skyTop = genre === 'romance' ? '#4c1d95' : '#1e293b';
    skyMid = genre === 'romance' ? '#ec4899' : '#3b82f6';
    skyBot = genre === 'romance' ? '#fde047' : '#fdba74';
  }

  // 감정 효과음 (SFX)
  const sfxList = [
    '두근...', '스르륵...', '샤라랑~', '탁!', '바람이 분다...',
    '어?!', '또각또각', '번뜩!', '쿵!', '스윽...',
    '위기!!', '콰광!!', '안 돼...!', '각성!', '결의에 찬 눈빛',
    '휴우...', '따스한 미소', '안도감', '기적처럼...', '내일을 향해!'
  ];
  const sfx = sfxList[(cut_index - 1) % sfxList.length];

  // 캐릭터 실루엣 및 포즈 계산
  const charX = width / 2;
  const charY = height * 0.58;

  // 말풍선 위치 (컷 번호에 따라 좌/우 배치)
  const isBubbleLeft = cut_index % 2 === 0;
  const bubbleX = isBubbleLeft ? 40 : width - 380;
  const bubbleY = height - 260;

  // 텍스트 이스케이프
  const esc = (t: string) => (t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 말풍선 대사 줄바꿈 (최대 2~3줄)
  const cleanDialogue = dialogue ? esc(dialogue.slice(0, 60)) : '';
  const cleanSummary = scene_summary ? esc(scene_summary.slice(0, 75)) : '';
  const cleanTitle = esc(scene_title || `컷 #${cut_index}`);
  const cleanSpeaker = esc(speaker || '주인공');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- 배경 그라디언트 -->
    <linearGradient id="${skyGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${skyTop}" />
      <stop offset="55%" stop-color="${skyMid}" />
      <stop offset="100%" stop-color="${skyBot}" />
    </linearGradient>

    <!-- 후광 빛 그라디언트 -->
    <radialGradient id="sunbeam_${cut_index}" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65" />
      <stop offset="40%" stop-color="${theme.glow}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- 캐릭터 실루엣 그라디언트 -->
    <linearGradient id="charGrad_${cut_index}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- 말풍선 그림자 필터 -->
    <filter id="shadow_${cut_index}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- 배경 캔버스 -->
  <rect width="${width}" height="${height}" fill="url(#${skyGradientId})" />

  <!-- 배경 분위기 광원/후광 -->
  <circle cx="${charX}" cy="${charY - 140}" r="380" fill="url(#sunbeam_${cut_index})" />

  <!-- 배경 일러스트 요소 (거리 / 건물 실루엣 또는 벚꽃 / 룬) -->
  <g opacity="0.35">
    <!-- 원경 건물 실루엣 -->
    <rect x="60" y="420" width="110" height="380" fill="#0f172a" />
    <rect x="200" y="360" width="130" height="440" fill="#1e293b" />
    <rect x="450" y="390" width="120" height="410" fill="#0f172a" />
    <rect x="600" y="450" width="110" height="350" fill="#1e293b" />

    <!-- 건물 창문 불빛 -->
    <circle cx="230" cy="400" r="3" fill="#fef08a" />
    <circle cx="260" cy="400" r="3" fill="#fef08a" />
    <circle cx="290" cy="400" r="3" fill="#fef08a" />
    <circle cx="230" cy="440" r="3" fill="#fef08a" />
    <circle cx="290" cy="440" r="3" fill="#fef08a" />
    <circle cx="480" cy="420" r="3" fill="#fef08a" />
    <circle cx="520" cy="420" r="3" fill="#fef08a" />
  </g>

  <!-- 가로등 빛 / 반짝이는 별빛 파티클 -->
  <g opacity="0.7">
    <circle cx="120" cy="180" r="2.5" fill="#ffffff" />
    <circle cx="180" cy="120" r="2" fill="#ffffff" />
    <circle cx="620" cy="160" r="3" fill="#ffffff" />
    <circle cx="680" cy="220" r="2" fill="#ffffff" />
    <circle cx="380" cy="90" r="2.5" fill="#ffffff" />
    <circle cx="540" cy="280" r="1.5" fill="#ffffff" />
    <!-- 반짝임 십자광 -->
    <path d="M 620,152 L 620,168 M 612,160 L 628,160" stroke="#ffffff" stroke-width="1.2" />
    <path d="M 120,172 L 120,188 M 112,180 L 128,180" stroke="#ffffff" stroke-width="1.2" />
  </g>

  <!-- 지면 / 바닥 언덕 실루엣 -->
  <path d="M 0,720 Q 384,680 768,720 L 768,1024 L 0,1024 Z" fill="#020617" opacity="0.85" />

  <!-- ════ 웹툰 주인공 캐릭터 일러스트 (정밀 실루엣 + 헤어 + 스타일) ════ -->
  <g transform="translate(${charX}, ${charY})">
    <!-- 캐릭터 발밑 그림자 -->
    <ellipse cx="0" cy="240" rx="140" ry="24" fill="#000000" opacity="0.6" filter="url(#shadow_${cut_index})" />

    <!-- 신체 의상 (오버사이즈 코트 / 재킷) -->
    <path d="M -70,30 L -90,200 L 90,200 L 70,30 Q 0,45 -70,30 Z" fill="url(#charGrad_${cut_index})" />
    <!-- 깃 / 칼라 디테일 -->
    <path d="M -30,30 L 0,85 L 30,30 Q 0,38 -30,30 Z" fill="${theme.accent}" opacity="0.8" />
    <path d="M -15,85 L 0,200 L 15,85 Z" stroke="#334155" stroke-width="2" fill="none" />

    <!-- 어깨 및 팔 -->
    <path d="M -70,30 Q -110,90 -95,180 Q -80,190 -65,180 Q -80,100 -50,45 Z" fill="url(#charGrad_${cut_index})" />
    <path d="M 70,30 Q 110,90 95,180 Q 80,190 65,180 Q 80,100 50,45 Z" fill="url(#charGrad_${cut_index})" />

    <!-- 목 -->
    <rect x="-18" y="-10" width="36" height="42" fill="#fbcfe8" rx="4" />

    <!-- 머리 / 얼굴 베이스 -->
    <ellipse cx="0" cy="-60" rx="55" ry="65" fill="#fbcfe8" />
    <!-- 턱선 쉐입 -->
    <path d="M -50,-60 Q -45,-10 0,0 Q 45,-10 50,-60 Z" fill="#fbcfe8" />

    <!-- 캐릭터 눈 (웹툰 스타일 또렷한 눈매) -->
    <g>
      <ellipse cx="-22" cy="-52" rx="10" ry="7" fill="#0f172a" />
      <circle cx="-20" cy="-54" r="3.5" fill="#ffffff" />
      <ellipse cx="22" cy="-52" rx="10" ry="7" fill="#0f172a" />
      <circle cx="24" cy="-54" r="3.5" fill="#ffffff" />
      <!-- 눈썹 -->
      <path d="M -32,-65 Q -22,-70 -12,-65" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M 12,-65 Q 22,-70 32,-65" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
      <!-- 볼터치 -->
      <ellipse cx="-32" cy="-40" rx="10" ry="4" fill="${theme.glow}" opacity="0.4" />
      <ellipse cx="32" cy="-40" rx="10" ry="4" fill="${theme.glow}" opacity="0.4" />
    </g>

    <!-- 웹툰 헤어스타일 -->
    ${isFemale ? `
      <!-- 여성 헤어 (긴 생머리 + 앞머리) -->
      <path d="M -60,-65 Q -65,30 -75,140 Q -50,150 -45,70 Q -50,-20 -40,-65 Z" fill="#18181b" />
      <path d="M 60,-65 Q 65,30 75,140 Q 50,150 45,70 Q 50,-20 40,-65 Z" fill="#18181b" />
      <path d="M -62,-65 Q 0,-135 62,-65 Q 45,-85 0,-85 Q -45,-85 -62,-65 Z" fill="#18181b" />
      <!-- 앞머리 볼륨 및 엔젤링 광택 -->
      <path d="M -45,-65 Q -30,-45 -20,-60 Q 0,-40 20,-60 Q 30,-45 45,-65 Z" fill="#27272a" />
      <path d="M -35,-95 Q 0,-115 35,-95" stroke="${theme.accent}" stroke-width="4" stroke-linecap="round" opacity="0.75" fill="none" />
    ` : `
      <!-- 남성 헤어 (레이어드 컷 + 댄디 볼륨 뱅) -->
      <path d="M -65,-55 Q -75,-125 0,-130 Q 75,-125 65,-55 Q 50,-80 30,-50 Q 15,-75 0,-48 Q -15,-75 -30,-50 Q -50,-80 -65,-55 Z" fill="#0f172a" />
      <!-- 머리카락 결 및 입체 하이라이트 -->
      <path d="M -50,-100 Q -30,-120 0,-122 Q 30,-120 50,-100" stroke="${theme.accent}" stroke-width="4" stroke-linecap="round" opacity="0.8" fill="none" />
      <path d="M -35,-75 Q -20,-95 -5,-80" stroke="${theme.glow}" stroke-width="2.5" stroke-linecap="round" opacity="0.6" fill="none" />
    `}
  </g>

  <!-- 효과음 (SFX 타이포그래피) -->
  <g transform="translate(${isBubbleLeft ? width - 180 : 120}, 420) rotate(${cut_index % 2 === 0 ? -12 : 12})">
    <text x="0" y="0" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="34" font-weight="900"
      fill="${theme.accent}" stroke="#000000" stroke-width="6" paint-order="stroke fill" text-anchor="middle" letter-spacing="2">
      ${sfx}
    </text>
  </g>

  <!-- ════ 상단 컷 정보 배지 및 제목 ════ -->
  <g transform="translate(32, 32)">
    <!-- 컷 번호 캡슐 -->
    <rect x="0" y="0" width="130" height="38" rx="19" fill="#000000" fill-opacity="0.75" />
    <text x="65" y="24" font-family="'Pretendard', sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">
      #${String(cut_index).padStart(2, '0')} ${esc(phase.slice(0, 1))}
    </text>

    <!-- 구간 표시 레이블 -->
    <rect x="140" y="0" width="160" height="38" rx="10" fill="${theme.top}" fill-opacity="0.85" stroke="${theme.accent}" stroke-width="1.5" />
    <text x="220" y="24" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">
      ${esc(phase)}
    </text>
  </g>

  <!-- 장면 타이틀 바 -->
  <g transform="translate(32, 85)">
    <rect x="0" y="0" width="${width - 64}" height="46" rx="12" fill="#000000" fill-opacity="0.65" stroke="#334155" stroke-width="1" />
    <text x="20" y="29" font-family="'Pretendard', sans-serif" font-size="16" font-weight="700" fill="#ffffff">
      ${cleanTitle}
    </text>
  </g>

  <!-- ════ 웹툰 정통 한국어 말풍선 (이미지 내 합성) ════ -->
  ${dialogue ? `
  <g transform="translate(${bubbleX}, ${bubbleY})" filter="url(#shadow_${cut_index})">
    <!-- 말풍선 본체 -->
    <rect x="0" y="0" width="340" height="135" rx="24" fill="#ffffff" stroke="#0f172a" stroke-width="3.5" />

    <!-- 말풍선 꼬리 (화자 방향으로 향함) -->
    ${isBubbleLeft ? `
      <polygon points="120,135 155,175 160,135" fill="#ffffff" stroke="#0f172a" stroke-width="3.5" />
      <polygon points="121,133 154,173 159,133" fill="#ffffff" stroke="none" />
    ` : `
      <polygon points="220,135 245,175 190,135" fill="#ffffff" stroke="#0f172a" stroke-width="3.5" />
      <polygon points="219,133 244,173 191,133" fill="#ffffff" stroke="none" />
    `}

    <!-- 화자 이름 태그 -->
    <rect x="18" y="14" width="90" height="26" rx="8" fill="#eef2ff" stroke="#c7d2fe" stroke-width="1.5" />
    <text x="63" y="32" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#4f46e5" text-anchor="middle">
      💬 ${cleanSpeaker}
    </text>

    <!-- 대사 본문 (자동 2줄 처리) -->
    <text x="20" y="68" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="15" font-weight="700" fill="#0f172a">
      "${cleanDialogue.slice(0, 24)}"
    </text>
    ${cleanDialogue.length > 24 ? `
    <text x="20" y="94" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="15" font-weight="700" fill="#0f172a">
      ${cleanDialogue.slice(24, 52)}${cleanDialogue.length > 52 ? '...' : ''}"
    </text>` : ''}
  </g>
  ` : ''}

  <!-- 하단 해설 / 나레이션 캡션 바 -->
  ${cleanSummary ? `
  <g transform="translate(32, ${height - 75})">
    <rect x="0" y="0" width="${width - 64}" height="45" rx="10" fill="#000000" fill-opacity="0.75" stroke="#1e293b" stroke-width="1" />
    <text x="20" y="28" font-family="'Pretendard', sans-serif" font-size="13" font-weight="500" fill="#cbd5e1">
      ${cleanSummary}
    </text>
  </g>
  ` : ''}

  <!-- 웹툰 패널 외곽선 테두리 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="6" />
  <rect x="3" y="3" width="${width - 6}" height="${height - 6}" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4" />
</svg>`;
}

export function generateWebtoonCutDataUri(cut: WebtoonCutInput): string {
  const svg = generateWebtoonCutSvg(cut);
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
