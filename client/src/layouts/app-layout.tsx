import { ListTodoIcon, UsersIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCurrentUser, useLogout } from '@/features/auth';
import { Button } from '@/shared/components/ui/button';

export function AppLayout() {
  const currentUser = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link className="flex items-center gap-2 font-semibold" to="/groups">
            <ListTodoIcon className="size-5" aria-hidden="true" />
            Ubiquity Todos
          </Link>
          <nav className="flex flex-1 items-center" aria-label="Primary navigation">
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-1.5 font-medium text-sm'
                  : 'flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground'
              }
              to="/groups"
            >
              <UsersIcon className="size-4" aria-hidden="true" />
              Groups
            </NavLink>
          </nav>
          <span className="hidden text-muted-foreground text-sm sm:inline">
            {currentUser.data?.displayName}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
