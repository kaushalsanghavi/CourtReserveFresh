import nodeSqlParser from "node-sql-parser";

const ALLOWED_RELATIONS = new Set([
  "ai_booking_facts",
  "ai_activity_facts",
  "ai_member_facts",
  "ai_comment_facts",
  "bookings",
  "activities",
  "members",
  "comments",
]);

const ALLOWED_FUNCTIONS = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "date_trunc",
  "extract",
  "cast",
  "coalesce",
  "lower",
  "upper",
  "round",
  "nullif",
]);

const DISALLOWED_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "truncate",
  "copy",
  "grant",
  "revoke",
  "vacuum",
  "analyze",
];

const DISALLOWED_SCHEMAS = new Set(["pg_catalog", "information_schema"]);

const SQL_PARSE_OPTIONS = { database: "postgresql" } as const;
const parser = new (nodeSqlParser as { Parser: new () => ParserInstance }).Parser();

interface ParserInstance {
  parse: (sql: string, opt: { database: string }) => unknown;
}

export interface ValidatedSqlResult {
  ok: boolean;
  sql: string;
  reason?: string;
  limitApplied: boolean;
}

type AstNode = Record<string, unknown>;
type ParseResult = {
  ast: unknown;
  tableList: string[];
};

function hasInlineComments(sql: string): boolean {
  return /--|\/\*/.test(sql);
}

function hasMultipleStatements(sql: string): boolean {
  const stripped = sql.trim().replace(/;+\s*$/, "");
  return stripped.includes(";");
}

function startsWithReadOnly(sql: string): boolean {
  return /^\s*(select|with)\b/i.test(sql);
}

function usesDisallowedKeyword(sql: string): boolean {
  const lower = sql.toLowerCase();
  return DISALLOWED_KEYWORDS.some((keyword) =>
    new RegExp(`\\b${keyword}\\b`, "i").test(lower),
  );
}

function normalizeIdentifier(raw: string): string {
  return raw.replace(/["`[\]]/g, "").trim().toLowerCase();
}

function isObjectLike(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSql(sql: string): ParseResult {
  return parser.parse(sql, SQL_PARSE_OPTIONS) as unknown as ParseResult;
}

function getStatements(ast: unknown): AstNode[] {
  if (Array.isArray(ast)) {
    return ast.filter((entry): entry is AstNode => isObjectLike(entry));
  }
  return isObjectLike(ast) ? [ast] : [];
}

function hasOnlySelectStatements(statement: AstNode): boolean {
  const type = statement.type;
  if (typeof type !== "string" || type.toLowerCase() !== "select") {
    return false;
  }

  if ("set_op" in statement && statement.set_op) {
    return false;
  }

  if ("_next" in statement && statement._next) {
    return false;
  }

  const withEntries = statement.with;
  if (Array.isArray(withEntries)) {
    for (const entry of withEntries) {
      if (!isObjectLike(entry) || !isObjectLike(entry.stmt)) {
        return false;
      }
      if (!hasOnlySelectStatements(entry.stmt)) {
        return false;
      }
    }
  }

  return true;
}

function collectCteNames(statement: AstNode, names: Set<string>): void {
  const withEntries = statement.with;
  if (!Array.isArray(withEntries)) {
    return;
  }

  for (const entry of withEntries) {
    if (!isObjectLike(entry)) {
      continue;
    }
    const cteName = isObjectLike(entry.name) ? entry.name.value : null;
    if (typeof cteName === "string" && cteName.trim()) {
      names.add(normalizeIdentifier(cteName));
    }
    if (isObjectLike(entry.stmt)) {
      collectCteNames(entry.stmt, names);
    }
  }
}

function extractFunctionName(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeIdentifier(value);
  }

  if (!isObjectLike(value)) {
    return null;
  }

  if (typeof value.value === "string") {
    return normalizeIdentifier(value.value);
  }

  if (Array.isArray(value.name) && value.name.length > 0) {
    const last = value.name[value.name.length - 1];
    if (isObjectLike(last) && typeof last.value === "string") {
      return normalizeIdentifier(last.value);
    }
    if (typeof last === "string") {
      return normalizeIdentifier(last);
    }
  }

  return null;
}

function walkAst(node: unknown, onNode: (item: AstNode) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      walkAst(item, onNode);
    }
    return;
  }

  if (!isObjectLike(node)) {
    return;
  }

  onNode(node);
  for (const value of Object.values(node)) {
    walkAst(value, onNode);
  }
}

function hasOnlyAllowedFunctionsFromAst(ast: unknown): boolean {
  let valid = true;

  walkAst(ast, (node) => {
    const type = typeof node.type === "string" ? node.type.toLowerCase() : "";
    if (type === "aggr_func" && typeof node.name === "string") {
      if (!ALLOWED_FUNCTIONS.has(normalizeIdentifier(node.name))) {
        valid = false;
      }
      return;
    }

    if (type === "function") {
      const fnName = extractFunctionName(node.name);
      if (!fnName || !ALLOWED_FUNCTIONS.has(fnName)) {
        valid = false;
      }
      return;
    }

    if (type === "extract" && !ALLOWED_FUNCTIONS.has("extract")) {
      valid = false;
      return;
    }

    if (type === "cast" && !ALLOWED_FUNCTIONS.has("cast")) {
      valid = false;
    }
  });

  return valid;
}

function parseTableRef(tableRef: string): {
  action: string;
  dbName: string;
  tableName: string;
} {
  const parts = tableRef.split("::");
  const action = normalizeIdentifier(parts[0] ?? "");
  const dbName = normalizeIdentifier(parts[1] ?? "");
  const tableName = normalizeIdentifier(parts[2] ?? "");
  return { action, dbName, tableName };
}

function hasDisallowedSchemaInRef(dbName: string): boolean {
  if (!dbName || dbName === "null") {
    return false;
  }
  return dbName
    .split(".")
    .map((part) => normalizeIdentifier(part))
    .some((part) => DISALLOWED_SCHEMAS.has(part));
}

function hasOnlyAllowedRelationsFromParse(
  tableList: string[],
  cteNames: Set<string>,
): boolean {
  return tableList.every((tableRef) => {
    const parsed = parseTableRef(tableRef);
    if (parsed.action !== "select") {
      return false;
    }
    if (hasDisallowedSchemaInRef(parsed.dbName)) {
      return false;
    }
    if (cteNames.has(parsed.tableName)) {
      return true;
    }
    return ALLOWED_RELATIONS.has(parsed.tableName);
  });
}

function enforceLimit(sql: string): { sql: string; limitApplied: boolean } {
  const match = sql.match(/\blimit\s+(\d+)\b/i);
  if (!match) {
    return { sql: `${sql.trim()} LIMIT 100`, limitApplied: true };
  }

  const current = Number(match[1]);
  if (current <= 200) {
    return { sql, limitApplied: false };
  }

  return {
    sql: sql.replace(/\blimit\s+\d+\b/i, "LIMIT 200"),
    limitApplied: true,
  };
}

export function validateGeneratedSql(rawSql: string): ValidatedSqlResult {
  const sql = rawSql.trim().replace(/;+\s*$/, "");
  if (!sql) {
    return { ok: false, sql, reason: "SQL is empty.", limitApplied: false };
  }

  if (hasInlineComments(sql)) {
    return {
      ok: false,
      sql,
      reason: "Comments are not allowed in generated SQL.",
      limitApplied: false,
    };
  }

  if (hasMultipleStatements(sql)) {
    return {
      ok: false,
      sql,
      reason: "Multiple SQL statements are not allowed.",
      limitApplied: false,
    };
  }

  if (!startsWithReadOnly(sql)) {
    return {
      ok: false,
      sql,
      reason: "Only read-only SELECT/WITH statements are allowed.",
      limitApplied: false,
    };
  }

  if (usesDisallowedKeyword(sql)) {
    return {
      ok: false,
      sql,
      reason: "SQL contains disallowed mutating or administrative keywords.",
      limitApplied: false,
    };
  }

  let parseResult: ParseResult;
  try {
    parseResult = parseSql(sql);
  } catch (error) {
    return {
      ok: false,
      sql,
      reason:
        error instanceof Error
          ? `SQL parse error: ${error.message}`
          : "SQL parse error.",
      limitApplied: false,
    };
  }

  const statements = getStatements(parseResult.ast);
  if (statements.length !== 1) {
    return {
      ok: false,
      sql,
      reason: "Multiple SQL statements are not allowed.",
      limitApplied: false,
    };
  }

  if (!hasOnlySelectStatements(statements[0])) {
    return {
      ok: false,
      sql,
      reason: "Only simple SELECT queries are allowed; set operations are disallowed.",
      limitApplied: false,
    };
  }

  const cteNames = new Set<string>();
  collectCteNames(statements[0], cteNames);

  if (!hasOnlyAllowedRelationsFromParse(parseResult.tableList, cteNames)) {
    return {
      ok: false,
      sql,
      reason: "SQL references relations outside the allowlist.",
      limitApplied: false,
    };
  }

  if (!hasOnlyAllowedFunctionsFromAst(parseResult.ast)) {
    return {
      ok: false,
      sql,
      reason: "SQL uses functions outside the allowlist.",
      limitApplied: false,
    };
  }

  const limited = enforceLimit(sql);
  return { ok: true, sql: limited.sql, limitApplied: limited.limitApplied };
}
