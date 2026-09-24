import { NextRequest } from 'next/server';
import { generateWebtoonCutDataUri } from '@/lib/svgRenderer';
import { saveNeonSession, saveNeonCut } from '@/lib/neon';
import { analyzeStoryIntoConti } from '@/lib/storyAnalyzer';

export const dynamic = 'force-dynamic';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const story = searchParams.get('story') || '';
  const title = searchParams.get('title') || '';
  const cutsJson = searchParams.get('cuts') || '';
  const genre = searchParams.get('genre') || 'drama';

  let cutsInput: string[] | string = story;
  if (cutsJson) {
    try {
      const parsed = JSON.parse(cutsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cutsInput = parsed;
      }
    } catch {
      // JSON 파싱 실패 시 story 사용
    }
  }

  // 10개 박스 중 최소 하나 이상의 텍스트가 있어야 함
  const hasContent = Array.isArray(cutsInput)
    ? cutsInput.some(c => c && c.trim().length > 0)
    : story.trim().length > 5;

  if (!hasContent) {
    return new Response(JSON.stringify({ error: '스토리를 입력하세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  // 1. 스토리 정밀 분석 및 9컷 콘티 / 영문 비주얼 프롬프트 동적 생성
  const analyzed = analyzeStoryIntoConti(cutsInput, genre, title);
  const { webtoonTitle, mainChar, cuts: contiCuts } = analyzed;

  const combinedContent = Array.isArray(cutsInput) ? cutsInput.join('\n') : story;
  const storyHash = hashString(combinedContent + title);
  const baseSeed = (storyHash + (Date.now() % 100000)) % 900000 + 10000;

  // Neon DB에 세션 비동기 저장
  saveNeonSession(sessionId, webtoonTitle, genre, combinedContent).catch(e =>
    console.error('[GenerateStream] Neon session save error:', e)
  );

  interface CutItem {
    cut_index: number;
    phase: string;
    phase_code?: string;
    scene_title: string;
    scene_summary: string;
    speaker: string;
    dialogue: string;
    camera_angle?: string;
    image_url: string;
    fallback_url: string;
    hasHuman?: boolean;
  }

  const cuts: CutItem[] = [];

  for (const conti of contiCuts) {
    const cutNum = conti.cut_index;
    const cutSeed = (baseSeed + cutNum * 1337) % 999999;
    const encodedPrompt = encodeURIComponent(conti.prompt);

    // Pollinations AI 고품질 생성 URL
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=800&nologo=true&seed=${cutSeed}&model=flux`;

    // SVG 폴백 일러스트 (사람 유무 hasHuman 반영)
    const dataUri = generateWebtoonCutDataUri({
      cut_index: cutNum,
      phase: conti.phase,
      scene_title: conti.scene_title,
      scene_summary: conti.direction,
      speaker: conti.speaker,
      dialogue: conti.dialogue,
      genre,
      mainChar,
      hasHuman: conti.hasHuman,
    });

    const cutData: CutItem = {
      cut_index: cutNum,
      phase: conti.phase,
      phase_code: conti.phase_code,
      scene_title: conti.scene_title,
      scene_summary: conti.direction,
      speaker: conti.speaker,
      dialogue: conti.dialogue,
      camera_angle: conti.camera_angle,
      image_url: pollinationsUrl,
      fallback_url: dataUri,
      hasHuman: conti.hasHuman,
    };

    cuts.push(cutData);

    // Neon DB에 컷 저장
    saveNeonCut(sessionId, {
      cut_index: cutNum,
      phase: conti.phase,
      scene_title: conti.scene_title,
      scene_summary: conti.direction,
      speaker: conti.speaker,
      dialogue: conti.dialogue,
      image_url: pollinationsUrl,
    }).catch(e => console.error(`[GenerateStream] Error saving cut ${cutNum} to Neon:`, e));
  }

  // SSE 스트리밍 응답 (총 9컷)
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({
        type: 'status',
        message: '📖 10개 박스 스토리를 분석하여 9컷 콘티를 구성 중입니다...',
        progress: 10,
        session_id: sessionId,
      });

      await new Promise(r => setTimeout(r, 200));

      // 콘티 완료 알림
      send({
        type: 'conti_ready',
        message: '✅ 9컷 콘티 기획 완료! 각 컷별 AI 웹툰 일러스트를 생성합니다.',
        progress: 20,
        session_id: sessionId,
        title: webtoonTitle,
        conti_cuts: contiCuts,
      });

      await new Promise(r => setTimeout(r, 250));

      // 9컷 순차 스트리밍
      for (let i = 0; i < cuts.length; i++) {
        await new Promise(r => setTimeout(r, 120));
        const pct = Math.round(20 + ((i + 1) / cuts.length) * 78);
        send({
          type: 'cut_done',
          cut_index: cuts[i].cut_index,
          total: 9,
          progress: pct,
          message: `🎨 ${i + 1}/9컷 [${cuts[i].phase}] ${cuts[i].scene_title} 준비 완료`,
          session_id: sessionId,
          cut_data: cuts[i],
        });
      }

      send({
        type: 'complete',
        message: '🎉 9컷 웹툰 생성 및 Neon DB 저장 완료!',
        progress: 100,
        session_id: sessionId,
        title: webtoonTitle,
        cuts,
        conti_cuts: contiCuts,
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
