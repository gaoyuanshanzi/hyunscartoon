import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const story = searchParams.get('story') || '';
  const genre = searchParams.get('genre') || 'drama';

  if (!story || story.trim().length < 20) {
    return new Response(JSON.stringify({ error: '스토리가 너무 짧습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
  const anchorToken = isFemale
    ? '1girl, pretty modern korean webtoon heroine, long brown hair with bangs, amber eyes, stylish casual clothes'
    : '1boy, handsome modern korean webtoon protagonist, messy black hair, dark brown eyes, navy hoodie';

  const seed = Math.floor(10000 + Math.random() * 90000);

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

  const genreKeywords: Record<string, string> = {
    drama: 'modern korean webtoon style, slice of life, expressive character, soft daylight, clean line art',
    fantasy: 'fantasy manhwa style, magical glow, dynamic lighting, ornate atmosphere, highly detailed',
    romance: 'romance webtoon style, warm pastel lighting, sparkling eyes, emotional atmosphere, manhwa panel',
    thriller: 'dark thriller manhwa style, intense shadows, cinematic dramatic lighting, suspenseful angle',
    action: 'shonen manhwa action scene, dynamic perspective, motion blur effect, intense aura',
  };
  const genreStyle = genreKeywords[genre.toLowerCase()] || genreKeywords.drama;

  interface CutItem {
    cut_index: number;
    phase: string;
    scene_title: string;
    scene_summary: string;
    speaker: string;
    dialogue: string;
    image_url: string;
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

      const safePrompt = encodeURIComponent(
        `${anchorToken}, ${genreStyle}, cut ${cutNum} of 20, manhwa comic panel, highly detailed, vibrant colors, clean lines`
      );
      const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=768&height=1024&model=flux&nologo=true&seed=${seed}`;

      cuts.push({
        cut_index: cutNum,
        phase: label,
        scene_title: `#${cutNum} ${title}`,
        scene_summary: narration || sentencePick,
        speaker: cutNum % 3 !== 0 ? mainChar : '내레이션',
        dialogue,
        image_url: imageUrl,
      });

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
      });

      await new Promise(r => setTimeout(r, 400));

      send({
        type: 'status',
        message: `✅ 콘티 완성! 총 20컷 확정. 이미지 생성 시작...`,
        progress: 10,
      });

      // 20컷을 순차적으로 전달 (실시간 시각 효과)
      for (let i = 0; i < cuts.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        const pct = Math.round(10 + ((i + 1) / cuts.length) * 85);
        send({
          type: 'cut_done',
          cut_index: cuts[i].cut_index,
          total: 20,
          progress: pct,
          message: `🎨 ${i + 1}/20컷 준비 완료`,
          cut_data: cuts[i],
        });
      }

      send({
        type: 'complete',
        message: '🎉 웹툰 20컷 생성 완료!',
        progress: 100,
        title: `웹툰: ${mainChar}의 이야기`,
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
