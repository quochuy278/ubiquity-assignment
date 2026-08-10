interface AuthLocationState {
  from?: {
    pathname?: unknown;
  };
}

export function getPostLoginPath(state: unknown) {
  if (typeof state !== 'object' || state === null) {
    return '/groups';
  }

  const pathname = (state as AuthLocationState).from?.pathname;
  return typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/groups';
}
