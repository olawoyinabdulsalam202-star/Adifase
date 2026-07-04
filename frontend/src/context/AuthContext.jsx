import { createContext, useContext, useEffect, useState } from "react";
import { getVoterSession, voterLogin, voterLogout } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getVoterSession());

  useEffect(() => {
    const onStorage = () => setSession(getVoterSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function login(email, password) {
    const s = await voterLogin(email, password);
    setSession(s);
    return s;
  }

  function logout() {
    voterLogout();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
