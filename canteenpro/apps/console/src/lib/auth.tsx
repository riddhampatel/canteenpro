import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setApiHandlers, tokenStore } from './api';

export interface Canteen {
  id: string;
  name: string;
  code: string;
  clientCompany?: string | null;
}
export interface Session {
  user: { id: string; name: string; email: string; role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' };
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null; currency: string; timezone: string; status: string };
  canteens: Canteen[];
  subscription?: {
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    daysLeft: number;
    active: boolean;
    plan: { code: string; name: string; features: Record<string, boolean> } | null;
  };
}

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  canteenId: string;
  setCanteenId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (...roles: Session['user']['role'][]) => boolean;
  feature: (f: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null as any);
const CANTEEN_KEY = 'cp_console_canteen';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canteenId, setCanteenIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(CANTEEN_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const setCanteenId = (id: string) => {
    setCanteenIdState(id);
    try {
      localStorage.setItem(CANTEEN_KEY, id);
    } catch {}
  };

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const s = await api.get<Session>('/auth/me');
      setSession(s);
      if (!s.canteens.find((c) => c.id === canteenId) && s.canteens[0]) setCanteenId(s.canteens[0].id);
    } catch {
      tokenStore.clear();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [canteenId]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setSession(null);
  }, []);

  useEffect(() => {
    setApiHandlers({
      unauthorized: () => {
        tokenStore.clear();
        setSession(null);
      },
      paymentRequired: () => {
        if (!location.pathname.startsWith('/billing')) location.assign('/billing?expired=1');
      },
    });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post<Session & { token: string }>('/auth/login', { email, password });
    tokenStore.set(r.token);
    await refresh();
  };
  const loginWithToken = async (token: string) => {
    tokenStore.set(token);
    await refresh();
  };

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      canteenId,
      setCanteenId,
      login,
      loginWithToken,
      logout,
      refresh,
      can: (...roles) => !!session && roles.includes(session.user.role),
      feature: (f) => session?.subscription?.plan?.features?.[f] !== false,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, loading, canteenId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
