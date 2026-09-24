'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Download,
  ZoomIn,
  ZoomOut,
  Share2,
  Check,
  Cloud,
  HardDrive,
  X,
  Loader2,
  Plus,
  Move,
  Trash2,
  FileCode,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react';
import type { CutData } from './StudioPage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface SpeechBubble {
  id: string;
  cutIndex: number;
  text: string;
  speaker: string;
  x: number; // 0 ~ 85%
  y: number; // 0 ~ 85%
}

interface Props {
  cuts: CutData[];
  title: string;
  sessionId?: string;
  onBack: () => void;
}

export default function WebtoonViewer({ cuts, title, sessionId, onBack }: Props) {
  const [zoom, setZoom] = useState(100);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saveHtml, setSaveHtml] = useState(true);
  const [savePng, setSavePng] = useState(true);
  const [saveNeon, setSaveNeon] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  // 요구사항 5: 생성 초기에는 말풍선이 없음 (빈 상태) -> 사용자가 수동으로 +버튼으로 추가
  const [bubbles, setBubbles] = useState<Record<number, SpeechBubble[]>>({});

  // 드래그 중인 말풍선 상태
  const [draggingBubble, setDraggingBubble] = useState<{
    cutIndex: number;
    bubbleId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 세션 또는 컷이 변경되면 상태 초기화
  useEffect(() => {
    setLoadedImages({});
    setFailedImages({});
    setBubbles({});
  }, [sessionId, cuts]);

  const sortedCuts = [...cuts].sort((a, b) => a.cut_index - b.cut_index);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_BASE}${url}`;
  };

  const handleImageError = (cutIndex: number) => {
    console.warn(`[WebtoonViewer] Cut #${cutIndex} image error, switching to fallback`);
    setFailedImages(prev => ({ ...prev, [cutIndex]: true }));
  };

  const handleImageLoad = (cutIndex: number) => {
    setLoadedImages(prev => ({ ...prev, [cutIndex]: true }));
  };

  // 말풍선 추가 (요구사항 5)
  const handleAddBubble = (cut: CutData) => {
    const newBubble: SpeechBubble = {
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      cutIndex: cut.cut_index,
      text: cut.dialogue || '대사를 입력하세요',
      speaker: cut.speaker || '인물',
      x: 25,
      y: 60,
    };

    setBubbles(prev => ({
      ...prev,
      [cut.cut_index]: [...(prev[cut.cut_index] || []), newBubble],
    }));
  };

  // 말풍선 삭제
  const handleDeleteBubble = (cutIndex: number, bubbleId: string) => {
    setBubbles(prev => ({
      ...prev,
      [cutIndex]: (prev[cutIndex] || []).filter(b => b.id !== bubbleId),
    }));
  };

  // 말풍선 텍스트 변경
  const handleUpdateBubbleText = (cutIndex: number, bubbleId: string, text: string) => {
    setBubbles(prev => ({
      ...prev,
      [cutIndex]: (prev[cutIndex] || []).map(b => (b.id === bubbleId ? { ...b, text } : b)),
    }));
  };

  // 말풍선 화자 변경
  const handleUpdateBubbleSpeaker = (cutIndex: number, bubbleId: string, speaker: string) => {
    setBubbles(prev => ({
      ...prev,
      [cutIndex]: (prev[cutIndex] || []).map(b => (b.id === bubbleId ? { ...b, speaker } : b)),
    }));
  };

  // 드래그 시작
  const handleMouseDown = (
    e: React.MouseEvent,
    cutIndex: number,
    bubble: SpeechBubble
  ) => {
    e.stopPropagation();
    const container = containerRefs.current[cutIndex];
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setDraggingBubble({
      cutIndex,
      bubbleId: bubble.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: bubble.x,
      initialY: bubble.y,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  };

  // 드래그 이동
  useEffect(() => {
    if (!draggingBubble) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingBubble.startX;
      const deltaY = e.clientY - draggingBubble.startY;

      const percentX = (deltaX / draggingBubble.containerWidth) * 100;
      const percentY = (deltaY / draggingBubble.containerHeight) * 100;

      const newX = Math.max(2, Math.min(75, draggingBubble.initialX + percentX));
      const newY = Math.max(2, Math.min(80, draggingBubble.initialY + percentY));

      setBubbles(prev => ({
        ...prev,
        [draggingBubble.cutIndex]: (prev[draggingBubble.cutIndex] || []).map(b =>
          b.id === draggingBubble.bubbleId ? { ...b, x: Math.round(newX), y: Math.round(newY) } : b
        ),
      }));
    };

    const handleMouseUp = () => {
      setDraggingBubble(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBubble]);

  // 개별 컷 PNG 렌더링 및 다운로드 (Canvas 합성)
  const renderCutToCanvas = async (cut: CutData): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isFailed = failedImages[cut.cut_index];
      const targetUrl = isFailed && cut.fallback_url ? cut.fallback_url : cut.image_url;
      const fullUrl = getFullUrl(targetUrl);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 1066;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context error');

        // 1. 배경 이미지 그리기
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. 상단 뱃지 그리기
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(24, 24, 110, 42, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Pretendard, sans-serif';
        ctx.fillText(`#${String(cut.cut_index).padStart(2, '0')} CUT`, 42, 51);

        // 3. 사용자가 수동 배치한 말풍선들 그리기
        const cutBubbles = bubbles[cut.cut_index] || [];
        for (const b of cutBubbles) {
          const bx = (b.x / 100) * canvas.width;
          const by = (b.y / 100) * canvas.height;
          const bw = Math.min(420, canvas.width * 0.7);
          const bh = 130;

          // 말풍선 그림자
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 8;

          // 말풍선 배경
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 20);
          ctx.fill();
          ctx.stroke();

          // 말꼬리
          ctx.beginPath();
          ctx.moveTo(bx + 40, by + bh);
          ctx.lineTo(bx + 65, by + bh + 24);
          ctx.lineTo(bx + 85, by + bh);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // 화자 뱃지
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 15px Pretendard, sans-serif';
          ctx.fillText(`💬 ${b.speaker || '인물'}`, bx + 20, by + 34);

          // 대사 텍스트
          ctx.fillStyle = '#09090b';
          ctx.font = 'bold 18px Pretendard, sans-serif';

          // 긴 텍스트 줄바꿈
          const words = b.text || '';
          const line1 = words.slice(0, 18);
          const line2 = words.slice(18, 36);
          const line3 = words.length > 36 ? words.slice(36, 52) + '...' : '';

          ctx.fillText(`"${line1}"`, bx + 20, by + 68);
          if (line2) ctx.fillText(line2, bx + 24, by + 94);
          if (line3) ctx.fillText(line3, bx + 24, by + 118);
        }

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        // 이미지 로드 실패 시에도 폴백 처리
        resolve('');
      };

      img.src = fullUrl;
    });
  };

  // 단일 컷 PNG 다운로드
  const handleDownloadSingle = async (cut: CutData) => {
    try {
      const dataUrl = await renderCutToCanvas(cut);
      if (!dataUrl) {
        alert('이미지를 다운로드할 수 없습니다.');
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `webtoon_cut_${cut.cut_index.toString().padStart(2, '0')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert('PNG 생성 중 오류: ' + e.message);
    }
  };

  // HTML 내보내기 문서 빌드 (사용자 수동 말풍선 완벽 반영)
  const buildExportHtml = () => {
    const cutsHtml = sortedCuts
      .map(cut => {
        const fullImg = getFullUrl(cut.image_url);
        const fallbackImg = cut.fallback_url ? getFullUrl(cut.fallback_url) : '';
        const cutBubbles = bubbles[cut.cut_index] || [];

        const bubblesHtml = cutBubbles
          .map(
            b => `
          <div style="position: absolute; left: ${b.x}%; top: ${b.y}%; max-width: 78%; z-index: 10;">
            <div style="background: rgba(255,255,255,0.96); border: 2.5px solid #0f172a; border-radius: 16px; padding: 12px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); position: relative;">
              <div style="display: inline-block; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 12px; margin-bottom: 6px; border: 1px solid #c7d2fe;">
                💬 ${b.speaker || '인물'}
              </div>
              <p style="font-size: 15px; font-weight: 700; color: #09090b; margin: 0; line-height: 1.4;">
                &ldquo;${b.text}&rdquo;
              </p>
            </div>
          </div>`
          )
          .join('');

        return `
        <div style="border-bottom: 2px solid #e2e8f0; background: #ffffff; position: relative; margin-bottom: 12px; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div style="position: relative; background: #0f172a; min-height: 400px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
            <img 
              src="${fullImg}" 
              alt="${cut.scene_title}" 
              loading="lazy" 
              style="width: 100%; height: auto; display: block; max-width: 800px;" 
              ${fallbackImg ? `onerror="if (!this.dataset.retried) { this.dataset.retried = '1'; this.src = '${fallbackImg}'; }"` : ''}
            />
            <div style="position: absolute; top: 14px; left: 14px; display: flex; gap: 6px; z-index: 10;">
              <span style="background: rgba(0,0,0,0.85); color: #ffffff; font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                #${String(cut.cut_index).padStart(2, '0')}
              </span>
              <span style="background: #4f46e5; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px;">
                ${cut.phase || ''}
              </span>
            </div>
            ${bubblesHtml}
          </div>
          <div style="padding: 16px 20px; background: #ffffff; border-top: 1px solid #f1f5f9;">
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
      <small>AI 9컷 웹툰 스튜디오</small>
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

  // 내보내기 실행 (HTML / PNG / Neon DB)
  const handleExportConfirm = async () => {
    if (!saveHtml && !savePng && !saveNeon) {
      alert('내보내기 형식을 하나 이상 선택해 주세요.');
      return;
    }

    setExporting(true);
    setExportStatus('내보내기 준비 중...');
    const messages: string[] = [];
    const safeTitle = (title || 'webtoon').replace(/[^가-힣a-zA-Z0-9]/g, '_');

    // 1. HTML 다운로드
    if (saveHtml) {
      try {
        setExportStatus('HTML 웹툰 파일 생성 중...');
        const htmlContent = buildExportHtml();
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}_9cuts.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        messages.push('💾 HTML 웹툰 파일 다운로드 완료');
      } catch (err: any) {
        messages.push('💾 HTML 다운로드 오류: ' + err.message);
      }
    }

    // 2. PNG 이미지 다운로드 (요구사항 6: 말풍선 합성 PNG 파일 다운로드)
    if (savePng) {
      try {
        setExportStatus('PNG 이미지들 합성 및 렌더링 중...');
        let downloadedCount = 0;
        for (const cut of sortedCuts) {
          const pngUrl = await renderCutToCanvas(cut);
          if (pngUrl) {
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${safeTitle}_cut_${String(cut.cut_index).padStart(2, '0')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            downloadedCount++;
            await new Promise(r => setTimeout(r, 200)); // 브라우저 다운로드 인터벌
          }
        }
        messages.push(`🖼️ PNG 이미지 ${downloadedCount}장 다운로드 완료`);
      } catch (err: any) {
        messages.push('🖼️ PNG 다운로드 오류: ' + err.message);
      }
    }

    // 3. Neon DB 저장
    if (saveNeon) {
      try {
        setExportStatus('Neon DB에 저장 중...');
        const htmlContent = buildExportHtml();
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
          messages.push('☁️ Neon PostgreSQL DB 저장 완료');
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
      <div className="flex flex-wrap items-center justify-between gap-3 fade-in-up bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl transition-all font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            스튜디오
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title || '9컷 웹툰 감상'}</h2>
            <p className="text-xs text-gray-400">총 {sortedCuts.length}컷 · 마우스로 말풍선 자유 배치 &amp; 대사 편집</p>
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
            📥 내보내기 (HTML / PNG)
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

      {/* 말풍선 편집 안내 배너 (요구사항 5 안내) */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>
            <strong>말풍선 수동 배치 기능:</strong> 각 컷 우상단의 <strong>[+ 말풍선 추가]</strong> 버튼을 누르면 말풍선이 생성됩니다. 마우스로 드래그하여 원하는 위치에 놓고 텍스트를 직접 입력하세요!
          </span>
        </div>
      </div>

      {/* 웹툰 세로 스크롤 뷰어 본체 */}
      <div className="flex justify-center select-none">
        <div
          className="webtoon-viewer rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-white"
          style={{ width: `${zoom}%`, maxWidth: '800px', minWidth: '320px' }}
        >
          {/* 웹툰 제목 배너 */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white text-center py-8 px-4">
            <div className="text-xs text-indigo-300 font-mono tracking-widest uppercase mb-1">
              AI 9컷 웹툰 스튜디오
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title || '9컷 웹툰'}</h1>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-300">
              <span className="bg-white/10 px-2.5 py-1 rounded-full">총 {sortedCuts.length}컷</span>
              <span>·</span>
              <span>수동 말풍선 커스텀 편집</span>
              {sessionId && (
                <>
                  <span>·</span>
                  <span className="font-mono text-gray-400">ID: {sessionId.slice(0, 14)}</span>
                </>
              )}
            </div>
          </div>

          {/* 컷 목록 (9컷) */}
          <div className="bg-white divide-y-2 divide-gray-100">
            {sortedCuts.map(cut => {
              const isFailed = failedImages[cut.cut_index];
              const isLoaded = loadedImages[cut.cut_index];
              const displayUrl = isFailed && cut.fallback_url ? getFullUrl(cut.fallback_url) : getFullUrl(cut.image_url);
              const cutBubbles = bubbles[cut.cut_index] || [];

              return (
                <div key={cut.cut_index} className="webtoon-panel group relative bg-white">
                  {/* 구간 구분 헤더 (기 1, 승 3, 전 6, 결 8) */}
                  {[1, 3, 6, 8].includes(cut.cut_index) && (
                    <div className="bg-gradient-to-r from-gray-950 via-indigo-950 to-gray-950 text-white text-center py-2.5 px-4 text-xs font-bold tracking-widest border-b border-indigo-900/50">
                      {cut.phase?.toUpperCase()}
                    </div>
                  )}

                  {/* 컷 이미지 영역 */}
                  <div
                    ref={el => {
                      containerRefs.current[cut.cut_index] = el;
                    }}
                    className="relative overflow-hidden bg-slate-900 flex items-center justify-center min-h-[420px] select-none"
                  >
                    {/* 로딩 인디케이터 */}
                    {!isLoaded && !isFailed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 text-white gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="text-xs text-gray-300">컷 #{cut.cut_index} AI 일러스트 로딩 중...</span>
                      </div>
                    )}

                    <img
                      key={`${sessionId}_${cut.cut_index}_${cut.image_url}`}
                      src={displayUrl}
                      alt={cut.scene_title}
                      className={`w-full h-auto block transition-opacity duration-300 pointer-events-none ${
                        isLoaded || isFailed ? 'opacity-100' : 'opacity-30'
                      }`}
                      loading="lazy"
                      onLoad={() => handleImageLoad(cut.cut_index)}
                      onError={() => handleImageError(cut.cut_index)}
                    />

                    {/* 컷 상단 번호 뱃지 */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 pointer-events-none z-20">
                      <span className="bg-black/80 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-lg border border-white/20 shadow-md">
                        #{String(cut.cut_index).padStart(2, '0')}
                      </span>
                      <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md">
                        {cut.phase}
                      </span>
                    </div>

                    {/* 우상단 컨트롤: [+ 말풍선 추가] & [저장] */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
                      <button
                        type="button"
                        onClick={() => handleAddBubble(cut)}
                        className="bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                        title="이 컷에 말풍선 추가"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        말풍선 추가
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(cut)}
                        className="bg-black/70 hover:bg-black text-white p-2 rounded-xl shadow-lg backdrop-blur-md transition-all flex items-center gap-1 text-xs"
                        title="이 컷 PNG 저장"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* ── 사용자가 직접 추가하고 드래그하는 말풍선들 (요구사항 5) ── */}
                    {cutBubbles.map(b => (
                      <div
                        key={b.id}
                        style={{ left: `${b.x}%`, top: `${b.y}%` }}
                        className="absolute z-30 max-w-[78%] cursor-move transition-shadow"
                        onMouseDown={e => handleMouseDown(e, cut.cut_index, b)}
                      >
                        <div className="relative bg-white/95 backdrop-blur-md border-[2.5px] border-gray-900 rounded-2xl p-3 shadow-2xl group/bubble hover:ring-2 hover:ring-indigo-500">
                          {/* 말풍선 상단 바: 이동 핸들 + 화자 수정 + 삭제 */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Move className="w-3 h-3 text-indigo-500" />
                              <span className="font-semibold text-gray-500">드래그 이동</span>
                            </div>

                            {/* 화자 인라인 입력 */}
                            <input
                              type="text"
                              value={b.speaker}
                              onChange={e => handleUpdateBubbleSpeaker(cut.cut_index, b.id, e.target.value)}
                              onMouseDown={e => e.stopPropagation()}
                              className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 w-20 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="화자"
                            />

                            {/* 삭제 버튼 */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteBubble(cut.cut_index, b.id);
                              }}
                              onMouseDown={e => e.stopPropagation()}
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                              title="말풍선 삭제"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 대사 텍스트 인라인 직접 편집 (Direct Text Typing) */}
                          <textarea
                            value={b.text}
                            onChange={e => handleUpdateBubbleText(cut.cut_index, b.id, e.target.value)}
                            onMouseDown={e => e.stopPropagation()}
                            rows={2}
                            className="w-full text-xs font-bold text-gray-950 bg-transparent resize-none focus:outline-none focus:bg-gray-50 rounded-lg p-1 leading-snug tracking-tight"
                            placeholder="대사를 입력하세요..."
                          />

                          {/* 말꼬리 */}
                          <div className="absolute -bottom-2.5 left-6 w-0 h-0 border-solid border-t-[10px] border-t-gray-900 border-x-[8px] border-x-transparent border-b-0 pointer-events-none" />
                          <div className="absolute -bottom-2 left-[26px] w-0 h-0 border-solid border-t-[8px] border-t-white border-x-[6px] border-x-transparent border-b-0 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 하단 장면 정보 바 */}
                  <div className="bg-white px-5 py-3.5 border-t border-gray-100 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          #{String(cut.cut_index).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-bold text-gray-800 truncate">{cut.scene_title}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{cut.scene_summary}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] text-gray-400 block">
                        말풍선 {cutBubbles.length}개
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 웹툰 종료 배너 */}
          <div className="bg-gray-900 text-white text-center py-10 px-4 space-y-4">
            <div className="text-3xl">🎉</div>
            <h3 className="text-lg font-bold">— 9컷 웹툰 완성 (FIN) —</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              모든 9컷이 완성되었습니다. HTML 문서와 PNG 이미지 파일로 안전하게 내보내세요.
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
                📥 9컷 웹툰 전체 내보내기 (HTML / PNG)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 내보내기 모달 (HTML / PNG 둘 중 하나 또는 둘 다 선택 - 요구사항 6) ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  웹툰 내보내기 (Export)
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">원하시는 내보내기 형식을 선택하세요</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {/* 1. HTML 파일 선택 */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 cursor-pointer transition-all bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={saveHtml}
                    onChange={e => setSaveHtml(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                      <FileCode className="w-4 h-4 text-emerald-600" />
                      HTML 웹툰 파일 (.html)
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      직접 배치한 말풍선과 일러스트가 포함된 단일 웹툰 HTML 문서로 다운로드합니다.
                    </p>
                  </div>
                </label>

                {/* 2. PNG 이미지 선택 (요구사항 6) */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 cursor-pointer transition-all bg-gray-50/50">
                  <input
                    type="checkbox"
                    checked={savePng}
                    onChange={e => setSavePng(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      PNG 웹툰 이미지 (.png)
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      말풍선과 대사가 완벽하게 합성된 9컷 고화질 PNG 이미지 파일들을 다운로드합니다.
                    </p>
                  </div>
                </label>

                {/* 3. Neon DB 클라우드 저장 */}
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
                      Neon PostgreSQL DB 클라우드 저장
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      사이드바 라이브러리에서 언제든 다시 불러올 수 있도록 데이터베이스에 보관합니다.
                    </p>
                  </div>
                </label>
              </div>

              {exportStatus && (
                <div
                  className={`text-xs px-3.5 py-2.5 rounded-xl border font-medium ${
                    exportStatus.includes('완료') || exportStatus.includes('성공')
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
                  disabled={exporting || (!saveHtml && !savePng && !saveNeon)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {exporting ? '처리 중...' : '선택 파일 내보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
