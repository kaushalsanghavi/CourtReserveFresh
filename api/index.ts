import express from "express";
import { registerRoutes } from "../server/routes";

// Create a single Express instance and reuse between invocations
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const server = await registerRoutes(app);
  server.on("request", () => {});
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  app(req as any, res as any);
}


