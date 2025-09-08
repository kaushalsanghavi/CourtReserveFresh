import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
let initialized = false;
let registerRoutesFn: any = null;
let ensureInitializedFn: (() => Promise<void>) | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!registerRoutesFn) {
    try {
      // Prefer the pre-bundled file on Vercel (generated during vercel-build)
      const mod: any = await import("./routes.js" as any);
      registerRoutesFn = mod.registerRoutes;
      ensureInitializedFn = mod.storage?.ensureInitialized?.bind(mod.storage) || null;
    } catch (_err) {
      // Fallback for local/dev environments
      const mod: any = await import("../server/routes" as any);
      registerRoutesFn = mod.registerRoutes;
      ensureInitializedFn = (await import("../server/storage" as any)).storage.ensureInitialized.bind((await import("../server/storage" as any)).storage);
    }
  }
  // run one-time initialization if exposed
  if (ensureInitializedFn) {
    await ensureInitializedFn();
  }
  const server = await registerRoutesFn(app);
  server.on("request", () => {});
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  app(req as any, res as any);
}


