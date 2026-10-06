import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { can as roleCan, type Permission, type UserInfo } from "@f-docbase/shared";
import { api } from "../api/client";

type AuthState = {
  /** 初回の状態取得が終わるまで true */
  loading: boolean;
  user: UserInfo | null;
  setupRequired: boolean;
  refresh: () => Promise<void>;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await api.authStatus();
      setUser(s.user);
      setSetupRequired(s.setupRequired);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({ loading, user, setupRequired, refresh, can: (p) => !!user && roleCan(user.role, p) }),
    [loading, user, setupRequired, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
