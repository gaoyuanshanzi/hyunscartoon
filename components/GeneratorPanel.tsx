'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Image as ImgIcon,
  BookOpen,
  RefreshCw,
  Copy,
  Check,
  Film,
  Camera,
  MessageSquare,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import type { CutData } from './StudioPage';
import { analyzeStoryIntoConti, GeneratedContiCut } from '@/lib/storyAnalyzer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const GENRE_OPTIONS = [
  { value: 'drama', label: '🎭 드라마', desc: '현실적인 감동 이야기' },
  { value: 'romance', label: '💕 로맨스', desc: '설레는 사랑 이야기' },
  { value: 'fantasy', label: '⚔️ 판타지', desc: '마법과 모험의 세계' },
  { value: 'thriller', label: '🔍 스릴러', desc: '긴장감 넘치는 전개' },
  { value: 'action', label: '💥 액션', desc: '역동적인 배틀 씬' },
];

const EXAMPLE_STORIES = [
  {
    title: '도시의 카페 이야기',
    text: `서울 홍대 골목의 작은 카페 '별빛'을 운영하는 28살 민우는 매일 아침 7시에 문을 열고 혼자 모든 일을 해낸다. 어느 날, 비를 피해 들어온 낯선 여자 지아가 카페에서 3시간 동안 노트북을 두드리며 소설을 썼다. 민우는 그녀의 커피잔이 빌 때마다 말없이 채워줬고, 지아는 고개 들어 미소를 지었다. 그것이 전부였다. 다음 날도, 그 다음 날도 지아는 같은 자리에 앉아 같은 시간을 보냈다. 어느 월요일 아침, 지아가 나타나지 않았다. 민우는 처음으로 카페 안이 이렇게 넓었다는 것을 알았다. 일주일이 지나 지아가 돌아왔을 때, 그녀의 손에는 두 권의 책이 있었다. 하나는 자신이 쓴 소설, 다른 하나는 선물. 민우는 그 책을 받아들고, 처음으로 먼저 말을 건넸다. "드시는 것 좀 시켜도 되겠어요? 오늘은 제가 직접 서빙하고 싶거든요."`,
  },
  {
    title: '마법사의 마지막 제자',
    text: `왕국의 마지막 마법사 그레이는 천 년을 살아온 끝에 자신의 힘이 다해가고 있다는 것을 느꼈다. 그는 새벽안개 속에서 마법의 씨앗을 묻어두고 세상을 떠날 준비를 했다. 그런데 열두 살 소녀 카에라가 그의 탑에 찾아와 제자로 받아달라고 고집을 피웠다. 그레이는 거절했지만, 카에라는 매일 아침 빈자리에 꽃을 놓아두었다. 스무 번의 꽃다발 끝에, 그레이는 문을 열었다. 가르치는 동안 그레이는 카에라의 눈에서 천 년 전 자신의 눈빛을 보았다. 그리고 깨달았다—자신이 전수해야 할 것은 마법이 아니라 포기하지 않는 마음이었다. 그가 숨을 거두던 날, 카에라의 손에서 처음으로 진짜 빛이 피어났다.`,
  },
];

const PHASE_COLORS: Record<string, { badge: string; border: string; bg: string; text: string }> = {
  기: { badge: 'bg-blue-600 text-white', border: 'border-blue-200', bg: 'bg-blue-50/50', text: 'text-blue-700' },
  승: { badge: 'bg-emerald-600 text-white', border: 'border-emerald-200', bg: 'bg-emerald-50/50', text: 'text-emerald-700' },
  전: { badge: 'bg-amber-600 text-white', border: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-700' },
  결: { badge: 'bg-purple-600 text-white', border: 'border-purple-200', bg: 'bg-purple-50/50', text: 'text-purple-700' },
};

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
  token,
  generating,
  setGenerating,
  progress,
  setProgress,
  statusMsg,
  setStatusMsg,
  completedCuts,
  setCompletedCuts,
  onComplete,
  onViewWebtoon,
  finished,
  setFinished,
  sessionId,
  setSessionId,
}: Props) {
  const [story, setStory] = useState('');
  const [genre, setGenre] = useState('drama');
  const [showExample, setShowExample] = useState(false);
  const [contiCuts, setContiCuts] = useState<GeneratedContiCut[]>([]);
  const [copiedConti, setCopiedConti] = useState(false);
  const [contiViewMode, setContiViewMode] = useState<'cards' | 'script'>('cards');
  const [showContiSection, setShowContiSection] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const wordCount = story.trim().split(/\s+/).filter(Boolean).length;
  const charCount = story.length;

  // 스토리 텍스트가 20자 이상 입력되면 자동으로 실시간 20컷 콘티 기획안 생성
  useEffect(() => {
    if (story.trim().length >= 25 && !generating && contiCuts.length === 0) {
      try {
        const preview = analyzeStoryIntoConti(story, genre);
        setContiCuts(preview.cuts);
      } catch (_e) {
        // 무시
      }
    }
  }, [story, genre, generating, contiCuts.length]);

  const handleGenerate = () => {
    if (!story.trim() || story.trim().length < 25) {
      alert('스토리 내용을 최소 25자 이상 입력해 주세요. (A4 반장~한 장 분량 권장)');
      return;
    }
    if (generating) return;

    setGenerating(true);
    setFinished(false);
    setCompletedCuts([]);
    setProgress(0);
    setStatusMsg('');

    // 시작 전 즉시 클라이언트 측 콘티 분석 반영
    try {
      const initialAnalyzed = analyzeStoryIntoConti(story, genre);
      setContiCuts(initialAnalyzed.cuts);
    } catch (_e) {}

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
        } else if (data.type === 'conti_ready') {
          // 서버에서 정밀 분석된 20컷 콘티 도착 (즉시 화면 표시)
          if (data.conti_cuts && data.conti_cuts.length > 0) {
            setContiCuts(data.conti_cuts);
          }
          setStatusMsg(data.message);
          setProgress(data.progress || 15);
        } else if (data.type === 'cut_done') {
          setProgress(data.progress);
          setStatusMsg(data.message);
          setCompletedCuts((prev: CutData[]) => {
            const updated = [...prev];
            const idx = updated.findIndex((c) => c.cut_index === data.cut_data.cut_index);
            if (idx >= 0) updated[idx] = data.cut_data;
            else updated.push(data.cut_data);
            return updated.sort((a, b) => a.cut_index - b.cut_index);
          });
        } else if (data.type === 'complete') {
          setProgress(100);
          setStatusMsg('🎉 20컷 웹툰 생성 및 Neon DB 저장 완료!');
          setFinished(true);
          setGenerating(false);
          if (data.conti_cuts) setContiCuts(data.conti_cuts);
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
    setContiCuts([]);
    setCompletedCuts([]);
    setProgress(0);
    setStatusMsg('');
    setFinished(false);
  };

  // 20컷 콘티 전체 텍스트 복사
  const handleCopyContiText = () => {
    if (contiCuts.length === 0) return;
    const textOutput = contiCuts
      .map(
        (c) =>
          `[#${String(c.cut_index).padStart(2, '0')} ${c.phase}] ${c.scene_title}\n` +
          `• 카메라 연출: ${c.camera_angle}\n` +
          `• 지문/상황: ${c.direction}\n` +
          (c.dialogue ? `• 대사 (${c.speaker}): "${c.dialogue}"\n` : '')
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(textOutput);
    setCopiedConti(true);
    setTimeout(() => setCopiedConti(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="fade-in-up">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">✍️ 웹툰 스토리 및 20컷 콘티 기획</h2>
        <p className="text-gray-500 text-sm">
          A4 반장~한 장 분량의 스토리를 입력하면, 기승전결 20컷 콘티 텍스트로 자동 정리되고 맞춤형 AI 일러스트가 생성됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 스토리 입력 및 20컷 콘티 표시 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 장르 선택 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🎨 웹툰 장르 선택</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => {
                    setGenre(g.value);
                    if (story.trim().length >= 25) {
                      const updated = analyzeStoryIntoConti(story, g.value);
                      setContiCuts(updated.cuts);
                    }
                  }}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                    genre === g.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-lg mb-0.5">{g.label.split(' ')[0]}</span>
                  <span className="text-xs font-medium">{g.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 스토리 본문 입력 (A4 반장 정도 내용) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-800">📝 원작 스토리 본문 (A4 반장 분량)</h3>
              </div>
              <button
                onClick={() => setShowExample(!showExample)}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                예시 스토리 {showExample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showExample && (
              <div className="mb-4 space-y-2">
                {EXAMPLE_STORIES.map((ex) => (
                  <div key={ex.title} className="border border-indigo-100 rounded-xl p-3.5 bg-indigo-50/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-indigo-800">{ex.title}</span>
                      <button
                        onClick={() => {
                          setStory(ex.text);
                          setShowExample(false);
                          const analyzed = analyzeStoryIntoConti(ex.text, genre);
                          setContiCuts(analyzed.cuts);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                      >
                        이 스토리 불러오기
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{ex.text}</p>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={story}
              onChange={(e) => {
                const newStory = e.target.value;
                setStory(newStory);
                if (newStory.trim().length >= 25 && !generating) {
                  try {
                    const analyzed = analyzeStoryIntoConti(newStory, genre);
                    setContiCuts(analyzed.cuts);
                  } catch (_err) {}
                } else if (newStory.trim().length === 0) {
                  setContiCuts([]);
                }
              }}
              placeholder={`여기에 A4 반장~한 장 분량의 스토리를 자유롭게 입력하세요...\n\n(이야기를 바꾸면 콘티와 20컷 웹툰 일러스트가 새로운 이야기에 맞춰 완전히 새로 생성됩니다)\n\n예시:\n"서울 홍대 골목의 작은 카페 '별빛'을 운영하는 28살 민우는 매일 아침 7시에 문을 열고 혼자 모든 일을 해낸다. 어느 날, 비를 피해 들어온 낯선 여자 지아가 카페에서 3시간 동안 노트북을 두드리며 소설을 썼다..."`}
              disabled={generating}
              className="w-full h-64 p-4 border border-gray-200 rounded-xl text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none leading-relaxed placeholder:text-gray-400 disabled:opacity-60 font-sans"
            />

            <div className="flex items-center justify-between mt-2.5">
              <div className="flex gap-3 text-xs text-gray-400">
                <span className="font-mono">{charCount.toLocaleString()}자</span>
                <span className="font-mono">{wordCount.toLocaleString()}단어</span>
                {charCount > 0 && (
                  <span
                    className={`font-semibold ${
                      charCount >= 100 && charCount <= 2500
                        ? 'text-emerald-600'
                        : charCount < 100
                        ? 'text-amber-500'
                        : 'text-indigo-600'
                    }`}
                  >
                    {charCount < 100 ? '⚠ A4 반장 권장 (100자 이상)' : '✓ 적정 분량 (20컷 자동 기획 가능)'}
                  </span>
                )}
              </div>
              {story && (
                <button
                  onClick={() => {
                    setStory('');
                    setContiCuts([]);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  본문 지우기
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 요구사항 (나): 입력한 스토리 text 바로 밑에 20개 콘티 형식 text 표시 */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 콘티 헤더 바 */}
            <div className="px-5 py-4 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-500/30 border border-indigo-400/40 rounded-lg flex items-center justify-center">
                  <Film className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight">🎬 20컷 웹툰 콘티 형식 텍스트</h3>
                    <span className="text-[11px] bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                      기·승·전·결 4단계 기획안
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    스토리 본문을 분석하여 정리한 20컷의 장면 연출, 카메라 앵글, 대사 및 지문입니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 뷰 모드 토글 */}
                <div className="hidden sm:flex bg-gray-800/80 rounded-lg p-0.5 border border-gray-700 text-xs">
                  <button
                    onClick={() => setContiViewMode('cards')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      contiViewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    카드형
                  </button>
                  <button
                    onClick={() => setContiViewMode('script')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      contiViewMode === 'script' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    대본형
                  </button>
                </div>

                {/* 복사 버튼 */}
                {contiCuts.length > 0 && (
                  <button
                    onClick={handleCopyContiText}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-semibold rounded-lg border border-gray-700 transition-all shadow-sm"
                    title="콘티 전체 텍스트 복사"
                  >
                    {copiedConti ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedConti ? '복사 완료!' : '콘티 복사'}</span>
                  </button>
                )}

                {/* 섹션 접기/펼치기 */}
                <button
                  onClick={() => setShowContiSection(!showContiSection)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {showContiSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 콘티 본문 */}
            {showContiSection && (
              <div className="p-5">
                {contiCuts.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Film className="w-10 h-10 mx-auto mb-2.5 text-gray-300 stroke-1" />
                    <p className="text-sm font-medium text-gray-600">스토리를 입력하면 20컷 콘티가 이곳에 자동으로 표시됩니다.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      상단 본문란에 A4 반장 분량의 이야기를 입력해 보세요.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* 상단 요약 바 */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">총 {contiCuts.length}개 컷 구성</span>
                        <div className="flex gap-1.5">
                          {['기 (1-5컷)', '승 (6-10컷)', '전 (11-15컷)', '결 (16-20컷)'].map((p, idx) => (
                            <span
                              key={p}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                idx === 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : idx === 1
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : idx === 2
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-gray-400 text-[11px]">※ 실시간 스토리 분석 결과</span>
                    </div>

                    {/* 카드형 뷰 */}
                    {contiViewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                        {contiCuts.map((cut) => {
                          const phaseInitial = cut.phase_code || (cut.phase.slice(0, 1) as '기' | '승' | '전' | '결');
                          const pStyle = PHASE_COLORS[phaseInitial] || PHASE_COLORS['기'];
                          const completed = completedCuts.find((c) => c.cut_index === cut.cut_index);

                          return (
                            <div
                              key={cut.cut_index}
                              className={`p-3.5 rounded-xl border transition-all ${
                                completed
                                  ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                                  : `${pStyle.bg} ${pStyle.border}`
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${pStyle.badge}`}>
                                    #{String(cut.cut_index).padStart(2, '0')} {phaseInitial}
                                  </span>
                                  <h4 className="text-xs font-bold text-gray-800 truncate">{cut.scene_title}</h4>
                                </div>
                                {completed && (
                                  <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" /> 그림 완료
                                  </span>
                                )}
                              </div>

                              {/* 카메라 앵글 */}
                              {cut.camera_angle && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
                                  <Camera className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="font-medium text-gray-600">{cut.camera_angle}</span>
                                </div>
                              )}

                              {/* 대사 */}
                              {cut.dialogue ? (
                                <div className="bg-white/90 rounded-lg p-2 border border-gray-200/80 mb-2 shadow-2xs">
                                  <div className="text-[10px] font-bold text-indigo-600 mb-0.5 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{cut.speaker || '인물'}</span>
                                  </div>
                                  <p className="text-xs font-semibold text-gray-900 leading-snug">
                                    "{cut.dialogue}"
                                  </p>
                                </div>
                              ) : null}

                              {/* 지문 / 연출 상황 */}
                              <p className="text-[11px] text-gray-600 leading-relaxed bg-white/50 p-2 rounded-lg border border-gray-100">
                                <span className="font-semibold text-gray-700">지문: </span>
                                {cut.direction}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* 대본형 뷰 */
                      <div className="max-h-[640px] overflow-y-auto space-y-2 pr-1 text-xs font-sans scrollbar-thin scrollbar-thumb-gray-200">
                        {contiCuts.map((cut) => {
                          const phaseInitial = cut.phase_code || (cut.phase.slice(0, 1) as '기' | '승' | '전' | '결');
                          const pStyle = PHASE_COLORS[phaseInitial] || PHASE_COLORS['기'];

                          return (
                            <div
                              key={cut.cut_index}
                              className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-1 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${pStyle.badge}`}>
                                    컷 {cut.cut_index} · {cut.phase}
                                  </span>
                                  <strong className="text-gray-900">{cut.scene_title}</strong>
                                </div>
                                <span className="text-[11px] text-gray-400">{cut.camera_angle}</span>
                              </div>
                              <p className="text-gray-600 text-[11px] mt-0.5">
                                <span className="font-medium text-gray-800">[상황 지문]</span> {cut.direction}
                              </p>
                              {cut.dialogue && (
                                <p className="text-indigo-700 font-semibold text-xs mt-0.5">
                                  <span className="text-gray-500">[{cut.speaker}]</span> "{cut.dialogue}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 컨트롤 및 생성 상태 패널 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🚀 20컷 웹툰 자동 생성</h3>

            {!generating ? (
              <button
                onClick={handleGenerate}
                disabled={!story.trim() || story.trim().length < 25}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                20컷 웹툰 생성하기
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-4 rounded-xl border-2 border-red-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span className="w-3 h-3 bg-red-500 rounded-sm" />
                생성 중지
              </button>
            )}

            {finished && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={onViewWebtoon}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  📖 웹툰 감상 및 내보내기
                </button>
                <button
                  onClick={handleReset}
                  className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  새로운 이야기로 다시 만들기
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
                  className={`h-full rounded-full transition-all duration-500 ${
                    generating ? 'progress-shimmer' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {statusMsg && <p className="text-xs text-gray-600 leading-relaxed font-medium">{statusMsg}</p>}
              {generating && (
                <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  스토리 맞춤 AI 일러스트 생성 및 동기화 중...
                </div>
              )}
            </div>
          )}

          {/* 실시간 컷 썸네일 그리드 */}
          {completedCuts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🎬 생성된 컷</h3>
                <span className="text-xs text-indigo-600 font-bold">{completedCuts.length} / 20</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 20 }, (_, i) => {
                  const cut = completedCuts.find((c) => c.cut_index === i + 1);
                  const isDataOrHttp =
                    cut && (cut.image_url.startsWith('http') || cut.image_url.startsWith('data:'));
                  const imgSrc = cut ? (isDataOrHttp ? cut.image_url : `${API_BASE}${cut.image_url}`) : '';

                  return (
                    <div
                      key={i}
                      className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 relative border border-gray-200"
                    >
                      {cut ? (
                        <>
                          <img
                            key={`${sessionId}_${cut.cut_index}_${cut.image_url}`}
                            src={imgSrc}
                            alt={cut.scene_title}
                            className="w-full h-full object-cover pop-in"
                            onError={(e) => {
                              if (cut.fallback_url && (e.target as HTMLImageElement).src !== cut.fallback_url) {
                                (e.target as HTMLImageElement).src = cut.fallback_url;
                              }
                            }}
                          />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center shadow">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                            #{i + 1}
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <ImgIcon className="w-4 h-4 mb-0.5" />
                          <span className="text-[9px] font-mono font-semibold">#{i + 1}</span>
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
