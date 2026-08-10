import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage, RegisterPage } from '@/features/auth';
import { GroupPage } from '@/features/groups/pages/group-page';
import { GroupsPage } from '@/features/groups/pages/groups-page';
import { TodoListPage } from '@/features/groups/pages/todo-list-page';
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
