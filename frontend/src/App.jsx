import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Poll from "./pages/Poll";
import Leaderboard from "./pages/Leaderboard";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminParticipants from "./pages/admin/AdminParticipants";
import AdminVoters from "./pages/admin/AdminVoters";
import AdminVotingStatus from "./pages/admin/AdminVotingStatus";
import AdminHistory from "./pages/admin/AdminHistory";
import AdminResults from "./pages/admin/AdminResults";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/poll"
              element={
                <ProtectedRoute>
                  <Poll />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="participants" element={<AdminParticipants />} />
              <Route path="voters" element={<AdminVoters />} />
              <Route path="voting-status" element={<AdminVotingStatus />} />
              <Route path="history" element={<AdminHistory />} />
              <Route path="results" element={<AdminResults />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
