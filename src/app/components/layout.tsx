import { Outlet } from "react-router";
import { GNB } from "./gnb";
import { Sidebar } from "./sidebar";
import { RecentItemsProvider } from "./recent-items-context";

export function Layout() {
  return (
    <RecentItemsProvider>
      <div className="flex flex-col h-screen bg-[#F7F8FA] overflow-hidden">
        <GNB />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </RecentItemsProvider>
  );
}