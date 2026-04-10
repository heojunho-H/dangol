import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Settings2,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  Download,
  Send,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Person {
  id: number;
  name: string;
  avatar: string;
  title: string;
  company: string;
  status: string;
  statusColor: string;
  statusBg: string;
  lastActivity: string;
  email: string;
  phone: string;
  location: string;
  recentOrder: number;
}

const people: Person[] = [
  {
    id: 1, name: "박지영",
    avatar: "https://images.unsplash.com/photo-1610387694365-19fafcc86d86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjB3b21hbiUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NTY2Mjc3MHww&ixlib=rb-4.1.0&q=80&w=1080",
    title: "CEO", company: "TechVision Inc.", status: "활성", statusColor: "#2CBF60", statusBg: "#EEFBF3",
    lastActivity: "오늘", email: "jy.park@techvision.co", phone: "+82 10-1234-5678", location: "서울, 강남구", recentOrder: 3,
  },
  {
    id: 2, name: "이준호",
    avatar: "https://images.unsplash.com/photo-1543132220-e7fef0b974e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMGJ1c2luZXNzJTIwY2FzdWFsJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzc1NjYxNTk0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "CTO", company: "DataFlow Systems", status: "리드", statusColor: "#1A472A", statusBg: "#EFF5F1",
    lastActivity: "어제", email: "junho.lee@dataflow.io", phone: "+82 10-9876-5432", location: "서울, 서초구", recentOrder: 1,
  },
  {
    id: 3, name: "최미란",
    avatar: "https://images.unsplash.com/photo-1761243892035-c3e13829115a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsJTIwaGVhZHNob3R8ZW58MXx8fHwxNzc1NjA3NDYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "VP of Sales", company: "GlobalTrade Co.", status: "검증됨", statusColor: "#FFA726", statusBg: "#FFF8EC",
    lastActivity: "2일 전", email: "miran@globaltrade.kr", phone: "+82 10-5555-7890", location: "부산, 해운대구", recentOrder: 2,
  },
  {
    id: 4, name: "정한결",
    avatar: "https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG1hbiUyMHN1aXQlMjBwb3J0cmFpdCUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzU2NjI3NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Director", company: "SmartFactory AI", status: "비활성", statusColor: "#999", statusBg: "#F5F5F5",
    lastActivity: "1주 전", email: "hg.jung@smartfactory.ai", phone: "+82 10-3333-4444", location: "대전, 유성구", recentOrder: 0,
  },
  {
    id: 5, name: "김현수",
    avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBvcnRyYWl0JTIwaGVhZHNob3R8ZW58MXx8fHwxNzc1NTU3NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Product Manager", company: "MediCare Health", status: "활성", statusColor: "#2CBF60", statusBg: "#EEFBF3",
    lastActivity: "오늘", email: "hs.kim@medicare.co.kr", phone: "+82 10-7777-8888", location: "서울, 마포구", recentOrder: 1,
  },
];

export function CustomersPage() {
  const [activeTab, setActiveTab] = useState<"companies" | "people">("people");
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [clientActive, setClientActive] = useState(true);

  const filtered = people.filter(
    (p) =>
      p.name.includes(search) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* Main Table */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-[#E0E3E8]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[#1A1A1A] text-[27px]">고객관리</h1>
              <p className="text-[#999] text-[0.9rem]">연락처 및 기업 관리</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 border border-[#E0E3E8] text-[#666] rounded-md hover:bg-[#F7F8FA] transition-colors text-[0.9rem]">
                <Settings2 size={11} />
                보기 설정
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#1A472A] text-white rounded-md hover:bg-[#133D22] transition-colors text-[0.9rem]">
                <Plus size={11} />
                고객 추가
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-5 mb-4">
            {(["people", "companies"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-[0.9rem] border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "text-[#1A472A] border-[#1A472A]"
                    : "text-[#999] border-transparent hover:text-[#444]"
                }`}
              >
                {tab === "companies" ? "기업" : "연락처"}
              </button>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="연락처 검색..."
                className="w-full bg-[#F7F8FA] border border-[#E0E3E8] rounded-md pl-9 pr-4 py-2 text-[0.9rem] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A472A] transition-colors"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-[#E0E3E8] text-[#666] rounded-md hover:bg-[#F7F8FA] transition-colors text-[0.9rem]">
              <SlidersHorizontal size={11} />
              필터
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E3E8] bg-[#F7F8FA]">
                <th className="w-10 py-2.5 px-4">
                  <input type="checkbox" className="accent-[#1A472A]" />
                </th>
                {["이름", "직함", "회사", "상태", "최근 활동"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-[#999] text-[0.8rem] tracking-wider uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => { setSelectedPerson(p); setClientActive(p.status === "활성"); }}
                  className={`border-b border-[#F0F1F3] cursor-pointer transition-colors ${
                    selectedPerson?.id === p.id ? "bg-[#EFF5F1]" : "hover:bg-[#FAFBFC]"
                  }`}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-[#1A472A]"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img src={p.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-[#1A1A1A] text-[0.9rem]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#666] text-[0.9rem]">{p.title}</td>
                  <td className="py-3 px-4 text-[#666] text-[0.9rem]">{p.company}</td>
                  <td className="py-3 px-4">
                    <span
                      className="text-[0.8rem] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: p.statusBg, color: p.statusColor }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#999] text-[0.9rem]">{p.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-white border-t border-[#E0E3E8] flex items-center gap-3">
            <span className="text-[#666] text-[0.85rem] mr-2">{selectedIds.size}건 선택됨</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#666] hover:bg-[#F7F8FA] transition-colors">
              <Download size={10} /> CSV 내보내기
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#1A472A] hover:bg-[#EFF5F1] transition-colors">
              <Send size={10} /> 일괄 이메일
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#E8453A] hover:bg-[#FEF2F2] transition-colors">
              <Trash2 size={10} /> 삭제
            </button>
          </div>
        )}
      </div>

      {/* Right Detail Panel */}
      {selectedPerson && (
        <div className="w-[240px] min-w-[240px] border-l border-[#E0E3E8] bg-white overflow-y-auto">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#1A1A1A] text-[1.1rem]">고객 요약</h3>
              <button onClick={() => setSelectedPerson(null)} className="text-[#999] hover:text-[#444] transition-colors">
                <X size={13} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#F0F1F3]">
              <img src={selectedPerson.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
              <div>
                <p className="text-[#1A1A1A] text-[1.1rem]">{selectedPerson.name}</p>
                <p className="text-[#999] text-[0.85rem]">{selectedPerson.company}</p>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[#666] text-[0.85rem]">활성 고객</span>
              <button onClick={() => setClientActive(!clientActive)}>
                {clientActive ? (
                  <ToggleRight size={19} className="text-[#2CBF60]" />
                ) : (
                  <ToggleLeft size={19} className="text-[#D1D5DB]" />
                )}
              </button>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-5">
              {[
                { label: "직함", value: selectedPerson.title },
                { label: "회사", value: selectedPerson.company },
                { label: "최근 주문", value: String(selectedPerson.recentOrder) },
                { label: "상태", value: selectedPerson.status },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#F0F1F3]">
                  <span className="text-[#999] text-[0.65rem]">{item.label}</span>
                  <span className="text-[#1A1A1A] text-[0.9rem]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="space-y-2 mb-5">
              {[
                { icon: Mail, value: selectedPerson.email, color: "#1A472A" },
                { icon: Phone, value: selectedPerson.phone, color: "#2CBF60" },
                { icon: MapPin, value: selectedPerson.location, color: "#FFA726" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#F7F8FA] rounded-md">
                  <item.icon size={11} style={{ color: item.color }} className="shrink-0" />
                  <span className="text-[#444] text-[0.85rem] truncate">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-[#999] text-[0.8rem] tracking-wider uppercase mb-3">활동</h4>
              <div className="space-y-0">
                {[
                  { action: "이메일 발송됨", time: "오늘 09:30" },
                  { action: "미팅 완료", time: "어제 15:00" },
                  { action: "제안서 전달됨", time: "4월 5일" },
                  { action: "첫 연락", time: "3월 28일" },
                ].map((event, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#1A472A] mt-1.5" />
                      {i < 3 && <div className="w-px flex-1 bg-[#E0E3E8] my-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-[#1A1A1A] text-[0.85rem]">{event.action}</p>
                      <p className="text-[#999] text-[0.8rem] flex items-center gap-1">
                        <Clock size={8} /> {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}