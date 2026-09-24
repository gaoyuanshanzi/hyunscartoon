'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle,
  Clock,
  BookOpen,
  RefreshCw,
  Copy,
  Check,
  Film,
  Camera,
  MessageSquare,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Split,
  Trash2,
  Wand2,
  Edit3,
} from 'lucide-react';
import type { CutData } from './StudioPage';
import { analyzeStoryIntoConti, GeneratedContiCut, NINE_CUT_PHASES } from '@/lib/storyAnalyzer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const GENRE_OPTIONS = [
  { value: 'drama', label: '🎭 드라마 / 평전', desc: '감동적인 인물 및 역사 이야기' },
  { value: 'fantasy', label: '⚔️ SF / 판타지', desc: '유인원 혁명, 미래 기술, 판타지' },
  { value: 'romance', label: '💕 로맨스', desc: '설레는 사랑과 따스한 감성' },
  { value: 'thriller', label: '🔍 스릴러', desc: '긴장감 넘치는 전개' },
  { value: 'action', label: '💥 액션', desc: '역동적인 임팩트 씬' },
];

// 예시 스토리 (10개 박스 규격)
const EXAMPLE_BOX_STORIES = [
  {
    title: '유인원의 반란: 본래의 자연으로',
    genre: 'fantasy',
    cuts: [
      '인간의 끝없는 개발로 황폐해진 미래의 잿빛 도시, 비밀 연구소 안에서 고요한 긴장감이 흐른다.',
      '지능을 각성한 오랑우탄과 유인원들은 조용히 서로의 눈빛을 교환하며 자유를 준비한다.',
      '통제실의 철창을 열고 나온 유인원들은 도시의 중앙 통제 타워를 향해 은밀하게 전진한다.',
      '경보음이 울리는 가운데, 거대한 고릴라 지휘관들이 인간 경비대를 무력화하고 통제소를 장악한다.',
      '복잡한 전선과 깜빡이는 모니터로 가득 찬 첨단 방송국 관제실 안으로 유인원들이 들어선다.',
      '오랑우탄 참모진은 인류의 전자기기를 역이용해 전 세계 방송에 "지구의 주인은 이제 본래의 자연으로 돌아간다"는 메시지를 송출했다.',
      '전 세계 거대 전광판과 TV 화면마다 군복을 입은 오랑우탄 참모진의 결연한 모습과 지구 지도 신호가 일제히 송출된다.',
      '인간들이 경악하는 사이, 모든 전력망이 차단되고 콘크리트 도시 틈새로 푸른 덩굴과 식물들이 자라나기 시작한다.',
      '황폐했던 도시는 울창한 녹색 원시림으로 뒤덮이고, 지구는 마침내 본래의 평화로운 자연으로 돌아간다.',
    ],
  },
  {
    title: '방황에서 성자(聖者)로: 어거스틴의 삶',
    genre: 'drama',
    cuts: [
      '북아프리카 타가스테의 고요한 새벽, 이교도 아버지와 열성적인 기독교인 어머니 모니카 사이에서 아우구스티누스가 태어난다.',
      '어린 어거스틴은 학문에 대한 비상한 재능을 보이며 지혜를 갈망하기 시작한다.',
      '청년이 된 어거스틴은 카르타고로 유학을 떠나 화려한 도시의 수사학에 빠져들며 방황한다.',
      '진리를 찾아 마니교에 심취했으나 공허함만 깊어지고, 어머니 모니카는 눈물로 아들을 위해 기도한다.',
      '로마와 밀라노로 떠난 어거스틴은 성 암브로시우스 주교의 지성적인 설교를 듣고 깊은 충격을 받는다.',
      '밀라노의 무화과나무 아래서 영혼의 고통으로 울부짖을 때, "집어 들고 읽으라(Tolle Lege)"는 아이들의 신비로운 노랫소리가 들린다.',
      '성경을 펼쳐 로마서 13장을 읽는 순간, 의심의 어둠이 사라지고 마음속에 확실한 평화의 빛이 쏟아져 내린다.',
      '어머니 모니카와 거룩한 기쁨을 나누고, 아프리카로 돌아와 히포의 주교로서 교회를 섬긴다.',
      '인류 지성사의 영원한 고전 《고백록》과 《신의 도성》을 남기며, 성자는 평화롭게 영원의 빛 속으로 들어간다.',
    ],
  },
  {
    title: '도시의 작은 카페 이야기',
    genre: 'drama',
    cuts: [
      '서울 골목의 작은 카페, 아침 햇살이 창문을 비추고 그윽한 원두 향기가 가득 차오른다.',
      '매일 아침 7시, 홀로 정갈하게 커피 머신을 닦으며 조용한 하루를 준비한다.',
      '비 내리는 오후, 우산을 든 손님이 찾아와 창가 자리에 앉아 조용히 노트북을 펼친다.',
      '비어가는 커피잔에 따뜻한 커피를 조용히 채워주고, 잔잔한 음악이 실내를 채운다.',
      '매일 같은 자리에 앉아 글을 쓰는 손님과 묵묵히 공간을 지키는 시간들이 이어진다.',
      '어느 비 오는 월요일 아침, 늘 켜져 있던 창가 자리의 조명이 비어 있다.',
      '일주일 만에 다시 문이 열리고, 젖은 코트를 털며 환한 미소로 들어선다.',
      '카운터 위에 놓인 선물 상자와 정성스레 묶인 한 권의 갓 인쇄된 소설책.',
      '따뜻한 커피 두 잔을 마주 놓고 나누는 다정한 대화와 함께 새로운 내일이 시작된다.',
    ],
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
  // 10개 박스 상태 (주제/제목 1개 + #1~#9 본문 9개)
  const [storyTitle, setStoryTitle] = useState('');
  const [cutBoxes, setCutBoxes] = useState<string[]>(Array(9).fill(''));
  const [customPrompts, setCustomPrompts] = useState<string[]>(Array(9).fill(''));
  const [openPromptIndices, setOpenPromptIndices] = useState<Record<number, boolean>>({});
  const [genre, setGenre] = useState('fantasy');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');

  const [contiCuts, setContiCuts] = useState<GeneratedContiCut[]>([]);
  const [copiedConti, setCopiedConti] = useState(false);
  const [contiViewMode, setContiViewMode] = useState<'cards' | 'script'>('cards');
  const [showContiSection, setShowContiSection] = useState(true);

  const eventSourceRef = useRef<EventSource | null>(null);

  // 10개 박스 내용이 변경될 때마다 실시간 9컷 콘티 및 고차원 비주얼 프롬프트 갱신
  useEffect(() => {
    const hasAnyContent = storyTitle.trim().length > 0 || cutBoxes.some(c => c.trim().length > 0);
    if (!hasAnyContent) {
      setContiCuts([]);
      return;
    }
    const analyzed = analyzeStoryIntoConti(cutBoxes, genre, storyTitle);
    setContiCuts(analyzed.cuts);

    // 사용자가 직접 입력한 커스텀 프롬프트가 없는 컷은 자동 생성된 고차원 프롬프트로 기본 채우기
    setCustomPrompts(prev => {
      const next = [...prev];
      analyzed.cuts.forEach((c, idx) => {
        if (!next[idx] || next[idx].trim().length === 0) {
          next[idx] = c.prompt;
        }
      });
      return next;
    });
  }, [storyTitle, cutBoxes, genre]);

  // 개별 박스 텍스트 업데이트
  const handleCutChange = (index: number, val: string) => {
    setCutBoxes(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    // 본문이 바뀌면 해당 컷의 커스텀 프롬프트도 초기화하여 새 본문 기반으로 재생성되게 유도
    setCustomPrompts(prev => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
  };

  // 개별 영문 프롬프트 직접 수정
  const handlePromptChange = (index: number, val: string) => {
    setCustomPrompts(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // 프롬프트 토글
  const togglePromptOpen = (index: number) => {
    setOpenPromptIndices(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // 예시 스토리 불러오기
  const handleLoadExample = (exampleIndex: number) => {
    const ex = EXAMPLE_BOX_STORIES[exampleIndex];
    setStoryTitle(ex.title);
    setGenre(ex.genre);
    setCutBoxes([...ex.cuts]);
    setCustomPrompts(Array(9).fill('')); // 새 예시에 맞게 자동 재생성
  };

  // 전체 초기화
  const handleClearAll = () => {
    if (confirm('입력한 10개 박스 내용을 모두 지우시겠습니까?')) {
      setStoryTitle('');
      setCutBoxes(Array(9).fill(''));
      setCustomPrompts(Array(9).fill(''));
      setContiCuts([]);
    }
  };

  // 일괄 텍스트 9등분 분배 적용
  const handleApplyBatchSplit = () => {
    if (!batchText.trim()) return;
    const lines = batchText
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    const newBoxes = Array(9).fill('');
    if (lines.length >= 9) {
      const step = lines.length / 9;
      for (let i = 0; i < 9; i++) {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        newBoxes[i] = lines.slice(start, end).join(' ');
      }
    } else {
      for (let i = 0; i < 9; i++) {
        newBoxes[i] = lines[i % lines.length] || '';
      }
    }
    setCutBoxes(newBoxes);
    setCustomPrompts(Array(9).fill(''));
    setShowBatchModal(false);
    setBatchText('');
  };

  // 콘티 텍스트 클립보드 복사
  const handleCopyConti = () => {
    if (contiCuts.length === 0) return;
    const text = contiCuts
      .map((c, idx) => {
        const promptToUse = customPrompts[idx] || c.prompt;
        return `[컷 #${c.cut_index} - ${c.phase}] ${c.scene_title}\n• 카메라: ${c.camera_angle}\n• 화자: ${c.speaker}\n• 대사: "${c.dialogue}"\n• 본문: ${c.direction}\n• 고차원 비주얼 프롬프트:\n  ${promptToUse}\n`;
      })
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(`=== ${storyTitle || '9컷 웹툰 콘티'} ===\n\n` + text);
    setCopiedConti(true);
    setTimeout(() => setCopiedConti(false), 2000);
  };

  // 9컷 웹툰 생성 시작
  const handleGenerate = async () => {
    const hasAnyContent = cutBoxes.some(c => c.trim().length > 0);
    if (!hasAnyContent) {
      alert('#1~#9 박스 중 최소 하나 이상의 스토리 본문을 입력해 주세요.');
      return;
    }

    setGenerating(true);
    setProgress(5);
    setStatusMsg('📖 고차원 비주얼 프롬프트 분석 및 9컷 웹툰 기획을 시작합니다...');
    setCompletedCuts([]);
    setFinished(false);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const titleParam = encodeURIComponent(storyTitle.trim());
    const genreParam = encodeURIComponent(genre);
    const cutsParam = encodeURIComponent(JSON.stringify(cutBoxes));
    const promptsParam = encodeURIComponent(JSON.stringify(customPrompts));
    const url = `${API_BASE}/api/generate-stream?title=${titleParam}&genre=${genreParam}&cuts=${cutsParam}&prompts=${promptsParam}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    const cutsAccumulator: CutData[] = [];

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setStatusMsg(data.message);
          setProgress(data.progress || 10);
        } else if (data.type === 'conti_ready') {
          setStatusMsg(data.message);
          setProgress(data.progress || 20);
          if (data.conti_cuts) {
            setContiCuts(data.conti_cuts);
          }
        } else if (data.type === 'cut_done') {
          setStatusMsg(data.message);
          setProgress(data.progress);
          const newCut: CutData = data.cut_data;
          cutsAccumulator.push(newCut);
          setCompletedCuts([...cutsAccumulator]);
        } else if (data.type === 'complete') {
          setStatusMsg(data.message);
          setProgress(100);
          setGenerating(false);
          setFinished(true);
          const finalSessionId = data.session_id || 'session_' + Date.now();
          setSessionId(finalSessionId);
          onComplete(data.cuts || cutsAccumulator, data.title || storyTitle || '웹툰', finalSessionId);
          es.close();
        } else if (data.type === 'error') {
          setStatusMsg(`오류 발생: ${data.message}`);
          setGenerating(false);
          es.close();
        }
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    es.onerror = () => {
      console.error('EventSource error occurred');
      setStatusMsg('AI 생성 서버 통신 완료 또는 연결 종료');
      setGenerating(false);
      es.close();
    };
  };

  const filledCount = cutBoxes.filter(c => c.trim().length > 0).length;

  return (
    <div className="space-y-6">
      {/* ── 1. 스토리 입력 패널 (10개 박스 양식 + 고차원 비주얼 프롬프트 에디터) ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
        {/* 상단 헤더 & 컨트롤 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">✍️</span>
              9컷 웹툰 스토리 입력 양식 (10개 Box)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              [주요 대상 + 구체적 행동 + 배경 장소 + 화풍] 구조의 영문 비주얼 프롬프트가 자동 생성되며 직접 수정도 가능합니다. (작성: {filledCount}/9)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* 전체 텍스트 일괄 배분 버튼 */}
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-all font-semibold"
            >
              <Split className="w-3.5 h-3.5" />
              통글 9컷 자동 배분
            </button>

            {/* 예시 불러오기 */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all font-medium"
              >
                <BookOpen className="w-3.5 h-3.5" />
                예시 로드
              </button>
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 hidden group-hover:block z-30">
                {EXAMPLE_BOX_STORIES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleLoadExample(i)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-indigo-50 text-gray-800 hover:text-indigo-700 transition-colors block"
                  >
                    <span className="font-bold block truncate">{ex.title}</span>
                    <span className="text-[10px] text-gray-400">
                      {i === 0 ? '🐒 유인원 혁명 (사용자 추천 예시)' : '9컷 자동 완성 예시'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 초기화 */}
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="모두 지우기"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 장르 선택 바 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> 장르:
          </span>
          {GENRE_OPTIONS.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGenre(g.value)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                genre === g.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* ── [BOX 0] 주제 / 제목 입력창 ── */}
        <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-blue-50/70 p-4 rounded-2xl border-2 border-indigo-100/80 space-y-1.5">
          <label className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">BOX 0</span>
            <span>📌 주제 / 제목</span>
            <span className="text-[11px] text-indigo-400 font-normal">(웹툰의 메인 타이틀)</span>
          </label>
          <input
            type="text"
            value={storyTitle}
            onChange={e => setStoryTitle(e.target.value)}
            placeholder="예: 유인원의 반란: 본래의 자연으로 (미입력 시 본문에서 자동 추출)"
            className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>

        {/* ── [BOX 1 ~ BOX 9] 컷별 본문 + 고차원 비주얼 프롬프트 에디터 그리드 ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-1">
            <span>📖 컷별 본문 및 영문 비주얼 프롬프트 (9개 박스)</span>
            <span className="text-gray-400 font-normal">각 컷별 영문 프롬프트를 펼쳐서 직접 확인 및 수정할 수 있습니다.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cutBoxes.map((text, idx) => {
              const phaseInfo = NINE_CUT_PHASES[idx];
              const pColor = PHASE_COLORS[phaseInfo.code];
              const isFilled = text.trim().length > 0;
              const currentPrompt = customPrompts[idx] || (contiCuts[idx] ? contiCuts[idx].prompt : '');
              const isOpenPrompt = openPromptIndices[idx];

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border-2 transition-all p-4 space-y-3 flex flex-col justify-between ${
                    isFilled ? `${pColor.border} shadow-sm bg-gradient-to-b from-white to-gray-50/40` : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${pColor.badge}`}>
                        #{idx + 1}
                      </span>
                      <span className={`text-[11px] font-bold ${pColor.text}`}>
                        {phaseInfo.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {text.length}자
                    </span>
                  </div>

                  {/* 한글 본문 입력 영역 */}
                  <textarea
                    value={text}
                    onChange={e => handleCutChange(idx, e.target.value)}
                    placeholder={`#${idx + 1} 장면 본문 내용을 입력하세요... (예: 오랑우탄 참모진은 인류의 전자기기를 역이용해...)`}
                    rows={4}
                    className="w-full text-xs text-gray-800 placeholder:text-gray-400 bg-transparent resize-none focus:outline-none leading-relaxed border-b border-gray-100 pb-2"
                  />

                  {/* 🎨 고차원 영문 비주얼 프롬프트 (Visual Prompt) 아코디언 토글 */}
                  <div className="space-y-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => togglePromptOpen(idx)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>영문 비주얼 프롬프트</span>
                        {isOpenPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {isOpenPrompt ? '직접 수정 가능' : '클릭하여 확인'}
                      </span>
                    </div>

                    {isOpenPrompt ? (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                        <textarea
                          value={currentPrompt}
                          onChange={e => handlePromptChange(idx, e.target.value)}
                          rows={4}
                          placeholder="A smart orangutan dressed in military advisor uniform, sitting in front of high-tech broadcasting control room..."
                          className="w-full text-[11px] font-mono text-slate-800 bg-white border border-indigo-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-normal resize-none"
                        />
                        <p className="text-[9px] text-slate-400 leading-tight">
                          💡 구조: [주요 대상 + 구체적 행동 + 배경 장소 + 화풍/조명]
                        </p>
                      </div>
                    ) : (
                      <p
                        onClick={() => togglePromptOpen(idx)}
                        className="text-[10px] text-slate-500 font-mono truncate cursor-pointer hover:text-indigo-600 transition-colors"
                        title={currentPrompt}
                      >
                        {currentPrompt || '본문 입력 시 고차원 프롬프트가 자동 생성됩니다.'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 생성 실행 버튼 ── */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            총 <strong>{filledCount}개</strong>의 컷이 작성되었습니다. (영문 비주얼 프롬프트 100% 자동 매핑)
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {finished && completedCuts.length > 0 && (
              <button
                type="button"
                onClick={onViewWebtoon}
                className="flex-1 sm:flex-none text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                완성된 9컷 웹툰 보기
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || filledCount === 0}
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-w-[220px]"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  생성 중... ({progress}%)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  9컷 웹툰 생성하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 진행률 바 */}
        {generating && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-300">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                {statusMsg}
              </span>
              <span className="font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 2. 콘티 형식 텍스트 및 고차원 프롬프트 표시 영역 ── */}
      {contiCuts.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-600" />
                9컷 콘티 &amp; 영문 비주얼 프롬프트 기획안
                <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
                  총 9컷
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                [주요 대상 + 구체적 행동 + 배경 장소 + 화풍] 4대 구조로 완벽 매핑된 연출 기획안입니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setContiViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    contiViewMode === 'cards' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  카드형
                </button>
                <button
                  type="button"
                  onClick={() => setContiViewMode('script')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    contiViewMode === 'script' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  대본형
                </button>
              </div>

              {/* 클립보드 복사 */}
              <button
                type="button"
                onClick={handleCopyConti}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl transition-all font-medium"
              >
                {copiedConti ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedConti ? '복사됨!' : '콘티 복사'}
              </button>

              {/* 접기/펼치기 */}
              <button
                type="button"
                onClick={() => setShowContiSection(!showContiSection)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {showContiSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showContiSection && (
            <>
              {contiViewMode === 'cards' ? (
                /* ── 카드형 뷰 ── */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {contiCuts.map((cut, idx) => {
                    const pColor = PHASE_COLORS[cut.phase_code] || PHASE_COLORS.기;
                    const promptToDisplay = customPrompts[idx] || cut.prompt;

                    return (
                      <div
                        key={cut.cut_index}
                        className={`rounded-2xl border ${pColor.border} ${pColor.bg} p-4 space-y-2.5 hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${pColor.badge}`}>
                            #{String(cut.cut_index).padStart(2, '0')} {cut.phase_code}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-gray-400" />
                            {cut.camera_angle}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 leading-snug">
                          {cut.scene_title}
                        </h4>

                        <div className="bg-white/90 rounded-xl p-2.5 border border-gray-100 text-xs text-gray-700 leading-relaxed">
                          <span className="text-[10px] font-bold text-gray-400 block mb-0.5">지문 / 본문</span>
                          <p className="line-clamp-2">{cut.direction}</p>
                        </div>

                        {/* 고차원 영문 비주얼 프롬프트 박스 */}
                        <div className="bg-slate-900 text-slate-200 rounded-xl p-2.5 text-[11px] font-mono leading-relaxed space-y-1">
                          <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            <Wand2 className="w-3 h-3" /> Visual Prompt:
                          </span>
                          <p className="line-clamp-3 text-slate-300">{promptToDisplay}</p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-gray-500">
                            {cut.hasHuman ? '👤 주체 등장' : '🏞️ 순수 배경·풍경'}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {cut.speaker}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── 대본형 뷰 ── */
                <div className="bg-gray-950 text-gray-200 rounded-2xl p-5 font-mono text-xs space-y-3 max-h-96 overflow-y-auto">
                  <div className="text-indigo-400 font-bold border-b border-gray-800 pb-2">
                    === {storyTitle || '9컷 웹툰 콘티 대본 (고차원 비주얼 프롬프트)'} ===
                  </div>
                  {contiCuts.map((cut, idx) => (
                    <div key={cut.cut_index} className="border-b border-gray-800/60 pb-3 space-y-1">
                      <div className="text-emerald-400 font-bold">
                        CUT #{cut.cut_index} [{cut.phase}] : {cut.scene_title}
                      </div>
                      <div className="text-gray-400">• 연출 구도: {cut.camera_angle} ({cut.hasHuman ? '주체 샷' : '배경 풍경'})</div>
                      <div className="text-gray-300">• 본문: {cut.direction}</div>
                      <div className="text-indigo-300">• 영문 Visual Prompt: {customPrompts[idx] || cut.prompt}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 통글 9컷 자동 배분 모달 ── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Split className="w-4 h-4" />
                  긴 글 한 번에 붙여넣기 (9컷 자동 배분)
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  A4지 분량의 전체 글을 넣으시면 9개 박스에 문장별로 고르게 배분해 드립니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                rows={8}
                placeholder="여기에 원작 스토리 본문 전체를 붙여넣으세요..."
                className="w-full border border-gray-200 rounded-2xl p-4 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-xs"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchSplit}
                  disabled={!batchText.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs disabled:opacity-50"
                >
                  9개 박스에 배분하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
