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
