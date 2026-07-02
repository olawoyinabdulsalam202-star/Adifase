import { createContext, useContext, useState } from "react";
import { getAdminSession, adminLogin, adminLogout } from "../lib/auth";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => getAdminSession());

  function login(email, password) {
    const s = adminLogin(email, password);
    setSession(s);
    return s;
  }

  function logout() {
    adminLogout();
    setSession(null);
  }

  return (
    <AdminAuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
