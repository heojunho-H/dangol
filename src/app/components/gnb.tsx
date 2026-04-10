import { Search, RefreshCw, Bell, ChevronDown } from "lucide-react";

export function GNB() {
  return (
    <header className="h-[42px] min-h-[42px] bg-white border-b border-[#E0E3E8] flex items-center px-5 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-[#1A472A] flex items-center justify-center text-white text-[0.6rem]">
          D
        </div>
        <span className="text-[#1A472A] text-[1.2rem]">dnagol CRM</span>
      </div>

      {/* Breadcrumb area - placeholder */}
      <div className="flex items-center gap-1.5 text-[0.9rem] text-[#999] ml-4">
        <span className="text-[#666]">CRM</span>
        <span>›</span>
        <span className="text-[#1A1A1A]">개요</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-[256px]">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
        <input
          type="text"
          placeholder="등록된 고객 정보 검색"
          className="w-full bg-[#F7F8FA] border border-[#E0E3E8] rounded-md pl-9 pr-4 py-[6px] text-[0.9rem] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A73E8] transition-colors"
        />
      </div>

      {/* Refresh */}
      <button className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E0E3E8] text-[#666] hover:bg-[#F7F8FA] transition-colors">
        <RefreshCw size={11} />
      </button>

      {/* Notifications */}
      <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-[#666] hover:bg-[#F7F8FA] transition-colors">
        <Bell size={13} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-[#E8453A] rounded-full" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2 pl-3 border-l border-[#E0E3E8]">
        <div className="w-7 h-7 rounded-full bg-[#2CBF60] flex items-center justify-center text-white text-[0.55rem]">
          김
        </div>
        <span className="text-[0.9rem] text-[#1A1A1A]">airtor2014</span>
        <ChevronDown size={11} className="text-[#999]" />
      </div>
    </header>
  );
}