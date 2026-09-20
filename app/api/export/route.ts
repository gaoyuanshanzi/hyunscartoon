import { NextRequest, NextResponse } from 'next/server';
import { saveNeonExportHtml } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, title, html, save_to_neon } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, message: 'session_id가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (save_to_neon) {
      const ok = await saveNeonExportHtml(session_id, html || '');
      if (ok) {
        return NextResponse.json({
          success: true,
          message: 'Neon DB에 웹툰 HTML이 안전하게 저장되었습니다.',
          session_id,
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Neon DB 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '로컬 다운로드가 완료되었습니다.',
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '내보내기 실패' },
      { status: 500 }
    );
  }
}
