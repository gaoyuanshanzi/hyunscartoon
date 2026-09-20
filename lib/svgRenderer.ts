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
  const { cut_index, phase, scene_title, scene_summary, speaker, dialogue } = cut;

  const width = 768;
  const height = 1024;

  // 20개 컷별 고유 색상 및 분위기 팔레트
  const sceneThemes = [
    { bg: '#FFF8E7', sky: '#87CEEB', mid: '#B0D4F1', dark: '#2C3E50', accent: '#FF9500', sfx: '햇살 쏟아짐!' },
    { bg: '#E8F4FD', sky: '#6DB3F2', mid: '#A8D8F0', dark: '#1A2B45', accent: '#3498DB', sfx: '기지개~ 쭉!' },
    { bg: '#F0F8F0', sky: '#90EE90', mid: '#B8E4B8', dark: '#2D4A2D', accent: '#27AE60', sfx: '어라...?' },
    { bg: '#FFF0F5', sky: '#FFB6C1', mid: '#FFCDD7', dark: '#4A1A2D', accent: '#E91E8C', sfx: '출발이다!' },
    { bg: '#FFFAEB', sky: '#FFD700', mid: '#FFE55C', dark: '#5C4000', accent: '#F39C12', sfx: '보글보글~' },
    { bg: '#FEF0F0', sky: '#FF8FA3', mid: '#FFAABB', dark: '#4A0015', accent: '#E91E63', sfx: '맛있다!' },
    { bg: '#F0FAFF', sky: '#56CCF2', mid: '#9BDEF5', dark: '#0A2C3A', accent: '#2980B9', sfx: '찰칵!' },
    { bg: '#F0FFF4', sky: '#52E07C', mid: '#8FEBA8', dark: '#0D3A1E', accent: '#16A085', sfx: '또각또각!' },
    { bg: '#EEF6FF', sky: '#78B5F5', mid: '#A8CFF8', dark: '#122A55', accent: '#1565C0', sfx: '시계를 확인!' },
    { bg: '#FFFBEE', sky: '#FFBE00', mid: '#FFD655', dark: '#4A3000', accent: '#E67E22', sfx: '부르릉~!' },
    { bg: '#1C2B3A', sky: '#2C3E50', mid: '#34495E', dark: '#0A111A', accent: '#48C9B0', sfx: '덜컹덜컹...' },
    { bg: '#2D1B00', sky: '#6B3700', mid: '#A05200', dark: '#1A0C00', accent: '#FF6B00', sfx: '끼이익—!!' },
    { bg: '#3D0020', sky: '#800040', mid: '#C00060', dark: '#1E0010', accent: '#FF2D78', sfx: '쿵!! 앗!' },
    { bg: '#200040', sky: '#4B0082', mid: '#7B00C8', dark: '#100020', accent: '#CC44FF', sfx: '화들짝!!' },
    { bg: '#0D0A2E', sky: '#1A1460', mid: '#2A1E99', dark: '#050318', accent: '#7C4DFF', sfx: '두근...두근...' },
    { bg: '#FFF0F8', sky: '#FF69B4', mid: '#FFB3D9', dark: '#4A0030', accent: '#E91E8C', sfx: '죄송해요!!' },
    { bg: '#F0FBFF', sky: '#00BCD4', mid: '#70D8EC', dark: '#003C4A', accent: '#0097A7', sfx: '괜찮아요 ^^' },
    { bg: '#FFF5F8', sky: '#FF80AB', mid: '#FFAAC4', dark: '#4A1030', accent: '#F06292', sfx: '소곤소곤~' },
    { bg: '#F5F0FF', sky: '#9C27B0', mid: '#CE93D8', dark: '#2E0050', accent: '#7B1FA2', sfx: '같이 내리자!' },
    { bg: '#FFFDE7', sky: '#FFC107', mid: '#FFE082', dark: '#4A3800', accent: '#FF8F00', sfx: '새로운 시작!' },
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

  const isDark = [11, 12, 13, 14, 15].includes(cut_index);
  const textColor = isDark ? '#E8F4FD' : '#0F172A';
  const panelBg = isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.88)';

  // ══ 스크린톤 / 집중선 패턴 ══
  const screenTonePattern = `
    <pattern id="tone_${cut_index}" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="1.8" fill="${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}" />
    </pattern>
    <pattern id="crosshatch_${cut_index}" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="8" y2="8" stroke="${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}" stroke-width="1"/>
      <line x1="8" y1="0" x2="0" y2="8" stroke="${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}" stroke-width="1"/>
    </pattern>`;

  // ══ 집중선 이펙트 (액션/클라이맥스 컷에만) ══
  const generateFocusLines = (cx: number, cy: number, count: number = 24): string => {
    let lines = '';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r1 = 80 + Math.random() * 40;
      const r2 = 500 + Math.random() * 100;
      const x1 = cx + Math.cos(angle) * r1;
      const y1 = cy + Math.sin(angle) * r1;
      const x2 = cx + Math.cos(angle) * r2;
      const y2 = cy + Math.sin(angle) * r2;
      const w = 1 + Math.random() * 2.5;
      lines += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${t.accent}" stroke-width="${w.toFixed(1)}" stroke-opacity="0.35" stroke-linecap="round"/>`;
    }
    return `<g>${lines}</g>`;
  };

  // ══ 웹툰 캐릭터 — 여학생 ══
  const girlCharacter = (cx: number, cy: number, scale: number = 1, pose: 'stand' | 'bow' | 'sit' | 'turn' = 'stand'): string => {
    const s = scale;
    const hairColor = '#2C1810';
    const skinColor = '#FFD5B8';
    const uniformTop = '#1E3A6E';
    const uniformSkirt = '#8B1A3A';
    const blushColor = '#FFB0B0';

    const poseOffset = pose === 'bow' ? 30 : 0;
    const headRotate = pose === 'turn' ? `rotate(15, ${cx}, ${cy - 90 * s})` : pose === 'bow' ? `rotate(40, ${cx}, ${cy - 70 * s})` : '';

    return `
      <!-- 여학생 캐릭터 -->
      <!-- 머리카락 (뒷부분) -->
      <ellipse cx="${cx}" cy="${cy - 82 * s}" rx="${38 * s}" ry="${44 * s}" fill="${hairColor}" />
      <!-- 얼굴 -->
      <g ${headRotate ? `transform="${headRotate}"` : ''}>
        <ellipse cx="${cx}" cy="${cy - 85 * s}" rx="${32 * s}" ry="${36 * s}" fill="${skinColor}" stroke="${hairColor}" stroke-width="${1.5 * s}" />
        <!-- 머리카락 앞 -->
        <path d="M ${cx - 32 * s},${cy - 95 * s} Q ${cx - 25 * s},${cy - 130 * s} ${cx},${cy - 128 * s} Q ${cx + 25 * s},${cy - 130 * s} ${cx + 30 * s},${cy - 100 * s}" fill="${hairColor}" />
        <!-- 앞머리 -->
        <path d="M ${cx - 30 * s},${cy - 100 * s} Q ${cx - 10 * s},${cy - 108 * s} ${cx},${cy - 104 * s}" fill="${hairColor}" />
        <!-- 눈 (왼) -->
        <ellipse cx="${cx - 11 * s}" cy="${cy - 87 * s}" rx="${7 * s}" ry="${8 * s}" fill="#1A1A2E" />
        <circle cx="${cx - 9 * s}" cy="${cy - 90 * s}" r="${2.5 * s}" fill="white" opacity="0.9" />
        <!-- 눈 (오) -->
        <ellipse cx="${cx + 11 * s}" cy="${cy - 87 * s}" rx="${7 * s}" ry="${8 * s}" fill="#1A1A2E" />
        <circle cx="${cx + 13 * s}" cy="${cy - 90 * s}" r="${2.5 * s}" fill="white" opacity="0.9" />
        <!-- 볼터치 -->
        <ellipse cx="${cx - 18 * s}" cy="${cy - 80 * s}" rx="${8 * s}" ry="${5 * s}" fill="${blushColor}" opacity="0.6" />
        <ellipse cx="${cx + 18 * s}" cy="${cy - 80 * s}" rx="${8 * s}" ry="${5 * s}" fill="${blushColor}" opacity="0.6" />
        <!-- 입 -->
        <path d="M ${cx - 8 * s},${cy - 68 * s} Q ${cx},${cy - 62 * s} ${cx + 8 * s},${cy - 68 * s}" stroke="#C06060" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round" />
        <!-- 눈썹 -->
        <path d="M ${cx - 16 * s},${cy - 98 * s} Q ${cx - 9 * s},${cy - 102 * s} ${cx - 4 * s},${cy - 98 * s}" stroke="${hairColor}" stroke-width="${2 * s}" fill="none" stroke-linecap="round" />
        <path d="M ${cx + 4 * s},${cy - 98 * s} Q ${cx + 9 * s},${cy - 102 * s} ${cx + 16 * s},${cy - 98 * s}" stroke="${hairColor}" stroke-width="${2 * s}" fill="none" stroke-linecap="round" />
      </g>
      <!-- 교복 상의 -->
      <path d="M ${cx - 28 * s},${cy - 49 * s} L ${cx - 38 * s},${cy + 30 * s + poseOffset} L ${cx + 38 * s},${cy + 30 * s + poseOffset} L ${cx + 28 * s},${cy - 49 * s} Z" fill="${uniformTop}" stroke="${hairColor}" stroke-width="${1.5 * s}" />
      <!-- 넥타이 -->
      <path d="M ${cx - 6 * s},${cy - 49 * s} L ${cx},${cy - 10 * s} L ${cx + 6 * s},${cy - 49 * s}" fill="#C41E3A" />
      <!-- 교복 치마 -->
      <path d="M ${cx - 38 * s},${cy + 28 * s + poseOffset} L ${cx - 50 * s},${cy + 90 * s + poseOffset} L ${cx + 50 * s},${cy + 90 * s + poseOffset} L ${cx + 38 * s},${cy + 28 * s + poseOffset} Z" fill="${uniformSkirt}" stroke="${hairColor}" stroke-width="${1.5 * s}" />
      <!-- 다리 -->
      <rect x="${cx - 22 * s}" y="${cy + 88 * s + poseOffset}" width="${16 * s}" height="${55 * s}" rx="${5 * s}" fill="${skinColor}" stroke="${hairColor}" stroke-width="${1 * s}" />
      <rect x="${cx + 6 * s}" y="${cy + 88 * s + poseOffset}" width="${16 * s}" height="${55 * s}" rx="${5 * s}" fill="${skinColor}" stroke="${hairColor}" stroke-width="${1 * s}" />
      <!-- 구두 -->
      <ellipse cx="${cx - 14 * s}" cy="${cy + 146 * s + poseOffset}" rx="${18 * s}" ry="${8 * s}" fill="${hairColor}" />
      <ellipse cx="${cx + 14 * s}" cy="${cy + 146 * s + poseOffset}" rx="${18 * s}" ry="${8 * s}" fill="${hairColor}" />
    `;
  };

  // ══ 웹툰 캐릭터 — 남학생 ══
  const boyCharacter = (cx: number, cy: number, scale: number = 1, pose: 'stand' | 'wave' | 'sit' = 'stand'): string => {
    const s = scale;
    const hairColor = '#1A1A1A';
    const skinColor = '#FFD0A0';
    const uniformTop = '#2C3E50';
    const uniformPants = '#1A252F';

    const handOffset = pose === 'wave' ? -40 : 0;

    return `
      <!-- 남학생 캐릭터 -->
      <!-- 머리카락 -->
      <ellipse cx="${cx}" cy="${cy - 85 * s}" rx="${35 * s}" ry="${42 * s}" fill="${hairColor}" />
      <!-- 얼굴 -->
      <ellipse cx="${cx}" cy="${cy - 85 * s}" rx="${30 * s}" ry="${34 * s}" fill="${skinColor}" stroke="${hairColor}" stroke-width="${1.5 * s}" />
      <!-- 앞머리 -->
      <path d="M ${cx - 30 * s},${cy - 102 * s} Q ${cx},${cy - 120 * s} ${cx + 30 * s},${cy - 102 * s} Q ${cx + 15 * s},${cy - 105 * s} ${cx - 5 * s},${cy - 106 * s}" fill="${hairColor}" />
      <!-- 눈 (왼) -->
      <ellipse cx="${cx - 10 * s}" cy="${cy - 88 * s}" rx="${6.5 * s}" ry="${7 * s}" fill="#1A1A2E" />
      <circle cx="${cx - 8 * s}" cy="${cy - 91 * s}" r="${2 * s}" fill="white" opacity="0.85" />
      <!-- 눈 (오) -->
      <ellipse cx="${cx + 10 * s}" cy="${cy - 88 * s}" rx="${6.5 * s}" ry="${7 * s}" fill="#1A1A2E" />
      <circle cx="${cx + 12 * s}" cy="${cy - 91 * s}" r="${2 * s}" fill="white" opacity="0.85" />
      <!-- 눈썹 -->
      <path d="M ${cx - 15 * s},${cy - 98 * s} Q ${cx - 9 * s},${cy - 102 * s} ${cx - 3 * s},${cy - 99 * s}" stroke="${hairColor}" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round" />
      <path d="M ${cx + 3 * s},${cy - 99 * s} Q ${cx + 9 * s},${cy - 102 * s} ${cx + 15 * s},${cy - 98 * s}" stroke="${hairColor}" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round" />
      <!-- 입 -->
      <path d="M ${cx - 7 * s},${cy - 70 * s} Q ${cx},${cy - 65 * s} ${cx + 7 * s},${cy - 70 * s}" stroke="#A06050" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round" />
      <!-- 교복 상의 -->
      <path d="M ${cx - 30 * s},${cy - 51 * s} L ${cx - 42 * s},${cy + 35 * s} L ${cx + 42 * s},${cy + 35 * s} L ${cx + 30 * s},${cy - 51 * s} Z" fill="${uniformTop}" stroke="${hairColor}" stroke-width="${1.5 * s}" />
      <!-- 팔 (오른쪽 - 손 흔들기) -->
      ${pose === 'wave' ? `<path d="M ${cx + 30 * s},${cy - 40 * s} Q ${cx + 60 * s},${cy - 80 * s} ${cx + 70 * s},${cy - 100 * s + handOffset}" stroke="${skinColor}" stroke-width="${14 * s}" fill="none" stroke-linecap="round" />
      <circle cx="${cx + 70 * s}" cy="${cy - 100 * s + handOffset}" r="${9 * s}" fill="${skinColor}" stroke="${hairColor}" stroke-width="${1 * s}" />` : ''}
      <!-- 넥타이 -->
      <path d="M ${cx - 5 * s},${cy - 51 * s} L ${cx + 1 * s},${cy - 15 * s} L ${cx + 5 * s},${cy - 51 * s}" fill="#8B0000" />
      <!-- 바지 -->
      <path d="M ${cx - 42 * s},${cy + 33 * s} L ${cx - 30 * s},${cy + 100 * s} L ${cx - 6 * s},${cy + 100 * s} L ${cx},${cy + 40 * s} Z" fill="${uniformPants}" stroke="${hairColor}" stroke-width="${1 * s}" />
      <path d="M ${cx + 42 * s},${cy + 33 * s} L ${cx + 30 * s},${cy + 100 * s} L ${cx + 6 * s},${cy + 100 * s} L ${cx},${cy + 40 * s} Z" fill="${uniformPants}" stroke="${hairColor}" stroke-width="${1 * s}" />
      <!-- 구두 -->
      <ellipse cx="${cx - 18 * s}" cy="${cy + 104 * s}" rx="${22 * s}" ry="${8 * s}" fill="#111111" />
      <ellipse cx="${cx + 18 * s}" cy="${cy + 104 * s}" rx="${22 * s}" ry="${8 * s}" fill="#111111" />
    `;
  };

  // ══ 각 컷별 고유 씬 일러스트레이션 ══
  let sceneIllustration = '';
  let usesFocusLines = false;
  let focusLinesSvg = '';

  if (cut_index === 1) {
    // 컷 1: 침실 창문과 쏟아지는 아침 햇살
    sceneIllustration = `
      <!-- 방 벽 -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="#FFF8F0" />
      <!-- 창문 프레임 -->
      <rect x="160" y="180" width="448" height="380" rx="12" fill="#A8D8F0" stroke="#5B8DB8" stroke-width="6" />
      <rect x="160" y="180" width="448" height="380" rx="12" fill="none" stroke="#3A6080" stroke-width="8" />
      <line x1="384" y1="180" x2="384" y2="560" stroke="#3A6080" stroke-width="6" />
      <line x1="160" y1="370" x2="608" y2="370" stroke="#3A6080" stroke-width="6" />
      <!-- 창밖 하늘과 태양 -->
      <circle cx="290" cy="300" r="65" fill="#FFD700" opacity="0.9">
        <animate attributeName="r" values="62;68;62" dur="3s" repeatCount="indefinite" />
      </circle>
      <!-- 태양 광선 -->
      ${Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x1 = 290 + Math.cos(a) * 72;
        const y1 = 300 + Math.sin(a) * 72;
        const x2 = 290 + Math.cos(a) * 100;
        const y2 = 300 + Math.sin(a) * 100;
        return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="#FFD700" stroke-width="5" stroke-opacity="0.7" stroke-linecap="round"/>`;
      }).join('')}
      <!-- 커튼 -->
      <path d="M 160,180 Q 200,280 175,560" stroke="#E8B4B8" stroke-width="3" fill="#F8D7DA" fill-opacity="0.7" />
      <path d="M 608,180 Q 568,280 593,560" stroke="#E8B4B8" stroke-width="3" fill="#F8D7DA" fill-opacity="0.7" />
      <!-- 침대 -->
      <rect x="80" y="680" width="608" height="180" rx="12" fill="#DCEEF8" stroke="#8BBED4" stroke-width="4" />
      <rect x="80" y="640" width="608" height="60" rx="10" fill="#6B9DC0" stroke="#3A6080" stroke-width="4" />
      <ellipse cx="230" cy="660" rx="100" ry="38" fill="white" stroke="#CBD5E1" stroke-width="3" />
      <!-- 스크린톤 오버레이 -->
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 2) {
    // 컷 2: 기지개 켜며 일어나는 장면
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 350, 18);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#E8F4FD" />
      ${boyCharacter(384, 420, 0.9, 'wave')}
      <!-- 반짝임 별 이펙트 -->
      <text x="200" y="200" font-size="32" fill="#FFD700" opacity="0.9">✦</text>
      <text x="520" y="180" font-size="24" fill="#FFD700" opacity="0.7">✦</text>
      <text x="460" y="250" font-size="18" fill="#FFB800" opacity="0.8">✦</text>
      <!-- 선 이펙트 (에너지) -->
      <path d="M 280,140 Q 300,200 320,160" stroke="${t.accent}" stroke-width="3" fill="none" stroke-dasharray="8 4" opacity="0.6" />
      <path d="M 460,150 Q 440,210 480,170" stroke="${t.accent}" stroke-width="3" fill="none" stroke-dasharray="8 4" opacity="0.6" />
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 3) {
    // 컷 3: 복도 장면
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#F0F8F0" />
      <!-- 복도 원근감 -->
      <path d="M 0,400 L 768,400 L 600,220 L 168,220 Z" fill="#E8F0E8" stroke="#C0C8C0" stroke-width="2" />
      <path d="M 0,${height}" L 768,${height} L 768,400 L 0,400 Z" fill="#D8E8D8" />
      <!-- 복도 선 (원근) -->
      <line x1="168" y1="220" x2="0" y2="400" stroke="#B0C0B0" stroke-width="2" opacity="0.6" />
      <line x1="600" y1="220" x2="768" y2="400" stroke="#B0C0B0" stroke-width="2" opacity="0.6" />
      <!-- 창문들 -->
      <rect x="440" y="240" width="100" height="130" rx="6" fill="#87CEEB" stroke="#5B8DB8" stroke-width="3" opacity="0.8" />
      <!-- 캐릭터 -->
      ${boyCharacter(280, 540, 1.0, 'stand')}
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 4) {
    // 컷 4: 등교 준비
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFF0F5" />
      <!-- 방 배경 -->
      <rect x="0" y="400" width="${width}" height="${height - 400}" fill="#F0E8F8" />
      <!-- 책상 -->
      <rect x="80" y="560" width="350" height="20" rx="4" fill="#8B7355" />
      <rect x="90" y="580" width="20" height="120" fill="#7A6348" />
      <rect x="400" y="580" width="20" height="120" fill="#7A6348" />
      <!-- 가방 -->
      <rect x="160" y="480" width="120" height="100" rx="12" fill="#1E3A6E" stroke="#0D2040" stroke-width="3" />
      <rect x="195" y="460" width="50" height="30" rx="8" fill="#1E3A6E" stroke="#0D2040" stroke-width="2" />
      <!-- 캐릭터 -->
      ${boyCharacter(500, 520, 1.05, 'stand')}
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 5) {
    // 컷 5: 주방 아침 식사
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFFAEB" />
      <!-- 주방 배경 -->
      <rect x="0" y="0" width="${width}" height="280" fill="#E8D8B0" />
      <!-- 찬장 -->
      <rect x="60" y="40" width="648" height="200" rx="8" fill="#C8A870" stroke="#A08040" stroke-width="4" />
      <!-- 식탁 -->
      <ellipse cx="384" cy="700" rx="310" ry="100" fill="#DEB887" stroke="#B8955A" stroke-width="5" />
      <!-- 밥그릇 -->
      <ellipse cx="250" cy="660" rx="70" ry="30" fill="white" stroke="#A0A0A0" stroke-width="3" />
      <ellipse cx="250" cy="648" rx="62" ry="20" fill="#F5F5DC" />
      <!-- 국그릇 -->
      <ellipse cx="400" cy="660" rx="65" ry="28" fill="white" stroke="#A0A0A0" stroke-width="3" />
      <ellipse cx="400" cy="650" rx="57" ry="20" fill="#E8A060" opacity="0.8" />
      <!-- 모락모락 김 -->
      <path d="M 250,625 Q 240,590 255,560 Q 270,530 255,500" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7" />
      <path d="M 265,620 Q 255,585 270,555" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5" />
      <path d="M 400,625 Q 390,590 405,560" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7" />
      <!-- 젓가락 -->
      <line x1="310" y1="640" x2="360" y2="700" stroke="#8B4513" stroke-width="3" stroke-linecap="round" />
      <line x1="320" y1="640" x2="370" y2="700" stroke="#8B4513" stroke-width="3" stroke-linecap="round" />
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 6) {
    // 컷 6: 가족과 식사
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FEF0F0" />
      <!-- 창문 햇살 -->
      <rect x="500" y="0" width="268" height="400" fill="#FFE0A0" opacity="0.4" />
      <!-- 식탁 -->
      <ellipse cx="384" cy="680" rx="320" ry="95" fill="#DEB887" stroke="#B8955A" stroke-width="5" />
      <!-- 두 인물 -->
      ${girlCharacter(240, 560, 0.9, 'stand')}
      ${boyCharacter(540, 550, 0.88, 'stand')}
      <!-- 하트 이펙트 -->
      <text x="370" y="280" font-size="38" fill="#FF69B4" opacity="0.8">♡</text>
      <text x="450" y="310" font-size="22" fill="#FF69B4" opacity="0.6">♡</text>
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 7) {
    // 컷 7: 현관문을 나서는 장면
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#F0FAFF" />
      <!-- 바깥 하늘 (문 너머) -->
      <rect x="200" y="100" width="368" height="580" fill="#87CEEB" />
      <!-- 현관문 프레임 -->
      <rect x="200" y="100" width="368" height="580" rx="16" fill="none" stroke="#5B3A2A" stroke-width="12" />
      <rect x="200" y="100" width="368" height="580" rx="16" fill="#8B6340" opacity="0.15" />
      <!-- 문손잡이 -->
      <circle cx="555" cy="400" r="18" fill="#D4A800" stroke="#A07800" stroke-width="3" />
      <!-- 바깥 풍경 (간단한) -->
      <circle cx="350" cy="220" r="50" fill="#FFD700" opacity="0.85" />
      <circle cx="480" cy="350" r="60" fill="#5CB85C" opacity="0.6" />
      <circle cx="290" cy="400" r="50" fill="#5CB85C" opacity="0.5" />
      <!-- 캐릭터 (실루엣, 문 앞에서 나가는 포즈) -->
      ${boyCharacter(384, 560, 1.0, 'wave')}
      <!-- 바람 이펙트 선들 -->
      <path d="M 100,300 Q 160,280 200,300" stroke="${t.accent}" stroke-width="2" fill="none" stroke-dasharray="8 4" opacity="0.5" />
      <path d="M 80,360 Q 150,340 200,355" stroke="${t.accent}" stroke-width="2" fill="none" stroke-dasharray="8 4" opacity="0.4" />
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 8) {
    // 컷 8: 가로수길 걷기
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#F0FFF4" />
      <!-- 하늘 그라데이션 -->
      <rect x="0" y="0" width="${width}" height="400" fill="#87CEEB" opacity="0.7" />
      <!-- 벚꽃나무들 -->
      <rect x="80" y="340" width="22" height="240" fill="#8B6340" />
      <circle cx="91" cy="300" r="80" fill="#FFB7C5" opacity="0.85" />
      <circle cx="120" cy="280" r="55" fill="#FFB7C5" opacity="0.7" />
      <rect x="620" y="360" width="22" height="220" fill="#8B6340" />
      <circle cx="631" cy="320" r="75" fill="#FFB7C5" opacity="0.85" />
      <!-- 떨어지는 꽃잎들 -->
      <ellipse cx="250" cy="180" rx="9" ry="5" fill="#FFB7C5" transform="rotate(25, 250, 180)" />
      <ellipse cx="380" cy="150" rx="9" ry="5" fill="#FFB7C5" transform="rotate(-15, 380, 150)" />
      <ellipse cx="520" cy="200" rx="9" ry="5" fill="#FFB7C5" transform="rotate(35, 520, 200)" />
      <ellipse cx="460" cy="110" rx="7" ry="4" fill="#FFB7C5" transform="rotate(-40, 460, 110)" />
      <!-- 도로와 인도 -->
      <rect x="0" y="580" width="${width}" height="${height - 580}" fill="#C8C8C8" />
      <rect x="0" y="580" width="${width}" height="20" fill="#A0A0A0" />
      <!-- 캐릭터 -->
      ${boyCharacter(380, 520, 1.05, 'stand')}
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 9) {
    // 컷 9: 버스 정류장
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#EEF6FF" />
      <!-- 하늘 -->
      <rect x="0" y="0" width="${width}" height="380" fill="#87CEEB" opacity="0.6" />
      <!-- 배경 빌딩들 -->
      <rect x="50" y="250" width="120" height="330" fill="#6B7280" opacity="0.7" />
      <rect x="180" y="200" width="100" height="380" fill="#4B5563" opacity="0.65" />
      <rect x="550" y="230" width="130" height="350" fill="#6B7280" opacity="0.7" />
      <!-- 버스 정류장 표지판 -->
      <rect x="490" y="310" width="28" height="290" fill="#78909C" />
      <rect x="452" y="270" width="105" height="60" rx="8" fill="#1565C0" stroke="white" stroke-width="3" />
      <text x="505" y="308" font-family="'Pretendard', sans-serif" font-size="24" font-weight="900" fill="white" text-anchor="middle">BUS</text>
      <!-- 버스 쉘터 지붕 -->
      <rect x="200" y="370" width="320" height="16" rx="4" fill="#37474F" />
      <rect x="200" y="370" width="12" height="210" fill="#37474F" />
      <rect x="508" y="370" width="12" height="210" fill="#37474F" />
      <!-- 캐릭터 -->
      ${boyCharacter(320, 540, 0.95, 'stand')}
      ${girlCharacter(480, 540, 0.9, 'stand')}
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 10) {
    // 컷 10: 버스 도착 (정면)
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 500, 20);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFFBEE" />
      <!-- 버스 차체 -->
      <rect x="124" y="280" width="520" height="440" rx="40" fill="#1565C0" stroke="#0D3C80" stroke-width="8" />
      <!-- 전면 유리 -->
      <rect x="164" y="320" width="440" height="200" rx="20" fill="#7EC8E3" opacity="0.85" stroke="#0D3C80" stroke-width="4" />
      <!-- 와이퍼 -->
      <line x1="250" y1="510" x2="380" y2="440" stroke="#0D3C80" stroke-width="4" stroke-linecap="round" />
      <line x1="510" y1="510" x2="400" y2="450" stroke="#0D3C80" stroke-width="4" stroke-linecap="round" />
      <!-- 헤드라이트 -->
      <ellipse cx="220" cy="590" rx="42" ry="26" fill="#FEF08A" stroke="#CA8A04" stroke-width="4" />
      <ellipse cx="548" cy="590" rx="42" ry="26" fill="#FEF08A" stroke="#CA8A04" stroke-width="4" />
      <!-- 라디에이터 그릴 -->
      <rect x="264" y="590" width="240" height="80" rx="12" fill="#0D3C80" />
      <line x1="280" y1="610" x2="488" y2="610" stroke="#1565C0" stroke-width="3" />
      <line x1="280" y1="630" x2="488" y2="630" stroke="#1565C0" stroke-width="3" />
      <line x1="280" y1="650" x2="488" y2="650" stroke="#1565C0" stroke-width="3" />
      <!-- 번호판 -->
      <rect x="314" y="688" width="140" height="46" rx="8" fill="white" stroke="#0D3C80" stroke-width="3" />
      <text x="384" y="720" font-family="sans-serif" font-size="22" font-weight="900" fill="#1565C0" text-anchor="middle">701</text>
      <!-- 속도 이펙트 선들 -->
      <line x1="0" y1="420" x2="124" y2="420" stroke="#FFD700" stroke-width="5" stroke-linecap="round" opacity="0.7" />
      <line x1="0" y1="460" x2="124" y2="460" stroke="#FFD700" stroke-width="3" stroke-linecap="round" opacity="0.5" />
      <line x1="644" y1="420" x2="768" y2="420" stroke="#FFD700" stroke-width="5" stroke-linecap="round" opacity="0.7" />
      <line x1="644" y1="460" x2="768" y2="460" stroke="#FFD700" stroke-width="3" stroke-linecap="round" opacity="0.5" />
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 11) {
    // 컷 11: 버스 내부 (손잡이)
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#1C2B3A" />
      <!-- 버스 창문들 -->
      <rect x="60" y="180" width="220" height="140" rx="10" fill="#7EC8E3" opacity="0.35" stroke="#48C9B0" stroke-width="3" />
      <rect x="310" y="180" width="220" height="140" rx="10" fill="#7EC8E3" opacity="0.35" stroke="#48C9B0" stroke-width="3" />
      <rect x="560" y="180" width="160" height="140" rx="10" fill="#7EC8E3" opacity="0.35" stroke="#48C9B0" stroke-width="3" />
      <!-- 천장 봉 -->
      <rect x="0" y="340" width="${width}" height="16" rx="8" fill="#FACC15" />
      <!-- 손잡이 링들 -->
      ${[160, 290, 420, 550, 660].map(x =>
        `<line x1="${x}" y1="356" x2="${x}" y2="400" stroke="#FACC15" stroke-width="4" />
         <circle cx="${x}" cy="414" r="22" fill="none" stroke="#FACC15" stroke-width="6" />`
      ).join('')}
      <!-- 캐릭터들 (실루엣) -->
      ${boyCharacter(250, 580, 0.9, 'stand')}
      ${girlCharacter(500, 580, 0.88, 'stand')}
      <!-- 스크린톤 어두운 버전 -->
      <rect width="${width}" height="${height}" fill="url(#crosshatch_${cut_index})" />`;
  } else if (cut_index === 12) {
    // 컷 12: 버스 급회전 — 집중선 + 액션
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 512, 32);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#2D1B00" />
      <!-- 버스 창문 (기울어진 뷰) -->
      <rect x="40" y="160" width="688" height="300" rx="16" fill="#7EC8E3" opacity="0.25" transform="rotate(-8, 384, 310)" />
      <!-- 손잡이 (기울어진) -->
      <rect x="0" y="310" width="${width}" height="14" rx="7" fill="#FACC15" transform="rotate(-6, 384, 317)" />
      <!-- 충격 이펙트 -->
      <path d="M 300,450 L 350,400 L 400,460 L 440,390 L 490,455" stroke="#FF6B00" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round" />
      <!-- SFX 텍스트 (큰 것) -->
      <text x="384" y="600" font-family="'Pretendard', sans-serif" font-size="80" font-weight="900" fill="#FF6B00" stroke="#1A0C00" stroke-width="8" text-anchor="middle" paint-order="stroke fill" transform="rotate(-8, 384, 580)">끼익!</text>
      <!-- 캐릭터들 (흔들리는 포즈) -->
      <g transform="rotate(-12, 250, 500)">
        ${boyCharacter(250, 520, 0.88, 'stand')}
      </g>
      <g transform="rotate(10, 530, 510)">
        ${girlCharacter(530, 510, 0.85, 'stand')}
      </g>
      <rect width="${width}" height="${height}" fill="url(#crosshatch_${cut_index})" />`;
  } else if (cut_index === 13) {
    // 컷 13: 발 밟히는 순간 — 극적 클로즈업
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 512, 36);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#3D0020" />
      <!-- 충격 원형 이펙트 -->
      <circle cx="384" cy="560" r="200" fill="none" stroke="#FF2D78" stroke-width="8" opacity="0.6" />
      <circle cx="384" cy="560" r="140" fill="none" stroke="#FF2D78" stroke-width="5" opacity="0.5" />
      <circle cx="384" cy="560" r="80" fill="none" stroke="#FF2D78" stroke-width="3" opacity="0.7" />
      <!-- 발 클로즈업 (구두 두 개) -->
      <ellipse cx="310" cy="680" rx="110" ry="50" fill="#1A1A1A" stroke="#333" stroke-width="4" />
      <ellipse cx="460" cy="650" rx="105" ry="48" fill="#6B3A2A" stroke="#3A1A0A" stroke-width="4" />
      <!-- 충격 별 이펙트 -->
      <path d="M 384,500 L 400,535 L 440,540 L 412,565 L 420,605 L 384,585 L 348,605 L 356,565 L 328,540 L 368,535 Z" fill="#FF2D78" opacity="0.85" />
      <!-- SFX -->
      <text x="384" y="420" font-family="'Pretendard', sans-serif" font-size="72" font-weight="900" fill="#FF2D78" stroke="#1E0010" stroke-width="10" text-anchor="middle" paint-order="stroke fill">쿵!!</text>
      <rect width="${width}" height="${height}" fill="url(#crosshatch_${cut_index})" />`;
  } else if (cut_index === 14) {
    // 컷 14: 여학생 뒤돌아보며 놀란 얼굴
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 380, 28);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#200040" />
      <!-- 빛 후광 -->
      <circle cx="384" cy="350" r="220" fill="#CC44FF" opacity="0.15" />
      <!-- 여학생 클로즈업 (놀란 얼굴) -->
      <!-- 머리카락 -->
      <ellipse cx="384" cy="300" rx="140" ry="160" fill="#1A0A00" />
      <!-- 얼굴 -->
      <ellipse cx="384" cy="320" rx="120" ry="130" fill="#FFD5B8" stroke="#1A0A00" stroke-width="3" />
      <!-- 놀란 큰 눈 (왼) -->
      <ellipse cx="330" cy="310" rx="32" ry="38" fill="white" stroke="#1A0A00" stroke-width="3" />
      <circle cx="330" cy="315" r="22" fill="#3A1A60" />
      <circle cx="338" cy="302" r="9" fill="white" opacity="0.9" />
      <!-- 놀란 큰 눈 (오) -->
      <ellipse cx="438" cy="310" rx="32" ry="38" fill="white" stroke="#1A0A00" stroke-width="3" />
      <circle cx="438" cy="315" r="22" fill="#3A1A60" />
      <circle cx="446" cy="302" r="9" fill="white" opacity="0.9" />
      <!-- 빛 반사 (쇼조 스타일) -->
      <line x1="310" y1="340" x2="360" y2="330" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="418" y1="340" x2="468" y2="330" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <!-- 볼터치 (강한 놀람) -->
      <ellipse cx="280" cy="365" rx="40" ry="20" fill="#FF69B4" opacity="0.7" />
      <ellipse cx="488" cy="365" rx="40" ry="20" fill="#FF69B4" opacity="0.7" />
      <!-- 입 (벌린 O 모양) -->
      <ellipse cx="384" cy="420" rx="28" ry="22" fill="#C06060" />
      <ellipse cx="384" cy="420" rx="18" ry="14" fill="#8B0000" />
      <!-- 눈썹 (올라간) -->
      <path d="M 295,268 Q 320,252 350,265" stroke="#1A0A00" stroke-width="7" fill="none" stroke-linecap="round" />
      <path d="M 418,265 Q 448,252 473,268" stroke="#1A0A00" stroke-width="7" fill="none" stroke-linecap="round" />
      <!-- 땀방울 -->
      <path d="M 500,220 Q 510,240 495,260 Q 480,280 495,300" fill="#87CEEB" stroke="none" opacity="0.8" />
      <!-- 느낌표 이펙트 -->
      <text x="560" y="200" font-size="60" fill="#CC44FF" font-weight="900" opacity="0.9">!</text>
      <rect width="${width}" height="${height}" fill="url(#crosshatch_${cut_index})" />`;
  } else if (cut_index === 15) {
    // 컷 15: 눈이 마주치는 순간
    usesFocusLines = true;
    focusLinesSvg = generateFocusLines(384, 460, 24);
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#0D0A2E" />
      <!-- 반짝이는 빛 효과 -->
      <circle cx="384" cy="460" r="180" fill="#7C4DFF" opacity="0.12" />
      <!-- 하트 이펙트들 -->
      <text x="200" y="200" font-size="40" fill="#FF80AB" opacity="0.7">♡</text>
      <text x="520" y="180" font-size="30" fill="#FF80AB" opacity="0.6">♡</text>
      <text x="384" y="140" font-size="24" fill="#FF80AB" opacity="0.5">♡</text>
      <!-- 두 캐릭터 -->
      ${boyCharacter(230, 530, 0.9, 'stand')}
      ${girlCharacter(540, 530, 0.88, 'turn')}
      <!-- 시선 연결선 (쇼조 스타일 빛) -->
      <line x1="280" y1="445" x2="492" y2="440" stroke="white" stroke-width="3" stroke-opacity="0.4" stroke-dasharray="10 6" />
      <!-- 반짝임 별들 -->
      <text x="380" y="380" font-size="28" fill="#FFD700" text-anchor="middle" opacity="0.9">✦</text>
      <text x="355" y="410" font-size="16" fill="#FFD700" opacity="0.7">✦</text>
      <text x="410" y="405" font-size="18" fill="#FFD700" opacity="0.8">✦</text>
      <rect width="${width}" height="${height}" fill="url(#crosshatch_${cut_index})" />`;
  } else if (cut_index === 16) {
    // 컷 16: 여학생 사과
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFF0F8" />
      <!-- 배경 꽃 장식 -->
      <circle cx="150" cy="200" r="80" fill="#FFB7C5" opacity="0.3" />
      <circle cx="620" cy="180" r="70" fill="#FFB7C5" opacity="0.25" />
      <!-- 여학생 (허리 숙여 사과) -->
      ${girlCharacter(380, 500, 1.05, 'bow')}
      <!-- 사과 텍스트 효과 -->
      <text x="384" y="200" font-family="'Pretendard', sans-serif" font-size="44" font-weight="900" fill="#E91E8C" stroke="white" stroke-width="6" text-anchor="middle" paint-order="stroke fill">죄송해요!</text>
      <!-- 반짝임 -->
      <text x="180" y="360" font-size="30" fill="#FF69B4" opacity="0.7">✦</text>
      <text x="560" y="340" font-size="24" fill="#FF69B4" opacity="0.6">✦</text>
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 17) {
    // 컷 17: 미소와 손 흔들기
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#F0FBFF" />
      <!-- 햇살 후광 효과 -->
      <circle cx="370" cy="400" r="230" fill="#FFD700" opacity="0.1" />
      <!-- 음표 이펙트들 -->
      <text x="180" y="250" font-size="40" fill="#00BCD4" opacity="0.7">♪</text>
      <text x="540" y="220" font-size="50" fill="#00BCD4" opacity="0.6">♬</text>
      <text x="460" y="290" font-size="28" fill="#00BCD4" opacity="0.5">♩</text>
      <!-- 캐릭터 (손 흔들며 미소) -->
      ${boyCharacter(370, 530, 1.05, 'wave')}
      <!-- 빛 파티클 -->
      <text x="540" y="390" font-size="24" fill="#FFD700" opacity="0.9">✦</text>
      <text x="200" y="420" font-size="18" fill="#FFD700" opacity="0.8">✦</text>
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 18) {
    // 컷 18: 나란히 서서 대화
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFF5F8" />
      <!-- 창문 빛 -->
      <rect x="400" y="0" width="368" height="500" fill="#FFE0A0" opacity="0.25" />
      <!-- 두 캐릭터 나란히 -->
      ${boyCharacter(270, 530, 1.0, 'stand')}
      ${girlCharacter(490, 530, 0.95, 'stand')}
      <!-- 대화 이펙트 점선들 -->
      <path d="M 340,300 Q 384,260 430,300" stroke="#F06292" stroke-width="2" fill="none" stroke-dasharray="8 5" opacity="0.5" />
      <!-- 반짝임들 -->
      <text x="384" y="180" font-size="32" fill="#FF80AB" text-anchor="middle" opacity="0.8">♡</text>
      <text x="180" y="280" font-size="22" fill="#FF80AB" opacity="0.5">♡</text>
      <text x="560" y="260" font-size="20" fill="#FF80AB" opacity="0.6">♡</text>
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else if (cut_index === 19) {
    // 컷 19: 같이 버스에서 내리기
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#F5F0FF" />
      <!-- 하늘 -->
      <rect x="0" y="0" width="${width}" height="300" fill="#87CEEB" opacity="0.6" />
      <!-- 버스 문 (열린) -->
      <rect x="100" y="200" width="200" height="380" rx="10" fill="#1565C0" stroke="#0D3C80" stroke-width="6" />
      <rect x="100" y="200" width="200" height="380" rx="10" fill="#7EC8E3" opacity="0.2" />
      <!-- 계단 -->
      <rect x="60" y="568" width="260" height="28" rx="4" fill="#607D8B" />
      <rect x="40" y="596" width="300" height="28" rx="4" fill="#546E7A" />
      <!-- 두 캐릭터 나란히 내리는 중 -->
      ${boyCharacter(280, 540, 0.95, 'stand')}
      ${girlCharacter(470, 540, 0.9, 'stand')}
      <!-- 벚꽃 -->
      <ellipse cx="160" cy="160" rx="10" ry="5" fill="#FFB7C5" transform="rotate(20, 160, 160)" />
      <ellipse cx="560" cy="140" rx="10" ry="5" fill="#FFB7C5" transform="rotate(-25, 560, 140)" />
      <ellipse cx="380" cy="120" rx="10" ry="5" fill="#FFB7C5" transform="rotate(10, 380, 120)" />
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  } else {
    // 컷 20: 학교 정문 — 희망찬 엔딩
    sceneIllustration = `
      <rect width="${width}" height="${height}" fill="#FFFDE7" />
      <!-- 환한 하늘 -->
      <rect x="0" y="0" width="${width}" height="350" fill="#87CEEB" opacity="0.6" />
      <!-- 황금빛 햇살 방사선 -->
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r1 = 40;
        const r2 = 450;
        const x1 = 384 + Math.cos(a) * r1;
        const y1 = 120 + Math.sin(a) * r1;
        const x2 = 384 + Math.cos(a) * r2;
        const y2 = 120 + Math.sin(a) * r2;
        return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="#FFD700" stroke-width="4" stroke-opacity="0.2" />`;
      }).join('')}
      <!-- 태양 -->
      <circle cx="384" cy="120" r="55" fill="#FFD700" opacity="0.9" />
      <!-- 학교 본관 -->
      <rect x="224" y="300" width="320" height="220" rx="8" fill="#F5F5F5" stroke="#CBD5E1" stroke-width="4" />
      <!-- 시계탑 -->
      <rect x="354" y="240" width="60" height="80" rx="6" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="3" />
      <circle cx="384" cy="270" r="26" fill="white" stroke="#1565C0" stroke-width="4" />
      <!-- 건물 창문들 -->
      ${[260, 360, 460].map(x => [340, 420].map(y =>
        `<rect x="${x}" y="${y}" width="50" height="40" rx="4" fill="#87CEEB" stroke="#94A3B8" stroke-width="2" />`
      ).join('')).join('')}
      <!-- 교문 기둥 -->
      <rect x="160" y="420" width="50" height="230" rx="8" fill="white" stroke="#CBD5E1" stroke-width="4" />
      <rect x="558" y="420" width="50" height="230" rx="8" fill="white" stroke="#CBD5E1" stroke-width="4" />
      <!-- 교문 아치 -->
      <path d="M 160,422 Q 384,340 608,422" fill="none" stroke="#1565C0" stroke-width="6" />
      <!-- 두 캐릭터 나란히 걷기 -->
      ${boyCharacter(290, 600, 0.95, 'stand')}
      ${girlCharacter(480, 600, 0.9, 'stand')}
      <!-- 벚꽃 파티클 -->
      ${[140, 220, 310, 430, 520, 620, 680].map((x, i) =>
        `<ellipse cx="${x}" cy="${160 + (i * 37) % 120}" rx="10" ry="5" fill="#FFB7C5" transform="rotate(${-30 + i * 15}, ${x}, ${160 + (i * 37) % 120})" opacity="0.85" />`
      ).join('')}
      <rect width="${width}" height="${height}" fill="url(#tone_${cut_index})" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg_${cut_index}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${t.sky}" />
      <stop offset="55%" stop-color="${t.mid}" />
      <stop offset="100%" stop-color="${t.bg}" />
    </linearGradient>
    <filter id="shadow_${cut_index}" x="-15%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.4" />
    </filter>
    <filter id="glow_${cut_index}" x="-20%" y="-20%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    ${screenTonePattern}
  </defs>

  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="url(#bg_${cut_index})" />

  <!-- 집중선 이펙트 (액션 컷) -->
  ${usesFocusLines ? focusLinesSvg : ''}

  <!-- 씬 일러스트레이션 -->
  ${sceneIllustration}

  <!-- ════ 상단 컷 정보 뱃지 ════ -->
  <g transform="translate(20, 20)">
    <rect x="0" y="0" width="148" height="42" rx="21" fill="#0F172A" fill-opacity="0.88" />
    <text x="74" y="28" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="15" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      #${String(cut_index).padStart(2, '0')} CUT
    </text>
    <rect x="158" y="0" width="190" height="42" rx="12" fill="${t.accent}" fill-opacity="0.95" />
    <text x="253" y="28" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ${esc(phase)}
    </text>
  </g>

  <!-- 장면 타이틀 바 -->
  <g transform="translate(20, 74)">
    <rect x="0" y="0" width="${width - 40}" height="46" rx="12" fill="${panelBg}" stroke="${isDark ? '#334155' : '#E2E8F0'}" stroke-width="1.5" />
    <text x="18" y="30" font-family="'Pretendard', sans-serif" font-size="15" font-weight="700" fill="${textColor}">
      ${cleanTitle}
    </text>
  </g>

  <!-- 효과음 SFX 타이포그래피 -->
  <g transform="translate(${cut_index % 2 === 0 ? width - 200 : 180}, ${isDark ? 750 : 700}) rotate(${cut_index % 2 === 0 ? -12 : 12})">
    <text x="0" y="0" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="36" font-weight="900"
      fill="${t.accent}" stroke="${isDark ? '#000000' : '#FFFFFF'}" stroke-width="10" paint-order="stroke fill" text-anchor="middle" letter-spacing="2">
      ${t.sfx}
    </text>
  </g>

  <!-- ════ 말풍선 ════ -->
  ${dialogue ? `
  <g transform="translate(${cut_index % 2 === 0 ? 28 : width - 388}, ${height - 270})" filter="url(#shadow_${cut_index})">
    <rect x="0" y="0" width="360" height="140" rx="24" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
    <!-- 말풍선 꼬리 -->
    ${cut_index % 2 === 0 ? `
      <polygon points="100,140 140,185 150,140" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
      <polygon points="102,138 139,183 149,138" fill="#FFFFFF" stroke="none" />
    ` : `
      <polygon points="240,140 265,185 215,140" fill="#FFFFFF" stroke="#0F172A" stroke-width="3" />
      <polygon points="239,138 264,183 216,138" fill="#FFFFFF" stroke="none" />
    `}
    <!-- 화자 이름 배지 -->
    <rect x="16" y="14" width="100" height="26" rx="7" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5" />
    <text x="66" y="32" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#3730A3" text-anchor="middle">
      💬 ${cleanSpeaker}
    </text>
    <!-- 대사 텍스트 -->
    <text x="18" y="68" font-family="'Pretendard', sans-serif" font-size="16" font-weight="600" fill="#0F172A">
      "${cleanDialogue.slice(0, 22)}"
    </text>
    ${cleanDialogue.length > 22 ? `
    <text x="18" y="96" font-family="'Pretendard', sans-serif" font-size="16" font-weight="600" fill="#0F172A">
      ${cleanDialogue.slice(22, 48)}${cleanDialogue.length > 48 ? '...' : ''}
    </text>` : ''}
  </g>` : ''}

  <!-- 하단 해설 캡션 -->
  ${cleanSummary ? `
  <g transform="translate(20, ${height - 78})">
    <rect x="0" y="0" width="${width - 40}" height="58" rx="12" fill="${panelBg}" stroke="${isDark ? '#334155' : '#E2E8F0'}" stroke-width="1.5" />
    <text x="18" y="24" font-family="'Pretendard', sans-serif" font-size="13" font-weight="500" fill="${isDark ? '#94A3B8' : '#64748B'}">▶ 장면 해설</text>
    <text x="18" y="46" font-family="'Pretendard', sans-serif" font-size="13" font-weight="600" fill="${textColor}">
      ${cleanSummary.slice(0, 44)}${cleanSummary.length > 44 ? '...' : ''}
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
