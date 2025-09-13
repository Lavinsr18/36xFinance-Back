// import express, { type Express } from "express";
// import fs from "fs";
// import path from "path";
// import { createServer as createViteServer, createLogger } from "vite";
// import { type Server } from "http";
// import viteConfig from "../vite.config";
// import { nanoid } from "nanoid";
// import { fileURLToPath } from "url";

// // ✅ Fix: define __dirname for CommonJS compatibility
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const viteLogger = createLogger();

// export function log(message: string, source = "express") {
//   const formattedTime = new Date().toLocaleTimeString("en-US", {
//     hour: "numeric",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });

//   console.log(`${formattedTime} [${source}] ${message}`);
// }

// export async function setupVite(app: Express, server: Server) {
//   const serverOptions = {
//     middlewareMode: true,
//     hmr: { server },
//     allowedHosts: true as const,
//   };

//   const vite = await createViteServer({
//     ...viteConfig,
//     configFile: false,
//     customLogger: {
//       ...viteLogger,
//       error: (msg, options) => {
//         viteLogger.error(msg, options);
//         process.exit(1);
//       },
//     },
//     server: serverOptions,
//     appType: "custom",
//   });

//   app.use(vite.middlewares);
//   app.use("*", async (req, res, next) => {
//     const url = req.originalUrl;

//     try {
//       const clientTemplate = path.resolve(
//         __dirname,
//         "..",
//         "client",
//         "index.html",
//       );

//       // always reload the index.html file from disk incase it changes
//       let template = await fs.promises.readFile(clientTemplate, "utf-8");
//       template = template.replace(
//         `src="/src/main.tsx"`,
//         `src="/src/main.tsx?v=${nanoid()}"`,
//       );
//       const page = await vite.transformIndexHtml(url, template);
//       res.status(200).set({ "Content-Type": "text/html" }).end(page);
//     } catch (e) {
//       vite.ssrFixStacktrace(e as Error);
//       next(e);
//     }
//   });
// }

// export function serveStatic(app: Express) {
//   const distPath = path.resolve(__dirname, "public");

//   if (!fs.existsSync(distPath)) {
//     throw new Error(
//       `Could not find the build directory: ${distPath}, make sure to build the client first`,
//     );
//   }

//   app.use(express.static(distPath));

//   // fall through to index.html if the file doesn't exist
//   app.use("*", (_req, res) => {
//     res.sendFile(path.resolve(distPath, "index.html"));
//   });
// }


// src/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Try a bunch of likely locations for client/index.html and return the first found.
 * Also accepts an environment variable FRONTEND_ROOT (relative or absolute) to force location.
 */
function findClientIndex(): { found: string | null; tried: string[] } {
  const tried: string[] = [];

  if (process.env.FRONTEND_ROOT) {
    tried.push(path.resolve(process.cwd(), process.env.FRONTEND_ROOT, "index.html"));
    tried.push(path.resolve(process.cwd(), process.env.FRONTEND_ROOT));
  }

  tried.push(path.resolve(__dirname, "../client/index.html"));
  tried.push(path.resolve(__dirname, "../../client/index.html"));
  tried.push(path.resolve(process.cwd(), "client/index.html"));
  tried.push(path.resolve(process.cwd(), "../client/index.html"));
  tried.push(path.resolve(process.cwd(), "index.html")); // edge-case: repo root is client

  for (const p of tried) {
    if (fs.existsSync(p)) return { found: p, tried };
  }
  return { found: null, tried };
}

/**
 * Find a built distribution folder for production serving.
 */
function findDistPath(): { found: string | null; tried: string[] } {
  const tried: string[] = [];

  if (process.env.FRONTEND_ROOT) {
    tried.push(path.resolve(process.cwd(), process.env.FRONTEND_ROOT, "dist"));
    tried.push(path.resolve(process.cwd(), process.env.FRONTEND_ROOT, "dist/public"));
  }

  tried.push(path.resolve(__dirname, "../client/dist"));         // typical: backend/src -> ../client/dist
  tried.push(path.resolve(__dirname, "../client/dist/public"));  // if build put dist/public
  tried.push(path.resolve(__dirname, "../../client/dist"));
  tried.push(path.resolve(process.cwd(), "dist/public"));        // if vite config writes to repoRoot/dist/public
  tried.push(path.resolve(process.cwd(), "client/dist"));
  tried.push(path.resolve(process.cwd(), "client/dist/public"));

  for (const p of tried) {
    if (fs.existsSync(p)) return { found: p, tried };
  }
  return { found: null, tried };
}

// ------------------ DEV MODE ------------------
export async function setupVite(app: Express, server: Server) {
  const { found: clientTemplatePath, tried } = findClientIndex();

  if (!clientTemplatePath) {
    log(
      `Vite middleware requested but no client/index.html found. Tried: ${tried.join(
        ", ",
      )}. Skipping Vite middleware. Run frontend dev server separately (npm run dev in client) or set FRONTEND_ROOT env var to point to client.`,
      "vite",
    );
    return; // graceful: do not throw — backend will keep serving APIs
  }

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");
      // add cache-busting query so HMR picks up changes in some envs
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// ------------------ PROD MODE ------------------
export function serveStatic(app: Express) {
  const { found: distPath, tried } = findDistPath();

  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Tried: ${tried.join(
        ", ",
      )}. Make sure to run the client build (cd client && npm run build) and/or set FRONTEND_ROOT to point at your client.`,
    );
  }

  app.use(express.static(distPath));

  // fallback to index.html for SPA routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
