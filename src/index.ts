// import express, { type Request, Response, NextFunction } from "express";
// import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite";

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// app.use((req, res, next) => {
//   const start = Date.now();
//   const path = req.path;
//   let capturedJsonResponse: Record<string, any> | undefined = undefined;

//   const originalResJson = res.json;
//   res.json = function (bodyJson, ...args) {
//     capturedJsonResponse = bodyJson;
//     return originalResJson.apply(res, [bodyJson, ...args]);
//   };

//   res.on("finish", () => {
//     const duration = Date.now() - start;
//     if (path.startsWith("/api")) {
//       let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
//       if (capturedJsonResponse) {
//         logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
//       }

//       if (logLine.length > 80) {
//         logLine = logLine.slice(0, 79) + "…";
//       }

//       log(logLine);
//     }
//   });

//   next();
// });

// (async () => {
//   const server = await registerRoutes(app);

//   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
//     const status = err.status || err.statusCode || 500;
//     const message = err.message || "Internal Server Error";

//     res.status(status).json({ message });
//     throw err;
//   });

//   if (app.get("env") === "development") {
//     await setupVite(app, server);
//   } else {
//     serveStatic(app);
//   }

//   const port = parseInt(process.env.PORT || "5000", 10);

//   // ✅ Cross-platform safe listen options
//   const listenOptions: any = {
//     port,
//     host: "0.0.0.0",
//   };

//   // Only use reusePort on non-Windows platforms
//   if (process.platform !== "win32") {
//     listenOptions.reusePort = true;
//   }

//   server.listen(listenOptions, () => {
//     log(`serving on port ${port}`);
//   });
// })();




// import express, { type Request, Response, NextFunction } from "express";
// import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite";

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));


// app.use((req, res, next) => {
//   const start = Date.now();
//   const path = req.path;
//   let capturedJsonResponse: Record<string, any> | undefined = undefined;

//   const originalResJson = res.json;
//   res.json = function (bodyJson, ...args) {
//     capturedJsonResponse = bodyJson;
//     return originalResJson.apply(res, [bodyJson, ...args]);
//   };

//   res.on("finish", () => {
//     const duration = Date.now() - start;
//     if (path.startsWith("/api")) {
//       let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
//       if (capturedJsonResponse) {
//         logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
//       }

//       if (logLine.length > 80) {
//         logLine = logLine.slice(0, 79) + "…";
//       }

//       log(logLine);
//     }
//   });

//   next();
// });

// // Logging middleware (unchanged)

// // ✅ Move error middleware here BEFORE registerRoutes creates server
// (async () => {
//   const server = await registerRoutes(app);

//   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
//     const status = err.status || err.statusCode || 500;
//     const message = err.message || "Internal Server Error";

//     res.status(status).json({ message });
//     throw err;
//   });

//   // importantly only setup vite in development and after
//   // setting up all the other routes so the catch-all route
//   // doesn't interfere with the other routes
//   if (app.get("env") === "development") {
//     await setupVite(app, server);
//   } else {
//     serveStatic(app);
//   }


//   const port = parseInt(process.env.PORT || "5000", 10);
//   const listenOptions: any = { port, host: "0.0.0.0" };
//   if (process.platform !== "win32") listenOptions.reusePort = true;

//   server.listen(listenOptions, () => {
//     log(`serving on port ${port}`);
//   });
// })();


// src/index.ts
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

// simple logger/middleware kept from your original
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  // @ts-ignore - keep original behaviour
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    // @ts-ignore
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 160) {
        logLine = logLine.slice(0, 159) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // centralized error handler (kept as you had)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);;
  });

  // DEV vs PROD behavior:
  const isDev = app.get("env") === "development";

  if (isDev) {
    // only setup vite middleware if a client/index.html actually exists (or FRONTEND_ROOT is set)
    const candidates = [
      path.resolve(__dirname, "../client/index.html"),
      path.resolve(__dirname, "../../client/index.html"),
      path.resolve(process.cwd(), "client/index.html"),
      path.resolve(process.cwd(), "../client/index.html"),
    ];

    // also respect FRONTEND_ROOT env var
    if (process.env.FRONTEND_ROOT) {
      candidates.unshift(path.resolve(process.cwd(), process.env.FRONTEND_ROOT, "index.html"));
    }

    const exists = candidates.some((p) => fs.existsSync(p));

    if (exists) {
      await setupVite(app, server);
    } else {
      // No client in this repo — skip frontend serving in dev.
      log(
        `Dev: no client/index.html found. Skipping Vite middleware. Run client dev server separately at http://localhost:5173 or set FRONTEND_ROOT to point to client.`,
        "express",
      );
    }
  } else {
    // prod: serve built static (throws helpful error if not found)
    try {
      serveStatic(app);
    } catch (err) {
      log((err as Error).message, "express");
      process.exit(1);
    }
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") listenOptions.reusePort = true;

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
