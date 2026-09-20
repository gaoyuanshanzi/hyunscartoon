import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithCuts, deleteSession } from '@/lib/neon';

export const dynamic = 'force-dynamic';

/** GET /api/sessions/[sessionId] — 세션 + 컷 전체 불러오기 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'sessionId가 없습니다.' }, { status: 400 });
  }
  try {
    const detail = await getSessionWithCuts(sessionId);
    if (!detail) {
      return NextResponse.json({ success: false, message: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, session: detail });
  } catch (error: any) {
    console.error(`[/api/sessions/${sessionId}] GET Error:`, error);
    return NextResponse.json({ success: false, message: error.message || '불러오기 실패' }, { status: 500 });
  }
}

/** DELETE /api/sessions/[sessionId] — 세션 + 컷 완전 삭제 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'sessionId가 없습니다.' }, { status: 400 });
  }
  try {
    const ok = await deleteSession(sessionId);
    if (!ok) {
      return NextResponse.json({ success: false, message: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: '웹툰이 완전 삭제되었습니다.' });
  } catch (error: any) {
    console.error(`[/api/sessions/${sessionId}] DELETE Error:`, error);
    return NextResponse.json({ success: false, message: error.message || '삭제 실패' }, { status: 500 });
  }
}
