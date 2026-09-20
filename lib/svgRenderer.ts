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

// 20개 각 컷별 고유 배경 및 캐릭터 포즈 렌더러
export function generateWebtoonCutSvg(cut: WebtoonCutInput): string {
  const { cut_index, phase, scene_title, scene_summary, speaker, dialogue, genre = 'drama' } = cut;

  const width = 768;
  const height = 1024;

  // 20개 컷별 고유 색상 및 분위기 팔레트
  const sceneThemes: Array<{ skyTop: string; skyMid: string; skyBot: string; accent: string; sfx: string; desc: string }> = [
    // 1-5 기 (도입): 아침 방, 기상, 집안
    { skyTop: '#38bdf8', skyMid: '#93c5fd', skyBot: '#e0f2fe', accent: '#0284c7', sfx: '햇살이 번쩍!', desc: '침실 창가 아침 햇살' },
    { skyTop: '#60a5fa', skyMid: '#bfdbfe', skyBot: '#eff6ff', accent: '#2563eb', sfx: '기지개 쭉~', desc: '침대에서 일어나는 순간' },
    { skyTop: '#818cf8', skyMid: '#c7d2fe', skyBot: '#f5f3ff', accent: '#4f46e5', sfx: '어라...?', desc: '복도에서 들려오는 소리' },
    { skyTop: '#34d399', skyMid: '#a7f3d0', skyBot: '#ecfdf5', accent: '#059669', sfx: '가방을 챙기며', desc: '옷을 갈아입고 등교 준비' },
    { skyTop: '#fbbf24', skyMid: '#fde68a', skyBot: '#fffbeb', accent: '#d97706', sfx: '보글보글~', desc: '따스한 주방 아침 식사' },

    // 6-10 승 (전개): 식사, 집 밖, 등굣길, 버스 정류장
    { skyTop: '#f472b6', skyMid: '#fbcfe8', skyBot: '#fff1f2', accent: '#db2777', sfx: '맛있다!', desc: '가족과 나누는 따뜻한 대화' },
    { skyTop: '#38bdf8', skyMid: '#bae6fd', skyBot: '#f0f9ff', accent: '#0284c7', sfx: '찰칵! 문이 열리고', desc: '현관문을 나서는 순간' },
    { skyTop: '#4ade80', skyMid: '#bbf7d0', skyBot: '#f0fdf4', accent: '#16a34a', sfx: '또각또각', desc: '초록 가로수길 걷기' },
    { skyTop: '#60a5fa', skyMid: '#93c5fd', skyBot: '#dbeafe', accent: '#2563eb', sfx: '시계를 힐끔', desc: '시끌벅적 버스 정류장' },
    { skyTop: '#f59e0b', skyMid: '#fcd34d', skyBot: '#fef3c7', accent: '#b45309', sfx: '부르릉~ 쾅!', desc: '도착하는 파란 시내버스' },

    // 11-15 전 (위기 및 절정): 버스 안, 흔들림, 충돌, 당황
    { skyTop: '#1e293b', skyMid: '#475569', skyBot: '#0f172a', accent: '#38bdf8', sfx: '덜컹덜컹...', desc: '만원 버스 안 손잡이를 잡고' },
    { skyTop: '#431407', skyMid: '#9a3412', skyBot: '#18181b', accent: '#ea580c', sfx: '끼이익—!!', desc: '버스의 급정거와 흔들림' },
    { skyTop: '#881337', skyMid: '#e11d48', skyBot: '#1e1b4b', accent: '#f43f5e', sfx: '쿵! 앗!', desc: '발을 밟히는 극적인 충격' },
    { skyTop: '#701a75', skyMid: '#c026d3', skyBot: '#2e1065', accent: '#e879f9', sfx: '화들짝!!', desc: '뒤돌아보며 깜짝 놀란 얼굴' },
    { skyTop: '#1e1b4b', skyMid: '#4338ca', skyBot: '#0f172a', accent: '#a855f7', sfx: '두근... 두근...', desc: '시선이 마주치는 숨막히는 순간' },

    // 16-20 결 (결말 및 여운): 사과, 미소, 동행, 학교 도착
    { skyTop: '#ec4899', skyMid: '#f472b6', skyBot: '#fdf2f8', accent: '#be185d', sfx: '정말 죄송해요!', desc: '두 손 모아 정중한 사과' },
    { skyTop: '#06b6d4', skyMid: '#67e8f9', skyBot: '#ecfeff', accent: '#0891b2', sfx: '괜찮아요 (방긋)', desc: '손을 흔들며 건네는 미소' },
    { skyTop: '#f43f5e', skyMid: '#fda4af', skyBot: '#fff1f2', accent: '#e11d48', sfx: '소곤소곤~', desc: '나란히 서서 나누는 대화' },
    { skyTop: '#8b5cf6', skyMid: '#c4b5fd', skyBot: '#f5f3ff', accent: '#7c3aed', sfx: '함께 내리며', desc: '정류장에서 같이 하차' },
    { skyTop: '#f59e0b', skyMid: '#fbbf24', skyBot: '#fef3c7', accent: '#d97706', sfx: '새로운 시작!', desc: '화사한 학교 정문을 향해' },
  ];

  const t = sceneThemes[(cut_index - 1) % sceneThemes.length];

  // 텍스트 이스케이프
  const esc = (text: string) => (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const cleanTitle = esc(scene_title || `컷 #${cut_index}`);
  const cleanSummary = esc(scene_summary || '');
  const cleanDialogue = esc(dialogue || '');
  const cleanSpeaker = esc(speaker || '주인공');

  // 20개 각 컷별 독창적인 배경 그래픽 생성
  let sceneIllustration = '';

  if (cut_index === 1) {
    // 컷 1: 침실 창문과 쏟아지는 아침 햇살
    sceneIllustration = `
      <!-- 창문 틀 -->
      <rect x="184" y="240" width="400" height="340" rx="16" fill="#ffffff" stroke="#94a3b8" stroke-width="8" opacity="0.9" />
      <line x1="384" y1="240" x2="384" y2="580" stroke="#94a3b8" stroke-width="6" />
      <line x1="184" y1="410" x2="584" y2="410" stroke="#94a3b8" stroke-width="6" />
      <!-- 창밖 푸른 하늘과 태양 -->
      <circle cx="340" cy="330" r="55" fill="#fde047" opacity="0.8" />
      <!-- 침대 베개와 이불 -->
      <path d="M 120,640 Q 384,600 648,640 L 680,780 L 88,780 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="4" />
      <ellipse cx="280" cy="620" rx="90" ry="40" fill="#ffffff" stroke="#cbd5e1" stroke-width="3" />
    `;
  } else if (cut_index === 2) {
    // 컷 2: 기지개 켜며 일어나는 침대 방
    sceneIllustration = `
      <rect x="220" y="260" width="328" height="280" rx="12" fill="#ffffff" opacity="0.8" />
      <!-- 침대 헤드보드 -->
      <rect x="160" y="520" width="448" height="180" rx="16" fill="#64748b" />
      <!-- 인물 기지개 (팔을 위로 뻗은 포즈) -->
      <circle cx="384" cy="460" r="45" fill="#fbcfe8" />
      <path d="M 340,490 L 320,380 M 428,490 L 448,380" stroke="#fbcfe8" stroke-width="18" stroke-linecap="round" />
      <path d="M 330,500 L 438,500 L 418,660 L 350,660 Z" fill="#3b82f6" />
    `;
  } else if (cut_index === 5 || cut_index === 6) {
    // 컷 5, 6: 주방 식탁과 모락모락 음식
    sceneIllustration = `
      <!-- 주방 찬장과 선반 -->
      <rect x="140" y="200" width="488" height="120" rx="8" fill="#475569" opacity="0.7" />
      <!-- 식탁 테이블 -->
      <ellipse cx="384" cy="640" rx="280" ry="90" fill="#f8fafc" stroke="#e2e8f0" stroke-width="6" />
      <!-- 접시와 모락모락 김 -->
      <ellipse cx="320" cy="630" rx="55" ry="25" fill="#ffffff" stroke="#94a3b8" stroke-width="3" />
      <ellipse cx="448" cy="630" rx="55" ry="25" fill="#ffffff" stroke="#94a3b8" stroke-width="3" />
      <!-- 김 올라오는 곡선 -->
      <path d="M 320,600 Q 310,560 325,530 Q 340,500 325,470" stroke="#cbd5e1" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 448,600 Q 438,560 453,530 Q 468,500 453,470" stroke="#cbd5e1" stroke-width="3" fill="none" stroke-linecap="round" />
    `;
  } else if (cut_index >= 7 && cut_index <= 9) {
    // 컷 7-9: 아침 거리, 가로수, 버스 정류장
    sceneIllustration = `
      <!-- 원경 빌딩군 -->
      <rect x="80" y="340" width="100" height="300" fill="#334155" opacity="0.6" />
      <rect x="200" y="280" width="120" height="360" fill="#475569" opacity="0.6" />
      <rect x="460" y="300" width="110" height="340" fill="#334155" opacity="0.6" />
      <rect x="590" y="360" width="100" height="280" fill="#475569" opacity="0.6" />
      <!-- 가로수 나무 -->
      <circle cx="210" cy="540" r="70" fill="#22c55e" opacity="0.8" />
      <rect x="200" y="580" width="20" height="90" fill="#78350f" />
      <!-- 버스 정류장 표지판 -->
      <rect x="520" y="440" width="24" height="230" fill="#94a3b8" />
      <circle cx="532" cy="430" r="42" fill="#3b82f6" stroke="#ffffff" stroke-width="4" />
      <text x="532" y="437" font-family="'Pretendard', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">BUS</text>
    `;
  } else if (cut_index === 10) {
    // 컷 10: 진입하는 파란 시내버스 정면
    sceneIllustration = `
      <!-- 버스 차체 정면 -->
      <rect x="204" y="340" width="360" height="340" rx="36" fill="#2563eb" stroke="#1e3a8a" stroke-width="6" />
      <!-- 버스 전면 유리창 -->
      <rect x="234" y="370" width="300" height="150" rx="16" fill="#93c5fd" opacity="0.85" />
      <!-- 버스 헤드라이트 -->
      <circle cx="260" cy="580" r="26" fill="#fef08a" stroke="#ca8a04" stroke-width="3" />
      <circle cx="508" cy="580" r="26" fill="#fef08a" stroke="#ca8a04" stroke-width="3" />
      <!-- 번호판 -->
      <rect x="334" y="590" width="100" height="36" rx="6" fill="#ffffff" />
      <text x="384" y="615" font-family="sans-serif" font-size="18" font-weight="900" fill="#1e3a8a" text-anchor="middle">701</text>
    `;
  } else if (cut_index >= 11 && cut_index <= 14) {
    // 컷 11-14: 버스 내부, 손잡이, 흔들림, 충돌 순간
    sceneIllustration = `
      <!-- 버스 내부 천장 및 창문 -->
      <rect x="100" y="240" width="568" height="260" rx="16" fill="#334155" opacity="0.9" />
      <rect x="130" y="270" width="508" height="160" rx="10" fill="#38bdf8" opacity="0.4" />
      <!-- 천장 노란 손잡이 봉 -->
      <line x1="120" y1="280" x2="648" y2="280" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
      <!-- 매달린 링 손잡이들 -->
      <circle cx="220" cy="350" r="28" fill="none" stroke="#facc15" stroke-width="6" />
      <circle cx="340" cy="350" r="28" fill="none" stroke="#facc15" stroke-width="6" />
      <circle cx="460" cy="350" r="28" fill="none" stroke="#facc15" stroke-width="6" />
      <circle cx="580" cy="350" r="28" fill="none" stroke="#facc15" stroke-width="6" />
      <!-- 흔들림 / 충격 이펙트 광선 -->
      <path d="M 280,500 L 484,700 M 484,500 L 280,700" stroke="#f43f5e" stroke-width="4" stroke-dasharray="10 8" />
    `;
  } else if (cut_index === 15 || cut_index === 16) {
    // 컷 15, 16: 두 주인공의 마주침 & 사과
    sceneIllustration = `
      <!-- 두 인물의 대면 실루엣 -->
      <!-- 왼쪽 남주인공 -->
      <circle cx="260" cy="500" r="50" fill="#1e293b" />
      <path d="M 210,550 L 310,550 L 320,720 L 200,720 Z" fill="#3b82f6" />
      <!-- 오른쪽 여주인공 (사과하며 고개 숙임) -->
      <circle cx="508" cy="520" r="48" fill="#1e293b" />
      <path d="M 460,565 L 556,565 L 570,720 L 450,720 Z" fill="#ec4899" />
      <!-- 두 사람 사이 반짝임 이펙트 -->
      <circle cx="384" cy="510" r="16" fill="#fde047" opacity="0.9" />
      <path d="M 384,480 L 384,540 M 354,510 L 414,510" stroke="#ffffff" stroke-width="3" />
    `;
  } else if (cut_index >= 17 && cut_index <= 19) {
    // 컷 17-19: 미소, 대화, 정류장 동행
    sceneIllustration = `
      <!-- 부드러운 하트 & 음표 파티클 -->
      <circle cx="384" cy="460" r="120" fill="#ffffff" opacity="0.2" />
      <text x="240" y="420" font-size="36" fill="#ec4899">♪</text>
      <text x="520" y="440" font-size="42" fill="#3b82f6">♬</text>
      <!-- 나란히 서서 걷는 두 사람 -->
      <circle cx="320" cy="520" r="42" fill="#1e293b" />
      <path d="M 280,560 L 360,560 L 370,700 L 270,700 Z" fill="#3b82f6" />
      <circle cx="448" cy="530" r="40" fill="#1e293b" />
      <path d="M 410,570 L 486,570 L 496,700 L 400,700 Z" fill="#ec4899" />
    `;
  } else {
    // 컷 20: 학교 정문과 희망찬 내일의 엔딩
    sceneIllustration = `
      <!-- 학교 교문 기둥 2개 -->
      <rect x="180" y="380" width="55" height="300" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" />
      <rect x="533" y="380" width="55" height="300" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" />
      <!-- 학교 본관 원경 건물 -->
      <rect x="270" y="320" width="228" height="200" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="4" />
      <!-- 시계탑 -->
      <circle cx="384" cy="380" r="28" fill="#ffffff" stroke="#3b82f6" stroke-width="4" />
      <!-- 흩날리는 꽃잎 파티클 -->
      <ellipse cx="280" cy="240" rx="12" ry="6" fill="#f472b6" transform="rotate(25 280 240)" />
      <ellipse cx="480" cy="220" rx="12" ry="6" fill="#f472b6" transform="rotate(-30 480 220)" />
      <ellipse cx="384" cy="200" rx="14" ry="7" fill="#f472b6" transform="rotate(15 384 200)" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg_${cut_index}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.skyTop}" />
      <stop offset="55%" stop-color="${t.skyMid}" />
      <stop offset="100%" stop-color="${t.skyBot}" />
    </linearGradient>
    <filter id="shadow_${cut_index}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- 배경 캔버스 -->
  <rect width="${width}" height="${height}" fill="url(#bg_${cut_index})" />

  <!-- 각 컷별 고유 장면 일러스트레이션 그래픽 -->
  ${sceneIllustration}

  <!-- 효과음 (SFX 만화 타이포그래피) -->
  <g transform="translate(${cut_index % 2 === 0 ? width - 180 : 160}, 360) rotate(${cut_index % 2 === 0 ? -10 : 10})">
    <text x="0" y="0" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="34" font-weight="900"
      fill="${t.accent}" stroke="#ffffff" stroke-width="8" paint-order="stroke fill" text-anchor="middle" letter-spacing="2">
      ${t.sfx}
    </text>
  </g>

  <!-- ════ 상단 컷 정보 뱃지 ════ -->
  <g transform="translate(32, 32)">
    <rect x="0" y="0" width="130" height="38" rx="19" fill="#0f172a" fill-opacity="0.8" />
    <text x="65" y="24" font-family="'Pretendard', sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">
      #${String(cut_index).padStart(2, '0')} ${esc(phase.slice(0, 1))}
    </text>
    <rect x="140" y="0" width="170" height="38" rx="10" fill="${t.accent}" fill-opacity="0.9" />
    <text x="225" y="24" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">
      ${esc(phase)}
    </text>
  </g>

  <!-- 장면 타이틀 바 -->
  <g transform="translate(32, 82)">
    <rect x="0" y="0" width="${width - 64}" height="44" rx="12" fill="#0f172a" fill-opacity="0.75" stroke="#334155" stroke-width="1" />
    <text x="20" y="28" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="#ffffff">
      ${cleanTitle}
    </text>
  </g>

  <!-- ════ 정통 웹툰 말풍선 (대사가 있을 때) ════ -->
  ${dialogue ? `
  <g transform="translate(${cut_index % 2 === 0 ? 40 : width - 380}, ${height - 250})" filter="url(#shadow_${cut_index})">
    <rect x="0" y="0" width="340" height="130" rx="22" fill="#ffffff" stroke="#0f172a" stroke-width="3" />
    <!-- 꼬리 -->
    ${cut_index % 2 === 0 ? `
      <polygon points="120,130 155,168 160,130" fill="#ffffff" stroke="#0f172a" stroke-width="3" />
      <polygon points="121,128 154,166 159,128" fill="#ffffff" stroke="none" />
    ` : `
      <polygon points="220,130 245,168 190,130" fill="#ffffff" stroke="#0f172a" stroke-width="3" />
      <polygon points="219,128 244,166 191,128" fill="#ffffff" stroke="none" />
    `}
    <rect x="18" y="14" width="90" height="24" rx="6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="63" y="31" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#2563eb" text-anchor="middle">
      💬 ${cleanSpeaker}
    </text>
    <text x="20" y="66" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="#0f172a">
      "${cleanDialogue.slice(0, 24)}"
    </text>
    ${cleanDialogue.length > 24 ? `
    <text x="20" y="92" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="#0f172a">
      ${cleanDialogue.slice(24, 52)}${cleanDialogue.length > 52 ? '...' : ''}"
    </text>` : ''}
  </g>` : ''}

  <!-- 하단 해설 캡션 바 -->
  ${cleanSummary ? `
  <g transform="translate(32, ${height - 70})">
    <rect x="0" y="0" width="${width - 64}" height="42" rx="10" fill="#0f172a" fill-opacity="0.8" />
    <text x="20" y="26" font-family="'Pretendard', sans-serif" font-size="13" font-weight="500" fill="#e2e8f0">
      ${cleanSummary}
    </text>
  </g>` : ''}

  <!-- 외곽선 테두리 -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="6" />
</svg>`;
}

export function generateWebtoonCutDataUri(cut: WebtoonCutInput): string {
  const svg = generateWebtoonCutSvg(cut);
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
