import { NextRequest, NextResponse } from 'next/server';
import { generateWebtoonCutSvg } from '@/lib/svgRenderer';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session') || '';
  const cutIndex = parseInt(searchParams.get('cut') || '1', 10);
  const phase = searchParams.get('phase') || '기 (도입)';
  const sceneTitle = searchParams.get('title') || `컷 #${cutIndex}`;
  const sceneSummary = searchParams.get('summary') || '';
  const speaker = searchParams.get('speaker') || '주인공';
  const dialogue = searchParams.get('dialogue') || '';
  const genre = searchParams.get('genre') || 'drama';

  // 1. Neon DB에 이미 저장된 컷 이미지가 있는지 확인
  if (sessionId) {
    try {
      const sql = getNeonSql();
      const rows = await sql.query(
        `SELECT image_url FROM webtoon_cuts WHERE session_id = $1 AND cut_index = $2 LIMIT 1`,
        [sessionId, cutIndex]
      );
      if (rows && rows.length > 0 && rows[0].image_url) {
        const storedUrl = rows[0].image_url;
        if (storedUrl.startsWith('data:image/svg+xml;base64,')) {
          const base64Data = storedUrl.replace('data:image/svg+xml;base64,', '');
          const svgBuffer = Buffer.from(base64Data, 'base64');
          return new NextResponse(svgBuffer, {
            headers: {
              'Content-Type': 'image/svg+xml; charset=utf-8',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }
      }
    } catch (e) {
      // DB 조회 실패 시 동적 생성으로 폴백
    }
  }

  // 2. 동적 SVG 웹툰 일러스트 생성
  const svg = generateWebtoonCutSvg({
    cut_index: cutIndex,
    phase,
    scene_title: sceneTitle,
    scene_summary: sceneSummary,
    speaker,
    dialogue,
    genre,
    isFemale: /지아|수아|유진|그녀|소녀/.test(sceneSummary + dialogue),
  });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
