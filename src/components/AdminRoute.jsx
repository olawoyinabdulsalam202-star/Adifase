import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminRoute({ children }) {
  const { session } = useAdminAuth();

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
