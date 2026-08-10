import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage, RegisterPage } from '@/features/auth';
import { GroupPage, GroupsPage, TodoListPage } from '@/features/groups';
import { AppLayout } from '@/layouts/app-layout';
import { ProtectedRoute, PublicOnlyRoute } from '@/router/route-guards';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/groups" replace />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/groups/:groupId/lists/:todoListId" element={<TodoListPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
