#!/usr/bin/env tsx

import { storage } from "../server/storage";

type Command = "deactivate" | "reactivate" | "history";

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function requireOption(options: Record<string, string>, key: string): string {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required option --${key}`);
  }
  return value;
}

function printUsage() {
  console.log(`Usage:
  tsx scripts/member-status.ts deactivate --member-id <id> --changed-by <name> [--reason "..."] [--source "script"]
  tsx scripts/member-status.ts reactivate --member-id <id> --changed-by <name> [--reason "..."] [--source "script"]
  tsx scripts/member-status.ts history --member-id <id> [--limit <n>]`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || !["deactivate", "reactivate", "history"].includes(command)) {
    printUsage();
    process.exit(command ? 1 : 0);
  }

  const options = parseArgs(rest);
  await storage.ensureInitialized();

  if (command === "history") {
    const memberId = requireOption(options, "member-id");
    const limit = options.limit ? Number.parseInt(options.limit, 10) : 20;
    const history = await storage.getMemberStatusHistory(memberId, limit);

    if (history.length === 0) {
      console.log(`No status history found for member ${memberId}.`);
      return;
    }

    console.log(JSON.stringify(history, null, 2));
    return;
  }

  const memberId = requireOption(options, "member-id");
  const changedBy = requireOption(options, "changed-by");
  const reason = options.reason;
  const source = options.source ?? "script";
  const toIsActive = command === "reactivate";

  const result = await storage.setMemberActiveStatus({
    memberId,
    toIsActive,
    changedBy,
    reason,
    source,
  });

  if (!result.changed) {
    console.log(
      `${result.member.name} is already ${result.member.isActive ? "active" : "inactive"}.`,
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        memberId: result.member.id,
        memberName: result.member.name,
        isActive: result.member.isActive,
        statusChangedAt: result.member.statusChangedAt,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
