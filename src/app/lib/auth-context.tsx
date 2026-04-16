import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  signOut: () => Promise<void>;
  reloadWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ACTIVE_WS_KEY = "dangol.active_workspace_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_WS_KEY)
  );

  const loadWorkspaces = async (userId: string) => {
    const { data, error } = await supabase
      .from("memberships")
      .select("role, workspace:workspaces(id, name, slug)")
      .eq("user_id", userId);

    if (error) {
      console.error("[auth] memberships load failed", error);
      setWorkspaces([]);
      return;
    }

    const list: Workspace[] = (data ?? []).flatMap((row: any) =>
      row.workspace
        ? [{ id: row.workspace.id, name: row.workspace.name, slug: row.workspace.slug, role: row.role }]
        : []
    );
    setWorkspaces(list);

    // seed 트리거가 방금 만든 워크스페이스를 자동 선택
    setActiveWorkspaceIdState((prev) => {
      if (prev && list.some((w) => w.id === prev)) return prev;
      const first = list[0]?.id ?? null;
      if (first) localStorage.setItem(ACTIVE_WS_KEY, first);
      return first;
    });
  };

  useEffect(() => {
    let mounted = true;
    let done = false;

    // Supabase 알려진 이슈: onAuthStateChange 콜백에서 async 작업(from() 등)을
    // 직접 await 하면 내부 lock 이 유지돼 getSession() 이 영영 resolve 안 함.
    // 해결: onAuthStateChange 안 async 작업은 setTimeout(0) 으로 밖으로 뺀다.
    // https://github.com/supabase/supabase-js/issues/915
    const finish = () => {
      if (!done && mounted) {
        done = true;
        setLoading(false);
      }
    };

    // 세이프티: 네트워크/SDK 가 끝내 응답 안 해도 5 초 뒤엔 UI 풀림.
    const timeoutId = window.setTimeout(() => {
      if (!done) console.warn("[auth] session load timeout (5s)");
      finish();
    }, 5000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          await loadWorkspaces(data.session.user.id);
        }
      } catch (err) {
        console.error("[auth] initial session load failed", err);
      } finally {
        finish();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      // async 는 defer — getSession lock 과 경합하지 않도록
      setTimeout(() => {
        if (!mounted) return;
        if (s?.user) {
          loadWorkspaces(s.user.id)
            .catch((err) => console.error("[auth] reload workspaces failed", err))
            .finally(finish);
        } else {
          setWorkspaces([]);
          setActiveWorkspaceIdState(null);
          localStorage.removeItem(ACTIVE_WS_KEY);
          finish();
        }
      }, 0);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(ACTIVE_WS_KEY, id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const reloadWorkspaces = async () => {
    if (session?.user) await loadWorkspaces(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        signOut,
        reloadWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useActiveWorkspaceId(): string {
  const { activeWorkspaceId } = useAuth();
  if (!activeWorkspaceId) {
    throw new Error("활성 워크스페이스가 없습니다. 로그인 가드를 통과했는지 확인하세요.");
  }
  return activeWorkspaceId;
}
