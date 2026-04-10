import { createContext, useContext, useState, type ReactNode } from "react";

export interface RecentItem {
  id: string;
  title: string;
  timestamp: number;
}

interface RecentItemsContextType {
  recentChats: RecentItem[];
  addRecentChat: (title: string) => void;
  removeRecentChat: (id: string) => void;
  renameRecentChat: (id: string, newTitle: string) => void;
}

const RecentItemsContext = createContext<RecentItemsContextType>({
  recentChats: [],
  addRecentChat: () => {},
  removeRecentChat: () => {},
  renameRecentChat: () => {},
});

const defaultRecents: RecentItem[] = [
  { id: "d1", title: "영업 관리 시스템 피드백 및 첨삭", timestamp: Date.now() - 7 * 86400000 },
  { id: "d2", title: "Dangol B2B CRM 솔루션 PPT 디자인", timestamp: Date.now() - 6 * 86400000 },
  { id: "d3", title: "발표 PPT 구성 기획", timestamp: Date.now() - 5 * 86400000 },
  { id: "d4", title: "B2B CRM SaaS 사업 발표 자료 작성", timestamp: Date.now() - 4 * 86400000 },
  { id: "d5", title: "피그마 메이크로 PPT 수정", timestamp: Date.now() - 3 * 86400000 },
  { id: "d6", title: "PPT 구성 기획", timestamp: Date.now() - 2 * 86400000 },
  { id: "d7", title: "중소기업 맞춤형 CRM 소프트웨어 다", timestamp: Date.now() - 86400000 },
];

export function RecentItemsProvider({ children }: { children: ReactNode }) {
  const [recentChats, setRecentChats] = useState<RecentItem[]>(defaultRecents);

  const addRecentChat = (title: string) => {
    const trimmed = title.length > 30 ? title.slice(0, 30) + "…" : title;
    const newItem: RecentItem = {
      id: Date.now().toString(),
      title: trimmed,
      timestamp: Date.now(),
    };
    setRecentChats((prev) => [newItem, ...prev]);
  };

  const removeRecentChat = (id: string) => {
    setRecentChats((prev) => prev.filter((item) => item.id !== id));
  };

  const renameRecentChat = (id: string, newTitle: string) => {
    setRecentChats((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  return (
    <RecentItemsContext.Provider value={{ recentChats, addRecentChat, removeRecentChat, renameRecentChat }}>
      {children}
    </RecentItemsContext.Provider>
  );
}

export const useRecentItems = () => useContext(RecentItemsContext);