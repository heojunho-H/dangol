import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Sparkles,
  MessageSquare,
  TrendingUp,
  CheckSquare,
  Check,
  ChevronDown,
  Paperclip,
  Search,
  FileText,
  BarChart2,
  Lightbulb,
  Network,
  Clock,
  Zap,
  Plus,
  Code,
  BookOpen,
  Target,
  PenLine,
  Database,
  SlidersHorizontal,
  Globe,
  Users,
  Layers,
  Image,
  Copy,
  ThumbsUp,
  MessageCircle,
  RefreshCw,
  Share,
  Loader,
} from "lucide-react";
import { useRecentItems } from "./recent-items-context";

/* ── Types ── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  isLoading?: boolean;
}

/* ── Model definitions ── */
const models = [
  {
    id: "auto",
    name: "Auto",
    description: "최적 모델 자동 선택",
    icon: (
      <div className="w-5 h-5 rounded-full bg-[#1A73E8] flex items-center justify-center">
        <Sparkles size={11} className="text-white" />
      </div>
    ),
  },
  {
    id: "sonnet-4.6",
    name: "Sonnet 4.6",
    description: "빠른 응답, 일상 업무에 최적",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#FFF3E0" />
        <path d="M10 4l1.5 3.5L15 9l-3.5 1.5L10 14l-1.5-3.5L5 9l3.5-1.5L10 4z" fill="#F57C00" />
      </svg>
    ),
  },
  {
    id: "opus-4.6",
    name: "Opus 4.6",
    description: "복잡한 분석 및 코딩에 최적",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#FFF3E0" />
        <path d="M10 3l2 4.5L17 9l-5 1.5L10 15l-2-4.5L3 9l5-1.5L10 3z" fill="#E65100" />
      </svg>
    ),
  },
  {
    id: "gpt-5.4",
    name: "GPT 5.4",
    description: "범용 대화 및 창작에 강점",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#F5F5F5" />
        <path d="M10 4l1.5 3.5L15 9l-3.5 1.5L10 14l-1.5-3.5L5 9l3.5-1.5L10 4z" fill="#424242" />
      </svg>
    ),
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "초고속 응답, 간단한 질문에 적합",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#E8F5E9" />
        <path d="M7 10l2-5 2 5-2 5-2-5z" fill="#1A472A" />
        <path d="M10 7l5 2-5 2-5-2 5-2z" fill="#EA4335" />
        <path d="M9 9l2-2 2 2-2 2-2-2z" fill="#FBBC04" />
      </svg>
    ),
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    description: "고급 추론 및 멀티모달 지원",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#E3F2FD" />
        <path d="M7 10l2-5 2 5-2 5-2-5z" fill="#4285F4" />
        <path d="M10 7l5 2-5 2-5-2 5-2z" fill="#EA4335" />
        <path d="M9 9l2-2 2 2-2 2-2-2z" fill="#34A853" />
      </svg>
    ),
  },
];

/* ── Quick Action Chips ── */
const quickActions = [
  { icon: TrendingUp, label: "영업 전문가", command: "/sales" },
  { icon: MessageSquare, label: "고객관계관리 전문가", command: "/crm" },
  { icon: Database, label: "데이터 분석", command: "/data" },
  { icon: BarChart2, label: "매출 분석", command: "/revenue" },
  { icon: Clock, label: "스마트 리마인드", command: "/remind" },
];

/* ── Component ── */
export function HomePage() {
  const { addRecentChat } = useRecentItems();
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [activeDataSources, setActiveDataSources] = useState<string>("종합");
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const currentModel = models.find((m) => m.id === selectedModel)!;

  const handleSend = () => {
    if (!query.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    addRecentChat(query.trim());
    setQuery("");
    setChatMode(true);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "안녕하세요! 😊 무엇을 도와드릴까요?",
        status: "채팅을 시작하기 위한 준비 중",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Chat Mode View ── */
  if (chatMode) {
    return (
      <div className="flex flex-col h-full bg-[#F8F9FA]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E3E8]">
          <button className="flex items-center gap-1.5 text-[#1A1A1A] text-[22px] hover:text-[#1A472A] transition-colors">
            채팅
            <ChevronDown size={16} className="text-[#999]" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#555] text-[18px] hover:bg-[#F0F1F3] transition-colors">
            <Share size={16} />
            공유
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[1100px] mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-[#EFF5F1] text-[#1A1A1A] text-[22px] px-5 py-3 rounded-2xl max-w-[70%]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {msg.status && (
                      <button className="flex items-center gap-1 text-[#999] text-[18px] hover:text-[#666] transition-colors">
                        {msg.status}
                        <ChevronDown size={14} className="rotate-[-90deg]" />
                      </button>
                    )}
                    <p className="text-[#1A1A1A] text-[22px] leading-relaxed">
                      {msg.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {[
                        { icon: Copy, label: "복사" },
                        { icon: ThumbsUp, label: "좋아요" },
                        { icon: MessageCircle, label: "피드백" },
                        { icon: RefreshCw, label: "다시 생성" },
                      ].map((action) => (
                        <button
                          key={action.label}
                          className="text-[#BBB] hover:text-[#666] transition-colors p-1"
                          title={action.label}
                        >
                          <action.icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <Sparkles size={22} className="text-[#1A472A] animate-spin" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Bar */}
        <div className="px-6 pb-4">
          <div className="max-w-[1100px] mx-auto">
            <div className="bg-white border border-[#E0E3E8] rounded-2xl overflow-visible shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <div className="relative px-5 pt-4 pb-3">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="답글..."
                  rows={2}
                  style={{ minHeight: '56px' }}
                  className="w-full bg-transparent text-[22px] text-[#1A1A1A] placeholder-[#999] focus:outline-none resize-none leading-relaxed pr-6"
                />
                <div className="absolute right-4 top-4 w-2.5 h-2.5 rounded-full bg-[#2CBF60]" />
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <div className="relative" ref={plusMenuRef}>
                  <button
                    onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                    className="w-8 h-8 rounded-lg border border-[#E0E3E8] flex items-center justify-center text-[#888] hover:text-[#555] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Plus size={16} />
                  </button>

                  {plusMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-[260px] bg-white border border-[#E0E3E8] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-50 py-1.5">
                      {[
                        { icon: Paperclip, label: "파일 또는 사진 추가", toggleable: false },
                        { icon: Layers, label: "종합", toggleable: true },
                        { icon: TrendingUp, label: "영업관리 데이터", toggleable: true },
                        { icon: Users, label: "고객관리 데이터", toggleable: true },
                        { icon: Globe, label: "웹 검색", toggleable: true },
                      ].map((item) => {
                        const isActive = item.toggleable && activeDataSources === item.label;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              if (item.toggleable) {
                                setActiveDataSources(item.label);
                              } else {
                                setPlusMenuOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isActive ? "bg-[#EFF5F1]" : "hover:bg-[#F7F8FA]"
                            }`}
                          >
                            <item.icon size={18} className={`${isActive ? "text-[#1A472A]" : "text-[#666]"} shrink-0`} />
                            <span className={`text-[20px] flex-1 ${isActive ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>{item.label}</span>
                            {isActive && <Check size={16} className="text-[#1A472A] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                        dropdownOpen ? "bg-[#EFF5F1] text-[#1A472A]" : "text-[#666] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      <span className="text-[#1A1A1A] text-[20px]">{currentModel.name}</span>
                      <ChevronDown
                        size={12}
                        className={`text-[#999] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-[280px] bg-white border border-[#E0E3E8] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-50 py-1.5">
                        <div className="px-4 py-2.5 border-b border-[#F0F1F3]">
                          <p className="text-[#999] text-[16px] tracking-wider uppercase">모델 선택</p>
                        </div>
                        <div className="py-1">
                          {models.map((model) => {
                            const isActive = selectedModel === model.id;
                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                  isActive ? "bg-[#EFF5F1]" : "hover:bg-[#F7F8FA]"
                                }`}
                              >
                                <div className="shrink-0">{model.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[20px] ${isActive ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>
                                      {model.name}
                                    </span>
                                    {isActive && <Check size={14} className="text-[#1A472A]" />}
                                  </div>
                                  <p className="text-[18px] text-[#999] truncate">{model.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="px-4 py-2 border-t border-[#F0F1F3]">
                          <p className="text-[18px] text-[#BBB]">모델은 작업 유형에 따라 자동 전환됩니다.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSend}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      query.trim()
                        ? "bg-[#1A472A] hover:bg-[#133D22] text-white"
                        : "text-[#999] hover:bg-[#F7F8FA] hover:text-[#555]"
                    }`}
                  >
                    {query.trim() ? <ArrowUp size={16} /> : <SlidersHorizontal size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-[16px] text-[#BBB] mt-3">
              AI이며 실수할 수 있습니다. 응답을 다시 한번 확인해 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Home View (unchanged) ── */
  return (
    <div className="flex flex-col h-full items-center justify-center px-6">
      {/* Greeting — Claude style */}
      <div className="flex items-center gap-2.5 mb-8">
        <Sparkles size={28} className="text-[#1A472A]" />
        <h1 className="text-[#1A1A1A] text-[48px]">
          dnagol님, 안녕하세요
        </h1>
      </div>

      {/* Input Card */}
      <div className="w-full max-w-[920px]">
        <div className="bg-white border border-[#E0E3E8] rounded-[20px] shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-visible">
          {/* Textarea row */}
          <div className="relative px-6 pt-6 pb-5">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="오늘 어떤 도움을 드릴까요?"
              rows={3}
              style={{ minHeight: '90px' }}
              className="w-full bg-white text-[24px] text-[#1A1A1A] placeholder-[#999] focus:outline-none resize-none leading-relaxed pr-6"
              onKeyDown={handleKeyDown}
            />
            {/* Status dot */}
            <div className="absolute right-5 top-6 w-2.5 h-2.5 rounded-full bg-[#2CBF60]" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 pb-3.5">
            {/* Left: add button */}
            <div className="relative" ref={plusMenuRef}>
              <button
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                className="w-8 h-8 rounded-lg border border-[#E0E3E8] flex items-center justify-center text-[#888] hover:text-[#555] hover:bg-[#F7F8FA] transition-colors"
              >
                <Plus size={16} />
              </button>

              {plusMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-[260px] bg-white border border-[#E0E3E8] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-50 py-1.5">
                  {[
                    { icon: Paperclip, label: "파일 또는 사진 추가", toggleable: false },
                    { icon: Layers, label: "종합", toggleable: true },
                    { icon: TrendingUp, label: "영업관리 데이터", toggleable: true },
                    { icon: Users, label: "고객관리 데이터", toggleable: true },
                    { icon: Globe, label: "웹 검색", toggleable: true },
                  ].map((item) => {
                    const isActive = item.toggleable && activeDataSources === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.toggleable) {
                            setActiveDataSources(item.label);
                          } else {
                            setPlusMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive ? "bg-[#EFF5F1]" : "hover:bg-[#F7F8FA]"
                        }`}
                      >
                        <item.icon size={18} className={`${isActive ? "text-[#1A472A]" : "text-[#666]"} shrink-0`} />
                        <span className={`text-[18px] flex-1 ${isActive ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>{item.label}</span>
                        {isActive && <Check size={16} className="text-[#1A472A] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: model selector + send */}
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all ${
                    dropdownOpen
                      ? "bg-[#EFF5F1] text-[#1A472A]"
                      : "text-[#666] hover:bg-[#F7F8FA]"
                  }`}
                >
                  <span className="text-[#1A1A1A] text-[18px]">{currentModel.name}</span>
                  <ChevronDown
                    size={12}
                    className={`text-[#999] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-[280px] bg-white border border-[#E0E3E8] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-50 py-1.5">
                    <div className="px-4 py-2.5 border-b border-[#F0F1F3]">
                      <p className="text-[#999] text-[16px] tracking-wider uppercase">모델 선택</p>
                    </div>
                    <div className="py-1">
                      {models.map((model) => {
                        const isActive = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isActive ? "bg-[#EFF5F1]" : "hover:bg-[#F7F8FA]"
                            }`}
                          >
                            <div className="shrink-0">{model.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[18px] ${isActive ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>
                                  {model.name}
                                </span>
                                {isActive && <Check size={14} className="text-[#1A472A]" />}
                              </div>
                              <p className="text-[16px] text-[#999] truncate">{model.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2 border-t border-[#F0F1F3]">
                      <p className="text-[16px] text-[#BBB]">모델은 작업 유형에 따라 자동 전환됩니다.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Send / voice button */}
              <button
                onClick={handleSend}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  query.trim()
                    ? "bg-[#1A472A] hover:bg-[#133D22] text-white"
                    : "text-[#999] hover:bg-[#F7F8FA] hover:text-[#555]"
                }`}
              >
                {query.trim() ? <ArrowUp size={16} /> : <SlidersHorizontal size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Chips — Claude style, below input */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => setQuery(a.command + " ")}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E0E3E8] rounded-full text-[18px] text-[#555] bg-white hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#EFF5F1] transition-colors"
            >
              <a.icon size={14} strokeWidth={1.8} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}