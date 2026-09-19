import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (username?.trim() === 'admin' && password === '123jesus') {
      const token = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      return NextResponse.json({
        token,
        message: '로그인 성공',
      });
    }

    return NextResponse.json(
      { detail: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 }
    );
  } catch (_e) {
    return NextResponse.json(
      { detail: '요청 처리 중 오류가 발생했습니다.' },
      { status: 400 }
    );
  }
}
