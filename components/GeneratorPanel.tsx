'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle, Clock, Image as ImgIcon, BookOpen, RefreshCw } from 'lucide-react';
import type { CutData } from './StudioPage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const GENRE_OPTIONS = [
  { value: 'drama',   label: '🎭 드라마', desc: '현실적인 감동 이야기' },
  { value: 'romance', label: '💕 로맨스', desc: '설레는 사랑 이야기' },
  { value: 'fantasy', label: '⚔️ 판타지', desc: '마법과 모험의 세계' },
  { value: 'thriller',label: '🔍 스릴러', desc: '긴장감 넘치는 전개' },
  { value: 'action',  label: '💥 액션',   desc: '역동적인 배틀 씬' },
];

const EXAMPLE_STORIES = [
  {
    title: '도시의 카페 이야기',
    text: `서울 홍대 골목의 작은 카페 '별빛'을 운영하는 28살 민우는 매일 아침 7시에 문을 열고 혼자 모든 일을 해낸다. 어느 날, 비를 피해 들어온 낯선 여자 지아가 카페에서 3시간 동안 노트북을 두드리며 소설을 썼다. 민우는 그녀의 커피잔이 빌 때마다 말없이 채워줬고, 지아는 고개 들어 미소를 지었다. 그것이 전부였다. 다음 날도, 그 다음 날도 지아는 같은 자리에 앉아 같은 시간을 보냈다. 어느 월요일 아침, 지아가 나타나지 않았다. 민우는 처음으로 카페 안이 이렇게 넓었다는 것을 알았다. 일주일이 지나 지아가 돌아왔을 때, 그녀의 손에는 두 권의 책이 있었다. 하나는 자신이 쓴 소설, 다른 하나는 선물. 민우는 그 책을 받아들고, 처음으로 먼저 말을 건넸다. "드시는 것 좀 시켜도 되겠어요? 오늘은 제가 직접 서빙하고 싶거든요."`
  },
  {
    title: '마법사의 마지막 제자',
    text: `왕국의 마지막 마법사 그레이는 천 년을 살아온 끝에 자신의 힘이 다해가고 있다는 것을 느꼈다. 그는 새벽안개 속에서 마법의 씨앗을 묻어두고 세상을 떠날 준비를 했다. 그런데 열두 살 소녀 카에라가 그의 탑에 찾아와 제자로 받아달라고 고집을 피웠다. 그레이는 거절했지만, 카에라는 매일 아침 빈자리에 꽃을 놓아두었다. 스무 번의 꽃다발 끝에, 그레이는 문을 열었다. 가르치는 동안 그레이는 카에라의 눈에서 천 년 전 자신의 눈빛을 보았다. 그리고 깨달았다—자신이 전수해야 할 것은 마법이 아니라 포기하지 않는 마음이었다. 그가 숨을 거두던 날, 카에라의 손에서 처음으로 진짜 빛이 피어났다.`
  }
];

interface Props {
  token: string;
  generating: boolean;
  setGenerating: (v: boolean) => void;
  progress: number;
  setProgress: (v: number) => void;
  statusMsg: string;
  setStatusMsg: (v: string) => void;
  completedCuts: CutData[];
  setCompletedCuts: React.Dispatch<React.SetStateAction<CutData[]>>;
  onComplete: (cuts: CutData[], title: string, sessionId?: string) => void;
  onViewWebtoon: () => void;
  finished: boolean;
  setFinished: (v: boolean) => void;
  sessionId: string;
  setSessionId: (v: string) => void;
}

export default function GeneratorPanel({
  token, generating, setGenerating, progress, setProgress,
  statusMsg, setStatusMsg, completedCuts, setCompletedCuts,
  onComplete, onViewWebtoon, finished, setFinished,
  sessionId, setSessionId
}: Props) {
  const [story, setStory] = useState('');
  const [genre, setGenre] = useState('drama');
  const [showExample, setShowExample] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const wordCount = story.trim().split(/\s+/).filter(Boolean).length;
  const charCount = story.length;

  const handleGenerate = () => {
    if (!story.trim() || story.trim().length < 30) {
      alert('스토리 내용을 최소 30자 이상 입력해 주세요. (A4 반장~한 장 분량 권장)');
      return;
    }
    if (generating) return;

    setGenerating(true);
    setFinished(false);
    setCompletedCuts([]);
    setProgress(0);
    setStatusMsg('');

    const params = new URLSearchParams({
      story: story,
      genre: genre,
      session_token: token,
    });

    const es = new EventSource(`${API_BASE}/api/generate-stream?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.session_id) {
          setSessionId(data.session_id);
        }

        if (data.type === 'status') {
          setStatusMsg(data.message);
          setProgress(data.progress || 0);
        } else if (data.type === 'cut_done') {
          setProgress(data.progress);
          setStatusMsg(data.message);
          setCompletedCuts((prev: CutData[]) => {
            const updated = [...prev];
            const idx = updated.findIndex(c => c.cut_index === data.cut_data.cut_index);
            if (idx >= 0) updated[idx] = data.cut_data;
            else updated.push(data.cut_data);
            return updated.sort((a, b) => a.cut_index - b.cut_index);
          });
        } else if (data.type === 'complete') {
          setProgress(100);
          setStatusMsg('🎉 웹툰 20컷 생성 및 Neon DB 저장 완료!');
          setFinished(true);
          setGenerating(false);
          onComplete(data.cuts || completedCuts, data.title || '웹툰', data.session_id);
          es.close();
        } else if (data.type === 'error') {
          setStatusMsg(`❌ 오류: ${data.message}`);
          setGenerating(false);
          es.close();
        }
      } catch (_err) {
        // JSON 파싱 무시
      }
    };

    es.onerror = () => {
      setStatusMsg('❌ 연결 오류. 다시 시도해 주세요.');
      setGenerating(false);
      es.close();
    };
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setGenerating(false);
    setStatusMsg('⏹ 생성을 중단했습니다.');
  };

  const handleReset = () => {
    setStory('');
    setCompletedCuts([]);
    setProgress(0);
    setStatusMsg('');
    setFinished(false);
  };

  return (
    <div className="space-y-6">
      <div className="fade-in-up">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">✍️ 웹툰 스토리 입력</h2>
        <p className="text-gray-500 text-sm">A4 반장~한 장 분량의 스토리를 입력하면 20컷 웹툰으로 자동 생성되어 Neon DB에 저장됩니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* 장르 선택 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🎨 웹툰 장르 선택</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {GENRE_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGenre(g.value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                    genre === g.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-lg mb-0.5">{g.label.split(' ')[0]}</span>
                  <span className="text-xs font-medium">{g.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 스토리 본문 입력 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">📝 스토리 본문</h3>
              <button
                onClick={() => setShowExample(!showExample)}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
              >
                예시 보기 {showExample ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              </button>
            </div>

            {showExample && (
              <div className="mb-4 space-y-2">
                {EXAMPLE_STORIES.map(ex => (
                  <div key={ex.title} className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-indigo-700">{ex.title}</span>
                      <button
                        onClick={() => { setStory(ex.text); setShowExample(false); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                      >
                        사용하기
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{ex.text}</p>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={story}
              onChange={e => setStory(e.target.value)}
              placeholder={`여기에 스토리를 입력하세요...\n\n예시:\n"서울 홍대 골목의 작은 카페 '별빛'을 운영하는 28살 민우는 매일 아침 7시에 문을 열고 혼자 모든 일을 해낸다. 어느 날, 비를 피해 들어온 낯선 여자 지아가 카페에서 3시간 동안 노트북을 두드리며 소설을 썼다..."\n\n※ A4 반장~한 장 분량(300~900자)이면 최적의 결과를 얻을 수 있습니다.`}
              disabled={generating}
              className="w-full h-72 p-4 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 resize-none leading-relaxed placeholder:text-gray-400 disabled:opacity-60"
            />

            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{charCount.toLocaleString()}자</span>
                <span>{wordCount.toLocaleString()}단어</span>
                {charCount > 0 && (
                  <span className={`font-medium ${charCount >= 200 && charCount <= 2000 ? 'text-green-500' : charCount < 200 ? 'text-amber-500' : 'text-blue-500'}`}>
                    {charCount < 200 ? '⚠ 더 자세한 스토리를 권장합니다' : charCount <= 2000 ? '✓ 최적 분량' : '💡 충분한 스토리 분량'}
                  </span>
                )}
              </div>
              {story && (
                <button onClick={() => setStory('')} className="text-xs text-gray-400 hover:text-red-400">지우기</button>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 컨트롤 패널 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🚀 웹툰 생성</h3>

            {!generating ? (
              <button
                onClick={handleGenerate}
                disabled={!story.trim() || story.trim().length < 30}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                20컷 웹툰 자동 생성
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-4 rounded-xl border-2 border-red-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span className="w-3 h-3 bg-red-500 rounded-sm"/>
                생성 중지
              </button>
            )}

            {finished && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={onViewWebtoon}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-3 rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  📖 웹툰 감상 및 내보내기
                </button>
                <button
                  onClick={handleReset}
                  className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  새 웹툰 만들기
                </button>
              </div>
            )}
          </div>

          {/* 진행 상황 */}
          {(generating || progress > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">📊 생성 진행률</h3>
                <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${generating ? 'progress-shimmer' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {statusMsg && (
                <p className="text-xs text-gray-600 leading-relaxed">{statusMsg}</p>
              )}
              {generating && (
                <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  AI 일러스트 생성 및 Neon DB 동기화 중...
                </div>
              )}
            </div>
          )}

          {/* 실시간 컷 썸네일 그리드 */}
          {completedCuts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🎬 생성된 컷</h3>
                <span className="text-xs text-gray-400 font-medium">{completedCuts.length} / 20</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 20 }, (_, i) => {
                  const cut = completedCuts.find(c => c.cut_index === i + 1);
                  const isDataOrHttp = cut && (cut.image_url.startsWith('http') || cut.image_url.startsWith('data:'));
                  const imgSrc = cut ? (isDataOrHttp ? cut.image_url : `${API_BASE}${cut.image_url}`) : '';

                  return (
                    <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 relative">
                      {cut ? (
                        <>
                          <img
                            src={imgSrc}
                            alt={cut.scene_title}
                            className="w-full h-full object-cover pop-in"
                          />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImgIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
