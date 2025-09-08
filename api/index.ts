import express from "express";

// Create a single Express instance and reuse between invocations
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
let initialized = false;
let registerRoutesFn: any = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!registerRoutesFn) {
    try {
      // Prefer the pre-bundled file on Vercel
      registerRoutesFn = (await import("../api_build/routes.js")).registerRoutes;
    } catch (_err) {
      // Fallback for local/dev environments
      registerRoutesFn = (await import("../server/routes" as any)).registerRoutes;
    }
  }
  const server = await registerRoutesFn(app);
  server.on("request", () => {});
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  app(req as any, res as any);
}


