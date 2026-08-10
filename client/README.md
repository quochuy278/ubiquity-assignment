# Client

React client built with TypeScript and Vite.

## Development

```bash
pnpm install
pnpm dev
```

## Code quality

Biome handles formatting, linting, and import organization.

```bash
pnpm format
pnpm lint
pnpm check
pnpm check:all
```

## State ownership

- TanStack Query owns server state, including the current user, groups, todo lists, todos, and
  query loading/error state.
- Zustand owns authentication token state only. The vanilla store is accessible outside React by
  the Axios transport. Its persist middleware stores only the refresh token; the access token is
  memory-only.
- React component state owns forms and transient UI state.
- React Router owns navigation state.

The current backend returns refresh tokens to JavaScript. A stronger production token-storage
model would require backend support for an HttpOnly/Secure cookie-based refresh-token flow.
