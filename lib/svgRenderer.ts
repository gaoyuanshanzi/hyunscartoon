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

// 텍스트 이스케이프
function esc(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 컷별 배경 그라데이션 및 테마 색상 동적 결정
function getThemeForCut(cut: WebtoonCutInput) {
  const { cut_index, phase, scene_summary, scene_title, genre = 'drama' } = cut;
  const combined = `${scene_title} ${scene_summary} ${genre}`;

  const isNight = /밤|새벽|어둠|달|별|야경/i.test(combined);
  const isSunset = /노을|석양|황혼|일몰/i.test(combined);
  const isRain = /비|우산|빗방울|소나기/i.test(combined);
  const isMagic = /마법|마법사|탑|판타지|환상|빛|성/i.test(combined) || genre === 'fantasy';
  const isCafe = /카페|커피|바리스타|차|찻집|테이블/i.test(combined);
  const isClimax = phase.includes('전') || /위기|충돌|갈등|경악|놀라|위험|절망/i.test(combined);
  const isEnding = phase.includes('결') || /결말|미래|희망|새로운|약속|함께/i.test(combined);

  if (isClimax) {
    return {
      sky: '#3B0764',
      mid: '#701A75',
      bg: '#18181B',
      accent: '#F43F5E',
      dark: true,
      sfx: '쿵!! 번쩍!',
      type: 'climax',
    };
  }
  if (isNight) {
    return {
      sky: '#0F172A',
      mid: '#1E1B4B',
      bg: '#020617',
      accent: '#818CF8',
      dark: true,
      sfx: '고요한 정적...',
      type: 'night',
    };
  }
  if (isSunset) {
    return {
      sky: '#C2410C',
      mid: '#EA580C',
      bg: '#451A03',
      accent: '#FBBF24',
      dark: false,
      sfx: '따스한 노을빛',
      type: 'sunset',
    };
  }
  if (isRain) {
    return {
      sky: '#334155',
      mid: '#475569',
      bg: '#1E293B',
      accent: '#38BDF8',
      dark: true,
      sfx: '주룩주룩...',
      type: 'rain',
    };
  }
  if (isMagic) {
    return {
      sky: '#2E1065',
      mid: '#581C87',
      bg: '#090514',
      accent: '#C084FC',
      dark: true,
      sfx: '신비로운 마법빛!',
      type: 'magic',
    };
  }
  if (isCafe) {
    return {
      sky: '#78350F',
      mid: '#B45309',
      bg: '#FFFBEB',
      accent: '#D97706',
      dark: false,
      sfx: '그윽한 커피 향~',
      type: 'cafe',
    };
  }
  if (isEnding) {
    return {
      sky: '#FDE047',
      mid: '#F472B6',
      bg: '#FFF1F2',
      accent: '#DB2777',
      dark: false,
      sfx: '찬란한 내일로!',
      type: 'ending',
    };
  }

  // 기본 기/승 단계별 산뜻한 파스텔 톤
  const defaultColors = [
    { sky: '#38BDF8', mid: '#93C5FD', bg: '#EFF6FF', accent: '#2563EB', sfx: '산뜻한 시작' },
    { sky: '#34D399', mid: '#A7F3D0', bg: '#ECFDF5', accent: '#059669', sfx: '새로운 발걸음' },
    { sky: '#F472B6', mid: '#FBCFE8', bg: '#FFF1F2', accent: '#E11D48', sfx: '두근두근...' },
    { sky: '#A78BFA', mid: '#DDD6FE', bg: '#F5F3FF', accent: '#7C3AED', sfx: '설레는 만남' },
  ];
  const c = defaultColors[(cut_index - 1) % defaultColors.length];
  return { ...c, dark: false, type: 'default' };
}

// 스토리에 맞춘 비주얼 아트워크 생성기
function renderStoryVisualScene(cut: WebtoonCutInput, theme: ReturnType<typeof getThemeForCut>, width: number, height: number): string {
  const { scene_summary, scene_title, genre = 'drama', isFemale } = cut;
  const combined = `${scene_title} ${scene_summary} ${genre}`;

  const isCafe = /카페|커피|바리스타|머그|잔/i.test(combined);
  const isBook = /책|소설|도서관|독서|선물|노트북|글/i.test(combined);
  const isMagic = /마법|마법사|탑|판타지|환상|빛|씨앗/i.test(combined) || genre === 'fantasy';
  const isRain = /비|우산|빗방울|빗길/i.test(combined);
  const isClimax = cut.phase.includes('전') || /위기|충돌|갈등|경악|놀라/i.test(combined);

  // 캐릭터 기본 렌더링 (남/여)
  const charX = 384;
  const charY = 560;
  const skin = isFemale ? '#FFD5B8' : '#FFD0A0';
  const hair = isFemale ? '#2A1810' : '#1A1A24';
  const cloth = isFemale ? '#DB2777' : '#2563EB';

  let sceneDetails = '';

  if (isCafe) {
    // ☕ 카페 씬 일러스트
    sceneDetails = `
      <!-- 카페 창문과 전등 -->
      <rect x="120" y="160" width="528" height="340" rx="16" fill="#FDE68A" fill-opacity="0.2" stroke="#B45309" stroke-width="4" />
      <line x1="384" y1="160" x2="384" y2="500" stroke="#B45309" stroke-width="3" />
      <!-- 펜던트 조명 -->
      <line x1="260" y1="160" x2="260" y2="240" stroke="#78350F" stroke-width="3" />
      <polygon points="240,260 280,260 270,240 250,240" fill="#F59E0B" />
      <circle cx="260" cy="270" r="12" fill="#FEF08A" opacity="0.9" />
      <line x1="508" y1="160" x2="508" y2="240" stroke="#78350F" stroke-width="3" />
      <polygon points="488,260 528,260 518,240 498,240" fill="#F59E0B" />
      <circle cx="508" cy="270" r="12" fill="#FEF08A" opacity="0.9" />
      <!-- 카페 원목 테이블 -->
      <ellipse cx="384" cy="740" rx="300" ry="90" fill="#78350F" stroke="#451A03" stroke-width="6" />
      <!-- 따뜻한 커피잔 -->
      <ellipse cx="384" cy="700" rx="55" ry="24" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="3" />
      <ellipse cx="384" cy="695" rx="46" ry="16" fill="#451A03" />
      <!-- 모락모락 커피 김 -->
      <path d="M 370,670 Q 360,630 375,590 Q 390,550 375,510" stroke="#FEF3C7" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8" />
      <path d="M 395,665 Q 405,625 390,585" stroke="#FEF3C7" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6" />
    `;
  } else if (isBook) {
    // 📖 책 / 소설 선물 씬 일러스트
    sceneDetails = `
      <!-- 서재와 책더미 배경 -->
      <rect x="80" y="200" width="608" height="240" rx="12" fill="#78350F" fill-opacity="0.15" stroke="#92400E" stroke-width="3" />
      ${[120, 160, 200, 240, 280, 480, 520, 560, 600, 640].map((x, i) =>
        `<rect x="${x}" y="${240 + (i % 3) * 15}" width="28" height="${180 - (i % 3) * 15}" rx="3" fill="${i % 2 === 0 ? '#1E3A8A' : '#991B1B'}" stroke="#0F172A" stroke-width="1.5" />`
      ).join('')}
      <!-- 테이블 위에 놓인 두 권의 소설책 -->
      <ellipse cx="384" cy="720" rx="260" ry="70" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="4" />
      <g transform="translate(320, 640) rotate(-6)">
        <rect x="0" y="0" width="130" height="90" rx="6" fill="#4338CA" stroke="#312E81" stroke-width="3" />
        <rect x="10" y="10" width="110" height="70" rx="4" fill="#6366F1" />
        <line x1="20" y1="30" x2="100" y2="30" stroke="#FFFFFF" stroke-width="3" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="#FFFFFF" stroke-width="2" />
      </g>
      <g transform="translate(350, 650) rotate(8)">
        <rect x="0" y="0" width="125" height="85" rx="6" fill="#B91C1C" stroke="#7F1D1D" stroke-width="3" />
        <rect x="10" y="10" width="105" height="65" rx="4" fill="#DC2626" />
        <!-- 리본 장식 -->
        <line x1="60" y1="0" x2="60" y2="85" stroke="#FDE047" stroke-width="4" />
      </g>
    `;
  } else if (isMagic) {
    // 🔮 판타지 / 마법탑 / 빛의 씨앗 씬 일러스트
    sceneDetails = `
      <!-- 신비로운 마법진 원형 -->
      <circle cx="384" cy="512" r="220" fill="none" stroke="#C084FC" stroke-width="4" opacity="0.5" stroke-dasharray="12 8" />
      <circle cx="384" cy="512" r="160" fill="none" stroke="#E879F9" stroke-width="3" opacity="0.7" />
      <polygon points="384,360 515,588 253,588" fill="none" stroke="#F472B6" stroke-width="2.5" opacity="0.6" />
      <polygon points="384,664 515,436 253,436" fill="none" stroke="#F472B6" stroke-width="2.5" opacity="0.6" />
      <!-- 마법의 빛나는 씨앗 / 보석 오라 -->
      <circle cx="384" cy="512" r="45" fill="#FEF08A" opacity="0.9">
        <animate attributeName="r" values="40;50;40" dur="2s" repeatCount="indefinite" />
      </circle>
      <!-- 반짝이는 마법 파티클들 -->
      ${[160, 240, 320, 440, 520, 600].map((x, i) =>
        `<text x="${x}" y="${300 + (i * 55) % 300}" font-size="28" fill="#FDE047" text-anchor="middle" opacity="0.85">✦</text>`
      ).join('')}
    `;
  } else if (isRain) {
    // 🌧️ 비 / 우산 씬 일러스트
    sceneDetails = `
      <!-- 빗줄기 라인들 -->
      ${Array.from({ length: 24 }, (_, i) => {
        const x = (i * 32 + 20) % width;
        const y = (i * 45) % 500;
        return `<line x1="${x}" y1="${y}" x2="${x - 15}" y2="${y + 60}" stroke="#93C5FD" stroke-width="2" stroke-linecap="round" opacity="0.6" />`;
      }).join('')}
      <!-- 우산 -->
      <path d="M 224,440 Q 384,280 544,440 Z" fill="#2563EB" stroke="#1D4ED8" stroke-width="4" />
      <line x1="384" y1="280" x2="384" y2="540" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round" />
      <path d="M 384,540 Q 384,565 400,565" stroke="#CBD5E1" stroke-width="6" fill="none" stroke-linecap="round" />
    `;
  } else if (isClimax) {
    // ⚡ 위기 / 갈등 / 충돌 / 클라이맥스 씬
    sceneDetails = `
      <!-- 방사형 강렬한 집중선 -->
      ${Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const r1 = 120;
        const r2 = 560;
        const x1 = 384 + Math.cos(a) * r1;
        const y1 = 500 + Math.sin(a) * r1;
        const x2 = 384 + Math.cos(a) * r2;
        const y2 = 500 + Math.sin(a) * r2;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#F43F5E" stroke-width="3" opacity="0.45" />`;
      }).join('')}
      <!-- 극적인 감정 스파크 -->
      <polygon points="384,420 405,470 460,475 418,510 430,565 384,535 338,565 350,510 308,475 363,470" fill="#FDE047" stroke="#EA580C" stroke-width="4" opacity="0.9" />
    `;
  } else {
    // 🌸 기본 감성 / 인물 중심 씬
    sceneDetails = `
      <!-- 창문 또는 배경 윈도우 -->
      <rect x="140" y="200" width="488" height="340" rx="20" fill="#FFFFFF" fill-opacity="0.3" stroke="#CBD5E1" stroke-width="3" />
      <!-- 꽃잎 파티클 -->
      ${[180, 280, 380, 480, 580].map((x, i) =>
        `<ellipse cx="${x}" cy="${260 + (i * 45) % 180}" rx="12" ry="6" fill="#F472B6" transform="rotate(${i * 25}, ${x}, ${260 + (i * 45) % 180})" opacity="0.75" />`
      ).join('')}
    `;
  }

  // 감정 인물 실루엣 / 포즈
  const characterFigure = `
    <!-- 인물 두상 & 상반신 -->
    <g transform="translate(${charX}, ${charY})">
      <!-- 헤어 후면 -->
      <ellipse cx="0" cy="-90" rx="42" ry="48" fill="${hair}" />
      <!-- 얼굴 -->
      <ellipse cx="0" cy="-92" rx="36" ry="40" fill="${skin}" stroke="${hair}" stroke-width="2" />
      <!-- 눈빛 -->
      <ellipse cx="-13" cy="-94" rx="7" ry="8" fill="#0F172A" />
      <circle cx="-11" cy="-97" r="2.5" fill="#FFFFFF" />
      <ellipse cx="13" cy="-94" rx="7" ry="8" fill="#0F172A" />
      <circle cx="15" cy="-97" r="2.5" fill="#FFFFFF" />
      <!-- 볼터치 -->
      <ellipse cx="-20" cy="-84" rx="8" ry="5" fill="#FDA4AF" opacity="0.6" />
      <ellipse cx="20" cy="-84" rx="8" ry="5" fill="#FDA4AF" opacity="0.6" />
      <!-- 부드러운 미소 -->
      <path d="M -9,-74 Q 0,-68 9,-74" stroke="#991B1B" stroke-width="2" fill="none" stroke-linecap="round" />
      <!-- 상의 의상 -->
      <path d="M -36,-52 L -48,40 L 48,40 L 36,-52 Z" fill="${cloth}" stroke="${hair}" stroke-width="2" />
    </g>
  `;

  return sceneDetails + characterFigure;
}

// 20개 각 컷별 고유 웹툰 SVG 생성
export function generateWebtoonCutSvg(cut: WebtoonCutInput): string {
  const { cut_index, phase, scene_title, scene_summary, speaker, dialogue } = cut;

  const width = 768;
  const height = 1024;

  const t = getThemeForCut(cut);
  const textColor = t.dark ? '#F8FAFC' : '#0F172A';
  const panelBg = t.dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)';

  const cleanTitle = esc(scene_title || `컷 #${cut_index}`);
  const cleanSummary = esc(scene_summary || '');
  const cleanDialogue = esc(dialogue || '');
  const cleanSpeaker = esc(speaker || '주인공');

  const visualScene = renderStoryVisualScene(cut, t, width, height);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg_grad_${cut_index}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.sky}" />
      <stop offset="50%" stop-color="${t.mid}" />
      <stop offset="100%" stop-color="${t.bg}" />
    </linearGradient>
    <filter id="shadow_${cut_index}" x="-15%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- 배경 그라데이션 -->
  <rect width="${width}" height="${height}" fill="url(#bg_grad_${cut_index})" />

  <!-- 스토리에 100% 맞춘 비주얼 아트워크 -->
  ${visualScene}

  <!-- ════ 상단 컷 번호 & 기승전결 뱃지 ════ -->
  <g transform="translate(24, 24)">
    <rect x="0" y="0" width="136" height="40" rx="20" fill="#0F172A" fill-opacity="0.9" />
    <text x="68" y="26" font-family="'Pretendard', sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      #${String(cut_index).padStart(2, '0')} CUT
    </text>
    <rect x="146" y="0" width="180" height="40" rx="12" fill="${t.accent}" fill-opacity="0.95" />
    <text x="236" y="26" font-family="'Pretendard', sans-serif" font-size="13" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${esc(phase)}
    </text>
  </g>

  <!-- 장면 소제목 바 -->
  <g transform="translate(24, 76)">
    <rect x="0" y="0" width="${width - 48}" height="46" rx="12" fill="${panelBg}" stroke="${t.dark ? '#334155' : '#E2E8F0'}" stroke-width="1.5" />
    <text x="20" y="30" font-family="'Pretendard', sans-serif" font-size="15" font-weight="800" fill="${textColor}">
      ${cleanTitle}
    </text>
  </g>

  <!-- 효과음 (SFX 타이포그래피) -->
  <g transform="translate(${cut_index % 2 === 0 ? width - 200 : 180}, 690) rotate(${cut_index % 2 === 0 ? -10 : 10})">
    <text x="0" y="0" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900"
      fill="${t.accent}" stroke="${t.dark ? '#000000' : '#FFFFFF'}" stroke-width="8" paint-order="stroke fill" text-anchor="middle">
      ${t.sfx}
    </text>
  </g>

  <!-- ════ 말풍선 (대사가 있을 때) ════ -->
  ${dialogue ? `
  <g transform="translate(${cut_index % 2 === 0 ? 32 : width - 392}, ${height - 280})" filter="url(#shadow_${cut_index})">
    <rect x="0" y="0" width="360" height="135" rx="22" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
    ${cut_index % 2 === 0 ? `
      <polygon points="100,135 135,175 145,135" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
      <polygon points="102,133 134,173 144,133" fill="#FFFFFF" stroke="none" />
    ` : `
      <polygon points="230,135 255,175 205,135" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
      <polygon points="229,133 254,173 206,133" fill="#FFFFFF" stroke="none" />
    `}
    <rect x="18" y="14" width="96" height="24" rx="6" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.2" />
    <text x="66" y="31" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#3730A3" text-anchor="middle">
      💬 ${cleanSpeaker}
    </text>
    <text x="18" y="66" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="#0F172A">
      "${cleanDialogue.slice(0, 22)}"
    </text>
    ${cleanDialogue.length > 22 ? `
    <text x="18" y="94" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="#0F172A">
      ${cleanDialogue.slice(22, 48)}${cleanDialogue.length > 48 ? '...' : ''}
    </text>` : ''}
  </g>` : ''}

  <!-- ════ 하단 해설 캡션 바 ════ -->
  ${cleanSummary ? `
  <g transform="translate(24, ${height - 84})">
    <rect x="0" y="0" width="${width - 48}" height="60" rx="12" fill="${panelBg}" stroke="${t.dark ? '#334155' : '#E2E8F0'}" stroke-width="1.5" />
    <text x="18" y="24" font-family="'Pretendard', sans-serif" font-size="12" font-weight="600" fill="${t.dark ? '#94A3B8' : '#64748B'}">
      ▶ 장면 지문
    </text>
    <text x="18" y="46" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${textColor}">
      ${cleanSummary.slice(0, 48)}${cleanSummary.length > 48 ? '...' : ''}
    </text>
  </g>` : ''}

  <!-- 외곽선 액자 테두리 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#0F172A" stroke-width="6" />
</svg>`;
}

export function generateWebtoonCutDataUri(cut: WebtoonCutInput): string {
  const svg = generateWebtoonCutSvg(cut);
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
