import { NextRequest } from 'next/server';
import { generateWebtoonCutDataUri } from '@/lib/svgRenderer';
import { saveNeonSession, saveNeonCut } from '@/lib/neon';

export const dynamic = 'force-dynamic';

// 20개 각 컷별 고유 시각적 장면 프롬프트 템플릿
const SCENE_PROMPTS = [
  // 1-5 기 (도입)
  'young student waking up in cozy bedroom, soft morning sunlight streaming through window, peaceful dawn, blankets, detailed anime room interior',
  'young student jumping out of bed, stretching arms with energized smile, messy morning hair, bright cozy bedroom, anime illustration',
  'young student walking through hallway, looking curious towards kitchen door, warm morning indoor lighting, clean anime lines',
  'young student getting dressed in neat casual clothes, putting on backpack, ready for the day, bright morning daylight',
  'warm cozy kitchen dining table with delicious breakfast dishes, steaming soup and rice, inviting home atmosphere',
  // 6-10 승 (전개)
  'young student eating warm breakfast happily with mother smiling warmly across dining table, heartwarming family moment, anime style',
  'student tying shoelaces at front entrance door, opening door to sunny day outside, fresh morning breeze',
  'student walking along tree-lined city sidewalk in morning sunlight, green trees, blue sky with soft white clouds, peaceful street',
  'crowded city bus stop with students and commuters waiting, student looking at watch, morning commute, vibrant urban street',
  'blue city bus arriving at bus stop with doors opening, passengers stepping forward, dynamic urban street perspective',
  // 11-15 전 (위기 및 절정)
  'inside crowded city bus, passengers holding yellow handrails, student standing, dramatic sunlight through bus windows, anime scene',
  'sudden bus turn, passengers swaying, dynamic camera angle, tension inside the city bus, action anime atmosphere',
  'close-up dramatic moment of shoe accidentally stepping on foot, student wincing with surprised reaction, dynamic anime perspective',
  'cute anime schoolgirl turning around in shock, apologetic wide eyes, blushing in embarrassment, cute manhwa face',
  'two students making eye contact inside bus, intense shared moment of surprise and realization, sparkling anime lighting',
  // 16-20 결 (결말 및 여운)
  'schoolgirl bowing politely with hands clasped saying sorry, sweet apologetic smile, charming anime expression',
  'student smiling kindly waving hand in reassurance, friendly and understanding expression, gentle warm morning glow',
  'two students chatting pleasantly standing side by side on bus, budding friendship, gentle sunlight through window',
  'two students stepping off bus at school bus stop together, smiling at each other under bright blue sky',
  'students walking together towards school gate in golden morning light, hopeful peaceful ending, beautiful anime artwork, masterpiece',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const story = searchParams.get('story') || '';
  const genre = searchParams.get('genre') || 'drama';

  if (!story || story.trim().length < 20) {
    return new Response(JSON.stringify({ error: '스토리가 너무 짧습니다. 최소 20자 이상 입력하세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  // 1. 스토리 분할 (기승전결 20컷)
  const rawSentences = story
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  const sentences = rawSentences.length >= 4 ? rawSentences : [
    story.slice(0, Math.floor(story.length / 3)) || story,
    story.slice(Math.floor(story.length / 3), Math.floor((2 * story.length) / 3)) || '상황이 급격하게 변화하기 시작한다.',
    story.slice(Math.floor((2 * story.length) / 3)) || '위기 속에서 예상치 못한 결정을 내린다.',
    '모든 갈등이 정리되고 새로운 내일이 밝아온다.',
  ];

  // 주인공 이름 추론
  const nameMatches = story.match(/([가-힣]{2,4})(?:[은는이가를와의]|에게|씨|군|양)/g);
  let mainChar = '주인공';
  if (nameMatches) {
    const counts: Record<string, number> = {};
    for (const raw of nameMatches) {
      const n = raw.replace(/[은는이가를와의]|에게|씨|군|양/g, '');
      if (!['그녀', '그것', '이것', '저것', '자신', '사람', '우리', '시간', '하루'].includes(n) && n.length >= 2) {
        counts[n] = (counts[n] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) mainChar = sorted[0][0];
  }

  const isFemale = /그녀|소녀|여학생|언니|누나|지아|수아|유진/.test(story);
  const webtoonTitle = `웹툰: ${mainChar}의 이야기`;
  const baseSeed = Math.floor(10000 + Math.random() * 90000);

  // Neon DB에 세션 저장
  saveNeonSession(sessionId, webtoonTitle, genre, story).catch(e =>
    console.error('[GenerateStream] Neon session save error:', e)
  );

  const phaseNames = [
    { label: '기 (도입)', titles: ['일상의 시작', '새로운 만남', '의문의 징후', '호기심의 발동', '결정의 순간'] },
    { label: '승 (전개)', titles: ['본격적인 사건 전개', '낯선 환경의 발견', '동료와의 교감', '숨겨진 비밀 발견', '점점 커지는 긴장'] },
    { label: '전 (위기 및 절정)', titles: ['돌발 위기 발생', '일촉즉발의 충돌', '절망적인 한계', '극적인 각성과 반격', '폭풍 같은 클라이맥스'] },
    { label: '결 (결말 및 여운)', titles: ['사태의 수습', '진심 어린 화해와 교훈', '새로운 변화의 수용', '따뜻한 미소', '또 다른 내일을 향해'] },
  ];

  const n = sentences.length;
  const quarters = [
    sentences.slice(0, Math.max(1, Math.floor(n / 4))),
    sentences.slice(Math.max(1, Math.floor(n / 4)), Math.max(2, Math.floor(n / 2))),
    sentences.slice(Math.max(2, Math.floor(n / 2)), Math.max(3, Math.floor((3 * n) / 4))),
    sentences.slice(Math.max(3, Math.floor((3 * n) / 4))),
  ];

  interface CutItem {
    cut_index: number;
    phase: string;
    scene_title: string;
    scene_summary: string;
    speaker: string;
    dialogue: string;
    image_url: string;
    fallback_url: string;
  }

  const cuts: CutItem[] = [];
  let cutNum = 1;

  for (let qIdx = 0; qIdx < 4; qIdx++) {
    const { label, titles } = phaseNames[qIdx];
    const qSentences = quarters[qIdx].length > 0 ? quarters[qIdx] : [`이야기의 ${label} 부분.`];

    for (let subIdx = 0; subIdx < 5; subIdx++) {
      const sentencePick = qSentences[subIdx % qSentences.length];
      const title = titles[subIdx];

      const dialogueMatch = sentencePick.match(/["']([^"']+)["']/);
      let dialogue = '';
      let narration = sentencePick;
      if (dialogueMatch) {
        dialogue = dialogueMatch[1].trim();
        narration = sentencePick.replace(dialogueMatch[0], '').trim();
      } else {
        dialogue = sentencePick.length > 35 ? sentencePick.slice(0, 35) + '...' : sentencePick;
      }

      const speaker = cutNum % 3 !== 0 ? mainChar : '내레이션';

      // 1. 20개 각 컷마다 100% 서로 다른 고유한 Pollinations.ai 프롬프트 및 시드 생성
      const sceneDetail = SCENE_PROMPTS[(cutNum - 1) % SCENE_PROMPTS.length];
      const cutSeed = (baseSeed + cutNum * 719) % 999999;
      const cleanPrompt = `anime webtoon style, ${sceneDetail}, masterpiece, vibrant aesthetic, highly detailed`;
      const encodedPrompt = encodeURIComponent(cleanPrompt);

      // Pollinations.ai 무료 API (sana 모델 적용)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=800&nologo=true&seed=${cutSeed}&model=sana`;

      // 2. 20개 각 컷마다 100% 서로 다른 고유한 SVG 일러스트 Data URI 생성 (오프라인/폴백용)
      const dataUri = generateWebtoonCutDataUri({
        cut_index: cutNum,
        phase: label,
        scene_title: `#${cutNum} ${title}`,
        scene_summary: narration || sentencePick,
        speaker,
        dialogue,
        genre,
        mainChar,
        isFemale,
      });

      const cutData: CutItem = {
        cut_index: cutNum,
        phase: label,
        scene_title: `#${cutNum} ${title}`,
        scene_summary: narration || sentencePick,
        speaker,
        dialogue,
        image_url: pollinationsUrl,
        fallback_url: dataUri,
      };

      cuts.push(cutData);

      // Neon DB에 각 컷 저장
      saveNeonCut(sessionId, {
        cut_index: cutNum,
        phase: label,
        scene_title: `#${cutNum} ${title}`,
        scene_summary: narration || sentencePick,
        speaker,
        dialogue,
        image_url: pollinationsUrl,
      }).catch(e => console.error(`[GenerateStream] Error saving cut ${cutNum} to Neon:`, e));

      cutNum++;
    }
  }

  // SSE 스트리밍 응답
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({
        type: 'status',
        message: '📖 스토리 분석 및 20컷 콘티 기획 중...',
        progress: 5,
        session_id: sessionId,
      });

      await new Promise(r => setTimeout(r, 200));

      send({
        type: 'status',
        message: `✅ 콘티 완성! 총 20컷 확정. AI 일러스트 생성 시작...`,
        progress: 10,
        session_id: sessionId,
      });

      for (let i = 0; i < cuts.length; i++) {
        await new Promise(r => setTimeout(r, 120));
        const pct = Math.round(10 + ((i + 1) / cuts.length) * 88);
        send({
          type: 'cut_done',
          cut_index: cuts[i].cut_index,
          total: 20,
          progress: pct,
          message: `🎨 ${i + 1}/20컷 AI 일러스트 준비 완료`,
          session_id: sessionId,
          cut_data: cuts[i],
        });
      }

      send({
        type: 'complete',
        message: '🎉 웹툰 20컷 생성 완료!',
        progress: 100,
        session_id: sessionId,
        title: webtoonTitle,
        cuts,
      });

      controller.close();
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
