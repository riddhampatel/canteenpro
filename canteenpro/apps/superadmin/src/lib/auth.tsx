import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setApiHandlers, tokenStore } from "./api";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "SUPPORT" | "CONTENT_EDITOR";
}
interface Ctx {
  user: Admin | null;
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  logout: () => void;
  is: (...r: Admin["role"][]) => boolean;
}
const C = createContext<Ctx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setApiHandlers({
      unauthorized: () => {
        tokenStore.clear();
        setUser(null);
      },
      paymentRequired: () => {},
    });
    if (!tokenStore.get()) return setLoading(false);
    api
      .get<Admin>("/platform/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: Admin }>(
      "/platform/auth/login",
      { email, password },
    );
    tokenStore.set(r.token);
    setUser(r.user);
  };
  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };
  return (
    <C.Provider
      value={{
        user,
        loading,
        login,
        logout,
        is: (...r) => !!user && r.includes(user.role),
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useAuth = () => useContext(C);
