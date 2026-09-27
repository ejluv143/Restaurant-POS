// PreToolUse: block edits to secrets, lockfiles, runtime data and build output.
// Exit code 2 blocks the tool call and shows stderr to Claude.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
const file = String(input.tool_input?.file_path ?? "").replace(/\\/g, "/");

const RULES = [
  [/\/\.env(?!\.example$)(\.|$)/, "env files hold secrets — edit them by hand"],
  [/\/package-lock\.json$/, "lockfile — change dependencies with npm install instead"],
  [/\/frontend\/data\//, "live room-order data — change it through the API, not by hand"],
  [/\/frontend\/(\.next|out|node_modules)\//, "generated output — edit the source instead"],
];

for (const [pattern, reason] of RULES) {
  if (pattern.test(file)) {
    process.stderr.write(`Blocked edit to ${file}: ${reason}.\n`);
    process.exit(2);
  }
}
