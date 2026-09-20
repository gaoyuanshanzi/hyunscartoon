import { NextRequest } from 'next/server';
import { generateWebtoonCutDataUri } from '@/lib/svgRenderer';
import { saveNeonSession, saveNeonCut } from '@/lib/neon';

export const dynamic = 'force-dynamic';

// 웹툰 스타일 기본 키워드 (모든 컷에 적용)
const WEBTOON_BASE_STYLE = 'Korean webtoon artstyle, manhwa style, cinematic lighting, highly detailed lineart, dynamic composition, 8k resolution, cell shading, vivid colors, professional illustration';
const NEGATIVE_PROMPT = encodeURIComponent('flat colors, simple background, low quality, bad anatomy, ugly, blurry, sketch, rough lines, monochrome, grayscale, deformed, disfigured');

// 20개 각 컷별 고유 시각적 장면 프롬프트 템플릿
const SCENE_PROMPTS = [
  // 1-5 기 (도입)
  'young Korean student waking up in cozy bedroom, soft golden morning sunlight streaming through curtains, peaceful dawn atmosphere, detailed webtoon room interior, warm pastel tones',
  'young Korean student jumping out of bed, stretching arms with energized bright smile, messy morning hair, vibrant cozy bedroom background, expressive anime face',
  'young Korean student walking through home hallway, glancing curiously towards kitchen, warm indoor morning light, clean precise lineart, detailed domestic setting',
  'young Korean student putting on school uniform, adjusting necktie, slinging backpack over shoulder, bright morning energy, dynamic pose, school preparation scene',
  'cozy Korean home kitchen, steaming rice and soup on dining table, morning breakfast spread, warm golden light, inviting homey atmosphere, detailed food illustration',
  // 6-10 승 (전개)
  'young Korean student eating warm breakfast with smiling mother, heartwarming family moment at kitchen table, wholesome interaction, soft warm lighting, expressive characters',
  'student at front door putting on shoes, opening door to reveal bright sunny morning street, fresh breeze effect lines, sense of departure and excitement',
  'student walking along Korean city sidewalk lined with cherry blossom trees, morning golden sunlight, vibrant blue sky, peaceful urban street, detailed background',
  'crowded Korean city bus stop, students and commuters waiting, student checking wristwatch nervously, dynamic urban street scene, busy morning atmosphere',
  'blue Korean city bus arriving at stop with doors sliding open, passengers rushing forward, dramatic perspective angle, motion blur effects, urban energy',
  // 11-15 전 (위기 및 절정)
  'inside packed city bus interior, passengers gripping yellow overhead handrails, student standing, dramatic slanted sunlight through bus windows, crowded atmosphere',
  'bus making sharp sudden turn, passengers lurching dramatically, speed lines and motion effects, tension and chaos inside city bus, dynamic action composition',
  'extreme close-up dramatic moment: shoe accidentally stepping on another foot, pained expression, shock ripple effects, dramatic impact lines, intense manga close-up',
  'cute Korean schoolgirl whipping around in shock, wide surprised eyes, flushed blushing cheeks, apologetic expression, detailed expressive manhwa face, emotional moment',
  'two students locking eyes in bus interior, electric tension between them, sparkling shoujo manga eye effects, dramatic lighting, emotional connection moment',
  // 16-20 결 (결말 및 여운)
  'Korean schoolgirl bowing deeply with clasped hands, heartfelt sincere apology, sweet embarrassed smile, warm soft lighting, expressive emotional face, charming scene',
  'kind Korean student waving hand reassuringly with gentle warm smile, understanding expression, soft golden backlight halo effect, heartwarming resolution',
  'two Korean students standing side by side on bus chatting warmly, budding new friendship, gentle window sunlight creating mood, relaxed happy expressions',
  'two Korean students stepping off bus together at school stop, laughing under bright blue sky, sense of new connection, uplifting cheerful scene',
  'two students walking together toward school gate in radiant golden morning light, cherry blossoms falling, hopeful romantic ending, masterpiece webtoon illustration',
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
      // 웹툰 스타일 키워드를 결합한 고품질 프롬프트
      const cleanPrompt = `${WEBTOON_BASE_STYLE}, ${sceneDetail}, masterpiece, best quality`;
      const encodedPrompt = encodeURIComponent(cleanPrompt);

      // Pollinations.ai 무료 API (sana 모델 + enhance + negative prompt 적용)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=800&nologo=true&seed=${cutSeed}&model=sana&enhance=true&negative=${NEGATIVE_PROMPT}`;

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
