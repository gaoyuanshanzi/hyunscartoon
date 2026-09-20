import { NextResponse } from 'next/server';
import { getAllSessions } from '@/lib/neon';

export const dynamic = 'force-dynamic';

/** GET /api/sessions — Neon DB 전체 세션 목록 조회 */
export async function GET() {
  try {
    const sessions = await getAllSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('[/api/sessions] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '세션 목록 조회 실패' },
      { status: 500 }
    );
  }
}
