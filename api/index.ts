import express from "express";
import { setupRoutes } from "./server";

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await setupRoutes(app);
  initialized = true;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  app(req as any, res as any);
}


