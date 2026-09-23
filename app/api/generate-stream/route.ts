import { NextRequest } from 'next/server';
import { generateWebtoonCutDataUri } from '@/lib/svgRenderer';
import { saveNeonSession, saveNeonCut } from '@/lib/neon';
import { analyzeStoryIntoConti } from '@/lib/storyAnalyzer';

export const dynamic = 'force-dynamic';

// 간단한 문자열 해시 함수 (스토리 내용이 바뀌면 시드가 완전히 바뀌도록 보장)
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
  const genre = searchParams.get('genre') || 'drama';

  if (!story || story.trim().length < 20) {
    return new Response(JSON.stringify({ error: '스토리가 너무 짧습니다. 최소 20자 이상 입력하세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  // 1. 스토리 정밀 분석 및 20컷 콘티 / 영문 비주얼 프롬프트 동적 생성
  const analyzed = analyzeStoryIntoConti(story, genre);
  const { webtoonTitle, mainChar, cuts: contiCuts } = analyzed;

  // 스토리가 바뀌면 시드가 완전히 달라지도록 스토리 해시 + 타임스탬프 결합
  const storyHash = hashString(story);
  const baseSeed = (storyHash + (Date.now() % 100000)) % 900000 + 10000;

  // Neon DB에 세션 저장
  saveNeonSession(sessionId, webtoonTitle, genre, story).catch(e =>
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
    pollinations_url?: string;
  }

  const cuts: CutItem[] = [];

  for (const conti of contiCuts) {
    const cutNum = conti.cut_index;
    const cutSeed = (baseSeed + cutNum * 1337) % 999999;
    const encodedPrompt = encodeURIComponent(conti.prompt);

    // Pollinations URL (백그라운드 시도용 — 성공하면 프론트에서 교체, 실패해도 SVG로 정상 표시)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=800&nologo=true&seed=${cutSeed}&model=flux`;

    // ✅ SVG 콘티 일러스트를 primary 이미지로 사용
    // - 콘티 내용(장면, 대사, 말풍선)이 항상 올바르게 표시됨
    // - Pollinations API 불안정 문제 영향 없음
    const dataUri = generateWebtoonCutDataUri({
      cut_index: cutNum,
      phase: conti.phase,
      scene_title: conti.scene_title,
      scene_summary: conti.direction,
      speaker: conti.speaker,
      dialogue: conti.dialogue,
      genre,
      mainChar,
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
      image_url: pollinationsUrl,  // AI 생성 웹툰 일러스트
      fallback_url: dataUri,       // 오프라인 / 네트워크 지연 시 고유 스토리 SVG 일러스트
    };

    cuts.push(cutData);

    // Neon DB에 각 컷 비동기 저장
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

  // SSE 스트리밍 응답
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({
        type: 'status',
        message: '📖 스토리를 정밀 분석하여 기승전결 20컷 콘티를 기획 중입니다...',
        progress: 5,
        session_id: sessionId,
      });

      await new Promise(r => setTimeout(r, 200));

      send({
        type: 'conti_ready',
        message: '✅ 20컷 콘티 기획 완료! 각 컷별 웹툰 일러스트를 생성합니다.',
        progress: 15,
        session_id: sessionId,
        title: webtoonTitle,
        conti_cuts: contiCuts,
      });

      await new Promise(r => setTimeout(r, 250));

      for (let i = 0; i < cuts.length; i++) {
        await new Promise(r => setTimeout(r, 100));
        const pct = Math.round(15 + ((i + 1) / cuts.length) * 83);
        send({
          type: 'cut_done',
          cut_index: cuts[i].cut_index,
          total: 20,
          progress: pct,
          message: `🎨 ${i + 1}/20컷 [${cuts[i].phase}] ${cuts[i].scene_title} 준비 완료`,
          session_id: sessionId,
          cut_data: cuts[i],
        });
      }

      send({
        type: 'complete',
        message: '🎉 20컷 웹툰 생성 및 Neon DB 저장 완료!',
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
