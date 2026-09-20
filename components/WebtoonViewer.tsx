'use client';

import { useState } from 'react';
import { ChevronLeft, Download, ZoomIn, ZoomOut, MessageSquare, MessageSquareOff, Share2, Check, Cloud, HardDrive, X, Loader2 } from 'lucide-react';
import type { CutData } from './StudioPage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Props {
  cuts: CutData[];
  title: string;
  sessionId?: string;
  onBack: () => void;
}

export default function WebtoonViewer({ cuts, title, sessionId, onBack }: Props) {
  const [zoom, setZoom] = useState(100);
  const [showBubble, setShowBubble] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saveLocal, setSaveLocal] = useState(true);
  const [saveNeon, setSaveNeon] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const sortedCuts = [...cuts].sort((a, b) => a.cut_index - b.cut_index);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_BASE}${url}`;
  };

  const handleImageError = (cutIndex: number) => {
    console.warn(`[WebtoonViewer] Cut #${cutIndex} image error, switching to scene fallback`);
    setFailedImages(prev => ({ ...prev, [cutIndex]: true }));
  };

  const handleImageLoad = (cutIndex: number) => {
    setLoadedImages(prev => ({ ...prev, [cutIndex]: true }));
  };

  const handleDownloadSingle = async (cut: CutData) => {
    const isFailed = failedImages[cut.cut_index];
    const targetUrl = isFailed && cut.fallback_url ? cut.fallback_url : cut.image_url;
    const fullUrl = getFullUrl(targetUrl);
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `webtoon_cut_${cut.cut_index.toString().padStart(2, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const buildExportHtml = () => {
    const cutsHtml = sortedCuts
      .map(cut => {
        const fullImg = getFullUrl(cut.image_url);
        const fallbackImg = cut.fallback_url ? getFullUrl(cut.fallback_url) : '';

        return `
        <div style="border-bottom: 2px solid #e2e8f0; background: #ffffff; position: relative; margin-bottom: 8px;">
          <div style="position: relative; background: #0f172a; min-height: 400px; display: flex; justify-content: center; align-items: center;">
            <img 
              src="${fullImg}" 
              alt="${cut.scene_title}" 
              loading="lazy" 
              style="width: 100%; height: auto; display: block; max-width: 800px;" 
              ${fallbackImg ? `onerror="if (!this.dataset.retried) { this.dataset.retried = '1'; this.src = '${fallbackImg}'; }"` : ''}
            />
          </div>
          <div style="padding: 16px 20px; background: #ffffff; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${cut.phase || ''} · CUT #${String(cut.cut_index).padStart(2, '0')}
              </div>
              <strong style="font-size: 15px; color: #0f172a; display: block; margin-bottom: 4px;">
                ${cut.scene_title || ''}
              </strong>
              <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
                ${cut.scene_summary || ''}
              </p>
            </div>
            ${
              cut.dialogue
                ? `
            <div style="flex-shrink: 0; background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 10px 16px; border-radius: 12px; max-width: 280px;">
              <span style="font-size: 11px; font-weight: 700; color: #4f46e5; display: block; margin-bottom: 2px;">💬 ${cut.speaker || '주인공'}</span>
              <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; line-height: 1.4;">"${cut.dialogue}"</p>
            </div>`
                : ''
            }
          </div>
        </div>`;
      })
      .join('');

    const now = new Date().toLocaleString('ko-KR');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || '웹툰'} – Hyun's Cartoon Studio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif; background: #f8fafc; color: #0f172a; }
    .container { max-width: 820px; margin: 0 auto; background: #ffffff; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); color: #ffffff; text-align: center; padding: 48px 24px; }
    .header small { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
    .header h1 { font-size: 26px; font-weight: 900; margin: 8px 0 6px; letter-spacing: -0.5px; }
    .header p { font-size: 13px; color: #cbd5e1; }
    .footer { background: #0f172a; color: #ffffff; text-align: center; padding: 40px 24px; }
    .footer h3 { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .footer p { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <small>AI 자동 생성 웹툰</small>
      <h1>${title || '웹툰'}</h1>
      <p>총 ${sortedCuts.length}컷 · Korean Manhwa Webtoon · ${now}</p>
    </div>
    ${cutsHtml}
    <div class="footer">
      <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
      <h3>— 끝 (FIN) —</h3>
      <p>Hyun's Cartoon Studio · Powered by Pollinations AI &amp; Neon PostgreSQL</p>
    </div>
  </div>
</body>
</html>`;
  };

  const handleExportConfirm = async () => {
    if (!saveLocal && !saveNeon) {
      alert('저장 방식을 하나 이상 선택해 주세요.');
      return;
    }

    setExporting(true);
    setExportStatus('내보내기 준비 중...');

    const htmlContent = buildExportHtml();
    const messages: string[] = [];

    // 1. 로컬 다운로드
    if (saveLocal) {
      try {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (title || 'webtoon').replace(/[^가-힣a-zA-Z0-9]/g, '_');
        a.download = `${safeTitle}_20cuts.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        messages.push('💾 HTML 파일 다운로드 완료');
      } catch (err: any) {
        messages.push('💾 로컬 다운로드 오류: ' + err.message);
      }
    }

    // 2. Neon DB 저장
    if (saveNeon) {
      try {
        setExportStatus('Neon DB에 저장 중...');
        const res = await fetch(`${API_BASE}/api/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId || 'session_' + Date.now(),
            title: title || '웹툰',
            html: htmlContent,
            save_to_neon: true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          messages.push('☁️ Neon PostgreSQL DB 저장 성공');
        } else {
          messages.push('☁️ Neon 저장 실패: ' + data.message);
        }
      } catch (err: any) {
        messages.push('☁️ Neon 통신 오류: ' + err.message);
      }
    }

    setExportStatus(messages.join('  |  '));
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      {/* 뷰어 상단 바 */}
      <div className="flex items-center justify-between fade-in-up bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl transition-all font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            스튜디오
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title || '웹툰 감상'}</h2>
            <p className="text-xs text-gray-400">{sortedCuts.length}컷 · 세로 스크롤 뷰어</p>
          </div>
        </div>

        {/* 뷰어 컨트롤 */}
        <div className="flex items-center gap-2">
          {/* 내보내기 버튼 */}
          <button
            onClick={() => {
              setExportStatus('');
              setShowExportModal(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            📥 내보내기 (Export)
          </button>

          {/* 말풍선 토글 */}
          <button
            onClick={() => setShowBubble(!showBubble)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border transition-all font-medium ${
              showBubble
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {showBubble ? <MessageSquare className="w-3.5 h-3.5" /> : <MessageSquareOff className="w-3.5 h-3.5" />}
            {showBubble ? '말풍선 ON' : '원본'}
          </button>

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5">
            <button
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <span className="text-xs text-gray-700 font-semibold w-9 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* 웹툰 세로 스크롤 뷰어 본체 */}
      <div className="flex justify-center">
        <div
          className="webtoon-viewer rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white"
          style={{ width: `${zoom}%`, maxWidth: '800px', minWidth: '320px' }}
        >
          {/* 웹툰 제목 배너 */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white text-center py-8 px-4">
            <div className="text-xs text-indigo-300 font-mono tracking-widest uppercase mb-1">
              AI 자동 생성 웹툰 · 20컷 연속 일러스트
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title || '웹툰'}</h1>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-300">
              <span className="bg-white/10 px-2.5 py-1 rounded-full">총 {sortedCuts.length}컷</span>
              <span>·</span>
              <span>AI 일러스트 + 한글 말풍선</span>
              {sessionId && (
                <>
                  <span>·</span>
                  <span className="font-mono text-gray-400">ID: {sessionId.slice(0, 14)}</span>
                </>
              )}
            </div>
          </div>

          {/* 컷 목록 */}
          <div className="bg-white divide-y-2 divide-gray-100">
            {sortedCuts.map(cut => {
              const isFailed = failedImages[cut.cut_index];
              const isLoaded = loadedImages[cut.cut_index];
              const displayUrl = isFailed && cut.fallback_url ? getFullUrl(cut.fallback_url) : getFullUrl(cut.image_url);

              return (
                <div key={cut.cut_index} className="webtoon-panel group relative bg-white">
                  {/* 구간 레이블 */}
                  {[1, 6, 11, 16].includes(cut.cut_index) && (
                    <div className="bg-gradient-to-r from-gray-950 via-indigo-950 to-gray-950 text-white text-center py-2.5 px-4 text-xs font-bold tracking-widest border-b border-indigo-900/50">
                      {cut.phase?.toUpperCase() || `CHAPTER ${Math.ceil(cut.cut_index / 5)}`}
                    </div>
                  )}

                  {/* 컷 이미지 영역 */}
                  <div className="relative overflow-hidden bg-slate-900 flex items-center justify-center min-h-[420px]">
                    {/* 로딩 스피너 (이미지 로드 전 표시) */}
                    {!isLoaded && !isFailed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 text-white gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="text-xs text-gray-300">컷 #{cut.cut_index} AI 일러스트 생성/로딩 중...</span>
                      </div>
                    )}

                    <img
                      src={displayUrl}
                      alt={cut.scene_title}
                      className={`w-full h-auto block transition-opacity duration-300 ${isLoaded || isFailed ? 'opacity-100' : 'opacity-30'}`}
                      loading="lazy"
                      onLoad={() => handleImageLoad(cut.cut_index)}
                      onError={() => handleImageError(cut.cut_index)}
                    />

                    {/* 개별 컷 다운로드 버튼 */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={() => handleDownloadSingle(cut)}
                        className="bg-black/70 hover:bg-black text-white p-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-medium"
                        title="이 컷 다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                        저장
                      </button>
                    </div>
                  </div>

                  {/* 하단 장면 정보 바 */}
                  <div className="bg-white px-5 py-3.5 border-t border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            #{String(cut.cut_index).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-bold text-gray-800 truncate">{cut.scene_title}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{cut.scene_summary}</p>
                      </div>

                      {cut.dialogue && showBubble && (
                        <div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 max-w-[240px]">
                          <p className="text-[11px] font-bold text-indigo-600 mb-0.5">💬 {cut.speaker}</p>
                          <p className="text-xs font-medium text-slate-800 line-clamp-2">"{cut.dialogue}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 웹툰 종료 배너 */}
          <div className="bg-gray-900 text-white text-center py-10 px-4 space-y-4">
            <div className="text-3xl">🎉</div>
            <h3 className="text-lg font-bold">— 끝 (FIN) —</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              20컷 웹툰이 모두 완성되었습니다. 상단 또는 아래 버튼으로 HTML 파일 및 Neon DB에 안전하게 내보내세요.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setExportStatus('');
                  setShowExportModal(true);
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all text-sm"
              >
                <Share2 className="w-4 h-4" />
                📥 20컷 웹툰 전체 내보내기 (Export)
              </button>
            </div>
            <p className="text-[11px] text-gray-500 pt-3">Hyun&apos;s Cartoon Studio · Neon.tech Database</p>
          </div>
        </div>
      </div>

      {/* 내보내기 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  웹툰 내보내기 (Export)
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">20컷 일러스트와 말풍선을 저장합니다</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 cursor-pointer transition-all bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={saveLocal}
                    onChange={e => setSaveLocal(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      로컬 HTML 다운로드
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      모든 20컷 일러스트가 포함된 독립형 웹툰 HTML 파일(.html)로 내 컴퓨터에 다운로드합니다.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 cursor-pointer transition-all bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={saveNeon}
                    onChange={e => setSaveNeon(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      Neon PostgreSQL DB 저장
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      사용자의 Neon 클라우드 데이터베이스(webtoon_sessions)에 영구 저장합니다.
                    </p>
                  </div>
                </label>
              </div>

              {exportStatus && (
                <div
                  className={`text-xs px-3.5 py-2.5 rounded-xl border font-medium ${
                    exportStatus.includes('성공') || exportStatus.includes('완료')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {exportStatus}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-xl text-sm transition-all"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleExportConfirm}
                  disabled={exporting || (!saveLocal && !saveNeon)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {exporting ? '처리 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
