import { sql } from "drizzle-orm";
import { db } from "../db.js";

export interface SqlExecutionResult {
  rows: Record<string, unknown>[];
  execMs: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`SQL execution timed out after ${ms}ms.`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function executeSqlReadOnly(
  query: string,
  timeoutMs = 2000,
): Promise<SqlExecutionResult> {
  const started = Date.now();
  const result = (await withTimeout(db.execute(sql.raw(query)), timeoutMs)) as {
    rows?: unknown[];
  };
  const execMs = Date.now() - started;

  const rows = Array.isArray(result.rows)
    ? (result.rows as Record<string, unknown>[])
    : [];

  return { rows, execMs };
}
