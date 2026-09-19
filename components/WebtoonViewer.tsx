'use client';

import { useState } from 'react';
import { ChevronLeft, Download, ZoomIn, ZoomOut, MessageSquare, MessageSquareOff } from 'lucide-react';
import type { CutData } from './StudioPage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Props {
  cuts: CutData[];
  title: string;
  onBack: () => void;
}

export default function WebtoonViewer({ cuts, title, onBack }: Props) {
  const [zoom, setZoom] = useState(100);
  const [showBubble, setShowBubble] = useState(true); // 말풍선 합성본 vs 원본 토글

  const sortedCuts = [...cuts].sort((a, b) => a.cut_index - b.cut_index);

  const handleDownload = async (cut: CutData) => {
    const targetUrl = showBubble ? cut.image_url : cut.image_url.replace('_bubble', '');
    const url = targetUrl.startsWith('http') ? targetUrl : `${API_BASE}${targetUrl}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `webtoon_cut_${cut.cut_index.toString().padStart(2, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* 뷰어 헤더 */}
      <div className="flex items-center justify-between fade-in-up">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            스튜디오
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title || '웹툰 감상'}</h2>
            <p className="text-xs text-gray-400">{sortedCuts.length}컷 · 세로 스크롤 뷰어</p>
          </div>
        </div>

        {/* 뷰어 컨트롤 */}
        <div className="flex items-center gap-2">
          {/* 말풍선 토글 */}
          <button
            onClick={() => setShowBubble(!showBubble)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all font-medium ${
              showBubble
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {showBubble ? <MessageSquare className="w-3.5 h-3.5"/> : <MessageSquareOff className="w-3.5 h-3.5"/>}
            {showBubble ? '말풍선 ON' : '원본'}
          </button>

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5">
            <button
              onClick={() => setZoom(z => Math.max(50, z - 10))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-xs text-gray-600 font-medium w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 웹툰 세로 스크롤 뷰어 */}
      <div className="flex justify-center">
        <div
          className="webtoon-viewer rounded-2xl overflow-hidden shadow-xl border border-gray-100"
          style={{ width: `${zoom}%`, maxWidth: '800px', minWidth: '320px' }}
        >
          {/* 웹툰 제목 배너 */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center py-6 px-4">
            <div className="text-xs text-gray-400 mb-1 tracking-widest uppercase">AI 자동 생성 웹툰</div>
            <h1 className="text-xl font-bold">{title || '웹툰'}</h1>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
              <span>총 {sortedCuts.length}컷</span>
              <span>·</span>
              <span>AI 이미지 + 한글 말풍선</span>
            </div>
          </div>

          {/* 컷 목록 (세로 스크롤) */}
          <div className="bg-white">
            {sortedCuts.map((cut, idx) => (
              <div key={cut.cut_index} className="webtoon-panel group relative">
                {/* 구간 레이블 (막 시작 시) */}
                {[1, 6, 11, 16].includes(cut.cut_index) && (
                  <div className="bg-gray-900 text-white text-center py-2 px-4 text-xs font-medium tracking-widest">
                    {cut.phase?.toUpperCase() || `CHAPTER ${Math.ceil(cut.cut_index / 5)}`}
                  </div>
                )}

                  {/* 컷 이미지 */}
                  <div className="relative overflow-hidden">
                    {(() => {
                      const targetUrl = showBubble ? cut.image_url : cut.image_url.replace('_bubble', '');
                      const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${API_BASE}${targetUrl}`;
                      return (
                        <img
                          src={fullUrl}
                          alt={cut.scene_title}
                          className="w-full h-auto block"
                          loading="lazy"
                        />
                      );
                    })()}

                  {/* 컷 번호 오버레이 */}
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-mono">
                    #{cut.cut_index.toString().padStart(2, '0')}
                  </div>

                  {/* 다운로드 버튼 (호버 시 표시) */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(cut)}
                      className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-md transition-all"
                      title="이 컷 다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 컷 정보 (장면 설명) */}
                <div className="bg-white px-4 py-3 border-t border-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5 truncate">{cut.scene_title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{cut.scene_summary}</p>
                    </div>
                    {cut.dialogue && (
                      <div className="flex-shrink-0 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 max-w-[200px]">
                        <p className="text-xs text-gray-500 font-medium mb-0.5">{cut.speaker}</p>
                        <p className="text-xs text-indigo-700 line-clamp-2">"{cut.dialogue}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 웹툰 종료 배너 */}
          <div className="bg-gray-900 text-white text-center py-8 px-4">
            <div className="text-3xl mb-3">🎉</div>
            <p className="text-base font-bold mb-1">— 끝 —</p>
            <p className="text-xs text-gray-400">AI가 자동으로 생성한 웹툰입니다.</p>
            <p className="text-xs text-gray-500 mt-1">Hyun&apos;s Cartoon Studio · Powered by FLUX AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
