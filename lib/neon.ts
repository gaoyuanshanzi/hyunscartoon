import { neon } from '@neondatabase/serverless';

export const NEON_DSN =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_ImMAjuKH5ZD7@ep-holy-shadow-b5417rlb-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export function getNeonSql() {
  return neon(NEON_DSN);
}

let isDbInitialized = false;

export async function initNeonDb() {
  if (isDbInitialized) return;
  try {
    const sql = getNeonSql();
    await sql.query(`
      CREATE TABLE IF NOT EXISTS webtoon_sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        title TEXT,
        genre TEXT,
        story TEXT,
        export_html TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS webtoon_cuts (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        cut_index INTEGER NOT NULL,
        phase TEXT,
        scene_title TEXT,
        dialogue TEXT,
        speaker TEXT,
        scene_summary TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    isDbInitialized = true;
    console.log('[Neon] Tables initialized successfully');
  } catch (err) {
    console.error('[Neon] Failed to initialize tables:', err);
  }
}

export async function saveNeonSession(
  sessionId: string,
  title: string,
  genre: string,
  story: string
) {
  try {
    await initNeonDb();
    const sql = getNeonSql();
    await sql.query(
      `
      INSERT INTO webtoon_sessions (session_id, title, genre, story)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (session_id) DO UPDATE
        SET title = EXCLUDED.title,
            genre = EXCLUDED.genre,
            story = EXCLUDED.story;
    `,
      [sessionId, title, genre, story]
    );
  } catch (err) {
    console.error('[Neon] Error saving session:', err);
  }
}

export async function saveNeonCut(sessionId: string, cut: {
  cut_index: number;
  phase?: string;
  scene_title?: string;
  dialogue?: string;
  speaker?: string;
  scene_summary?: string;
  image_url?: string;
}) {
  try {
    await initNeonDb();
    const sql = getNeonSql();
    await sql.query(
      `
      INSERT INTO webtoon_cuts 
        (session_id, cut_index, phase, scene_title, dialogue, speaker, scene_summary, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        sessionId,
        cut.cut_index,
        cut.phase || '',
        cut.scene_title || '',
        cut.dialogue || '',
        cut.speaker || '',
        cut.scene_summary || '',
        cut.image_url || '',
      ]
    );
  } catch (err) {
    console.error(`[Neon] Error saving cut ${cut.cut_index}:`, err);
  }
}

export async function saveNeonExportHtml(sessionId: string, html: string): Promise<boolean> {
  try {
    await initNeonDb();
    const sql = getNeonSql();
    await sql.query(
      `
      UPDATE webtoon_sessions
      SET export_html = $1
      WHERE session_id = $2
    `,
      [html, sessionId]
    );
    return true;
  } catch (err) {
    console.error('[Neon] Error saving export html:', err);
    return false;
  }
}

// ──────────────────────────────────────────────
// 라이브러리 사이드바용 함수들
// ──────────────────────────────────────────────

export interface SessionSummary {
  session_id: string;
  title: string;
  genre: string;
  story: string;
  created_at: string;
  cut_count: number;
  has_export: boolean;
}

export interface SessionDetail extends SessionSummary {
  export_html: string | null;
  cuts: CutDetail[];
}

export interface CutDetail {
  cut_index: number;
  phase: string;
  scene_title: string;
  dialogue: string;
  speaker: string;
  scene_summary: string;
  image_url: string;
}

/** 전체 세션 목록 조회 (컷 수 포함) */
export async function getAllSessions(): Promise<SessionSummary[]> {
  await initNeonDb();
  const sql = getNeonSql();
  const rows = await sql.query(`
    SELECT
      s.session_id,
      s.title,
      s.genre,
      s.story,
      s.created_at,
      s.export_html IS NOT NULL AND s.export_html != '' AS has_export,
      COUNT(c.id)::int AS cut_count
    FROM webtoon_sessions s
    LEFT JOIN webtoon_cuts c ON c.session_id = s.session_id
    GROUP BY s.session_id, s.title, s.genre, s.story, s.created_at, s.export_html
    ORDER BY s.created_at DESC
    LIMIT 100
  `);
  return (rows as any[]).map((r: any) => ({
    session_id: r.session_id,
    title: r.title || '(제목 없음)',
    genre: r.genre || 'drama',
    story: r.story || '',
    created_at: r.created_at,
    cut_count: Number(r.cut_count) || 0,
    has_export: r.has_export === true || r.has_export === 't',
  }));
}

/** 특정 세션 + 컷 전체 조회 */
export async function getSessionWithCuts(sessionId: string): Promise<SessionDetail | null> {
  await initNeonDb();
  const sql = getNeonSql();
  const sessRows = await sql.query(
    `SELECT * FROM webtoon_sessions WHERE session_id = $1 LIMIT 1`,
    [sessionId]
  );
  if (!sessRows || (sessRows as any[]).length === 0) return null;
  const s = (sessRows as any[])[0];

  const cutRows = await sql.query(
    `SELECT * FROM webtoon_cuts WHERE session_id = $1 ORDER BY cut_index ASC`,
    [sessionId]
  );

  return {
    session_id: s.session_id,
    title: s.title || '(제목 없음)',
    genre: s.genre || 'drama',
    story: s.story || '',
    created_at: s.created_at,
    cut_count: (cutRows as any[]).length,
    has_export: !!(s.export_html),
    export_html: s.export_html || null,
    cuts: (cutRows as any[]).map((c: any) => ({
      cut_index: c.cut_index,
      phase: c.phase || '',
      scene_title: c.scene_title || '',
      dialogue: c.dialogue || '',
      speaker: c.speaker || '',
      scene_summary: c.scene_summary || '',
      image_url: c.image_url || '',
    })),
  };
}

/** 세션 + 관련 컷 완전 삭제 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await initNeonDb();
    const sql = getNeonSql();
    await sql.query(`DELETE FROM webtoon_cuts WHERE session_id = $1`, [sessionId]);
    await sql.query(`DELETE FROM webtoon_sessions WHERE session_id = $1`, [sessionId]);
    return true;
  } catch (err) {
    console.error('[Neon] Error deleting session:', err);
    return false;
  }
}

