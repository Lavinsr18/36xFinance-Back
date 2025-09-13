# MERN Backend (from monorepo exports)

This is a ready-made backend package created from your uploaded monorepo files.
It includes the following source files (TypeScript) under `src/`:
- index.ts
- routes.ts
- storage.ts
- vite.ts

## Quick start (dev)

1. Install dependencies
   ```bash
   npm install
   ```

2. Create a `.env` based on `.env.example` (optional)
   ```bash
   cp .env.example .env
   ```

3. Run dev server
   ```bash
   npm run dev
   ```

The dev script uses `ts-node-dev` and will start the Express server defined in `src/index.ts`. The app listens on `PORT` (default 5000).

## Notes
- Storage is in-memory (`storage.ts` uses `MemStorage`). Data will reset on restart.
- If you want to serve a separated frontend, set `CLIENT_URL` in `.env` (e.g. http://localhost:3000).
- Build for production using `npm run build` and then `npm start`.
