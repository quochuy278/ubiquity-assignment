import { ListTodoIcon, UsersIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCurrentUser, useLogout } from '@/features/auth';
import { SafeButton } from '@/shared/components/safe-button';

export function AppLayout() {
  const { data: currentUser } = useCurrentUser();
  const { mutateAsync: logout, isPending: isLoggingOut } = useLogout();
  const handleLogout = async () => {
    await logout().catch(() => undefined);
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link className="flex shrink-0 items-center gap-2 font-semibold" to="/groups">
            <ListTodoIcon className="size-5" aria-hidden="true" />
            Ubiquity Todo
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
              Lists
            </NavLink>
          </nav>
          <span
            className="hidden max-w-40 truncate text-muted-foreground text-sm sm:inline"
            title={currentUser?.displayName}
          >
            {currentUser?.displayName}
          </span>
          <SafeButton
            variant="outline"
            size="sm"
            pending={isLoggingOut}
            pendingText="Signing out..."
            onAction={handleLogout}
          >
            Sign out
          </SafeButton>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
