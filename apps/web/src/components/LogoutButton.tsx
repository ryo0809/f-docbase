import { useNavigate } from "react-router";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function LogoutButton() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function logout() {
    await api.logout().catch(() => undefined);
    await refresh();
    navigate("/login");
  }

  return (
    <button onClick={logout} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
      ログアウト
    </button>
  );
}
