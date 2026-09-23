'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Library,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Trash2,
  Download,
  FolderOpen,
  Film,
  AlertTriangle,
  Loader2,
  FileDown,
  CheckCircle,
} from 'lucide-react';
import type { CutData } from './StudioPage';

interface SessionSummary {
  session_id: string;
  title: string;
  genre: string;
  created_at: string;
  cut_count: number;
  has_export: boolean;
}

interface Props {
  onLoadSession: (cuts: CutData[], title: string, sessionId: string) => void;
}

const GENRE_LABELS: Record<string, string> = {
  drama: '드라마',
  romance: '로맨스',
  action: '액션',
  fantasy: '판타지',
  comedy: '코미디',
  thriller: '스릴러',
  horror: '호러',
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yy}.${mm}.${dd} ${hh}:${min}`;
  } catch {
    return dateStr;
  }
}

export default function LibrarySidebar({ onLoadSession }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setError(data.message || '조회 실패');
      }
    } catch (e: any) {
      setError('네트워크 오류: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 불러오기
  const handleLoad = async (sessionId: string) => {
    setLoadingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!data.success || !data.session) {
        showToast('❌ 불러오기 실패: ' + (data.message || ''));
        return;
      }
      const { session } = data;
      const cuts: CutData[] = (session.cuts || []).map((c: any) => ({
        cut_index: c.cut_index,
        scene_title: c.scene_title || '',
        phase: c.phase || '',
        dialogue: c.dialogue || '',
        speaker: c.speaker || '',
        scene_summary: c.scene_summary || '',
        fallback_url: `/api/image?cut=${c.cut_index}&title=${encodeURIComponent(c.scene_title || '')}&summary=${encodeURIComponent(c.scene_summary || '')}&speaker=${encodeURIComponent(c.speaker || '')}&dialogue=${encodeURIComponent(c.dialogue || '')}&genre=${encodeURIComponent(session.genre || 'drama')}&phase=${encodeURIComponent(c.phase || '')}`,
      }));
      onLoadSession(cuts, session.title, sessionId);
      showToast(`✅ "${session.title}" 불러오기 완료!`);
    } catch (e: any) {
      showToast('❌ 오류: ' + (e.message || ''));
    } finally {
      setLoadingId(null);
    }
  };

  // 내보내기 (HTML 다운로드)
  const handleExport = async (sessionId: string, title: string) => {
    setExportingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!data.success || !data.session) {
        showToast('❌ 내보내기 실패: ' + (data.message || ''));
        return;
      }
      const { session } = data;

      // export_html이 이미 저장돼 있으면 그것을 사용, 없으면 컷으로 HTML 빌드
      let html = session.export_html;
      if (!html) {
        html = buildHtmlFromCuts(session.cuts || [], session.title, session.genre);
      }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webtoon_${title.replace(/\s+/g, '_').slice(0, 30)}_${sessionId.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`📥 "${title}" HTML 내보내기 완료!`);
    } catch (e: any) {
      showToast('❌ 오류: ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  // 삭제 확인
  const handleDeleteConfirm = (sessionId: string) => {
    setConfirmDeleteId(sessionId);
  };

  // 실제 삭제
  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        if (expandedId === sessionId) setExpandedId(null);
        showToast('🗑️ 완전 삭제 완료');
      } else {
        showToast('❌ 삭제 실패: ' + (data.message || ''));
      }
    } catch (e: any) {
      showToast('❌ 오류: ' + (e.message || ''));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-60 min-w-[15rem] shrink-0 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0 overflow-hidden border-r border-gray-700">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-gray-100">라이브러리</span>
          {sessions.length > 0 && (
            <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">
              {sessions.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          title="새로고침"
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 섹션 레이블 */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider">
          <FolderOpen className="w-3 h-3" />
          내 웹툰
        </div>
      </div>

      {/* 오류 */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 로딩 */}
      {loading && sessions.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 세션 없음 */}
      {!loading && sessions.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500 leading-relaxed">
              저장된 웹툰이 없습니다.<br />생성 후 자동 저장됩니다.
            </p>
          </div>
        </div>
      )}

      {/* 세션 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {sessions.map((s) => {
          const isExpanded = expandedId === s.session_id;
          const isLoading = loadingId === s.session_id;
          const isDeleting = deletingId === s.session_id;
          const isExporting = exportingId === s.session_id;
          const isConfirmDelete = confirmDeleteId === s.session_id;

          return (
            <div key={s.session_id} className="border-b border-gray-800 last:border-0">
              {/* 세션 헤더 */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.session_id)}
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left group"
              >
                <span className="mt-0.5 shrink-0 text-gray-500 group-hover:text-gray-300 transition-colors">
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Film className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-200 truncate leading-tight">
                      {s.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {formatDate(s.created_at)}
                    </span>
                    <span className="text-[10px] bg-gray-700 text-gray-400 px-1 py-0.5 rounded">
                      {GENRE_LABELS[s.genre] || s.genre}
                    </span>
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1 py-0.5 rounded">
                      {s.cut_count}컷
                    </span>
                    {s.has_export && (
                      <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-1 py-0.5 rounded" title="HTML 저장됨">
                        HTML
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* 펼쳐진 액션 버튼들 */}
              {isExpanded && (
                <div className="bg-gray-800/60 border-t border-gray-700/50 px-3 py-2.5 space-y-1.5">
                  {/* 세션 ID */}
                  <p className="text-[10px] text-gray-600 font-mono truncate pb-1">
                    ID: {s.session_id}
                  </p>

                  {/* 삭제 확인 모달 (인라인) */}
                  {isConfirmDelete ? (
                    <div className="bg-red-950/60 border border-red-800 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-snug">
                          <strong>완전 삭제</strong>하면 복구 불가합니다.<br />정말 삭제하시겠습니까?
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDelete(s.session_id)}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors"
                        >
                          삭제 확인
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 불러오기 */}
                      <button
                        onClick={() => handleLoad(s.session_id)}
                        disabled={isLoading || isDeleting}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {isLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <BookOpen className="w-3.5 h-3.5" />
                        }
                        {isLoading ? '불러오는 중...' : '불러오기'}
                      </button>

                      {/* 내보내기 */}
                      <button
                        onClick={() => handleExport(s.session_id, s.title)}
                        disabled={isExporting || isDeleting}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {isExporting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <FileDown className="w-3.5 h-3.5" />
                        }
                        {isExporting ? '내보내는 중...' : 'HTML 내보내기'}
                      </button>

                      {/* 완전삭제 */}
                      <button
                        onClick={() => handleDeleteConfirm(s.session_id)}
                        disabled={isDeleting || isLoading}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-red-900 disabled:opacity-50 text-gray-300 hover:text-red-300 text-xs font-semibold rounded-lg transition-colors border border-gray-600 hover:border-red-800"
                      >
                        {isDeleting
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                        {isDeleting ? '삭제 중...' : '완전 삭제'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 정보 */}
      <div className="px-4 py-3 border-t border-gray-700 shrink-0">
        <p className="text-[10px] text-gray-600 text-center">
          Neon DB · {sessions.length}개 웹툰 저장됨
        </p>
      </div>

      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-52 bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-xl text-center border border-gray-600 z-50 animate-fade-in">
          {toastMsg}
        </div>
      )}
    </aside>
  );
}

// ── HTML 내보내기 빌더 (저장된 export_html이 없을 때) ──
function buildHtmlFromCuts(cuts: any[], title: string, genre: string): string {
  const cutsHtml = cuts
    .sort((a, b) => a.cut_index - b.cut_index)
    .map(cut => `
      <div style="border-bottom:2px solid #e2e8f0;background:#fff;margin-bottom:8px;">
        <div style="background:#0f172a;min-height:300px;display:flex;justify-content:center;align-items:center;">
          <img src="${cut.image_url}" alt="${cut.scene_title}" loading="lazy"
            style="width:100%;height:auto;max-width:700px;display:block;"
            onerror="this.style.background='#1e293b';this.alt='이미지 로드 실패';"
          />
        </div>
        <div style="padding:12px 16px;border-top:1px solid #f1f5f9;">
          <div style="font-size:11px;color:#4f46e5;font-weight:800;margin-bottom:4px;">${cut.phase} · CUT #${String(cut.cut_index).padStart(2,'0')}</div>
          <strong style="font-size:14px;color:#0f172a;display:block;margin-bottom:4px;">${cut.scene_title}</strong>
          ${cut.dialogue ? `<p style="font-size:13px;color:#475569;margin:0 0 4px;">"${cut.dialogue}" — ${cut.speaker}</p>` : ''}
          ${cut.scene_summary ? `<p style="font-size:12px;color:#94a3b8;margin:0;">${cut.scene_summary}</p>` : ''}
        </div>
      </div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f8fafc; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px; }
  header { text-align: center; padding: 32px 0 24px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
  header h1 { font-size: 26px; font-weight: 900; color: #0f172a; }
  header p { font-size: 13px; color: #94a3b8; margin-top: 8px; }
  footer { text-align: center; padding: 24px 0; color: #94a3b8; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${title}</h1>
    <p>장르: ${genre} · 총 ${cuts.length}컷 · 생성: AI 웹툰 스튜디오</p>
  </header>
  ${cutsHtml}
  <footer>© AI 웹툰 스튜디오 · Neon DB 저장</footer>
</div>
</body>
</html>`;
}
