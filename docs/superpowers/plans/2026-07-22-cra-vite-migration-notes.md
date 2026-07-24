# CRA→Vite migration notes (scratch — delete after Task 8)

Dead files (Vite scaffold, never wired up):
- vmbso-spa-v2/src/main.tsx      (stub, superseded by Task 2)
- vmbso-spa-v2/README.md         (unmodified `npm create vite` default README)

Files this migration rewrites in place (not deleted):
- vmbso-spa-v2/index.html        (Vite scaffold shell -> gets real CRA head content, Task 4)
- vmbso-spa-v2/vite.config.ts    (gets proxy + build output config, Task 3)
- vmbso-spa-v2/package.json      (deps + scripts, Tasks 2 and 6)

Files this migration deletes once their content has moved elsewhere:
- vmbso-spa-v2/public/index.html   -> content moves into index.html (Task 4)
- vmbso-spa-v2/src/index.tsx       -> content moves into src/main.tsx (Task 2)
- vmbso-spa-v2/src/react-app-env.d.ts -> superseded by src/vite-env.d.ts (Task 2)
- vmbso-spa-v2/src/setupProxy.js   -> superseded by vite.config.ts server.proxy (Task 3)
- vmbso-spa-v2/yarn.lock           -> standardizing on npm (Task 6)

Known pre-existing gap, NOT fixed by this migration (out of scope, carried over as-is):
- public/index.html references %PUBLIC_URL%/logo192.png, which does not exist in
  public/images/ and never has (confirmed absent from build/ output too). This 404s
  silently today and will keep doing so after migration. Separate ticket if it matters.
