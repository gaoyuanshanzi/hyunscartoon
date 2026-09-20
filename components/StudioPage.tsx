'use client';

import { useState } from 'react';
import GeneratorPanel from './GeneratorPanel';
import WebtoonViewer from './WebtoonViewer';
import { BookOpen, LogOut, Sparkles } from 'lucide-react';

export interface CutData {
  cut_index: number;
  scene_title: string;
  phase: string;
  dialogue: string;
  speaker: string;
  scene_summary: string;
  image_url: string;
  fallback_url?: string;
}

interface Props {
  token: string;
  onLogout: () => void;
}

export default function StudioPage({ token, onLogout }: Props) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [completedCuts, setCompletedCuts] = useState<CutData[]>([]);
  const [webtoonTitle, setWebtoonTitle] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [finished, setFinished] = useState(false);
  const [view, setView] = useState<'studio' | 'viewer'>('studio');

  const handleComplete = (cuts: CutData[], title: string, sId?: string) => {
    setCompletedCuts(cuts);
    setWebtoonTitle(title);
    if (sId) setSessionId(sId);
    setFinished(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">웹툰 스튜디오</h1>
                <p className="text-xs text-gray-400 leading-tight">AI 자동 20컷 웹툰 생성기 · Neon DB 연동</p>
              </div>
            </div>

            {/* 중앙 탭 */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setView('studio')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === 'studio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> 스튜디오
                </span>
              </button>
              <button
                onClick={() => setView('viewer')}
                disabled={completedCuts.length === 0}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === 'viewer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  뷰어 {completedCuts.length > 0 && `(${completedCuts.length}컷)`}
                </span>
              </button>
            </div>

            {/* 로그아웃 */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'studio' ? (
          <GeneratorPanel
            token={token}
            generating={generating}
            setGenerating={setGenerating}
            progress={progress}
            setProgress={setProgress}
            statusMsg={statusMsg}
            setStatusMsg={setStatusMsg}
            completedCuts={completedCuts}
            setCompletedCuts={setCompletedCuts}
            onComplete={handleComplete}
            onViewWebtoon={() => setView('viewer')}
            finished={finished}
            setFinished={setFinished}
            sessionId={sessionId}
            setSessionId={setSessionId}
          />
        ) : (
          <WebtoonViewer
            cuts={completedCuts}
            title={webtoonTitle}
            sessionId={sessionId}
            onBack={() => setView('studio')}
          />
        )}
      </main>
    </div>
  );
}
