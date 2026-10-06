import { Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { AdminLayout } from "./layout/AdminLayout";
import { AuthGate, RequirePermission } from "./layout/AuthGate";
import { AdminDocsPage } from "./pages/AdminDocsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { DocPage } from "./pages/DocPage";
import { EditPage } from "./pages/EditPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NewPage } from "./pages/NewPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGate />}>
          <Route index element={<HomePage />} />
          <Route path="docs/*" element={<DocPage />} />
          <Route element={<RequirePermission permission="edit" />}>
            <Route path="new" element={<NewPage />} />
            <Route path="edit/*" element={<EditPage />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/docs" replace />} />
              <Route path="docs" element={<AdminDocsPage />} />
              <Route element={<RequirePermission permission="manageUsers" />}>
                <Route path="users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage message="ページが見つかりません" />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
