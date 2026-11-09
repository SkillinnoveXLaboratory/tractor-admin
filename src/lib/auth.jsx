import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(() => ({ admin: null, powers: [], loading: Boolean(getToken()), notice: "" }));

  const signOutLocal = useCallback((notice = "") => {
    setToken(null);
    queryClient.clear();
    setState({ admin: null, powers: [], loading: false, notice });
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler((message) => signOutLocal(message || "Your session ended. Please sign in again."));
  }, [signOutLocal]);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api("/auth/me")
      .then((data) => { if (!cancelled) setState({ admin: data.admin, powers: data.powers, loading: false, notice: "" }); })
      .catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    setToken(data.token);
    setState({ admin: data.admin, powers: data.powers, loading: false, notice: "" });
  }, []);

  const replaceSession = useCallback((token, admin) => {
    if (token) setToken(token);
    if (admin) setState((s) => ({ ...s, admin }));
  }, []);

  const signOut = useCallback(() => signOutLocal(""), [signOutLocal]);

  const value = useMemo(() => {
    const isSuper = state.admin?.role === "super_admin";
    const can = (power) => Boolean(state.admin) && (isSuper || (power !== "admins" && state.admin.permissions.includes(power)));
    return { ...state, isSuper, can, signIn, signOut, replaceSession };
  }, [state, signIn, signOut, replaceSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
